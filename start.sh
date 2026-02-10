#!/bin/bash

# AI-Elenchos 启动脚本

echo "======================================"
echo "AI-Elenchos 启动中..."
echo "======================================"

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "错误: Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查后端依赖是否安装
if [ ! -d "backend/node_modules" ]; then
    echo "正在安装后端依赖..."
    cd backend && npm install && cd ..
fi

# 启动后端服务器
echo "正在启动后端服务器..."
cd backend
node server.js &
BACKEND_PID=$!
cd ..

echo ""
echo "======================================"
echo "AI-Elenchos 已启动!"
echo "======================================"
echo ""
echo "后端服务器运行在: http://localhost:3000"
echo "前端页面请打开: frontend/index.html"
ecda yu
echo "使用方法："
echo "1. 在浏览器中打开 frontend/index.html"
echo "2. 配置两个AI模型的API信息"
echo "3. 输入要讨论的问题"
echo "4. 点击'开始对话'按钮"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

# 等待用户中断
trap "echo '正在停止服务器...'; kill $BACKEND_PID; exit 0" INT
wait $BACKEND_PID