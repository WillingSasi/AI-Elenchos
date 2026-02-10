@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

echo ======================================
echo AI-Elenchos 启动中...
echo ======================================

REM 检查Node.js是否安装
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: Node.js 未安装，请先安装 Node.js
    pause
    exit /b 1
)

REM 检查后端依赖是否安装
if not exist "backend\node_modules" (
    echo 正在安装后端依赖...
    cd backend
    npm install
    cd ..
)

REM 启动后端服务器
echo 正在启动后端服务器...
cd backend
start "AI-Elenchos Backend" node server.js
cd ..

echo.
echo ======================================
echo AI-Elenchos 已启动!
echo ======================================
echo.
echo 后端服务器运行在: http://localhost:3000
echo 前端页面请打开: frontend\index.html
echo.
echo 使用方法：
echo 1. 在浏览器中打开 frontend\index.html
echo 2. 配置两个AI模型的API信息
echo 3. 输入要讨论的问题
echo 4. 点击'开始对话'按钮
echo.
echo 按任意键关闭此窗口...
pause > nul