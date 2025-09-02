<template>
  <div class="connections">
    <div class="page-header">
      <h2>数据库连接</h2>
      <el-button type="primary" @click="showNewConnectionDialog">
        <el-icon><Plus /></el-icon>
        新建连接
      </el-button>
    </div>

    <!-- 连接列表 -->
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>连接列表</span>
          <el-button type="text" @click="refreshConnections">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>

      <el-table :data="connections" style="width: 100%;margin: 0 0 20px 0" border>;">
        <el-table-column prop="name" label="连接名称" width="200">
          <template #default="{ row }">
            <div class="connection-name">
              <el-icon class="connection-icon"><Database /></el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="数据库类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getDatabaseTypeColor(row.type)">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <!-- <el-table-column prop="host" label="主机地址" width="150" /> -->
        <el-table-column prop="port" label="端口" width="80" />
        <el-table-column prop="database" label="数据库" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'connected' ? 'success' : 'info'" size="small">
              {{ row.status === 'connected' ? '已连接' : '未连接' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作"  class-name="operation">
          <template #default="{ row }" >
            <el-button-group>
              <el-button 
                :type="row.status === 'connected' ? 'warning' : 'success'" 
                size="small"
                @click="toggleConnection(row)"
              >
                {{ row.status === 'connected' ? '断开' : '连接' }}
              </el-button>
              <el-button type="primary" size="small" @click="editConnection(row)">
                编辑
              </el-button>
              <el-button type="danger" size="small" @click="deleteConnection(row)">
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建/编辑连接对话框 -->
    <el-dialog
      v-model="connectionDialogVisible"
      :title="isEditing ? '编辑连接' : '新建连接'"
      width="600px"
    >
      <el-form
        ref="connectionFormRef"
        :model="connectionForm"
        :rules="connectionRules"
        label-width="100px"
      >
        <el-form-item label="连接名称" prop="name">
          <el-input v-model="connectionForm.name" placeholder="请输入连接名称" />
        </el-form-item>
        
        <el-form-item label="数据库类型" prop="type">
          <el-select v-model="connectionForm.type" placeholder="请选择数据库类型" style="width: 100%">
            <el-option label="MySQL" value="mysql" />
          </el-select>
        </el-form-item>

        <el-form-item label="主机地址" prop="host">
          <el-input v-model="connectionForm.host" placeholder="localhost" />
        </el-form-item>

        <el-form-item label="端口" prop="port">
          <el-input-number v-model="connectionForm.port" :min="1" :max="65535" style="width: 100%" />
        </el-form-item>

        <el-form-item label="数据库名" prop="database">
          <el-input v-model="connectionForm.database" placeholder="请输入数据库名" />
        </el-form-item>

        <el-form-item label="用户名" prop="username">
          <el-input v-model="connectionForm.username" placeholder="请输入用户名" />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input 
            v-model="connectionForm.password" 
            type="password" 
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>

        <!-- <el-form-item label="SSL">
          <el-switch v-model="connectionForm.ssl" />
        </el-form-item> -->
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="connectionDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="testConnection" :loading="testing">
            测试连接
          </el-button>
          <el-button type="success" @click="saveConnection" :loading="saving">
            {{ isEditing ? '更新' : '保存' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

export default {
  name: 'Connections',
  setup() {
    const connections = ref([
      {
        id: 1,
        name: '本地MySQL',
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        database: 'test',
        username: 'root',
        password: '',
        ssl: false,
        status: 'connected'
      },
      {
        id: 2,
        name: '测试PostgreSQL',
        type: 'postgresql',
        host: '192.168.1.100',
        port: 5432,
        database: 'postgres',
        username: 'postgres',
        password: '',
        ssl: false,
        status: 'disconnected'
      }
    ]);

    const connectionDialogVisible = ref(false);
    const isEditing = ref(false);
    const testing = ref(false);
    const saving = ref(false);
    const connectionFormRef = ref();

    const connectionForm = reactive({
      id: null,
      name: '',
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      database: '',
      username: '',
      password: '',
      ssl: false
    });

    const connectionRules = {
      name: [
        { required: true, message: '请输入连接名称', trigger: 'blur' }
      ],
      type: [
        { required: true, message: '请选择数据库类型', trigger: 'change' }
      ],
      host: [
        { required: true, message: '请输入主机地址', trigger: 'blur' }
      ],
      port: [
        { required: true, message: '请输入端口号', trigger: 'blur' }
      ],
      database: [
        { required: true, message: '请输入数据库名', trigger: 'blur' }
      ],
      username: [
        { required: true, message: '请输入用户名', trigger: 'blur' }
      ]
    };

    const getDatabaseTypeColor = (type) => {
      const colors = {
        mysql: 'primary',
        postgresql: 'success',
        sqlite: 'warning',
        sqlserver: 'danger',
        oracle: 'info'
      };
      return colors[type] || 'info';
    };

    const showNewConnectionDialog = () => {
      isEditing.value = false;
      resetForm();
      connectionDialogVisible.value = true;
    };

    const editConnection = (connection) => {
      isEditing.value = true;
      Object.assign(connectionForm, connection);
      connectionDialogVisible.value = true;
    };

    const resetForm = () => {
      Object.assign(connectionForm, {
        id: null,
        name: '',
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        database: '',
        username: '',
        password: '',
        ssl: false
      });
    };

    const testConnection = async () => {
      try {
        await connectionFormRef.value.validate();
        testing.value = true;
        // 深拷贝 connectionForm，去除 Proxy
        const plainForm = JSON.parse(JSON.stringify(connectionForm));
        // 调用真正的数据库连接测试
        const result = await window.electronAPI.testDatabaseConnection(plainForm);
        if (result.success) {
          ElMessage.success(`${result.message} - 版本: ${result.version}`);
          
          // 显示数据库列表（如果有的话）
          if (result.databases && result.databases.length > 0) {
            ElMessage.info(`可用数据库: ${result.databases.slice(0, 5).join(', ')}${result.databases.length > 5 ? '...' : ''}`);
          }
        } else {
          ElMessage.error('连接测试失败: ' + result.message);
        }
      } catch (error) {
        ElMessage.error('连接测试失败：' + error.message);
      } finally {
        testing.value = false;
      }
    };

    const saveConnection = async () => {
      try {
        await connectionFormRef.value.validate();
        saving.value = true;
        const plainForm = JSON.parse(JSON.stringify(connectionForm));
        if (isEditing.value) {
          await window.electronAPI.upsertConnection(plainForm);
          connections.value = await window.electronAPI.getConnections();
          ElMessage.success('连接更新成功！');
        } else {
          await window.electronAPI.upsertConnection(plainForm);
          connections.value = await window.electronAPI.getConnections();
          ElMessage.success('连接创建成功！');
        }

        connectionDialogVisible.value = false;
        resetForm();
      } catch (error) {
        ElMessage.error('保存失败：' + error.message);
      } finally {
        saving.value = false;
      }
    };

    const toggleConnection = async (connection) => {
      if (connection.status === 'connected') {
        try {
          await ElMessageBox.confirm('确定要断开连接吗？', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          });
          
          // 关闭真正的数据库连接
          const connectionId = `${connection.id}`;
          await window.electronAPI.closeDatabaseConnection(connectionId);
          
          connection.status = 'disconnected';
          ElMessage.success('连接已断开');
        } catch (error) {
          if (error !== 'cancel') {
            ElMessage.error('断开连接失败：' + error.message);
          }
        }
      } else {
        try {
          const plainForm = JSON.parse(JSON.stringify(connection));
          // 建立真正的数据库连接
          const result = await window.electronAPI.establishDatabaseConnection(plainForm);
          
          if (result.success) {
            connection.status = 'connected';
            connection.connectionId = result.connectionId;
            console.log(connection.connectionId);
            ElMessage.success('连接成功');
          } else {
            ElMessage.error('连接失败：' + result.message);
          }
        } catch (error) {
          ElMessage.error('连接失败：' + error.message);
        }
      }
    };

    const deleteConnection = async (connection) => {
      try {
        await ElMessageBox.confirm('确定要删除这个连接吗？', '警告', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });
        
        await window.electronAPI.deleteConnection(connection.id);
        connections.value = await window.electronAPI.getConnections();
        ElMessage.success('连接已删除');
      } catch {
        // 用户取消
      }
    };

    const refreshConnections = () => {
      ElMessage.success('连接列表已刷新');
    };

    onMounted(async () => {
      const saved = await window.electronAPI.getConnections();
      connections.value = saved;
    });

    return {
      connections,
      connectionDialogVisible,
      isEditing,
      testing,
      saving,
      connectionFormRef,
      connectionForm,
      connectionRules,
      getDatabaseTypeColor,
      showNewConnectionDialog,
      editConnection,
      testConnection,
      saveConnection,
      toggleConnection,
      deleteConnection,
      refreshConnections
    };
  }
};
</script>

<style scoped>
.connections {
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

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.connection-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.connection-icon {
  color: #409eff;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 让 el-button-group 居中 */
:deep(.el-table__body-wrapper .el-table__cell.operation) {
  text-align: center;
}

:deep(.el-table__body-wrapper .el-table__cell.operation .cell) {
  display: flex;
  justify-content: center;
  align-items: center;
}

:deep(.operation .cell) {
  text-align: center;
}
</style> 