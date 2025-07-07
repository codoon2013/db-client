# MySQL Client

一个基于 Electron 构建的现代化 MySQL 数据库客户端桌面应用。

## 功能特性

- 🔌 **多数据库连接管理** - 支持同时管理多个 MySQL 数据库连接
- 🖥️ **现代化界面** - 简洁美观的用户界面
- 📝 **SQL 查询执行** - 支持执行 SQL 查询并显示结果
- 📊 **结果表格显示** - 查询结果以表格形式展示
- ⏱️ **执行时间统计** - 显示查询执行时间
- 📚 **查询历史记录** - 自动保存查询历史，支持快速重用
- 💾 **连接配置持久化** - 自动保存连接配置信息
- 🔧 **连接测试** - 支持测试数据库连接
- 📱 **跨平台支持** - 支持 macOS、Windows 和 Linux

## 快速开始

### 环境要求

- Node.js 16.0 或更高版本
- npm 8.0 或更高版本
- MySQL 服务器

### 安装依赖

```bash
npm install
```

### 开发模式运行

```bash
npm run dev
```

### 生产模式运行

```bash
npm start
```

## 使用说明

详细的使用说明请参考 [USAGE.md](USAGE.md) 文件。

### 基本操作

1. **创建连接** - 点击"新建连接"按钮，填写数据库连接信息
2. **连接数据库** - 选择连接并点击"连接"按钮
3. **执行查询** - 在查询框中输入 SQL 语句并执行
4. **查看结果** - 查询结果将在下方表格中显示
5. **管理连接** - 可以编辑、删除或切换数据库连接

## 打包和分发

### 快速打包

使用提供的打包脚本：

```bash
# macOS 打包
./build.sh mac

# Windows 打包
./build.sh win

# Linux 打包
./build.sh linux

# 所有平台打包
./build.sh all
```

### 详细打包说明

详细的打包指南请参考 [BUILD.md](BUILD.md) 文件。

#### 常用打包命令

```bash
# macOS 未签名打包（开发测试）
npm run build:mac-unsigned

# macOS 签名打包（生产发布）
npm run build:mac-signed

# Windows 打包
npm run build:win-unsigned

# Linux 打包
npm run build:linux-unsigned

# 快速打包（仅目录）
npm run pack:mac
```

## 项目结构

```
db-client/
├── main.js              # Electron 主进程
├── renderer.js          # 渲染进程脚本
├── index.html           # 主界面 HTML
├── styles.css           # 样式文件
├── package.json         # 项目配置
├── build.sh             # 打包脚本
├── run-app.sh           # 运行脚本
├── assets/              # 资源文件
│   └── entitlements.mac.plist  # macOS 签名配置
├── USAGE.md             # 使用说明
├── BUILD.md             # 打包指南
└── README.md            # 项目说明
```

## 开发

### 项目设置

1. 克隆项目
2. 安装依赖：`npm install`
3. 启动开发模式：`npm run dev`

### 代码结构

- `main.js` - Electron 主进程，处理数据库连接和查询
- `renderer.js` - 渲染进程，处理用户界面交互
- `index.html` - 主界面结构
- `styles.css` - 界面样式

### 调试

- 开发模式会显示开发者工具
- 主进程日志在终端显示
- 渲染进程日志在开发者工具控制台显示

## 技术栈

- **Electron** - 桌面应用框架
- **Node.js** - 运行时环境
- **MySQL2** - MySQL 数据库驱动
- **Electron Store** - 配置持久化

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

详细更新日志请参考 [CHANGELOG.md](CHANGELOG.md) 文件。
