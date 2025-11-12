# DB Client - 数据库客户端

一个基于 Electron + Vue + Element Plus 构建的现代化数据库客户端工具。

## 功能特性

- 🎯 **多数据库支持**: 支持 MySQL、PostgreSQL、SQLite、SQL Server、Oracle 等主流数据库
- 🔍 **查询编辑器**: 强大的 SQL 编辑器，支持语法高亮、自动补全、查询模板
- 📊 **数据可视化**: 直观的数据展示和结果导出功能
- 🔗 **连接管理**: 便捷的数据库连接管理，支持连接测试和保存
- 📋 **表管理**: 完整的表结构查看、数据预览功能
- ⚙️ **个性化设置**: 丰富的应用设置，支持主题切换、编辑器配置等
- 🖥️ **跨平台**: 支持 Windows、macOS、Linux 三大平台

## 技术栈

- **前端框架**: Vue 3 + Composition API
- **UI 组件库**: Element Plus
- **桌面应用**: Electron
- **构建工具**: Vue CLI
- **包管理**: npm

## 项目结构

```
db-client/
├── main.js                 # Electron 主进程
├── preload.js             # 预加载脚本
├── package.json           # 项目配置
├── vue.config.js          # Vue 配置
├── public/                # 静态资源
│   └── index.html         # HTML 模板
└── src/                   # 源代码
    ├── main.js            # Vue 应用入口
    ├── App.vue            # 根组件
    └── components/        # 组件目录
        ├── Dashboard.vue      # 仪表板
        ├── Connections.vue    # 连接管理
        ├── QueryEditor.vue    # 查询编辑器
        ├── Tables.vue         # 表管理
        └── Settings.vue       # 设置页面
```

## 安装和运行

### 环境要求

- Node.js 16.0 或更高版本
- npm 8.0 或更高版本

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 启动开发服务器和 Electron
npm run dev
```

### 构建应用

```bash
# 构建 Vue 应用
npm run build

# 构建 Electron 应用
npm run electron:build
```

### 其他命令

```bash
# 仅启动 Vue 开发服务器
npm run serve

# 仅启动 Electron
npm start
```

## 使用说明

### 1. 数据库连接

1. 点击侧边栏的"数据库连接"
2. 点击"新建连接"按钮
3. 填写连接信息（主机、端口、用户名、密码等）
4. 点击"测试连接"验证连接
5. 保存连接配置

### 2. 查询编辑器

1. 选择要使用的数据库连接
2. 在 SQL 编辑器中编写查询语句
3. 点击"执行"按钮运行查询
4. 查看查询结果和统计信息

### 3. 表管理

1. 选择数据库连接和数据库
2. 在表列表中查看所有表
3. 点击表名查看表结构和索引信息
4. 点击"预览数据"查看表数据

### 4. 应用设置

1. 点击侧边栏的"设置"
2. 根据需要调整各项设置
3. 点击"保存设置"应用更改

## 开发指南

### 添加新功能

1. 在 `src/components/` 目录下创建新的 Vue 组件
2. 在 `src/App.vue` 中注册新组件
3. 在侧边栏菜单中添加对应的导航项

### 自定义样式

项目使用 Element Plus 组件库，可以通过以下方式自定义样式：

1. 修改组件内的 `<style>` 部分
2. 使用 CSS 变量覆盖 Element Plus 主题
3. 在 `src/App.vue` 中添加全局样式

### 数据库驱动

当前版本为演示版本，实际数据库连接功能需要集成相应的数据库驱动：

- MySQL: `mysql2`
- PostgreSQL: `pg`
- SQLite: `sqlite3`
- SQL Server: `mssql`
- Oracle: `oracledb`

## 构建和分发

### 构建配置

项目使用 `electron-builder` 进行应用打包，配置在 `package.json` 的 `build` 字段中。

### 平台特定配置

- **macOS**: 生成 `.dmg` 安装包
- **Windows**: 生成 `.exe` 安装程序
- **Linux**: 生成 `.AppImage` 文件

### 签名和公证

生产环境发布前需要进行代码签名和应用公证：

```bash
# macOS 代码签名
codesign --deep --force --verify --verbose --sign "Developer ID Application: Your Name" dist_electron/mac/DB Client.app

# Windows 代码签名
signtool sign /f certificate.p12 /p password dist_electron/win-unpacked/DB Client.exe
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0
- 初始版本发布
- 基础功能实现
- 多数据库支持
- 查询编辑器
- 表管理功能 