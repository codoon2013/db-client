<template>
  <div class="query-editor">
    <div class="page-header">
      <h2>查询编辑器</h2>
      <div class="header-actions" style="display: flex; align-items: center; gap: 12px;">
        <el-select v-model="selectedConnection" placeholder="选择数据库连接" style="width: 150px; margin-right: 12px;">
          <el-option
            v-for="conn in availableConnections"
            :key="conn.id"
            :label="conn.name"
            :value="conn.id"
          />
        </el-select>
        <el-button
          :type="currentConnStatus === 'connected' ? 'success' : 'info'"
          size="small"
          @click="toggleConnectionStatus"
        >
          {{ currentConnStatus === 'connected' ? '已连接' : '连接' }}
        </el-button>
      </div>
    </div>

    <el-row :gutter="20" class="editor-container">
      <!-- SQL编辑器 -->
      <el-col :span="24">
        <el-card shadow="hover" class="editor-card">
          <template #header>
            <div class="card-header">
              <span>SQL 编辑器</span>
              <!-- 删除插入模板按钮 -->
            </div>
          </template>
          
          <div class="sql-editor">
            <el-input
              v-model="sqlQuery"
              type="textarea"
              :rows="5"
              placeholder="请输入 SQL 查询语句..."
              class="sql-textarea"
            />
            <div style="display: flex; justify-content: flex-end; margin-top: 8px; gap: 8px;">
              <el-button-group>
                <el-button type="primary" @click="executeQuery" :loading="executing" :disabled="!selectedConnection">
                  <el-icon><VideoPlay /></el-icon>
                  执行
                </el-button>
                <el-button @click="clearQuery">
                  <el-icon><Delete /></el-icon>
                  清空
                </el-button>
                <el-button @click="saveQuery">
                  <el-icon><Download /></el-icon>
                  保存
                </el-button>
              </el-button-group>
            </div>
          </div>

          <!-- 删除查询模板 el-collapse 区域 -->
        </el-card>
      </el-col>

      <!-- 查询结果 -->
      <el-col :span="24">
        <el-card shadow="hover" class="result-card">
          <template #header>
            <div class="card-header">
              <span>查询结果</span>
              <div class="result-actions">
                <el-tag v-if="queryResult" :type="queryResult.success ? 'success' : 'danger'">
                  {{ queryResult.success ? '执行成功' : '执行失败' }}
                </el-tag>
                <el-button type="text" @click="exportResult" :disabled="!queryResult || !queryResult.success">
                  <el-icon><Upload /></el-icon>
                  导出
                </el-button>
              </div>
            </div>
          </template>

          <div class="result-content">
            <div v-if="!queryResult" class="empty-result">
              <el-icon><Document /></el-icon>
              <p>暂无查询结果</p>
              <p>请选择数据库连接并执行查询</p>
            </div>
            
            <div v-else-if="!queryResult.success" class="error-result">
              <el-icon><Warning /></el-icon>
              <p class="error-message">{{ queryResult.error }}</p>
            </div>
            
            <div v-else class="success-result">
              <!-- 结果统计 -->
              <div class="result-stats">
                <el-tag type="info">影响行数: {{ queryResult.affectedRows || 0 }}</el-tag>
                <el-tag type="success">执行时间: {{ queryResult.executionTime }}ms</el-tag>
              </div>

              <!-- 数据表格 -->
              <div v-if="queryResult.data && queryResult.data.length > 0" class="result-table">
                <el-table 
                  :data="queryResult.data" 
                  style="width: 100%"
                  max-height="400"
                  border
                >
                  <el-table-column
                    v-for="column in queryResult.columns"
                    :key="column"
                    :prop="column"
                    :label="column"
                    min-width="120"
                  />
                </el-table>
              </div>

              <!-- 无数据结果 -->
              <div v-else class="no-data">
                <el-icon><Document /></el-icon>
                <p>查询完成，无数据返回</p>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 保存查询对话框 -->
    <el-dialog v-model="saveDialogVisible" title="保存查询" width="400px">
      <el-form :model="saveForm" label-width="80px">
        <el-form-item label="查询名称">
          <el-input v-model="saveForm.name" placeholder="请输入查询名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input 
            v-model="saveForm.description" 
            type="textarea" 
            :rows="3"
            placeholder="请输入查询描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="saveDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmSave">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage } from 'element-plus';

export default {
  name: 'QueryEditor',
  setup() {
    const selectedConnection = ref(null);
    const sqlQuery = ref('');
    const executing = ref(false);
    const activeTemplate = ref([]);
    const saveDialogVisible = ref(false);
    const queryResult = ref(null);

    const connections = ref([]);
    const availableConnections = ref([]);

    const saveForm = reactive({
      name: '',
      description: ''
    });

    const currentConnStatus = computed(() => {
      const conn = availableConnections.value.find(c => c.id === selectedConnection.value);
      return conn && conn.status === 'connected' ? 'connected' : 'disconnected';
    });

    const toggleConnectionStatus = async () => {
      const conn = availableConnections.value.find(c => c.id === selectedConnection.value);
      if (!conn) return;
      try {
        if (conn.status === 'connected') {
          // 断开连接
          const connectionId = `${conn.type}_${conn.host}_${conn.port}_${conn.database}`;
          await window.electronAPI.closeDatabaseConnection(connectionId);
          conn.status = 'disconnected';
          ElMessage.success('连接已断开');
        } else {
          // 建立连接
          const plainConn = JSON.parse(JSON.stringify(conn));
          const result = await window.electronAPI.establishDatabaseConnection(plainConn);
          if (result.success) {
            conn.status = 'connected';
            conn.connectionId = result.connectionId;
            ElMessage.success('连接成功');
          } else {
            ElMessage.error('连接失败：' + result.message);
          }
        }
        // 刷新连接列表状态
        // const saved = await window.electronAPI.getConnections();
        // connections.value = saved;
        // availableConnections.value = saved;
      } catch (error) {
        ElMessage.error('操作失败：' + error.message);
      }
    };

    const executeQuery = async () => {
      if (!selectedConnection.value) {
        ElMessage.warning('请先选择数据库连接');
        return;
      }

      const conn = availableConnections.value.find(c => c.id === selectedConnection.value);
      if (conn.status !== 'connected') {
        ElMessage.warning('请先连接数据库');
        return;
      }

      if (!sqlQuery.value.trim()) {
        ElMessage.warning('请输入SQL查询语句');
        return;
      }
      executing.value = true;

      try {
        const connectionId = conn.connectionId;
        const sql = sqlQuery.value.trim();
        console.log(connectionId);
        const result = await window.electronAPI.executeQuery(connectionId, sql);
        
        console.log(result);
        queryResult.value = result;
        
        ElMessage.success('查询执行成功');
      } catch (error) {
        queryResult.value = {
          success: false,
          error: '查询执行失败：' + error.message
        };
        ElMessage.error('查询执行失败');
      } finally {
        executing.value = false;
      }
    };

    const clearQuery = () => {
      sqlQuery.value = '';
      queryResult.value = null;
      ElMessage.info('查询已清空');
    };

    const insertTemplate = (template) => {
      if (typeof template === 'string') {
        sqlQuery.value = template;
      } else {
        sqlQuery.value = template.sql;
      }
    };

    const saveQuery = () => {
      if (!sqlQuery.value.trim()) {
        ElMessage.warning('请先输入SQL查询语句');
        return;
      }
      saveForm.name = '';
      saveForm.description = '';
      saveDialogVisible.value = true;
    };

    const confirmSave = () => {
      if (!saveForm.name.trim()) {
        ElMessage.warning('请输入查询名称');
        return;
      }
      
      // 这里可以保存查询到本地或服务器
      ElMessage.success('查询已保存');
      saveDialogVisible.value = false;
    };

    const exportResult = () => {
      if (!queryResult.value || !queryResult.value.success) {
        return;
      }
      
      // 这里可以实现导出功能
      ElMessage.success('结果已导出');
    };

    const loadConnections = async () => {
      const saved = await window.electronAPI.getConnections();
      console.log(saved);
      connections.value = saved;
      availableConnections.value = saved;
    };

    onMounted(loadConnections);

    return {
      selectedConnection,
      sqlQuery,
      executing,
      activeTemplate,
      saveDialogVisible,
      queryResult,
      availableConnections,
      saveForm,
      executeQuery,
      clearQuery,
      saveQuery,
      confirmSave,
      exportResult,
      currentConnStatus,
      toggleConnectionStatus
    };
  }
};
</script>

<style scoped>
.query-editor {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.header-actions {
  display: flex;
  align-items: center;
}

.editor-container {
  height: calc(100vh - 200px);
}

.editor-card,
.result-card {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sql-editor {
  flex: 1;
  margin-bottom: 16px;
}

.sql-textarea {
  height: 100%;
}

.sql-textarea :deep(.el-textarea__inner) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
}

.template-collapse {
  margin-top: 16px;
}

.template-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.template-btn {
  font-size: 12px;
}

.result-content {
  flex: 1;
  overflow: auto;
}

.empty-result,
.error-result,
.no-data {
  text-align: center;
  padding: 40px 20px;
  color: #909399;
}

.empty-result .el-icon,
.error-result .el-icon,
.no-data .el-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-result {
  color: #f56c6c;
}

.error-message {
  color: #f56c6c;
  font-weight: 500;
}

.result-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.result-table {
  margin-top: 16px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style> 