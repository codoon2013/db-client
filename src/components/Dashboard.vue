<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <!-- 统计卡片 -->
      <el-col :span="6" v-for="stat in stats" :key="stat.title">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <el-icon class="stat-icon" :class="stat.color">
              <component :is="stat.icon" />
            </el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-title">{{ stat.title }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <!-- 最近连接 -->
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>最近连接</span>
              <el-button type="text" @click="refreshConnections">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <div class="recent-connections">
            <div v-if="recentConnections.length === 0" class="empty-state">
              <el-icon><Connection /></el-icon>
              <p>暂无连接记录</p>
              <el-button type="primary" @click="createConnection">创建连接</el-button>
            </div>
            <div v-else>
              <div 
                v-for="conn in recentConnections" 
                :key="conn.id"
                class="connection-item"
                @click="connectToDatabase(conn)"
              >
                <el-icon class="connection-icon"><Database /></el-icon>
                <div class="connection-info">
                  <div class="connection-name">{{ conn.name }}</div>
                  <div class="connection-details">{{ conn.host }}:{{ conn.port }}</div>
                </div>
                <el-tag :type="conn.status === 'connected' ? 'success' : 'info'" size="small">
                  {{ conn.status === 'connected' ? '已连接' : '未连接' }}
                </el-tag>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 快速操作 -->
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>快速操作</span>
            </div>
          </template>
          <div class="quick-actions">
            <el-button type="primary" @click="createConnection" class="action-btn">
              <el-icon><Plus /></el-icon>
              新建连接
            </el-button>
            <el-button type="success" @click="openQueryEditor" class="action-btn">
              <el-icon><Edit /></el-icon>
              查询编辑器
            </el-button>
            <el-button type="warning" @click="openTables" class="action-btn">
              <el-icon><Grid /></el-icon>
              数据表管理
            </el-button>
            <el-button type="info" @click="openSettings" class="action-btn">
              <el-icon><Setting /></el-icon>
              应用设置
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

export default {
  name: 'Dashboard',
  setup() {
    const stats = ref([
      {
        title: '总连接数',
        value: '12',
        icon: 'Connection',
        color: 'text-primary'
      },
      {
        title: '活跃连接',
        value: '3',
        icon: 'CircleCheck',
        color: 'text-success'
      },
      {
        title: '数据库数量',
        value: '8',
        icon: 'Database',
        color: 'text-warning'
      },
      {
        title: '表数量',
        value: '156',
        icon: 'Grid',
        color: 'text-info'
      }
    ]);

    const recentConnections = ref([
      {
        id: 1,
        name: '本地MySQL',
        host: 'localhost',
        port: 3306,
        status: 'connected'
      },
      {
        id: 2,
        name: '测试数据库',
        host: '192.168.1.100',
        port: 5432,
        status: 'disconnected'
      }
    ]);

    const refreshConnections = () => {
      ElMessage.success('连接列表已刷新');
    };

    const createConnection = () => {
      ElMessage.info('打开新建连接对话框');
    };

    const connectToDatabase = (connection) => {
      ElMessage.success(`正在连接到 ${connection.name}`);
    };

    const openQueryEditor = () => {
      ElMessage.info('打开查询编辑器');
    };

    const openTables = () => {
      ElMessage.info('打开数据表管理');
    };

    const openSettings = () => {
      ElMessage.info('打开应用设置');
    };

    onMounted(() => {
      // 初始化仪表板数据
    });

    return {
      stats,
      recentConnections,
      refreshConnections,
      createConnection,
      connectToDatabase,
      openQueryEditor,
      openTables,
      openSettings
    };
  }
};
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

.stat-card {
  margin-bottom: 20px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  font-size: 32px;
  padding: 12px;
  border-radius: 8px;
  background-color: #f0f9ff;
}

.text-primary {
  color: #409eff;
}

.text-success {
  color: #67c23a;
}

.text-warning {
  color: #e6a23c;
}

.text-info {
  color: #909399;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
}

.stat-title {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.recent-connections {
  min-height: 200px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #909399;
}

.empty-state .el-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state p {
  margin-bottom: 16px;
}

.connection-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-bottom: 8px;
}

.connection-item:hover {
  background-color: #f5f7fa;
}

.connection-icon {
  font-size: 20px;
  color: #409eff;
  margin-right: 12px;
}

.connection-info {
  flex: 1;
}

.connection-name {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.connection-details {
  font-size: 12px;
  color: #909399;
}

.quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.action-btn {
  height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.action-btn .el-icon {
  font-size: 20px;
}
</style> 