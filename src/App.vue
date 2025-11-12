<template>
  <div id="app">
    <el-container class="app-container">
      <!-- 头部 -->
      <el-header class="app-header"  style="display:none">
        <div class="header-right">
        </div>
      </el-header>

      <!-- 主体内容 -->
      <el-container>
        <!-- 侧边栏 -->
        <el-aside  :width="sidebarCollapsed ? '64px' : '200px'" class="app-sidebar">
          <div class="sidebar-toggle" @click="toggleSidebar">
            <el-icon>
              <!-- <div v-if="sidebarCollapsed" >1</div>
              <div v-else >2</div> -->
              <Expand v-if="sidebarCollapsed" />
              <Fold v-else />
            </el-icon>
          </div>
          <el-menu
            :default-active="activeMenu"
            class="sidebar-menu"
            @select="handleMenuSelect"
            :collapse="sidebarCollapsed"
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
          <el-tabs
            v-model="editableTabsValue"
            type="card"
            closable
            @tab-remove="removeTab"
            @tab-click="clickTab"
          >
            <el-tab-pane
              v-for="item in editableTabs"
              :key="item.name"
              :label="item.title"
              :name="item.name"
            >
              <component :is="item.component"  v-bind="item.props || {}" />
            </el-tab-pane>
          </el-tabs>
        </el-main>
      </el-container>
    </el-container>
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
import { Monitor, Connection, Edit, Grid, Database, InfoFilled, Expand, Fold } from '@element-plus/icons-vue';

export default {
  name: 'App',
  components: {
    Dashboard,
    Connections,
    QueryEditor,
    Tables,
    Settings,
    // 注册图标组件
    Monitor,
    Connection,
    Edit,
    Grid,
    Database,
    InfoFilled,
    Expand,
    Fold
  },
  setup() {
    const activeMenu = ref('dashboard');
    const aboutVisible = ref(false);
    const appVersion = ref('1.0.0');
    const sidebarCollapsed = ref(false); 
    
    // tabs 相关数据
    const editableTabsValue = ref('dashboard');
    const editableTabs = ref([
      {
        title: '数据仪表盘',
        name: 'dashboard',
        component: 'Dashboard'
      }
    ]);
    
        // 菜单选择处理
    const handleMenuSelect = (index) => {
      activeMenu.value = index;
      
      // 为查询编辑器创建唯一标识，支持多开
      let tabName = index;
      let tabTitle = '';
      let component = '';
      let newIndex = 0;
      // 如果是查询编辑器，生成唯一标识
      if (index === 'query') {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 5);
        tabName = `query_${timestamp}_${randomId}`;
        // 计算已有查询编辑器的最大序号，生成查询编辑器(n) 格式的标题
        const existing = editableTabs.value
          .filter(t => t.title && t.title.startsWith('查询编辑器('))
          .map(t => {
            const m = t.title.match(/查询编辑器\((\d+)\)/);
            return m ? parseInt(m[1], 10) : 0;
          });
        const maxIndex = existing.length ? Math.max(...existing) : 0;
        newIndex = maxIndex + 1;
        tabTitle = `查询编辑器(${newIndex})`;
        component = 'QueryEditor';
      } else {
        // 查找或创建其他标签页
        let tab = editableTabs.value.find(tab => tab.name === index);
        
        if (!tab) {
          // 设置标签页标题和组件
          switch (index) {
            case 'dashboard':
              tabTitle = '数据仪表盘';
              component = 'Dashboard';
              break;
            case 'connections':
              tabTitle = '数据库连接';
              component = 'Connections';
              break;
            case 'tables':
              tabTitle = '数据表管理';
              component = 'Tables';
              break;
            case 'settings':
              tabTitle = '设置';
              component = 'Settings';
              break;
          }
          
          editableTabs.value.push({
            title: tabTitle,
            name: index,
            component: component
          });
        }
      }
      
      // 如果是查询编辑器，每次都创建新标签页
      if (index === 'query') {
        
        editableTabs.value.push({
          title: tabTitle,
          name: tabName,
          component: component,
          props: {
            tabId: newIndex
          }
        });
      }
      
      // 设置当前激活的标签页
      editableTabsValue.value = tabName;
    };

    // 切换侧边栏显示/隐藏
    const toggleSidebar = () => {
      console.log('toggleSidebar');
      sidebarCollapsed.value = !sidebarCollapsed.value;
    };

    

    // 标签页点击事件
    const clickTab = (tab) => {
      activeMenu.value = tab.props.name;
    };
    
    
    // 删除标签页
    const removeTab = (targetName) => {
      const tabs = editableTabs.value;
      let activeName = editableTabsValue.value;
      
      // 如果关闭的是查询编辑器标签页，直接关闭
      if (targetName.startsWith('query_')) {
        // 如果关闭的是当前激活的标签页，需要切换到其他标签页
        if (activeName === targetName) {
          const targetIndex = tabs.findIndex(tab => tab.name === targetName);
          const nextTab = tabs[targetIndex - 1] || tabs[targetIndex + 1];
          if (nextTab) {
            activeName = nextTab.name;
          }
        }
        
        editableTabsValue.value = activeName;
        activeMenu.value = activeName.startsWith('query_') ? 'query' : activeName;
        editableTabs.value = tabs.filter(tab => tab.name !== targetName);
        return;
      }
      
      // 对于非查询编辑器标签页，保持原有逻辑
      if (activeName === targetName) {
        tabs.forEach((tab, index) => {
          if (tab.name === targetName) {
            const nextTab = tabs[index + 1] || tabs[index - 1];
            if (nextTab) {
              activeName = nextTab.name;
            }
          }
        });
      }
      
      editableTabsValue.value = activeName;
      activeMenu.value = activeName;
      editableTabs.value = tabs.filter(tab => tab.name !== targetName);
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
      appVersion,
      handleMenuSelect,
      sidebarCollapsed, // 返回侧边栏折叠状态
      toggleSidebar, // 返回切换函数
      editableTabsValue,
      editableTabs,
      clickTab,
      removeTab
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
  position: relative;
}

.sidebar-menu {
  border-right: none;
  height: 100%;
  padding-top: 50px;
}


.sidebar-toggle {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 100;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  user-select: none; /* 防止文本选择 */
}

.sidebar-toggle:hover {
  background-color: #ecf5ff;
}

.sidebar-toggle .el-icon {
  font-size: 16px;
  color: #409eff;
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

.el-tabs {
  height: 100%;
}

.el-tabs__content {
  height: calc(100% - 55px);
}

.el-tab-pane {
  height: 100%;
}

.el-tabs__header {
  margin-bottom: 10px;
}
</style>