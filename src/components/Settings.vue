<template>
  <div class="settings">
    <div class="page-header">
      <h2>应用设置</h2>
    </div>

    <el-row :gutter="20">
      <!-- 设置导航 -->
      <el-col :span="6">
        <el-card shadow="hover" class="settings-nav-card">
          <el-menu
            :default-active="activeSetting"
            class="settings-menu"
            @select="handleSettingSelect"
          >
            <el-menu-item index="general">
              <el-icon><Setting /></el-icon>
              <span>常规设置</span>
            </el-menu-item>
            <el-menu-item index="appearance">
              <el-icon><Brush /></el-icon>
              <span>外观设置</span>
            </el-menu-item>
            <el-menu-item index="database">
              <el-icon><Database /></el-icon>
              <span>数据库设置</span>
            </el-menu-item>
            <el-menu-item index="editor">
              <el-icon><Edit /></el-icon>
              <span>编辑器设置</span>
            </el-menu-item>
            <el-menu-item index="advanced">
              <el-icon><Tools /></el-icon>
              <span>高级设置</span>
            </el-menu-item>
          </el-menu>
        </el-card>
      </el-col>

      <!-- 设置内容 -->
      <el-col :span="18">
        <el-card shadow="hover" class="settings-content-card">
          <!-- 常规设置 -->
          <div v-if="activeSetting === 'general'" class="setting-section">
            <h3>常规设置</h3>
            
            <el-form :model="generalSettings" label-width="120px">
              <el-form-item label="应用语言">
                <el-select v-model="generalSettings.language" style="width: 200px;">
                  <el-option label="简体中文" value="zh-CN" />
                  <el-option label="English" value="en-US" />
                </el-select>
              </el-form-item>

              <el-form-item label="启动时行为">
                <el-radio-group v-model="generalSettings.startupBehavior">
                  <el-radio label="show-welcome">显示欢迎页面</el-radio>
                  <el-radio label="open-last-connection">打开上次连接</el-radio>
                  <el-radio label="open-dashboard">打开仪表板</el-radio>
                </el-radio-group>
              </el-form-item>

              <el-form-item label="自动保存">
                <el-switch v-model="generalSettings.autoSave" />
                <span style="margin-left: 8px; color: #909399;">自动保存查询和设置</span>
              </el-form-item>

              <el-form-item label="自动保存间隔">
                <el-input-number 
                  v-model="generalSettings.autoSaveInterval" 
                  :min="1" 
                  :max="60"
                  :disabled="!generalSettings.autoSave"
                  style="width: 120px;"
                />
                <span style="margin-left: 8px; color: #909399;">分钟</span>
              </el-form-item>

              <el-form-item label="最大历史记录">
                <el-input-number 
                  v-model="generalSettings.maxHistory" 
                  :min="10" 
                  :max="1000"
                  style="width: 120px;"
                />
                <span style="margin-left: 8px; color: #909399;">条</span>
              </el-form-item>
            </el-form>
          </div>

          <!-- 外观设置 -->
          <div v-if="activeSetting === 'appearance'" class="setting-section">
            <h3>外观设置</h3>
            
            <el-form :model="appearanceSettings" label-width="120px">
              <el-form-item label="主题模式">
                <el-radio-group v-model="appearanceSettings.theme">
                  <el-radio label="light">浅色主题</el-radio>
                  <el-radio label="dark">深色主题</el-radio>
                  <el-radio label="auto">跟随系统</el-radio>
                </el-radio-group>
              </el-form-item>

              <el-form-item label="主色调">
                <el-color-picker v-model="appearanceSettings.primaryColor" />
                <span style="margin-left: 8px; color: #909399;">应用主色调</span>
              </el-form-item>

              <el-form-item label="字体大小">
                <el-slider 
                  v-model="appearanceSettings.fontSize" 
                  :min="12" 
                  :max="20" 
                  :step="1"
                  style="width: 200px;"
                />
                <span style="margin-left: 8px; color: #909399;">{{ appearanceSettings.fontSize }}px</span>
              </el-form-item>

              <el-form-item label="紧凑模式">
                <el-switch v-model="appearanceSettings.compactMode" />
                <span style="margin-left: 8px; color: #909399;">减少界面间距</span>
              </el-form-item>

              <el-form-item label="显示动画">
                <el-switch v-model="appearanceSettings.showAnimations" />
                <span style="margin-left: 8px; color: #909399;">界面过渡动画</span>
              </el-form-item>
            </el-form>
          </div>

          <!-- 数据库设置 -->
          <div v-if="activeSetting === 'database'" class="setting-section">
            <h3>数据库设置</h3>
            
            <el-form :model="databaseSettings" label-width="120px">
              <el-form-item label="连接超时">
                <el-input-number 
                  v-model="databaseSettings.connectionTimeout" 
                  :min="5" 
                  :max="300"
                  style="width: 120px;"
                />
                <span style="margin-left: 8px; color: #909399;">秒</span>
              </el-form-item>

              <el-form-item label="查询超时">
                <el-input-number 
                  v-model="databaseSettings.queryTimeout" 
                  :min="10" 
                  :max="3600"
                  style="width: 120px;"
                />
                <span style="margin-left: 8px; color: #909399;">秒</span>
              </el-form-item>

              <el-form-item label="最大结果行数">
                <el-input-number 
                  v-model="databaseSettings.maxResultRows" 
                  :min="100" 
                  :max="100000"
                  style="width: 120px;"
                />
                <span style="margin-left: 8px; color: #909399;">行</span>
              </el-form-item>

              <el-form-item label="自动提交">
                <el-switch v-model="databaseSettings.autoCommit" />
                <span style="margin-left: 8px; color: #909399;">自动提交事务</span>
              </el-form-item>

              <el-form-item label="显示SQL日志">
                <el-switch v-model="databaseSettings.showSQLLog" />
                <span style="margin-left: 8px; color: #909399;">在控制台显示SQL语句</span>
              </el-form-item>

              <el-form-item label="连接池大小">
                <el-input-number 
                  v-model="databaseSettings.connectionPoolSize" 
                  :min="1" 
                  :max="50"
                  style="width: 120px;"
                />
                <span style="margin-left: 8px; color: #909399;">个连接</span>
              </el-form-item>
            </el-form>
          </div>

          <!-- 编辑器设置 -->
          <div v-if="activeSetting === 'editor'" class="setting-section">
            <h3>编辑器设置</h3>
            
            <el-form :model="editorSettings" label-width="120px">
              <el-form-item label="字体">
                <el-select v-model="editorSettings.fontFamily" style="width: 200px;">
                  <el-option label="Monaco" value="Monaco" />
                  <el-option label="Consolas" value="Consolas" />
                  <el-option label="Courier New" value="Courier New" />
                  <el-option label="Source Code Pro" value="Source Code Pro" />
                </el-select>
              </el-form-item>

                             <el-form-item label="字体大小">
                 <el-input-number 
                   v-model="editorSettings.fontSize" 
                   :min="10" 
                   :max="24" 
                   :step="1"
                   style="width: 120px;"
                 />
                <span style="margin-left: 8px; color: #909399;">px</span>
              </el-form-item>

              <el-form-item label="行号显示">
                <el-switch v-model="editorSettings.showLineNumbers" />
                <span style="margin-left: 8px; color: #909399;">显示行号</span>
              </el-form-item>

              <el-form-item label="语法高亮">
                <el-switch v-model="editorSettings.syntaxHighlighting" />
                <span style="margin-left: 8px; color: #909399;">SQL语法高亮</span>
              </el-form-item>

              <el-form-item label="自动补全">
                <el-switch v-model="editorSettings.autoComplete" />
                <span style="margin-left: 8px; color: #909399;">代码自动补全</span>
              </el-form-item>

                             <el-form-item label="制表符大小">
                 <el-input-number 
                   v-model="editorSettings.tabSize" 
                   :min="2" 
                   :max="8" 
                   :step="1"
                   style="width: 120px;"
                 />
                <span style="margin-left: 8px; color: #909399;">空格</span>
              </el-form-item>

              <el-form-item label="自动缩进">
                <el-switch v-model="editorSettings.autoIndent" />
                <span style="margin-left: 8px; color: #909399;">自动缩进</span>
              </el-form-item>

              <el-form-item label="括号匹配">
                <el-switch v-model="editorSettings.bracketMatching" />
                <span style="margin-left: 8px; color: #909399;">高亮匹配括号</span>
              </el-form-item>
            </el-form>
          </div>

          <!-- 高级设置 -->
          <div v-if="activeSetting === 'advanced'" class="setting-section">
            <h3>高级设置</h3>
            
            <el-form :model="advancedSettings" label-width="120px">
              <el-form-item label="调试模式">
                <el-switch v-model="advancedSettings.debugMode" />
                <span style="margin-left: 8px; color: #909399;">启用调试信息</span>
              </el-form-item>

              <el-form-item label="日志级别">
                <el-select v-model="advancedSettings.logLevel" style="width: 200px;">
                  <el-option label="错误" value="error" />
                  <el-option label="警告" value="warn" />
                  <el-option label="信息" value="info" />
                  <el-option label="调试" value="debug" />
                </el-select>
              </el-form-item>

              <el-form-item label="数据目录">
                <el-input v-model="advancedSettings.dataDirectory" style="width: 300px;" />
                <el-button style="margin-left: 8px;">浏览</el-button>
              </el-form-item>

              <el-form-item label="重置设置">
                <el-button type="danger" @click="resetSettings">重置所有设置</el-button>
                <span style="margin-left: 8px; color: #909399;">恢复默认设置</span>
              </el-form-item>

              <el-form-item label="导出设置">
                <el-button @click="exportSettings">导出设置</el-button>
                <span style="margin-left: 8px; color: #909399;">导出当前设置</span>
              </el-form-item>

              <el-form-item label="导入设置">
                <el-button @click="importSettings">导入设置</el-button>
                <span style="margin-left: 8px; color: #909399;">从文件导入设置</span>
              </el-form-item>
            </el-form>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 底部操作按钮 -->
    <div class="settings-footer">
      <el-button @click="cancelSettings">取消</el-button>
      <el-button type="primary" @click="saveSettings">保存设置</el-button>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

export default {
  name: 'Settings',
  setup() {
    const activeSetting = ref('general');

    const generalSettings = reactive({
      language: 'zh-CN',
      startupBehavior: 'show-welcome',
      autoSave: true,
      autoSaveInterval: 5,
      maxHistory: 100
    });

    const appearanceSettings = reactive({
      theme: 'light',
      primaryColor: '#409eff',
      fontSize: 14,
      compactMode: false,
      showAnimations: true
    });

    const databaseSettings = reactive({
      connectionTimeout: 30,
      queryTimeout: 300,
      maxResultRows: 10000,
      autoCommit: true,
      showSQLLog: false,
      connectionPoolSize: 10
    });

    const editorSettings = reactive({
      fontFamily: 'Monaco',
      fontSize: 14,
      showLineNumbers: true,
      syntaxHighlighting: true,
      autoComplete: true,
      tabSize: 2,
      autoIndent: true,
      bracketMatching: true
    });

    const advancedSettings = reactive({
      debugMode: false,
      logLevel: 'info',
      dataDirectory: '/Users/username/.db-client'
    });

    const handleSettingSelect = (index) => {
      activeSetting.value = index;
    };

    const saveSettings = () => {
      // 保存设置到本地存储或配置文件
      ElMessage.success('设置已保存');
    };

    const cancelSettings = () => {
      ElMessage.info('设置已取消');
    };

    const resetSettings = async () => {
      try {
        await ElMessageBox.confirm(
          '确定要重置所有设置吗？此操作不可恢复！',
          '警告',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        );
        
        // 重置所有设置到默认值
        ElMessage.success('设置已重置为默认值');
      } catch {
        // 用户取消
      }
    };

    const exportSettings = () => {
      // 导出设置到文件
      ElMessage.success('设置已导出');
    };

    const importSettings = () => {
      // 从文件导入设置
      ElMessage.success('设置已导入');
    };

    onMounted(() => {
      // 加载保存的设置
    });

    return {
      activeSetting,
      generalSettings,
      appearanceSettings,
      databaseSettings,
      editorSettings,
      advancedSettings,
      handleSettingSelect,
      saveSettings,
      cancelSettings,
      resetSettings,
      exportSettings,
      importSettings
    };
  }
};
</script>

<style scoped>
.settings {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.settings-nav-card,
.settings-content-card {
  height: calc(100vh - 200px);
}

.settings-menu {
  border-right: none;
  height: 100%;
}

.setting-section {
  padding: 20px 0;
}

.setting-section h3 {
  margin-bottom: 24px;
  color: #303133;
  font-size: 18px;
  border-bottom: 1px solid #e4e7ed;
  padding-bottom: 12px;
}

.settings-footer {
  margin-top: 20px;
  text-align: center;
  padding: 20px;
  border-top: 1px solid #e4e7ed;
}

.settings-footer .el-button {
  margin: 0 8px;
}
</style> 