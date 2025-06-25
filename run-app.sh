#!/bin/bash

# 检测系统架构
ARCH=$(uname -m)
echo "检测到系统架构: $ARCH"

# 根据架构选择正确的应用版本
if [ "$ARCH" = "x86_64" ]; then
    APP_PATH="dist/mac/Mac Desktop System.app"
    echo "使用 x86_64 版本"
elif [ "$ARCH" = "arm64" ]; then
    APP_PATH="dist/mac-arm64/Mac Desktop System.app"
    echo "使用 arm64 版本"
else
    echo "未知架构: $ARCH"
    exit 1
fi

# 检查应用是否存在
if [ ! -d "$APP_PATH" ]; then
    echo "错误: 应用不存在于 $APP_PATH"
    echo "请先运行: npm run build:mac-unsigned"
    exit 1
fi

# 运行应用
echo "启动应用..."
open "$APP_PATH" 