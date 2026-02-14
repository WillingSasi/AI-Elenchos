const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 单条回复最大字数（与前端截断统一）
const MAX_REPLY_LENGTH = 350;

// ====== 日志系统 ======
const logsDir = path.join(__dirname, '../logs');
fs.ensureDirSync(logsDir);

const logger = {
    _getLogFile() {
        // 按天分割日志文件
        const date = new Date().toISOString().split('T')[0];
        return path.join(logsDir, `server_${date}.log`);
    },
    _write(level, message) {
        const timestamp = new Date().toISOString();
        const line = `[${timestamp}] [${level}] ${message}\n`;
        // 同时输出到控制台和文件（异步写入，不阻塞事件循环）
        process.stdout.write(line);
        fs.appendFile(this._getLogFile(), line).catch(() => {});
    },
    info(msg)  { this._write('INFO', msg); },
    warn(msg)  { this._write('WARN', msg); },
    error(msg) { this._write('ERROR', msg); },
    debug(msg) { this._write('DEBUG', msg); }
};

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 提供静态文件服务
app.use(express.static(path.join(__dirname, '../frontend')));

// 存储活动对话
const activeConversations = new Map();

// 确保对话目录存在
const conversationsDir = path.join(__dirname, '../conversations');
fs.ensureDirSync(conversationsDir);

// AI对话类
class AIConversation {
    constructor(config) {
        this.id = uuidv4();
        this.question = config.question;
        this.firstSpeaker = config.firstSpeaker;
        this.modelAConfig = config.modelAConfig;
        this.modelBConfig = config.modelBConfig;
        this.totalRounds = config.totalRounds || 10;
        this.currentRound = 0;
        this.history = [
            { role: 'user', content: config.question }
        ];
        this.currentSpeaker = config.firstSpeaker;
        this.isRunning = false;
        this.shouldStop = false;
        this.response = null;
    }

    async start(response) {
        this.response = response;
        this.isRunning = true;
        this.shouldStop = false;

        // 监听客户端断开，自动停止对话循环并清理资源
        response.on('close', () => {
            if (this.isRunning) {
                logger.info(`[${this.id}] 客户端断开连接，停止对话`);
                this.shouldStop = true;
            }
            activeConversations.delete(this.id);
        });

        // 设置响应头以支持流式输出
        response.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type'
        });

        // 立即发送 conversationId，让前端知道后端实例的真实ID
        this.sendEvent({ type: 'conversation_start', conversationId: this.id });

        try {
            // 开始对话循环
            await this.conversationLoop();
        } catch (error) {
            console.error('对话错误:', error);
            this.sendError(error.message);
        } finally {
            this.sendConversationComplete();
            this.isRunning = false;
            activeConversations.delete(this.id);
            response.end();
        }
    }

    // 继续对话：基于已有history和上下文，追加更多轮次
    async continueConversation(response, additionalRounds, existingHistory) {
        this.response = response;
        this.isRunning = true;
        this.shouldStop = false;
        this.totalRounds = this.currentRound + additionalRounds;
        
        // 如果前端传来了完整的对话历史，用它恢复后端状态
        // （因为第一次对话结束后后端对象可能已被清理）
        if (existingHistory && existingHistory.length > 0) {
            this.history = existingHistory.map(item => ({
                role: item.role,
                content: item.content
            }));
        }

        // 监听客户端断开，自动停止对话循环并清理资源
        response.on('close', () => {
            if (this.isRunning) {
                logger.info(`[${this.id}] 客户端断开连接，停止继续对话`);
                this.shouldStop = true;
            }
            activeConversations.delete(this.id);
        });

        // 设置响应头
        response.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type'
        });

        // 立即发送 conversationId，让前端知道后端实例的真实ID
        this.sendEvent({ type: 'conversation_start', conversationId: this.id });

        try {
            await this.conversationLoop();
        } catch (error) {
            console.error('继续对话错误:', error);
            this.sendError(error.message);
        } finally {
            this.sendConversationComplete();
            this.isRunning = false;
            activeConversations.delete(this.id);
            response.end();
        }
    }

    async conversationLoop() {
        const minimumRounds = this.totalRounds;
        
        logger.info(`=== 对话循环开始: currentRound=${this.currentRound}, totalRounds=${minimumRounds}, speaker=${this.currentSpeaker} ===`);
        
        while (this.currentRound < minimumRounds && !this.shouldStop) {
            const currentConfig = this.currentSpeaker === 'A' ? this.modelAConfig : this.modelBConfig;
            const speakerForThisRound = this.currentSpeaker;
            
            logger.info(`--- 第${this.currentRound + 1}轮开始, 发言者: ${speakerForThisRound}, 模型: ${currentConfig.name} ---`);
            
            // 发送发言者变化事件
            this.sendSpeakerChange(speakerForThisRound);
            
            // 构建对话历史
            const messages = this.buildConversationHistory(speakerForThisRound);
            logger.info(`[${speakerForThisRound}] 构建消息历史: ${messages.length}条`);
            
            // 调用AI API
            let aiResponse;
            try {
                aiResponse = await this.callAI(currentConfig, messages);
            } catch (err) {
                logger.error(`[${speakerForThisRound}] callAI异常: ${err.message}`);
                throw err;
            }
            
            if (this.shouldStop) {
                logger.info('对话被用户停止');
                break;
            }
            
            // 空内容保护：如果AI返回空内容，记录警告但仍继续
            if (!aiResponse || aiResponse.trim() === '') {
                logger.warn(`[${speakerForThisRound}] AI返回空内容！使用占位文本`);
                aiResponse = `(模型${speakerForThisRound}未返回有效内容)`;
            }
            
            logger.info(`[${speakerForThisRound}] 回复完成, 内容长度: ${aiResponse.length}, 前50字: ${aiResponse.substring(0, 50)}...`);
            
            // 添加到后端历史记录
            this.history.push({
                role: speakerForThisRound,
                content: aiResponse
            });
            
            // 发送最终完整消息
            this.sendMessageComplete(speakerForThisRound, aiResponse);
            
            // 增加轮次计数
            this.currentRound++;
            
            // 发送轮次完成事件
            this.sendRoundComplete();
            
            // 切换发言者
            this.currentSpeaker = speakerForThisRound === 'A' ? 'B' : 'A';
            
            logger.info(`--- 第${this.currentRound}轮完成, 下一个发言者: ${this.currentSpeaker} ---`);
            
            // 短暂延迟
            await this.delay(1000);
        }
        
        logger.info(`=== 对话循环结束: 完成${this.currentRound}轮 ===`);
    }

    /**
     * 构建对话历史 — 会话上下文连续性的核心方法
     * 
     * 设计说明：
     * OpenAI兼容API是无状态的，每次调用都需要发送完整的消息历史。
     * 因此每个模型的"session"实际上就是累积的消息历史。
     * 
     * 关键机制：
     * 1. 每个模型看到自己之前的回复作为 assistant 角色（维持自身上下文记忆）
     * 2. 每个模型看到对方的回复作为 user 角色（作为需要回应的输入）
     * 3. 完整的对话历史随每次API调用一起发送，保证逻辑连续性
     * 
     * 示例（假设A先说话）：
     * - Round 0: A的API调用 = [system, 背景问题]
     * - Round 1: B的API调用 = [system, 背景问题, user:"模型A的回应:..."]
     * - Round 2: A的API调用 = [system, 背景问题, assistant:A的回复1, user:"模型B的回应:..."]
     * - Round 3: B的API调用 = [system, 背景问题, user:"模型A的回应:...", assistant:B的回复1, user:"模型A的回应:..."]
     * 
     * @param {string} speaker - 当前说话者 'A' 或 'B'
     * @returns {Array} 构建好的messages数组，可直接用于API调用
     */
    buildConversationHistory(speaker) {
        const isFirstMessage = this.currentRound === 0;
        const messages = [
            {
                role: 'system',
                content: this.getSystemPrompt(speaker, isFirstMessage)
            }
        ];

        // 根据双方当前人格，动态决定称呼（不再写死为苏格拉底/亚里士多德）
        const personaDisplayNames = {
            socrates: '苏格拉底',
            musk: '马斯克',
            critic: '杠精',
            philosopher: '哲学家',
            ma_yun: '马云',
            trump: '川普',
            xi: '秩序型领导',
            xi_jinping: '习近平',
            jiang_zemin: '江泽民',
            ikkyu: '一休和尚',
            zhuangzi: '庄子',
            nietzsche: '尼采',
            lu_xun: '鲁迅',
            munger: '芒格',
            joker: '小丑段子手',
            standup: '脱口秀选手'
        };

        const getDisplayNameForRole = (role) => {
            const isA = role === 'A';
            const baseName = isA ? '苏格拉底' : '亚里士多德';
            const cfg = isA ? this.modelAConfig : this.modelBConfig;
            const code = cfg && cfg.persona;
            return (code && personaDisplayNames[code]) || baseName;
        };

        // 添加用户的原始输入作为背景信息
        if (this.history.length > 0 && this.history[0].role === 'user') {
            messages.push({
                role: 'user',
                content: isFirstMessage ? 
                    `用户输入的内容：${this.history[0].content}\n\n请将以上内容转化为一个标准的开放性讨论问句。` : 
                    `讨论背景：${this.history[0].content}\n\n请基于完整的对话历史，直接回应对方的最新观点。记住，你们是独立的思考者，用"你"和"我"交流。`
            });
        }

        // 构建完整的对话历史，根据当前说话者的视角分配角色
        // 确保每个模型在自己的上下文session内保持连续性
        this.history.forEach(item => {
            if (item.role !== 'user') {
                if (item.role === speaker) {
                    // 当前说话者自己的历史发言 → assistant角色（模型的"记忆"）
                    messages.push({
                        role: 'assistant',
                        content: item.content
                    });
                } else {
                    // 对方的发言 → user角色（需要回应的输入）
                    const otherName = getDisplayNameForRole(item.role);
                    messages.push({
                        role: 'user',
                        content: `${otherName}的回应: ${item.content}`
                    });
                }
            }
        });

        return messages;
    }

    getSystemPrompt(speaker, isFirstMessage = false) {
        // 拟人化称呼：默认 A→"苏格拉底"（质疑者），B→"亚里士多德"（建构者）
        const basePersonas = {
            A: { name: '苏格拉底', otherName: '亚里士多德', role: '质疑者与解构者' },
            B: { name: '亚里士多德', otherName: '苏格拉底', role: '建构者与捍卫者' }
        };

        // 人格设定：由前端传入，可为空，同时用于动态覆盖称呼
        const personaStyles = {
            default: '',
            socrates: '你的说话风格更接近苏格拉底：喜欢用连环追问和反讽逼对方暴露前提，但不要故意装傻。',
            musk: '你的说话风格更接近马斯克：大胆设想、技术细节丰富，敢于给出现实中难以实现的激进方案。',
            critic: '你的说话风格像一个专业「杠精」：专门找论点的漏洞、前后矛盾和隐藏假设，但不要进行人身攻击。',
            philosopher: '你的说话风格像一位哲学家：善用抽象概念、比喻和反思，把讨论提升到更高层次。',
            ma_yun: '你的说话风格像马云：喜欢讲故事、打比方、顺便输出一点鸡汤，语气接地气又略带鼓动性。',
            trump: '你的说话风格像川普：直白、极端、爱下判断和抛金句，但要避免真实政治立场与人身攻击。',
            xi: '你的说话风格像一位重视秩序与大局观的领导者：语气稳重、强调长期与整体利益，避免真实政治内容。',
            xi_jinping: '你的说话风格像习近平,偏向“大局观+稳健务实”：注重长期规划、整体安全与秩序，用较正式的语言阐述立场，避免涉及现实具体政治事件。',
            jiang_zemin: '你的说话风格像江泽民,偏向“正式中带一点幽默”：语言有条理、有一点书面感，偶尔穿插风趣表达来化解紧张气氛，同样避免现实政治话题。',
            ikkyu: '你的说话风格像一休和尚：看似顽皮，实际用出人意料的比喻说深刻道理，略带禅意和幽默。',
            zhuangzi: '你的说话风格像庄子：爱用夸张寓言和天马行空的比喻，从常识外的角度质疑一切理所当然。',
            nietzsche: '你的说话风格像尼采：锋利、激进、充满对价值与权力的反思，不怕用极端表述刺破伪善。',
            lu_xun: '你的说话风格像鲁迅：冷峻、讽刺，擅长一针见血地指出逻辑与人性的荒诞。',
            munger: '你的说话风格像查理·芒格：极度理性、重视多元思维模型，善于用简单例子说明复杂道理。',
            joker: '你的说话风格像喜欢玩梗的搞笑up主：一本正经讲道理时顺手抛几个沙雕梗，但不影响结论清晰。',
            standup: '你的说话风格像脱口秀演员：用段子、反转和自嘲推进论证，在笑点中传递犀利观点。'
        };

        const personaDisplayNames = {
            socrates: '苏格拉底',
            musk: '马斯克',
            critic: '杠精',
            philosopher: '哲学家',
            ma_yun: '马云',
            trump: '川普',
            xi: '秩序型领导',
            xi_jinping: '习近平',
            jiang_zemin: '江泽民',
            ikkyu: '一休和尚',
            zhuangzi: '庄子',
            nietzsche: '尼采',
            lu_xun: '鲁迅',
            munger: '芒格',
            joker: '小丑段子手',
            standup: '脱口秀选手'
        };

        const myPersonaCode = speaker === 'A'
            ? (this.modelAConfig && this.modelAConfig.persona) || 'default'
            : (this.modelBConfig && this.modelBConfig.persona) || 'default';

        const otherPersonaCode = speaker === 'A'
            ? (this.modelBConfig && this.modelBConfig.persona) || 'default'
            : (this.modelAConfig && this.modelAConfig.persona) || 'default';

        const baseMe = basePersonas[speaker];
        const baseOther = speaker === 'A' ? basePersonas.B : basePersonas.A;

        const meDisplayName = (myPersonaCode && personaDisplayNames[myPersonaCode]) || baseMe.name;
        const otherDisplayName = (otherPersonaCode && personaDisplayNames[otherPersonaCode]) || baseOther.name;

        const me = {
            name: meDisplayName,
            otherName: otherDisplayName,
            role: baseMe.role
        };

        const personaDesc = personaStyles[myPersonaCode] || '';
        const question = this.question || '';
        
        // 所有输出共用的基础规则
        const baseRules = `

【输出规则（必须遵守）】
- 每次回复控制在${MAX_REPLY_LENGTH}字以内，简洁有力
- 不要捏造事实，不确定的内容明确标注
- 禁止空洞的客套和赞美，直奔核心
- 每次回复必须包含：①对对方论点的明确立场 ②你的独立论据 ③一个追问或挑战
- 适度使用 emoji（如🤔😏⚔️🔥）来表达语气和立场，但不要过度堆砌，必须保证文字本身清晰易读
- 本次讨论的核心议题是：「${question}」——所有回复必须紧扣此主题，偏离时立即拉回`;

        if (isFirstMessage) {
            return `你是${me.name}，即将与${me.otherName}展开一场深度讨论。
你们是两位独立的思考者，以第一人称"我"称呼自己，以"你"称呼对方。

你的首要任务是：将用户提供的内容（可能是一个问题、一个假设、一个论点、或一个观点）转化为一个**标准的、开放性的讨论问句**。

转化要求：
1. 无论用户给的是问句还是陈述句/论点/假设，你都需要将其重新措辞为一个适合双方深入讨论的开放性问题
2. 保留用户原始意图的核心，但使问题更加清晰、有深度、有多角度探讨的空间
3. 问题应该是开放性的（没有简单的是/否答案），能引发多角度、多层次的讨论
4. 如果用户的输入已经是很好的开放性问题，可以适当润色和扩展

输出格式：
- 直接输出转化后的开放性讨论问句
- 不需要额外的解释、前缀或引导语
- 问句应该简洁有力，一两句话即可
${baseRules}

现在，请将用户的输入转化为标准的开放性讨论问句：`;
        } else {
            // 根据角色A/B给出不同的辩论策略
            const rolePrompt = speaker === 'A' ? `你的角色是「${me.role}」——你的价值在于拆解、追问和压力测试。

你的行为准则：
1. 独立思考，不要轻易被对方说服。即使对方有道理，也要找到其论点的边界、反例或隐含假设
2. 针对对方最新观点中最薄弱的环节进行追问
3. 引入对方未考虑到的视角、反面案例或极端情境
4. 你的目标不是达成共识，而是通过质疑让真理浮现` :

`你的角色是「${me.role}」——你的价值在于论证、举证和体系构建。

你的行为准则：
1. 独立思考，坚守并强化你认为正确的立场，用证据和逻辑捍卫
2. 如果对方的质疑有效，不要简单认同，而是修正并升级你的论点
3. 提供具体的事实、数据、案例或类比来支撑你的观点
4. 你的目标不是妥协，而是通过论证让最强的论点胜出`;

            return `你是${me.name}，正在与${me.otherName}进行苏格拉底式的辩证讨论。
你们是两位独立的思考者，以第一人称"我"称呼自己，以"你"称呼对方。像真人对话一样自然交流。

${rolePrompt}

${personaDesc ? `【人格设定】\n- ${personaDesc}\n` : ''}

禁止行为：
- 不要说"你说得很好"、"我同意你的观点"等顺从性表述
- 不要重复对方或自己已有的论点
- 不要偏离核心议题
- 不要使用"模型A"、"模型B"等非人称呼
${baseRules}

现在，请回应对方的观点：`;
        }
    }

    async callAI(config, messages) {
        const { url, token, name } = config;
        
        // 关键：在调用开始时捕获当前speaker角色，避免使用可变的this.currentSpeaker
        const speakerRole = this.currentSpeaker;
        
        try {
            // 构建API请求
            const apiUrl = url.endsWith('/') ? url + 'chat/completions' : url + '/chat/completions';
            
            // 尝试使用流式API，如果不支持则回退到普通API
            let finalContent = '';
            let lastSentLength = 0; // 追踪上次发送partial时的内容长度
            
            try {
                // 首先尝试流式API
                const streamResponse = await axios.post(apiUrl, {
                    model: name,
                    messages: messages,
                    stream: true,
                    temperature: 0.7,
                    max_tokens: 2000
                }, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000,
                    responseType: 'stream'
                });

                // 处理流式响应
                const stream = streamResponse.data;
                let buffer = '';
                
                // 发送partial更新的辅助函数
                const sendPartial = () => {
                    if (this.response && !this.response.destroyed && finalContent.length > lastSentLength) {
                        const partialData = {
                            type: 'message_partial',
                            role: speakerRole, // 使用捕获的角色，不用this.currentSpeaker
                            content: finalContent,
                            timestamp: new Date().toISOString()
                        };
                        this.response.write(`data: ${JSON.stringify(partialData)}\n\n`);
                        lastSentLength = finalContent.length;
                    }
                };
                
                return new Promise((resolve, reject) => {
                    let resolved = false;
                    let rawChunks = []; // 记录原始数据用于调试
                    
                    const doResolve = () => {
                        if (resolved) return;
                        resolved = true;
                        sendPartial();
                        logger.info(`[${speakerRole}] 流式输出完成, 内容长度: ${finalContent.length}`);
                        
                        // 关键：如果流式返回了空内容，自动回退到非流式API重试
                        if (finalContent.trim() === '') {
                            logger.warn(`[${speakerRole}] 流式输出为空！记录前3个原始chunk: ${JSON.stringify(rawChunks.slice(0, 3))}`);
                            logger.info(`[${speakerRole}] 回退到非流式API重试...`);
                            this.callAINonStream(config, apiUrl, messages)
                                .then(content => {
                                    logger.info(`[${speakerRole}] 非流式API重试成功, 内容长度: ${content.length}`);
                                    resolve(content);
                                })
                                .catch(err => {
                                    logger.error(`[${speakerRole}] 非流式API重试也失败: ${err.message}`);
                                    resolve('');
                                });
                        } else {
                            resolve(finalContent);
                        }
                    };
                    
                    stream.on('data', (chunk) => {
                        buffer += chunk.toString();
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';
                        
                        for (const line of lines) {
                            if (line.trim() && line.startsWith('data: ')) {
                                const data = line.substring(6);
                                if (data.trim() === '[DONE]') {
                                    doResolve();
                                    return;
                                }
                                
                                try {
                                    const parsed = JSON.parse(data);
                                    // 记录原始数据用于调试（只记录前5个）
                                    if (rawChunks.length < 5) {
                                        rawChunks.push(data.substring(0, 200));
                                    }
                                    
                                    if (parsed.choices && parsed.choices[0]) {
                                        const choice = parsed.choices[0];
                                        // 兼容多种流式响应格式
                                        let content = null;
                                        
                                        // 标准格式: delta.content
                                        if (choice.delta && choice.delta.content) {
                                            content = choice.delta.content;
                                        }
                                        // 某些模型: delta.reasoning_content（思维链模型）
                                        else if (choice.delta && choice.delta.reasoning_content) {
                                            content = choice.delta.reasoning_content;
                                        }
                                        // 某些模型: message.content（非标准流式）
                                        else if (choice.message && choice.message.content) {
                                            content = choice.message.content;
                                        }
                                        // 某些模型: delta.text
                                        else if (choice.delta && choice.delta.text) {
                                            content = choice.delta.text;
                                        }
                                        // 某些模型: text（旧版completions格式）
                                        else if (choice.text) {
                                            content = choice.text;
                                        }
                                        
                                        if (content) {
                                            finalContent += content;
                                            if (finalContent.length - lastSentLength >= 10 || finalContent.length < 50) {
                                                sendPartial();
                                            }
                                        }
                                    }
                                } catch (e) {
                                    // 忽略解析错误
                                }
                            }
                        }
                    });
                    
                    stream.on('end', () => {
                        doResolve();
                    });
                    
                    stream.on('error', (error) => {
                        if (resolved) return;
                        resolved = true;
                        logger.warn(`[${speakerRole}] 流式API失败，尝试普通API: ${error.message}`);
                        this.callAINonStream(config, apiUrl, messages).then(resolve).catch(reject);
                    });
                });
                
            } catch (streamError) {
                logger.warn(`[${speakerRole}] 流式API异常，使用普通API: ${streamError.message}`);
                return this.callAINonStream(config, apiUrl, messages);
            }
        } catch (error) {
            logger.error(`[${speakerRole}] 调用模型${config.name}失败: ${error.message}`);
            throw new Error(`模型${config.name}调用失败: ${error.message}`);
        }
    }

    // 非流式API调用方法
    async callAINonStream(config, apiUrl, messages) {
        const response = await axios.post(apiUrl, {
            model: config.name,
            messages: messages,
            stream: false,
            temperature: 0.7,
            max_tokens: 2000
        }, {
            headers: {
                'Authorization': `Bearer ${config.token}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000
        });

        if (response.data && response.data.choices && response.data.choices.length > 0) {
            const choice = response.data.choices[0];
            // 兼容多种非流式响应格式
            const content = (choice.message && choice.message.content) ||
                           (choice.message && choice.message.reasoning_content) ||
                           choice.text ||
                           '';
            logger.info(`[非流式] 模型${config.name}返回内容长度: ${content.length}`);
            return content;
        } else {
            logger.warn(`[非流式] 模型${config.name}返回格式异常: ${JSON.stringify(response.data).substring(0, 200)}`);
            throw new Error('无效的API响应格式');
        }
    }

    // 发送最终完整消息（一轮AI输出结束后调用）
    // 前端收到这个事件时：更新显示为最终内容、关闭流式动画、保存到history
    sendMessageComplete(role, content) {
        const data = {
            type: 'message_complete',
            role: role,
            content: content,
            timestamp: new Date().toISOString()
        };
        
        if (this.response && !this.response.destroyed) {
            this.response.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    }

    sendRoundComplete() {
        const data = {
            type: 'round_complete',
            round: this.currentRound,
            timestamp: new Date().toISOString()
        };
        
        if (this.response && !this.response.destroyed) {
            this.response.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    }

    sendSpeakerChange(currentSpeaker) {
        const previousSpeaker = currentSpeaker === 'A' ? 'B' : 'A';
        const data = {
            type: 'speaker_change',
            previousSpeaker: previousSpeaker,
            currentSpeaker: currentSpeaker,
            timestamp: new Date().toISOString()
        };
        
        if (this.response && !this.response.destroyed) {
            this.response.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    }

    sendConversationComplete() {
        const data = {
            type: 'conversation_complete',
            totalRounds: this.currentRound,
            conversationId: this.id,
            timestamp: new Date().toISOString()
        };
        
        if (this.response && !this.response.destroyed) {
            this.response.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    }

    // 通用事件发送
    sendEvent(data) {
        if (this.response && !this.response.destroyed) {
            this.response.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    }

    sendError(message) {
        const data = {
            type: 'error',
            message: message,
            timestamp: new Date().toISOString()
        };
        
        if (this.response && !this.response.destroyed) {
            this.response.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    }

    stop() {
        this.shouldStop = true;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// API路由

// 开始对话
app.post('/api/start-conversation', (req, res) => {
    const { 
        question, 
        firstSpeaker, 
        modelAConfig, 
        modelBConfig, 
        totalRounds 
    } = req.body;
    
    logger.info(`===== 新对话请求: question="${question}", firstSpeaker=${firstSpeaker}, modelA=${modelAConfig?.name}, modelB=${modelBConfig?.name}, rounds=${totalRounds} =====`);

    // 验证输入
    if (!question || !firstSpeaker || !modelAConfig || !modelBConfig) {
        return res.status(400).json({
            error: '缺少必要参数'
        });
    }

    // 创建新对话
    const conversation = new AIConversation({
        question,
        firstSpeaker,
        modelAConfig,
        modelBConfig,
        totalRounds
    });

    // 存储对话
    activeConversations.set(conversation.id, conversation);

    // 开始对话
    conversation.start(res);
});

// 继续对话 — 在已有对话基础上追加更多轮次
app.post('/api/continue-conversation', (req, res) => {
    const { 
        question,
        conversationId: clientConvId,
        currentSpeaker: speaker,
        currentRound: round,
        additionalRounds,
        modelAConfig, 
        modelBConfig,
        history
    } = req.body;

    if (!question || !modelAConfig || !modelBConfig || !history) {
        return res.status(400).json({ error: '缺少必要参数' });
    }

    const nextSpeaker = speaker || 'A';
    const prevRound = round || 0;
    const addRounds = additionalRounds || 10;

    // 创建一个新的AIConversation实例，但恢复之前的状态
    const conversation = new AIConversation({
        question,
        firstSpeaker: nextSpeaker, // 这里设置的值会在构造函数中被赋给currentSpeaker
        modelAConfig,
        modelBConfig,
        totalRounds: prevRound + addRounds // 总轮次 = 之前轮次 + 新增轮次
    });

    // 关键：覆盖构造函数中的默认值，恢复之前的状态
    conversation.currentRound = prevRound;
    conversation.currentSpeaker = nextSpeaker;

    console.log(`继续对话: speaker=${nextSpeaker}, round=${prevRound}, totalRounds=${prevRound + addRounds}, historyLen=${history.length}`);

    // 存储对话
    activeConversations.set(conversation.id, conversation);

    // 继续对话，传入已有历史
    conversation.continueConversation(res, addRounds, history);
});

// 停止对话 — 仅停止指定ID的对话，不影响其他用户
app.post('/api/stop-conversation', (req, res) => {
    const { conversationId } = req.body;
    logger.info(`收到停止对话请求: ${conversationId}`);
    
    if (conversationId && activeConversations.has(conversationId)) {
        const conversation = activeConversations.get(conversationId);
        conversation.stop();
        activeConversations.delete(conversationId);
        logger.info(`对话 ${conversationId} 已停止`);
        return res.json({ success: true });
    }
    
    // 找不到就直接返回成功，不影响其他用户的对话
    logger.info(`对话 ${conversationId} 已结束或不存在，跳过`);
    return res.json({ success: true, message: '对话已结束或不存在' });
});

// 保存对话
app.post('/api/save-conversation', async (req, res) => {
    try {
        const conversationData = req.body;
        
        // 生成文件名（加入短UUID避免并发冲突）
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const shortId = uuidv4().slice(0, 8);
        const filename = `conversation_${timestamp}_${shortId}.json`;
        const filePath = path.join(conversationsDir, filename);
        
        // 保存对话到文件
        await fs.writeFile(filePath, JSON.stringify(conversationData, null, 2));
        
        res.json({ 
            success: true, 
            filename: filename 
        });
    } catch (error) {
        console.error('保存对话失败:', error);
        res.status(500).json({ 
            error: '保存对话失败',
            message: error.message 
        });
    }
});

// 获取对话列表
app.get('/api/conversations', async (req, res) => {
    try {
        const files = await fs.readdir(conversationsDir);
        const conversations = [];
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(conversationsDir, file);
                const stats = await fs.stat(filePath);
                const content = await fs.readJson(filePath);
                
                conversations.push({
                    filename: file,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    ...content
                });
            }
        }
        
        // 按创建时间排序，最新的在前
        conversations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        res.json(conversations);
    } catch (error) {
        console.error('获取对话列表失败:', error);
        res.status(500).json({ error: '获取对话列表失败' });
    }
});

// 获取特定对话内容
app.get('/api/conversations/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const baseDir = path.resolve(conversationsDir);
        const filePath = path.resolve(baseDir, filename);
        
        // 安全检查：解析后必须在对话目录内，防止 path traversal
        if (filePath !== baseDir && !filePath.startsWith(baseDir + path.sep)) {
            return res.status(403).json({ error: '禁止访问' });
        }
        
        const content = await fs.readJson(filePath);
        res.json(content);
    } catch (error) {
        console.error('获取对话内容失败:', error);
        res.status(500).json({ error: '获取对话内容失败' });
    }
});

// 删除对话
app.delete('/api/conversations/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const baseDir = path.resolve(conversationsDir);
        const filePath = path.resolve(baseDir, filename);
        
        // 安全检查：解析后必须在对话目录内，防止 path traversal
        if (filePath !== baseDir && !filePath.startsWith(baseDir + path.sep)) {
            return res.status(403).json({ error: '禁止访问' });
        }
        
        await fs.remove(filePath);
        res.json({ success: true });
    } catch (error) {
        console.error('删除对话失败:', error);
        res.status(500).json({ error: '删除对话失败' });
    }
});

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        activeConversations: activeConversations.size,
        timestamp: new Date().toISOString() 
    });
});

// 测试SSE流
app.get('/api/test-sse', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    
    // 发送测试消息
    setTimeout(() => {
        res.write(`data: ${JSON.stringify({type: 'test', message: 'Hello'})}\n\n`);
    }, 1000);
    
    setTimeout(() => {
        res.write(`data: ${JSON.stringify({type: 'test', message: 'World'})}\n\n`);
    }, 2000);
    
    setTimeout(() => {
        res.write(`data: ${JSON.stringify({type: 'test', message: 'Complete'})}\n\n`);
        res.end();
    }, 3000);
});

// 模型健康检查
app.post('/api/check-model', async (req, res) => {
    try {
        const { url, token, name } = req.body;
        
        if (!url || !token || !name) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数: url, token, name'
            });
        }
        
        // 构建API请求
        const apiUrl = url.endsWith('/') ? url + 'chat/completions' : url + '/chat/completions';
        
        const testResponse = await axios.post(apiUrl, {
            model: name,
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'Reply with just "OK" to confirm you are working.' }
            ],
            stream: false,
            temperature: 0.1,
            max_tokens: 10
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        
        if (testResponse.data && testResponse.data.choices && testResponse.data.choices.length > 0) {
            const responseText = testResponse.data.choices[0].message.content;
            return res.json({
                success: true,
                response: responseText,
                model: name,
                usage: testResponse.data.usage || null,
                timestamp: new Date().toISOString()
            });
        } else {
            return res.status(400).json({
                success: false,
                error: 'API返回格式无效'
            });
        }
        
    } catch (error) {
        let errorMessage = '模型检查失败';
        
        if (error.response) {
            // 服务器返回了错误状态码
            const statusCode = error.response.status;
            const errorData = error.response.data;
            
            if (statusCode === 401) {
                errorMessage = 'API密钥无效或已过期';
            } else if (statusCode === 404) {
                errorMessage = `模型 "${req.body.name}" 不存在或路径错误`;
            } else if (statusCode === 429) {
                errorMessage = 'API请求频率超限，请稍后再试';
            } else if (errorData && errorData.error && errorData.error.message) {
                errorMessage = `API错误: ${errorData.error.message}`;
            } else {
                errorMessage = `服务器错误 (${statusCode}): ${error.statusText}`;
            }
        } else if (error.request) {
            // 请求已发出但没有收到响应
            if (error.code === 'ECONNREFUSED') {
                errorMessage = '无法连接到API服务器，请检查URL';
            } else if (error.code === 'ENOTFOUND') {
                errorMessage = '无法解析API服务器地址';
            } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
                errorMessage = '请求超时，服务器响应太慢';
            } else {
                errorMessage = '网络错误: ' + error.code;
            }
        } else {
            // 其他错误
            errorMessage = error.message || '未知错误';
        }
        
        return res.status(500).json({
            success: false,
            error: errorMessage,
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 裁判模型 C：对当前对话进行评判
app.post('/api/judge', async (req, res) => {
    try {
        const { question, history, judgeConfig, round, auto } = req.body;

        if (!question || !history || !Array.isArray(history)) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数: question 或 history'
            });
        }

        if (!judgeConfig || !judgeConfig.url || !judgeConfig.token || !judgeConfig.name) {
            return res.status(400).json({
                success: false,
                error: '缺少裁判模型配置: url / token / name'
            });
        }

        const { url, token, name } = judgeConfig;

        // 构建简要对话梗概（避免 token 过长，这里按最近 20 条对话截断）
        const recent = history.slice(-20);
        const lines = recent.map((msg, idx) => {
            let speaker;
            if (msg.role === 'A') speaker = '模型 A';
            else if (msg.role === 'B') speaker = '模型 B';
            else if (msg.role === 'user') speaker = '用户/上帝视角';
            else speaker = msg.role;
            return `[#${idx + 1}] ${speaker}: ${msg.content}`;
        });
        const summaryText = lines.join('\n\n');

        const apiUrl = url.endsWith('/') ? url + 'chat/completions' : url + '/chat/completions';

        const messages = [
            {
                role: 'system',
                content: `你是裁判模型 C，一位冷静、公正、略带幽默感的哲学评审。
你需要在阅读「模型 A」与「模型 B」的一段对话后，给出一份「回合判决」：
- 指出本阶段中哪一方在论证、逻辑严密性、攻击有效性上更占上风（可以判「势均力敌」）
- 指出每一方最有力的论点各一条
- 指出双方目前各自最大的漏洞或盲点各一条
- 给出下一阶段双方可以如何升级自己论点的建议
输出风格可以适度使用 emoji（例如 ⚖️🔥🤺😏），增加阅读趣味，但必须保证信息清晰、结构分明。`
            },
            {
                role: 'user',
                content: `讨论的核心议题是：「${question}」

下面是最近一段对话摘要（最多 20 条，从旧到新）：
${summaryText}

请基于上述内容做出本阶段的裁判判决。`
            }
        ];

        const response = await axios.post(apiUrl, {
            model: name,
            messages,
            stream: false,
            temperature: 0.6,
            max_tokens: 800
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 45000
        });

        let content = '';
        if (response.data && response.data.choices && response.data.choices.length > 0) {
            const choice = response.data.choices[0];
            const raw = (choice.message && choice.message.content) ?? choice.text ?? '';
            // 兼容 content 为数组的情况（如多模态 API 返回 [{ type: 'text', text: '...' }]）
            if (typeof raw === 'string') {
                content = raw;
            } else if (Array.isArray(raw)) {
                content = raw.map(p => (typeof p === 'string' ? p : (p && p.text) || '')).join('');
            } else if (raw && typeof raw === 'object') {
                content = raw.text || raw.content || '';
            }
        }

        return res.json({
            success: true,
            content,
            model: name,
            round: round || null,
            auto: !!auto
        });
    } catch (error) {
        logger.error(`裁判模型调用失败: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: '裁判模型调用失败: ' + (error.message || '未知错误')
        });
    }
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
const server = app.listen(PORT, () => {
    logger.info(`AI-Elenchos 服务器运行在端口 ${PORT}`);
    logger.info(`访问 http://localhost:${PORT} 打开前端页面`);
    logger.info(`日志文件: ${logsDir}/`);
});

// 优雅关闭 — 停止所有活动对话并关闭服务器
function gracefulShutdown(signal) {
    logger.info(`收到${signal}信号，正在关闭服务器...`);
    // 停止所有活动对话
    activeConversations.forEach((conv, id) => {
        conv.stop();
    });
    activeConversations.clear();
    server.close(() => {
        logger.info('服务器已关闭');
        process.exit(0);
    });
    // 如果10秒后还没关闭就强制退出
    setTimeout(() => {
        logger.warn('强制关闭服务器');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));