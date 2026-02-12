# 多用户/多线程并发审计报告

## 审计范围

- 后端：`backend/server.js` 中与会话生命周期、并发、存储、日志相关的逻辑。
- 前端：`frontend/script.js` 中与会话 id、停止、继续、双请求相关的逻辑。

## 结论摘要

- **多用户隔离**：按会话 UUID 隔离，无跨用户串会话问题。
- **停止/继续/保存**：只操作当前会话 id，无误杀/误覆盖。
- **已修复**：对话目录读写使用 `path.resolve` 做路径校验，防止 path traversal。

---

## 后端

### 1. 会话隔离（多用户）

- `AIConversation` 构造时 `this.id = uuidv4()`，每个会话唯一。
- `activeConversations` 以 `conversation.id` 为 key，不同用户/请求对应不同 id，不会互相覆盖或串线。

### 2. 停止对话

- `POST /api/stop-conversation` 仅根据 body 中的 `conversationId` 查找并停止对应会话。
- 只对目标 id 调用 `conversation.stop()` 并从 `activeConversations` 删除，不会影响其他用户的会话。

### 3. 继续对话

- 每次继续都会 `new AIConversation(...)`，生成新的 `id`。
- 新会话以新 id 加入 `activeConversations`，并在流式响应中通过 `conversation_start.conversationId` 下发给前端。
- 前端用该 id 更新本地 `conversationId`，后续停止/保存都针对当前会话，逻辑正确。

### 4. 对话完成与内存

- 在 `sendConversationComplete` 中会从 `activeConversations` 中 `delete(this.id)`，避免会话完成后长期占用内存。

### 5. 保存对话

- 文件名使用 `时间戳 + 短 UUID`，多用户同时保存不会互相覆盖。

### 6. 日志

- 使用 `fs.appendFile` 异步写日志，不阻塞事件循环；多请求并发写同一文件由 OS 处理，单行写入可视为原子。

### 7. 路径遍历（已修复）

- **问题**：`/api/conversations/:filename` 的 GET/DELETE 原先用 `path.join` + `startsWith(conversationsDir)` 校验。在 `filename` 含 `..` 时，拼接结果仍可能通过 `startsWith`，存在路径穿越风险。
- **修复**：改为 `path.resolve(conversationsDir, filename)` 得到绝对路径，再判断解析后的路径是否等于或在 `path.resolve(conversationsDir)` 之下（使用 `path.sep`），否则返回 403。

---

## 前端

### 1. 单页单会话

- 单页内仅维护一个 `conversationId`，来自后端（start 的响应或 continue 的 `conversation_start`）。
- 停止、继续、保存均使用该 id，不会误操作其他会话。

### 2. 防重复提交

- 开始对话：点击后 `isConversing = true`，`startBtn.disabled = true`，无法重复点击开始。
- 继续对话：同样受 `isConversing` 与 `conversationHistory.length` 控制，继续中按钮禁用。

### 3. 清空与轮次

- 清空对话后，前端会重置轮次显示与默认 `totalRounds`（如 10 轮），与「开始对话」行为一致。

---

## 建议（可选）

- 若将来支持多标签页或多端同时操作同一用户，可考虑在后端用「用户 id + 会话 id」做更细粒度校验，或为会话增加 TTL 自动回收。
- 当前设计下，多用户、多会话并发无逻辑 bug；path traversal 已通过解析路径严格限制在对话目录内。
