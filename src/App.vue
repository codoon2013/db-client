<template>
  <div id="app">
    <el-container class="app-container">
      <!-- 头部 -->
      <el-header class="app-header">
        <div class="header-left">
          <el-icon class="logo-icon"><Database /></el-icon>
          <span class="app-title">DB Client</span>
        </div>
        <div class="header-right">
          <el-button-group>
            <el-button size="small" @click="showAbout">
              <el-icon><InfoFilled /></el-icon>
              关于
            </el-button>
          </el-button-group>
        </div>
      </el-header>

      <!-- 主体内容 -->
      <el-container>
        <!-- 侧边栏 -->
        <el-aside width="250px" class="app-sidebar">
          <el-menu
            :default-active="activeMenu"
            class="sidebar-menu"
            @select="handleMenuSelect"
          >
            <el-menu-item index="dashboard">
              <el-icon><Monitor /></el-icon>
              <span>数据仪表盘</span>
            </el-menu-item>
            <el-menu-item index="connections">
              <el-icon><Connection /></el-icon>
              <span>数据库连接</span>
            </el-menu-item>
            <el-menu-item index="query">
              <el-icon><Edit /></el-icon>
              <span>查询编辑器</span>
            </el-menu-item>
            <el-menu-item index="tables">
              <el-icon><Grid /></el-icon>
              <span>数据表管理</span>
            </el-menu-item>
          </el-menu>
        </el-aside>

        <!-- 主内容区 -->
        <el-main class="app-main">
          <component :is="currentComponent" />
        </el-main>
      </el-container>
    </el-container>

    <!-- 关于对话框 -->
    <el-dialog
      v-model="aboutVisible"
      title="关于 DB Client"
      width="400px"
      center
    >
      <div class="about-content">
        <el-icon class="about-icon"><Database /></el-icon>
        <h3>DB Client</h3>
        <p>版本: {{ appVersion }}</p>
        <p>基于 Electron + Vue + Element Plus 构建</p>
        <p>一个现代化的数据库客户端工具</p>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import Dashboard from './components/Dashboard.vue';
import Connections from './components/Connections.vue';
import QueryEditor from './components/QueryEditor.vue';
import Tables from './components/Tables.vue';
import Settings from './components/Settings.vue';

export default {
  name: 'App',
  components: {
    Dashboard,
    Connections,
    QueryEditor,
    Tables,
    Settings
  },
  setup() {
    const activeMenu = ref('dashboard');
    const currentComponent = ref('Dashboard');
    const aboutVisible = ref(false);
    const appVersion = ref('1.0.0');

    // 菜单选择处理
    const handleMenuSelect = (index) => {
      activeMenu.value = index;
      switch (index) {
        case 'dashboard':
          currentComponent.value = 'Dashboard';
          break;
        case 'connections':
          currentComponent.value = 'Connections';
          break;
        case 'query':
          currentComponent.value = 'QueryEditor';
          break;
        case 'tables':
          currentComponent.value = 'Tables';
          break;
        case 'settings':
          currentComponent.value = 'Settings';
          break;
      }
    };

    // 显示关于对话框
    const showAbout = () => {
      aboutVisible.value = true;
    };

    // 处理菜单事件
    const handleMenuEvents = () => {
      if (window.electronAPI) {
        window.electronAPI.onMenuNew(() => {
          ElMessage.info('新建功能');
        });

        window.electronAPI.onMenuOpen(() => {
          ElMessage.info('打开功能');
        });

        window.electronAPI.onMenuAbout(() => {
          showAbout();
        });
      }
    };

    // 获取应用信息
    const getAppInfo = async () => {
      if (window.electronAPI) {
        try {
          appVersion.value = await window.electronAPI.getAppVersion();
        } catch (error) {
          console.error('获取应用版本失败:', error);
        }
      }
    };

    onMounted(() => {
      handleMenuEvents();
      getAppInfo();
    });

    onUnmounted(() => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('menu-new');
        window.electronAPI.removeAllListeners('menu-open');
        window.electronAPI.removeAllListeners('menu-about');
      }
    });

    return {
      activeMenu,
      currentComponent,
      aboutVisible,
      appVersion,
      handleMenuSelect,
      showAbout
    };
  }
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  height: 100vh;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}

.app-container {
  height: 100vh;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 24px;
}

.app-title {
  font-size: 18px;
  font-weight: bold;
}

.app-sidebar {
  background-color: #f5f7fa;
  border-right: 1px solid #e4e7ed;
}

.sidebar-menu {
  border-right: none;
  height: 100%;
}

.app-main {
  background-color: #ffffff;
  padding: 20px;
}

.about-content {
  text-align: center;
  padding: 20px 0;
}

.about-icon {
  font-size: 48px;
  color: #409eff;
  margin-bottom: 16px;
}

.about-content h3 {
  margin-bottom: 16px;
  color: #303133;
}

.about-content p {
  margin-bottom: 8px;
  color: #606266;
}
</style> 