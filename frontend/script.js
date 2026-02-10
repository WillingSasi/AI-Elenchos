// ===== i18n 国际化系统 =====
let currentLang = localStorage.getItem('aiElenchosLang') || 'zh';

const i18nDict = {
    zh: {
        // 页面结构
        siteTitle: 'AI思想杂交实验室',
        siteSubtitle: '"未经审视的思想不值得持有。" — 改编自苏格拉底',
        footer: '© 2024 AI-Elenchos | 让AI进行苏格拉底式的对话，以进化思想',
        footerGithub: 'GitHub 开源地址',
        // 输入 & 按钮
        inputPlaceholder: '请输入要讨论的问题...',
        startBtn: '开始对话',
        continueBtn: '继续10轮',
        stopBtn: '停止对话',
        saveBtn: '保存对话',
        clearBtn: '清空对话',
        scrollTopBtn: '返回顶部',
        downloadBtn: '下载对话',
        msgNoDownload: '没有对话内容可下载',
        testConnBtn: '测试连接',
        testingBtn: '测试中...',
        // 轮次
        roundPrefix: '第 ',
        roundSuffix: ' 轮对话',
        // 模型配置
        modelATitle: '模型 A',
        modelBTitle: '模型 B',
        modelNameLabel: '模型名称:',
        // 状态
        statusReady: '就绪',
        statusThinking: '思考中...',
        statusError: '错误',
        statusUnknown: '未知状态',
        // 加载
        loadingText: 'AI正在思考中...',
        // 欢迎
        welcomeTitle: '欢迎使用 AI-Elenchos！',
        welcomeDesc: '配置两个AI模型的API信息，输入问题后点击"开始对话"按钮，让AI们互相讨论。',
        welcomeFeatureLabel: '特色功能：',
        welcomeFeatureDesc: '模型会基于您的问题自主提问并展开对话，无需人类干预！',
        // 消息 & 提示
        msgInputRequired: '请输入要讨论的问题',
        msgConvComplete: '对话已完成！',
        msgConvStopped: '对话已停止',
        msgConvCleared: '对话已清空',
        msgNoContent: '没有对话内容可保存',
        msgSaved: '对话已保存: ',
        msgSavedLocal: '对话已保存到本地',
        msgSaveFailed: '保存对话失败',
        msgStreamError: '对话过程中发生错误: ',
        msgStartFailed: '开始对话失败: ',
        msgContinueError: '继续对话过程中发生错误: ',
        msgContinueFailed: '继续对话失败: ',
        msgModelConfigA: '请完善模型A的配置',
        msgModelConfigB: '请完善模型B的配置',
        msgModelConfig: '请完善模型{0}的配置',
        msgModelSuccess: '模型{0}连接成功: ',
        msgModelFail: '模型{0}连接失败: ',
        msgModelCheckFail: '模型{0}检查失败: ',
        confirmStop: '对话正在进行中，当前第{0}轮。确定要提前停止对话吗？',
        confirmClear: '确定要清空当前对话吗？',
        // 聊天气泡
        userLabel: '用户',
        modelLabel: '模型{0} · {1}',
        modelFallbackA: '模型 A',
        modelFallbackB: '模型 B',
        waitingReply: '(等待回复...)',
        noValidContent: '(模型{0}未返回有效内容)',
    },
    en: {
        siteTitle: 'AI Thought Hybridization Lab',
        siteSubtitle: '"The unexamined idea is not worth holding." — Adapted from Socrates',
        footer: '© 2024 AI-Elenchos | Where AI Engages in Socratic Dialogue to Evolve Ideas',
        footerGithub: 'Open Source on GitHub',
        inputPlaceholder: 'Enter a topic for discussion...',
        startBtn: 'Start',
        continueBtn: '+10 Rounds',
        stopBtn: 'Stop',
        saveBtn: 'Save',
        clearBtn: 'Clear',
        scrollTopBtn: 'Top',
        downloadBtn: 'Download',
        msgNoDownload: 'No conversation to download',
        testConnBtn: 'Test',
        testingBtn: 'Testing...',
        roundPrefix: 'Round ',
        roundSuffix: '',
        modelATitle: 'Model A',
        modelBTitle: 'Model B',
        modelNameLabel: 'Model Name:',
        statusReady: 'Ready',
        statusThinking: 'Thinking...',
        statusError: 'Error',
        statusUnknown: 'Unknown',
        loadingText: 'AI is thinking...',
        welcomeTitle: 'Welcome to AI-Elenchos!',
        welcomeDesc: 'Configure two AI models, enter a topic, and click "Start" to let them debate.',
        welcomeFeatureLabel: 'Key Feature: ',
        welcomeFeatureDesc: 'Models autonomously pose questions and explore ideas — no human intervention needed!',
        msgInputRequired: 'Please enter a topic for discussion',
        msgConvComplete: 'Conversation complete!',
        msgConvStopped: 'Conversation stopped',
        msgConvCleared: 'Conversation cleared',
        msgNoContent: 'No conversation to save',
        msgSaved: 'Saved: ',
        msgSavedLocal: 'Saved to local storage',
        msgSaveFailed: 'Failed to save',
        msgStreamError: 'Error during conversation: ',
        msgStartFailed: 'Failed to start: ',
        msgContinueError: 'Error continuing conversation: ',
        msgContinueFailed: 'Failed to continue: ',
        msgModelConfigA: 'Please complete Model A configuration',
        msgModelConfigB: 'Please complete Model B configuration',
        msgModelConfig: 'Please complete Model {0} config',
        msgModelSuccess: 'Model {0} connected: ',
        msgModelFail: 'Model {0} failed: ',
        msgModelCheckFail: 'Model {0} check failed: ',
        confirmStop: 'Conversation in progress (round {0}). Stop now?',
        confirmClear: 'Clear current conversation?',
        userLabel: 'User',
        modelLabel: 'Model {0} · {1}',
        modelFallbackA: 'Model A',
        modelFallbackB: 'Model B',
        waitingReply: '(Awaiting response...)',
        noValidContent: '(Model {0} returned no content)',
    }
};

// i18n 工具函数
function t(key, ...args) {
    let text = (i18nDict[currentLang] && i18nDict[currentLang][key]) || (i18nDict['zh'][key]) || key;
    args.forEach((arg, i) => {
        text = text.replace(`{${i}}`, arg);
    });
    return text;
}

// 应用 i18n 到所有带 data-i18n 属性的静态 DOM 元素
function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18nDict[currentLang][key] !== undefined) {
            el.textContent = i18nDict[currentLang][key];
        }
    });
    // placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (i18nDict[currentLang][key] !== undefined) {
            el.placeholder = i18nDict[currentLang][key];
        }
    });
    // title 属性（悬浮按钮 tooltip）
    document.querySelectorAll('.fab-btn').forEach(btn => {
        const label = btn.querySelector('.fab-label');
        if (label) {
            btn.title = label.textContent;
        }
    });
    // 更新页面 <title>
    document.title = 'AI-Elenchos | ' + t('siteTitle');
    // 更新 html lang
    document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
}

// 切换语言
function toggleLanguage() {
    currentLang = currentLang === 'zh' ? 'en' : 'zh';
    localStorage.setItem('aiElenchosLang', currentLang);
    // 更新切换按钮上的标签
    document.getElementById('langLabel').textContent = currentLang === 'zh' ? 'EN' : '中';
    applyI18n();
}

// 全局变量
let conversationHistory = [];
let currentRound = 0;
let totalRounds = 10;
let isConversing = false;
let currentSpeaker = null;
let conversationId = null;
let shouldStop = false;
let currentPartialMessage = null;
let currentStreamingEl = null;
let currentStreamingRole = null;

// API 基地址：自动适配本地开发和远程服务器部署
const API_BASE = window.location.origin.includes('file://') 
    ? 'http://localhost:3000'  // 本地直接打开 HTML 文件时回退到 localhost
    : window.location.origin;  // 部署到服务器时使用当前域名

// DOM元素
const userQuestion = document.getElementById('userQuestion');
const startBtn = document.getElementById('startBtn');
const continueBtn = document.getElementById('continueBtn');
const stopBtn = document.getElementById('stopBtn');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');
const conversationHistoryEl = document.getElementById('conversationHistory');
const pinnedQuestionEl = document.getElementById('pinnedQuestion');
const currentRoundEl = document.getElementById('currentRound');
const totalRoundsEl = document.getElementById('totalRounds');
const loadingOverlay = document.getElementById('loadingOverlay');

// 模型A的DOM元素
const modelAUrl = document.getElementById('modelAUrl');
const modelAToken = document.getElementById('modelAToken');
const modelAName = document.getElementById('modelAName');
const modelAStatus = document.getElementById('modelAStatus');
const modelAStatusText = document.getElementById('modelAStatusText');
const checkModelA = document.getElementById('checkModelA');

// 模型B的DOM元素
const modelBUrl = document.getElementById('modelBUrl');
const modelBToken = document.getElementById('modelBToken');
const modelBName = document.getElementById('modelBName');
const modelBStatus = document.getElementById('modelBStatus');
const modelBStatusText = document.getElementById('modelBStatusText');
const checkModelB = document.getElementById('checkModelB');

// 悬浮侧边栏DOM元素
const fabContinue = document.getElementById('fabContinue');
const fabStop = document.getElementById('fabStop');
const fabSave = document.getElementById('fabSave');
const fabClear = document.getElementById('fabClear');
const fabDownload = document.getElementById('fabDownload');
const fabScrollTop = document.getElementById('fabScrollTop');

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化 i18n
    document.getElementById('langLabel').textContent = currentLang === 'zh' ? 'EN' : '中';
    applyI18n();
    
    // 加载本地存储的配置
    loadConfigFromStorage();
    
    // 绑定事件监听器
    bindEventListeners();
    
    // 初始化UI
    updateUI();
    
    // 尝试加载上一次的对话
    loadLastConversation();
});

// 绑定事件监听器
function bindEventListeners() {
    startBtn.addEventListener('click', startConversation);
    continueBtn.addEventListener('click', continueConversation);
    stopBtn.addEventListener('click', stopConversation);
    saveBtn.addEventListener('click', saveConversation);
    clearBtn.addEventListener('click', clearConversation);
    
    // 模型健康检查按钮
    checkModelA.addEventListener('click', () => checkModelHealth('A'));
    checkModelB.addEventListener('click', () => checkModelHealth('B'));
    
    // 输入框变化时保存到本地存储
    [modelAUrl, modelAToken, modelAName, modelBUrl, modelBToken, modelBName].forEach(input => {
        input.addEventListener('change', saveConfigToStorage);
    });
    
    // 回车键开始对话
    userQuestion.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            if (!isConversing) {
                startConversation();
            }
        }
    });
    
    // 悬浮侧边栏按钮 — 复用已有的功能函数
    fabContinue.addEventListener('click', continueConversation);
    fabStop.addEventListener('click', stopConversation);
    fabSave.addEventListener('click', saveConversation);
    fabClear.addEventListener('click', clearConversation);
    fabDownload.addEventListener('click', downloadConversation);
    fabScrollTop.addEventListener('click', scrollToTop);
    
    // 监听页面滚动，控制"返回顶部"按钮的显示/隐藏
    window.addEventListener('scroll', onWindowScroll);
    
    // 语言切换按钮
    document.getElementById('langToggleBtn').addEventListener('click', toggleLanguage);
}

// 页面滚动事件：显示/隐藏返回顶部按钮
function onWindowScroll() {
    if (window.scrollY > 400) {
        fabScrollTop.classList.add('visible');
    } else {
        fabScrollTop.classList.remove('visible');
    }
}

// 平滑滚动到页面顶部
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 同步悬浮按钮与顶部控制按钮的 disabled 状态
function syncFabState() {
    fabContinue.disabled = continueBtn.disabled;
    fabStop.disabled = stopBtn.disabled;
    // save 和 clear 跟随是否有对话记录
    fabSave.disabled = conversationHistory.length === 0;
    fabClear.disabled = conversationHistory.length === 0;
    fabDownload.disabled = conversationHistory.length === 0;
}

// 从本地存储加载配置
function loadConfigFromStorage() {
    try {
        const config = JSON.parse(localStorage.getItem('aiDialogueConfig') || '{}');
        
        if (config.modelAUrl) modelAUrl.value = config.modelAUrl;
        if (config.modelAToken) modelAToken.value = config.modelAToken;
        if (config.modelAName) modelAName.value = config.modelAName;
        
        if (config.modelBUrl) modelBUrl.value = config.modelBUrl;
        if (config.modelBToken) modelBToken.value = config.modelBToken;
        if (config.modelBName) modelBName.value = config.modelBName;
    } catch (error) {
        console.error('加载配置失败:', error);
    }
}

// 保存配置到本地存储
function saveConfigToStorage() {
    try {
        const config = {
            modelAUrl: modelAUrl.value,
            modelAToken: modelAToken.value,
            modelAName: modelAName.value,
            modelBUrl: modelBUrl.value,
            modelBToken: modelBToken.value,
            modelBName: modelBName.value
        };
        localStorage.setItem('aiDialogueConfig', JSON.stringify(config));
    } catch (error) {
        console.error('保存配置失败:', error);
    }
}

// 开始对话
async function startConversation() {
    const question = userQuestion.value.trim();
    if (!question) {
        showMessage(t('msgInputRequired'), 'warning');
        return;
    }
    
    if (!validateModelConfig()) {
        return;
    }
    
    // 重置对话状态
    conversationHistory = [];
    currentRound = 0;
    isConversing = true;
    currentPartialMessage = null;
    currentStreamingEl = null;
    currentStreamingRole = null;
    conversationId = generateConversationId();
    
    // 随机选择第一个发言者
    currentSpeaker = Math.random() < 0.5 ? 'A' : 'B';
    
    // 添加用户问题到对话历史
    conversationHistory.push({
        role: 'user',
        content: question,
        timestamp: new Date().toISOString()
    });
    
    // 更新UI
    updateUI();
    clearConversationHistory();
    addMessage('user', question);
    
    // 显示加载状态
    showLoading();
    updateModelStatus(currentSpeaker, 'thinking');
    
    try {
        console.log('开始对话，发送请求...');
        // 调用后端API开始对话
        const response = await fetch(`${API_BASE}/api/start-conversation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question: question,
                firstSpeaker: currentSpeaker,
                modelAConfig: {
                    url: modelAUrl.value,
                    token: modelAToken.value,
                    name: modelAName.value
                },
                modelBConfig: {
                    url: modelBUrl.value,
                    token: modelBToken.value,
                    name: modelBName.value
                },
                totalRounds: totalRounds
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        console.log('收到响应，开始处理流...');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        // 处理流式响应
        let buffer = '';
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                console.log('收到数据块:', chunk);
                
                buffer += chunk;
                
                // 处理每个数据行
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // 保留不完整的行
                
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            if (line.startsWith('data: ')) {
                                const jsonStr = line.substring(6).trim();
                                if (jsonStr) {
                                    console.log('解析JSON:', jsonStr);
                                    const data = JSON.parse(jsonStr);
                                    console.log('解析成功:', data);
                                    handleStreamData(data);
                                }
                            }
                        } catch (e) {
                            console.error('解析数据失败:', e, '原始数据:', line);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('流处理错误:', error);
            showMessage(t('msgStreamError') + error.message, 'error');
        }
        
    } catch (error) {
        console.error('开始对话失败:', error);
        showMessage(t('msgStartFailed') + error.message, 'error');
        updateModelStatus(currentSpeaker, 'error');
        isConversing = false;
        updateUI();
    } finally {
        hideLoading();
    }
}

// 将未完成的部分消息保存到历史记录（兜底机制）
function finalizePartialMessage() {
    if (currentPartialMessage) {
        // 检查是否已经在历史记录中（避免重复）
        const lastInHistory = conversationHistory[conversationHistory.length - 1];
        if (!lastInHistory || lastInHistory.role !== currentPartialMessage.role || 
            lastInHistory.content !== currentPartialMessage.content) {
            conversationHistory.push({ ...currentPartialMessage });
        }
        currentPartialMessage = null;
    }
}

// 处理流式数据
// 后端事件流顺序（每一轮）：
//   speaker_change → 多次 message_partial → message_complete → round_complete
//   （然后下一轮的 speaker_change ...）
// 最终：conversation_complete
function handleStreamData(data) {
    switch (data.type) {
        case 'message_partial':
            // 流式输出的中间片段，逐步更新气泡内容
            if (data.role && data.content) {
                addMessage(data.role, data.content, true);
                
                // 持续追踪当前部分消息的最新内容（用于兜底保存）
                currentPartialMessage = {
                    role: data.role,
                    content: data.content,
                    timestamp: new Date().toISOString()
                };
                
                // 自动关闭loading
                if (loadingOverlay.classList.contains('hidden') === false) {
                    hideLoading();
                }
            }
            break;
            
        case 'message_complete':
            // 一轮AI输出的最终完整内容
            if (data.role) {
                const finalContent = data.content || t('noValidContent', data.role);
                // 用最终内容更新气泡（isPartial=false会关闭打字动画）
                addMessage(data.role, finalContent, false);
                
                // 保存到前端对话历史
                conversationHistory.push({
                    role: data.role,
                    content: finalContent,
                    timestamp: new Date().toISOString()
                });
                
                // 清除partial追踪（已有完整版本）
                currentPartialMessage = null;
                // 重置流式DOM跟踪，为下一轮做准备
                currentStreamingEl = null;
                currentStreamingRole = null;
            }
            break;
            
        case 'round_complete':
            currentRound = data.round;
            updateUI();
            break;
            
        case 'speaker_change':
            // 新一轮开始前的说话者切换
            // 兜底：如果之前的partial没被message_complete覆盖，保存它
            finalizePartialMessage();
            currentStreamingEl = null;
            currentStreamingRole = null;
            updateModelStatus(data.previousSpeaker, 'ready');
            updateModelStatus(data.currentSpeaker, 'thinking');
            currentSpeaker = data.currentSpeaker;
            break;
            
        case 'conversation_complete':
            // 所有轮次结束
            finalizePartialMessage();
            currentStreamingEl = null;
            currentStreamingRole = null;
            isConversing = false;
            updateModelStatus('A', 'ready');
            updateModelStatus('B', 'ready');
            updateUI();
            showMessage(t('msgConvComplete'), 'success');
            break;
            
        case 'error':
            finalizePartialMessage();
            currentStreamingEl = null;
            currentStreamingRole = null;
            showMessage(data.message || 'Error', 'error');
            updateModelStatus(data.model || currentSpeaker, 'error');
            isConversing = false;
            updateUI();
            hideLoading();
            break;
    }
}

// 继续对话 — 基于已有对话历史继续追加10轮
async function continueConversation() {
    if (isConversing || conversationHistory.length === 0) {
        return;
    }
    
    if (!validateModelConfig()) {
        return;
    }
    
    const additionalRounds = 10;
    totalRounds += additionalRounds;
    isConversing = true;
    currentPartialMessage = null;
    currentStreamingEl = null;
    currentStreamingRole = null;
    
    // 确定下一个发言者：上一条消息是谁说的，下一轮就换人
    const lastMsg = conversationHistory[conversationHistory.length - 1];
    if (lastMsg && (lastMsg.role === 'A' || lastMsg.role === 'B')) {
        currentSpeaker = lastMsg.role === 'A' ? 'B' : 'A';
    }
    
    updateUI();
    showLoading();
    updateModelStatus(currentSpeaker, 'thinking');
    
    try {
        console.log('继续对话，发送请求...');
        const response = await fetch(`${API_BASE}/api/continue-conversation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question: userQuestion.value.trim(),
                conversationId: conversationId,
                currentSpeaker: currentSpeaker,
                currentRound: currentRound,
                additionalRounds: additionalRounds,
                modelAConfig: {
                    url: modelAUrl.value,
                    token: modelAToken.value,
                    name: modelAName.value
                },
                modelBConfig: {
                    url: modelBUrl.value,
                    token: modelBToken.value,
                    name: modelBName.value
                },
                history: conversationHistory
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        console.log('继续对话收到响应，开始处理流...');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            if (line.startsWith('data: ')) {
                                const jsonStr = line.substring(6).trim();
                                if (jsonStr) {
                                    const data = JSON.parse(jsonStr);
                                    handleStreamData(data);
                                }
                            }
                        } catch (e) {
                            console.error('解析数据失败:', e, '原始数据:', line);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('流处理错误:', error);
            showMessage(t('msgContinueError') + error.message, 'error');
        }
        
    } catch (error) {
        console.error('继续对话失败:', error);
        showMessage(t('msgContinueFailed') + error.message, 'error');
        updateModelStatus(currentSpeaker, 'error');
        isConversing = false;
        updateUI();
    } finally {
        hideLoading();
    }
}

// 停止对话
function stopConversation() {
    if (isConversing) {
        // 确认是否要停止对话
        if (currentRound < 10) {
            if (!confirm(t('confirmStop', currentRound))) {
                return;
            }
        }
        
        isConversing = false;
        shouldStop = true; // 设置后端停止标志
        updateModelStatus(currentSpeaker, 'ready');
        updateUI();
        showMessage(t('msgConvStopped'), 'info');
        
        // 调用后端API停止对话
        fetch(`${API_BASE}/api/stop-conversation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                conversationId: conversationId
            })
        }).catch(error => {
            console.error('停止对话失败:', error);
        });
    }
}

// 保存对话
function saveConversation() {
    if (conversationHistory.length === 0) {
        showMessage(t('msgNoContent'), 'warning');
        return;
    }
    
    try {
        // 保存前兜底：确保最后一条部分消息也被保存
        finalizePartialMessage();
        
        const conversationData = {
            id: conversationId,
            question: userQuestion.value.trim(),
            timestamp: new Date().toISOString(),
            totalRounds: totalRounds,
            currentRound: currentRound,
            history: conversationHistory,
            modelAConfig: {
                name: modelAName.value
            },
            modelBConfig: {
                name: modelBName.value
            }
        };
        
        // 保存到本地存储
        const conversations = JSON.parse(localStorage.getItem('aiConversations') || '[]');
        conversations.push(conversationData);
        localStorage.setItem('aiConversations', JSON.stringify(conversations));
        
        // 保存到文件（需要后端支持）
        fetch(`${API_BASE}/api/save-conversation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(conversationData)
        })
        .then(response => response.json())
        .then(data => {
            showMessage(t('msgSaved') + data.filename, 'success');
        })
        .catch(error => {
            console.error('保存对话到文件失败:', error);
            showMessage(t('msgSavedLocal'), 'success');
        });
        
    } catch (error) {
        console.error('保存对话失败:', error);
        showMessage(t('msgSaveFailed'), 'error');
    }
}

// 清空对话
function clearConversation() {
    if (conversationHistory.length > 0 && !isConversing) {
        if (confirm(t('confirmClear'))) {
            conversationHistory = [];
            currentRound = 0;
            conversationId = null;
            clearConversationHistory();
            updateUI();
            showMessage(t('msgConvCleared'), 'info');
        }
    }
}

// 下载对话为 JSON 文件（纯浏览器端，不经过后端）
function downloadConversation() {
    if (conversationHistory.length === 0) {
        showMessage(t('msgNoDownload'), 'warning');
        return;
    }
    
    // 兜底保存未完成的部分消息
    finalizePartialMessage();
    
    const data = {
        id: conversationId,
        question: userQuestion.value.trim(),
        exportTime: new Date().toISOString(),
        totalRounds: totalRounds,
        currentRound: currentRound,
        modelA: modelAName.value || 'Model A',
        modelB: modelBName.value || 'Model B',
        history: conversationHistory
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI-Elenchos_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 加载上一次的对话
function loadLastConversation() {
    try {
        const conversations = JSON.parse(localStorage.getItem('aiConversations') || '[]');
        if (conversations.length > 0) {
            const lastConversation = conversations[conversations.length - 1];
            // 这里可以选择性地显示加载上次对话的选项
            console.log('上次对话:', lastConversation);
        }
    } catch (error) {
        console.error('加载对话失败:', error);
    }
}

// 验证模型配置
function validateModelConfig() {
    if (!modelAUrl.value.trim() || !modelAToken.value.trim() || !modelAName.value.trim()) {
        showMessage(t('msgModelConfigA'), 'warning');
        return false;
    }
    
    if (!modelBUrl.value.trim() || !modelBToken.value.trim() || !modelBName.value.trim()) {
        showMessage(t('msgModelConfigB'), 'warning');
        return false;
    }
    
    return true;
}

// 更新UI状态
function updateUI() {
    currentRoundEl.textContent = currentRound;
    totalRoundsEl.textContent = totalRounds;
    
    startBtn.disabled = isConversing;
    continueBtn.disabled = isConversing || conversationHistory.length === 0;
    
    // 允许随时停止对话，但给出提示
    stopBtn.disabled = !isConversing;
    
    userQuestion.disabled = isConversing;
    
    // 同步悬浮侧边栏按钮状态
    syncFabState();
}

// 更新模型状态
function updateModelStatus(model, status) {
    let statusEl, statusTextEl;
    
    if (model === 'A') {
        statusEl = modelAStatus;
        statusTextEl = modelAStatusText;
    } else if (model === 'B') {
        statusEl = modelBStatus;
        statusTextEl = modelBStatusText;
    } else {
        return;
    }
    
    // 移除所有状态类
    statusEl.className = 'status-indicator';
    
    switch (status) {
        case 'ready':
            statusEl.classList.add('ready');
            statusTextEl.textContent = t('statusReady');
            break;
        case 'thinking':
            statusEl.classList.add('thinking');
            statusTextEl.textContent = t('statusThinking');
            break;
        case 'error':
            statusEl.classList.add('error');
            statusTextEl.textContent = t('statusError');
            break;
        default:
            statusTextEl.textContent = t('statusUnknown');
    }
}

// 清空对话历史显示
function clearConversationHistory() {
    conversationHistoryEl.innerHTML = '';
    // 隐藏置顶问题栏
    if (pinnedQuestionEl) {
        pinnedQuestionEl.classList.add('hidden');
        pinnedQuestionEl.innerHTML = '';
    }
}

// 添加消息到对话历史
// 核心改进：使用显式变量跟踪当前流式输出的DOM元素，
// 不再通过搜索DOM匹配最后一个同角色wrapper（该方式在消息丢失时会导致覆盖）
function addMessage(role, content, isPartial = false) {
    // 将换行符转换为HTML换行标签，确保内容正确换行显示
    // 同时处理连续换行（段落间隔）
    const formattedContent = (content || '').replace(/\n/g, '<br>');
    
    if (role === 'user') {
        // 用户问题仅显示在置顶栏，不在对话流中重复
        if (pinnedQuestionEl) {
            pinnedQuestionEl.innerHTML = `
                <div class="pinned-icon">💬</div>
                <div class="pinned-text">「${formattedContent}」</div>
            `;
            pinnedQuestionEl.classList.remove('hidden');
        }
        return; // 不在对话流中插入用户消息
    } else {
        // 模型消息：CSS类名必须用小写
        const roleLower = role.toLowerCase();
        
        // 情况1：正在流式输出且角色匹配 → 更新现有元素
        if (currentStreamingRole === role && currentStreamingEl) {
            const contentEl = currentStreamingEl.querySelector('.message-content');
            if (contentEl) {
                contentEl.innerHTML = formattedContent;
                if (!isPartial) {
                    // 最终消息，移除打字动画
                    contentEl.classList.remove('typing-indicator');
                }
            }
            if (!isPartial) {
                // 消息已完成，重置流式跟踪
                currentStreamingEl = null;
                currentStreamingRole = null;
            }
        } else {
            // 情况2：新的发言者或首次消息 → 创建新的消息元素
            // 先重置可能残留的流式状态
            currentStreamingEl = null;
            currentStreamingRole = null;
            
            const messageWrapper = document.createElement('div');
            messageWrapper.className = `message-wrapper model-${roleLower}-wrapper`;
            
            const messageEl = document.createElement('div');
            messageEl.className = `message model-${roleLower}`;
            
            const timestamp = new Date().toLocaleTimeString();
            
            const modelDisplayName = role === 'A' ? (modelAName.value || t('modelFallbackA')) : (modelBName.value || t('modelFallbackB'));
            messageEl.innerHTML = `
                <div class="message-header">
                    <span>${t('modelLabel', role, modelDisplayName)}</span>
                    <span>${timestamp}</span>
                </div>
                <div class="message-content ${isPartial ? 'typing-indicator' : ''}">
                    ${formattedContent || t('waitingReply')}
                </div>
            `;
            
            messageWrapper.appendChild(messageEl);
            
            // 添加头像
            const avatar = document.createElement('div');
            avatar.className = `speaker-avatar model-${roleLower}`;
            avatar.textContent = role;
            messageWrapper.appendChild(avatar);
            
            conversationHistoryEl.appendChild(messageWrapper);
            
            // 如果是流式消息，记录当前流式输出的元素
            if (isPartial) {
                currentStreamingEl = messageEl;
                currentStreamingRole = role;
            }
        }
    }
    
    // 滚动容器是 .conversation-section（而非 conversationHistoryEl 自身）
    const scrollContainer = conversationHistoryEl.closest('.conversation-section');
    if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
}

// 显示加载遮罩
function showLoading() {
    loadingOverlay.classList.remove('hidden');
}

// 隐藏加载遮罩
function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

// 显示消息提示
function showMessage(message, type = 'info') {
    // 创建消息元素
    const messageEl = document.createElement('div');
    messageEl.className = `toast ${type}`;
    messageEl.textContent = message;
    
    // 添加样式
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 5px;
        color: white;
        font-weight: 500;
        z-index: 1001;
        transform: translateX(0);
        transition: transform 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    // 根据类型设置背景色
    switch (type) {
        case 'success':
            messageEl.style.backgroundColor = '#2ecc71';
            break;
        case 'error':
            messageEl.style.backgroundColor = '#e74c3c';
            break;
        case 'warning':
            messageEl.style.backgroundColor = '#f39c12';
            break;
        case 'info':
        default:
            messageEl.style.backgroundColor = '#3498db';
            break;
    }
    
    document.body.appendChild(messageEl);
    
    // 3秒后自动消失
    setTimeout(() => {
        messageEl.style.transform = 'translateX(120%)';
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 300);
    }, 3000);
}

// 检查模型健康状态
async function checkModelHealth(model) {
    let url, token, name, checkBtn, statusEl, statusTextEl;
    
    if (model === 'A') {
        url = modelAUrl.value.trim();
        token = modelAToken.value.trim();
        name = modelAName.value.trim();
        checkBtn = checkModelA;
        statusEl = modelAStatus;
        statusTextEl = modelAStatusText;
    } else if (model === 'B') {
        url = modelBUrl.value.trim();
        token = modelBToken.value.trim();
        name = modelBName.value.trim();
        checkBtn = checkModelB;
        statusEl = modelBStatus;
        statusTextEl = modelBStatusText;
    } else {
        return;
    }
    
    if (!url || !token || !name) {
        showMessage(t('msgModelConfig', model), 'warning');
        return;
    }
    
    // 更新按钮状态
    checkBtn.disabled = true;
    checkBtn.textContent = t('testingBtn');
    updateModelStatus(model, 'thinking');
    
    try {
        const response = await fetch(`${API_BASE}/api/check-model`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: url,
                token: token,
                name: name
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateModelStatus(model, 'ready');
            showMessage(t('msgModelSuccess', model) + data.response, 'success');
            
            // 可以显示额外信息如token使用量
            if (data.usage) {
                console.log(`模型${model}使用情况:`, data.usage);
            }
        } else {
            updateModelStatus(model, 'error');
            showMessage(t('msgModelFail', model) + data.error, 'error');
        }
    } catch (error) {
        updateModelStatus(model, 'error');
        showMessage(t('msgModelCheckFail', model) + error.message, 'error');
    } finally {
        // 恢复按钮状态
        checkBtn.disabled = false;
        checkBtn.textContent = t('testConnBtn');
    }
}

// 生成对话ID
function generateConversationId() {
    return 'conv_' + new Date().getTime() + '_' + Math.random().toString(36).substr(2, 9);
}