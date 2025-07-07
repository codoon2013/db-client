# MySQL Client 打包指南

## 环境准备

### 1. 安装依赖
```bash
npm install
```

### 2. 创建资源文件夹
```bash
mkdir -p assets
```

### 3. 准备图标文件
在 `assets/` 文件夹中放置以下图标文件：
- `icon.icns` - macOS 图标 (512x512)
- `icon.ico` - Windows 图标 (256x256)
- `icon.png` - Linux 图标 (512x512)
- `dmg-background.png` - DMG 背景图片 (540x380)

## 打包命令

### macOS 打包

#### 开发测试打包（未签名）
```bash
npm run build:mac-unsigned
```
- 生成未签名的 macOS 应用
- 输出到 `dist/mac/` 和 `dist/mac-arm64/`
- 适用于开发和测试

#### 生产打包（签名）
```bash
npm run build:mac-signed
```
- 需要有效的 Apple Developer 证书
- 生成已签名的 macOS 应用
- 可以正常分发和安装

#### 快速打包（仅目录）
```bash
npm run pack:mac
```
- 生成未打包的应用目录
- 适用于快速测试

### Windows 打包

#### 开发测试打包
```bash
npm run build:win-unsigned
```
- 生成 Windows 安装包
- 输出到 `dist/win/`

#### 快速打包
```bash
npm run pack:win
```

### Linux 打包

#### 开发测试打包
```bash
npm run build:linux-unsigned
```
- 生成 Linux 应用包
- 输出到 `dist/linux/`

#### 快速打包
```bash
npm run pack:linux
```

### 通用打包命令

#### 所有平台打包
```bash
npm run dist
```

#### 特定平台打包
```bash
npm run dist:mac    # macOS
npm run dist:win    # Windows
npm run dist:linux  # Linux
```

## 输出文件说明

### macOS
- `mysql-client-1.0.0.dmg` - 安装镜像
- `mysql-client-1.0.0-mac.zip` - 压缩包
- `mysql-client.app` - 应用程序包

### Windows
- `mysql-client-1.0.0.exe` - 安装程序
- `mysql-client-1.0.0-portable.exe` - 便携版

### Linux
- `mysql-client-1.0.0.AppImage` - AppImage 格式
- `mysql-client_1.0.0_amd64.deb` - Debian 包

## 运行打包后的应用

### macOS
```bash
# 使用提供的脚本
./run-app.sh

# 或直接运行
open dist/mac/mysql-client.app
```

### Windows
```bash
# 安装后从开始菜单运行
# 或直接运行便携版
dist/win/mysql-client-1.0.0-portable.exe
```

### Linux
```bash
# AppImage
chmod +x dist/linux/mysql-client-1.0.0.AppImage
./dist/linux/mysql-client-1.0.0.AppImage

# Debian 包
sudo dpkg -i dist/linux/mysql-client_1.0.0_amd64.deb
```

## 签名配置（macOS）

### 1. 创建 entitlements 文件
创建 `assets/entitlements.mac.plist`：
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.network.server</key>
    <true/>
  </dict>
</plist>
```

### 2. 设置环境变量
```bash
export CSC_LINK=/path/to/your/certificate.p12
export CSC_KEY_PASSWORD=your_password
```

## 常见问题

### 1. 打包失败
- 检查是否安装了所有依赖：`npm install`
- 确保有足够的磁盘空间
- 检查 Node.js 和 npm 版本兼容性

### 2. macOS 签名问题
- 确保有有效的 Apple Developer 证书
- 检查 entitlements 文件配置
- 验证证书是否过期

### 3. 应用无法启动
- 检查控制台错误信息
- 验证所有依赖文件是否包含在打包中
- 测试未打包版本是否正常工作

### 4. 网络连接问题
- 确保应用有网络权限
- 检查防火墙设置
- 验证 MySQL 服务器连接配置

## 开发调试

### 启用开发者模式
```bash
npm run dev
```

### 查看打包日志
```bash
npm run build:mac-unsigned -- --verbose
```

### 清理构建文件
```bash
rm -rf dist/
rm -rf node_modules/
npm install
``` 