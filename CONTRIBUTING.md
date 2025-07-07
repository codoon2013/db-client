# 贡献指南

感谢您对 DB-Client 项目的关注！我们欢迎所有形式的贡献，包括但不限于：

- 🐛 报告 Bug
- 💡 提出新功能建议
- 📝 改进文档
- 🔧 提交代码修复
- 🎨 优化用户界面

## 📋 贡献流程

### 1. 准备工作

#### Fork 项目
1. 访问 [DB-Client GitHub 页面](https://github.com/yourusername/db-client)
2. 点击右上角的 "Fork" 按钮
3. 将项目 Fork 到您的 GitHub 账户

#### 克隆项目
```bash
# 克隆您的 Fork
git clone https://github.com/your-username/db-client.git
cd db-client

# 添加上游仓库
git remote add upstream https://github.com/yourusername/db-client.git
```

#### 安装依赖
```bash
# 安装项目依赖
npm install

# 验证安装
npm run dev
```

### 2. 开发流程

#### 创建分支
```bash
# 确保在 main 分支
git checkout main

# 拉取最新代码
git pull upstream main

# 创建功能分支
git checkout -b feature/your-feature-name
# 或者创建修复分支
git checkout -b fix/your-bug-fix
```

#### 开发规范

##### 代码风格
- 使用 **ES6+** 语法
- 遵循 **JavaScript Standard Style**
- 使用 **2 空格** 缩进
- 使用 **单引号** 字符串
- 语句末尾添加 **分号**

##### 命名规范
- **文件名**: 使用 kebab-case（如：`database-utils.js`）
- **变量名**: 使用 camelCase（如：`dbConnection`）
- **常量名**: 使用 UPPER_SNAKE_CASE（如：`MAX_RETRY_COUNT`）
- **类名**: 使用 PascalCase（如：`DatabaseManager`）

##### 注释规范
```javascript
/**
 * 连接 MySQL 数据库
 * @param {Object} config - 数据库配置
 * @param {string} config.host - 主机地址
 * @param {number} config.port - 端口号
 * @param {string} config.user - 用户名
 * @param {string} config.password - 密码
 * @param {string} config.database - 数据库名
 * @returns {Promise<Object>} 连接结果
 */
async function connectDatabase(config) {
  // 实现代码
}
```

#### 提交代码
```bash
# 添加修改的文件
git add .

# 提交代码（使用规范的提交信息）
git commit -m "feat: 添加数据库连接池功能"

# 推送到您的 Fork
git push origin feature/your-feature-name
```

### 3. 提交信息规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

#### 提交类型
- `feat`: 新功能
- `fix`: 错误修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

#### 提交示例
```bash
feat: 添加数据库连接池功能
fix: 修复 CSV 导入时的编码问题
docs: 更新 README 安装说明
style: 统一代码缩进格式
refactor: 重构数据库连接逻辑
perf: 优化查询性能
test: 添加数据库连接测试
chore: 更新依赖包版本
```

### 4. 创建 Pull Request

#### 准备工作
1. 确保代码通过所有测试
2. 更新相关文档
3. 添加必要的测试用例

#### 创建 PR
1. 访问您的 GitHub Fork 页面
2. 点击 "Compare & pull request"
3. 填写 PR 标题和描述

#### PR 描述模板
```markdown
## 描述
简要描述这次更改的内容和原因。

## 类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 文档更新
- [ ] 代码重构
- [ ] 性能优化
- [ ] 测试相关

## 测试
- [ ] 本地测试通过
- [ ] 添加了新的测试用例
- [ ] 更新了现有测试

## 检查清单
- [ ] 代码遵循项目规范
- [ ] 添加了必要的注释
- [ ] 更新了相关文档
- [ ] 提交信息符合规范

## 相关 Issue
Closes #123
```

### 5. 代码审查

#### 审查流程
1. 项目维护者会审查您的 PR
2. 可能需要根据反馈进行修改
3. 审查通过后合并到主分支

#### 审查要点
- 代码质量和可读性
- 功能完整性和正确性
- 测试覆盖率
- 文档更新
- 性能影响

## 🐛 报告 Bug

### Bug 报告模板
```markdown
## Bug 描述
详细描述遇到的问题。

## 重现步骤
1. 打开应用
2. 点击某个按钮
3. 观察错误行为

## 预期行为
描述您期望的正确行为。

## 实际行为
描述实际发生的错误行为。

## 环境信息
- 操作系统：macOS 12.0
- 应用版本：1.0.0
- Node.js 版本：16.0.0

## 附加信息
- 错误截图
- 控制台日志
- 相关配置文件
```

## 💡 功能建议

### 建议模板
```markdown
## 功能描述
详细描述您希望添加的功能。

## 使用场景
描述这个功能的使用场景和价值。

## 实现建议
如果有的话，提供实现思路或技术方案。

## 优先级
- [ ] 高优先级
- [ ] 中优先级
- [ ] 低优先级
```

## 📝 文档贡献

### 文档类型
- README 更新
- API 文档
- 使用教程
- 故障排除指南
- 开发指南

### 文档规范
- 使用清晰的标题结构
- 添加适当的代码示例
- 包含必要的截图
- 保持文档的时效性

## 🎨 UI/UX 贡献

### 设计原则
- 简洁直观
- 响应式设计
- 无障碍访问
- 跨平台一致性

### 设计工具
- Figma（推荐）
- Sketch
- Adobe XD

## 🧪 测试贡献

### 测试类型
- 单元测试
- 集成测试
- 端到端测试
- 性能测试

### 测试框架
- Jest（单元测试）
- Spectron（E2E 测试）
- 手动测试

## 📞 联系我们

如果您有任何问题或需要帮助：

- 📧 邮箱：your.email@example.com
- 💬 讨论区：[GitHub Discussions](https://github.com/yourusername/db-client/discussions)
- 🐛 问题反馈：[GitHub Issues](https://github.com/yourusername/db-client/issues)

## 🙏 致谢

感谢所有为 DB-Client 项目做出贡献的开发者！

---

**注意**: 通过提交 Pull Request，您同意您的贡献将在 MIT 许可证下发布。 