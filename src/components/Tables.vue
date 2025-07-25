<template>
  <div class="tables">
    <div class="page-header">
      <h2>数据表管理</h2>
      <div class="header-actions">
        <el-select v-model="selectedConnection" placeholder="选择数据库连接" style="width: 200px; margin-right: 12px;">
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
          style="margin-right: 12px;"
          @click="toggleConnectionStatus"
        >
          {{ currentConnStatus === 'connected' ? '已连接' : '连接' }}
        </el-button>
        <el-select v-model="selectedDatabase" placeholder="选择数据库" style="width: 150px; margin-right: 12px;">
          <el-option
            v-for="db in availableDatabases"
            :key="db"
            :label="db"
            :value="db"
          />
        </el-select>
        <el-button type="primary" @click="refreshTables">
          <el-icon><Refresh /></el-icon>
          刷新数据表
        </el-button>
      </div>
    </div>

    <el-row :gutter="20" class="tables-container">
      <!-- 表列表 -->
      <el-col :span="8">
        <el-card shadow="hover" class="tables-list-card">
          <template #header>
            <div class="card-header">
              <span>数据表</span>
              <el-input
                v-model="tableSearch"
                placeholder="搜索表名"
                size="small"
                style="width: 150px;"
                clearable
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </div>
          </template>

          <div class="tables-list">
            <div v-if="!selectedConnection || !selectedDatabase" class="empty-state">
              <el-icon><Database /></el-icon>
              <p>请先选择数据库连接和数据库</p>
            </div>
            
            <div v-else-if="filteredTables.length === 0" class="empty-state">
              <el-icon><Grid /></el-icon>
              <p>暂无数据表</p>
            </div>
            
            <div v-else>
              <div
                v-for="table in filteredTables"
                :key="table.name"
                class="table-item"
                :class="{ active: selectedTable?.name === table.name }"
                @click="selectTable(table)"
              >
                <el-icon class="table-icon"><Grid /></el-icon>
                <div class="table-info">
                  <div class="table-name">{{ table.name }}</div>
                  <div class="table-details">
                    {{ table.rows }} 行 | {{ table.size }}
                  </div>
                </div>
                <div class="table-actions">
                                  <el-button type="text" size="small" @click.stop="openPreviewTable(table)">
                  <el-icon><View /></el-icon>
                </el-button>
                  <el-button type="text" size="small" @click.stop="editTable(table)">
                    <el-icon><Edit /></el-icon>
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 表详情 -->
      <el-col :span="16">
        <el-card shadow="hover" class="table-detail-card">
          <template #header>
            <div class="card-header">
              <span v-if="selectedTable">{{ selectedTable.name }} - 表详情</span>
              <span v-else>表详情</span>
              <div v-if="selectedTable" class="detail-actions">
                <el-button-group>
                    <el-button size="small" @click="openPreviewTable(selectedTable)">
                    <el-icon><View /></el-icon>
                        预览数据
                    </el-button>
                  <!-- <el-button size="small" @click="editTable(selectedTable)">
                    <el-icon><Edit /></el-icon>
                    编辑表
                  </el-button> -->
                  <el-button size="small" @click="importData(selectedTable)">
                    <el-icon><Upload /></el-icon>
                    导入数据
                  </el-button>
                  <!-- <el-button size="small" type="danger" @click="deleteTable(selectedTable)">
                    <el-icon><Delete /></el-icon>
                    删除表
                  </el-button> -->
                </el-button-group>
              </div>
            </div>
          </template>

          <div class="table-detail-content">
            <div v-if="!selectedTable" class="empty-detail">
              <el-icon><Grid /></el-icon>
              <p>请选择一个数据表查看详情</p>
            </div>
            
            <div v-else>
              <!-- 表信息 -->
              <el-descriptions title="表信息" :column="2" border>
                <el-descriptions-item label="表名">{{ selectedTable.name }}</el-descriptions-item>
                <el-descriptions-item label="行数">{{ selectedTable.rows }}</el-descriptions-item>
                <el-descriptions-item label="大小">{{ selectedTable.size }}</el-descriptions-item>
                <el-descriptions-item label="引擎">{{ selectedTable.engine }}</el-descriptions-item>
                <el-descriptions-item label="字符集">{{ selectedTable.charset }}</el-descriptions-item>
                <el-descriptions-item label="排序规则">{{ selectedTable.collation }}</el-descriptions-item>
              </el-descriptions>

              <!-- 表结构 -->
              <div class="table-structure">
                <h3>表结构</h3>
                <el-table :data="selectedTable.columns" style="width: 100%" border>
                  <el-table-column prop="name" label="字段名" width="150" />
                  <el-table-column prop="type" label="数据类型" width="120" />
                  <el-table-column prop="length" label="长度" width="80" />
                  <el-table-column prop="nullable" label="允许空值" width="100">
                    <template #default="{ row }">
                      <el-tag :type="row.nullable ? 'info' : 'danger'" size="small">
                        {{ row.nullable ? '是' : '否' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="default" label="默认值" width="120" />
                  <el-table-column prop="key" label="键" width="80">
                    <template #default="{ row }">
                      <el-tag v-if="row.key === 'PRI'" type="primary" size="small">主键</el-tag>
                      <el-tag v-else-if="row.key === 'UNI'" type="success" size="small">唯一</el-tag>
                      <el-tag v-else-if="row.key === 'MUL'" type="warning" size="small">索引</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="comment" label="注释" />
                </el-table>
              </div>

              <!-- 索引信息 -->
              <div class="table-indexes">
                <h3>索引信息</h3>
                <el-table :data="selectedTable.indexes" style="width: 100%" border>
                  <el-table-column prop="name" label="索引名" width="150" />
                  <el-table-column prop="type" label="类型" width="100" />
                  <el-table-column prop="columns" label="字段" />
                  <el-table-column prop="cardinality" label="基数" width="100" />
                </el-table>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 数据预览对话框 -->
    <el-dialog
      v-model="previewDialogVisible"
      :title="previewTable?.name ? `${previewTable.name} - 数据预览` : '数据预览'"
      width="80%"
      top="5vh"
      @closed="handlePreviewDialogClose"
    >
      <div class="preview-content">
        <div class="preview-toolbar">
          <el-input
            v-model="previewSearch"
            placeholder="搜索数据"
            style="width: 200px;"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button-group>
            <el-button size="small" @click="refreshPreview">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
            <!-- <el-button size="small" @click="exportPreview">
              <el-icon><Download /></el-icon>
              导出
            </el-button> -->
          </el-button-group>
        </div>

        <el-table 
          ref="previewTable"
          :data="previewData" 
          style="width: 100%"
          max-height="400"
          border
          table-layout="fixed"
        >
          <el-table-column
            v-for="column in previewColumns"
            :key="column"
            :prop="column"
            :label="column"
            min-width="120"
          />
        </el-table>

        <div class="preview-pagination">
          <el-pagination
            v-model:current-page="previewPage"
            v-model:page-size="previewPageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="previewTotal"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handlePreviewSizeChange"
            @current-change="handlePreviewPageChange"
          />
        </div>
      </div>
    </el-dialog>

    <!-- Excel 预览对话框 -->
    <el-dialog
      v-model="excelPreviewVisible"
      title="Excel 预览"
      width="80%"
      top="5vh"
      destroy-on-close
    >
      <div class="preview-content">
        <div class="preview-toolbar">
          <div class="excel-info">
            <span>文件名：{{ excelFileName }}</span>
            <span class="excel-sheet-info">
              <el-select v-model="selectedSheet" size="small" placeholder="选择工作表" @change="handleSheetChange">
                <el-option
                  v-for="sheet in sheetList"
                  :key="sheet"
                  :label="sheet"
                  :value="sheet"
                />
              </el-select>
              <span class="sheet-count">共 {{ sheetList.length }} 个工作表</span>
            </span>
          </div>
          <el-button-group>
            <el-button size="small" type="primary" @click="confirmImport" :loading="importing">
              <el-icon><Check /></el-icon>
              确认导入
            </el-button>
          </el-button-group>
        </div>

        <el-table 
          ref="excelPreviewTable"
          :data="excelPreviewData" 
          style="width: 100%"
          max-height="400"
          border
          table-layout="fixed"
        >
          <el-table-column
            v-for="column in excelPreviewColumns"
            :key="column"
            :prop="column"
            :label="column"
            min-width="120"
          />
        </el-table>

        <div class="preview-info">
          <p>共 {{ excelTotal }} 条数据，以上显示前 10 条预览</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Database, Grid, View, Edit, Upload, Delete, Refresh, Search, Download } from '@element-plus/icons-vue';

const selectedConnection = ref(null);
const selectedDatabase = ref(null);
const selectedTable = ref(null);
const tableSearch = ref('');
const previewDialogVisible = ref(false);
const previewTable = ref(null);
const currentPreviewTable = ref(null);
const previewSearch = ref('');
const previewPage = ref(1);
const previewPageSize = ref(20);
const previewTotal = ref(0);

const availableConnections = ref([]);
const availableDatabases = ref([]);

const tables = ref([]);

const previewData = ref([]);
const previewColumns = ref([]);
const previewTableRef = ref(null);


// Excel 预览相关的响应式数据
const excelPreviewVisible = ref(false);
const excelFileName = ref('');
const selectedSheet = ref('');
const sheetList = ref([]);
const excelPreviewData = ref([]);
const excelPreviewColumns = ref([]);
const excelTotal = ref(0);
const importing = ref(false);
const importFilePath = ref('');

const filteredTables = computed(() => {
  if (!tableSearch.value) return tables.value;
  return tables.value.filter(table => 
    table.name.toLowerCase().includes(tableSearch.value.toLowerCase())
  );
});

const selectTable = async (table) => {
  selectedTable.value = table;
  const conn = availableConnections.value.find(c => c.id === selectedConnection.value);
  if (!conn || !conn.status === 'connected') return;
  try {
    const structure = await window.electronAPI.getTableStructure(conn.connectionId, selectedDatabase.value, table.name);
    selectedTable.value = {
      ...table,
      columns: structure.columns || [],
      indexes: structure.indexes || []
    };
  } catch (error) {
    ElMessage.error('获取表结构失败: ' + error.message);
    selectedTable.value = {
      ...table,
      columns: [],
      indexes: []
    };
  }
};

const refreshTables = async () => {
  if (!selectedConnection.value || !selectedDatabase.value) {
    ElMessage.warning('请先选择数据库连接和数据库');
    return;
  }
  const conn = availableConnections.value.find(c => c.id === selectedConnection.value);
  if (!conn || conn.status !== 'connected') {
    ElMessage.error('数据库未连接，无法刷新数据表');
    return;
  }
  try {
    const tableList = await window.electronAPI.getTables(conn.connectionId, selectedDatabase.value);
    tables.value = tableList;
    ElMessage.success('表列表已刷新');
  } catch (error) {
    ElMessage.error('获取表列表失败: ' + error.message);
  }
};

const openPreviewTable = (table) => {
  if (!table || !table.name) {
    ElMessage.error('无效的表信息');
    return;
  }
  
  console.log('===============================');
  console.log('开始打开预览表');
  console.log('当前表:', table.name);
  
  // 先复制表数据，避免后续操作影响原始数据
  const tableData = { ...table };
  console.log('表数据副本:', tableData.name);
  
  // 设置状态
  previewPage.value = 1;
  previewTotal.value = tableData.rows || 0;
  previewTable.value = tableData;
  
  // 显示对话框
  previewDialogVisible.value = true;
  
  // 确认预览表设置成功
  console.log('预览表设置后:', previewTable.value?.name);
  
  // 加载数据
  loadPreviewData();
};

const editTable = (table) => {
  ElMessage.info(`编辑表: ${table.name}`);
};

const deleteTable = async (table) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除表 "${table.name}" 吗？此操作不可恢复！`,
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    const index = tables.value.findIndex(t => t.name === table.name);
    if (index !== -1) {
      tables.value.splice(index, 1);
      if (selectedTable.value?.name === table.name) {
        selectedTable.value = null;
      }
      ElMessage.success('表已删除');
    }
  } catch {
    // 用户取消
  }
};

const importData = async (table) => {
  if (!table) {
    ElMessage.warning('请先选择一个表以导入数据。');
    return;
  }

  
  const conn = availableConnections.value.find(c => c.id === selectedConnection.value);
  if (!conn || conn.status !== 'connected') {
    ElMessage.error('数据库未连接，无法导入数据。');
    return;
  }

  try {
    // 第一步：选择文件
    const result = await window.electronAPI.showOpenDialog({
      title: '选择 Excel 文件',
      filters: [
        { name: 'Excel 文件', extensions: ['xlsx', 'xls'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled || !result.filePaths?.length) {
      return; // 用户取消选择
    }

    const filePath = result.filePaths[0];

    // 第二步：获取预览数据
    const preview = await window.electronAPI.getSheetPreview(filePath, null);
    if (preview.success) {
      // 显示 Excel 预览
      excelPreviewData.value = preview.data;
      excelPreviewColumns.value = preview.columns;
      excelTotal.value = preview.total;
      // 使用正则表达式同时处理 Windows 和 Unix 风格的路径
      excelFileName.value = filePath.replace(/^.*[/\\]/, '');
      importFilePath.value = filePath;
      sheetList.value = preview.sheets || ['Sheet1'];
      selectedSheet.value = preview.sheets?.[0] || 'Sheet1';
      excelPreviewVisible.value = true;
    } else if (!preview.preview && preview.success) {
      ElMessage.success(preview.message);
      refreshTables();
    } else {
      if (preview.message !== '导入已取消') {
        ElMessage.error(preview.message);
      }
    }
  } catch (error) {
    console.error('导入数据时发生错误:', error);
    ElMessage.error(`导入失败: ${error.message}`);
  }
};

// 处理工作表切换
const handleSheetChange = async (sheetName) => {
  try {
    const preview = await window.electronAPI.getSheetPreview(importFilePath.value, sheetName);
    if (preview.success) {
      excelPreviewData.value = preview.data;
      excelPreviewColumns.value = preview.columns;
      excelTotal.value = preview.total;
    } else {
      ElMessage.error('加载工作表失败：' + preview.message);
    }
  } catch (error) {
    console.error('切换工作表失败:', error);
    ElMessage.error('切换工作表失败：' + error.message);
  }
};

// 确认导入
const confirmImport = async () => {
  if (!importFilePath.value) {
    ElMessage.error('没有找到要导入的文件');
    return;
  }

  const conn = availableConnections.value.find(c => c.id === selectedConnection.value);
  if (!conn || !conn.status === 'connected' || !selectedTable.value) {
    ElMessage.error('连接状态异常，请重试');
    return;
  }

  importing.value = true;
  try {
    const result = await window.electronAPI.importFromFile(
      conn.connectionId,
      selectedTable.value.name,
      importFilePath.value,
      selectedSheet.value
    );

    if (result.success) {
      excelPreviewVisible.value = false;
      ElMessage.success(result.message);
      refreshTables();
    } else {
      ElMessage.error(result.message);
    }
  } catch (error) {
    console.error('导入数据时发生错误:', error);
    ElMessage.error(`导入失败: ${error.message}`);
  } finally {
    importing.value = false;
  }
};

const loadPreviewData = async () => {
  // 在函数开始时就创建预览表的深拷贝
  if (previewTable.value && previewTable.value.name) {
      currentPreviewTable.value = previewTable.value.name;
  }
  
  // 确保有效的预览表和对话框打开状态
  if (!previewDialogVisible.value || !currentPreviewTable.value) {
    console.log('对话框未打开或预览表无效，终止加载');
    return;
  }

  const conn = availableConnections.value.find(c => c.id === selectedConnection.value);
  if (!conn || conn.status !== 'connected' || !selectedDatabase.value) {
    previewData.value = [];
    previewColumns.value = [];
    return;
  }

  try {
    const result = await window.electronAPI.getTableData(
      conn.connectionId,
      selectedDatabase.value,
      currentPreviewTable.value,
      {
        page: previewPage.value,
        pageSize: previewPageSize.value,
        search: previewSearch.value
      }
    );

    if (result.success) {
      // 再次检查对话框是否仍然打开
      if (!previewDialogVisible.value) {
        return;
      }
      previewData.value = result.data || [];
      if (result.data?.length > 0) {
        previewColumns.value = Object.keys(result.data[0]);
      }
      previewTotal.value = result.total || 0;
    } else {
      ElMessage.error('获取预览数据失败：' + result.message);
      previewData.value = [];
      previewColumns.value = [];
    }
  } catch (error) {
    ElMessage.error('加载预览数据失败：' + error.message);
    previewData.value = [];
    previewColumns.value = [];
  }
  
};

const refreshPreview = () => {
  loadPreviewData();
  ElMessage.success('预览数据已刷新');
};

// 导出预览数据
const exportPreview = async () => {
  const conn = availableConnections.value.find(c => c.id === selectedConnection.value);
  if (!conn || conn.status !== 'connected' || !selectedDatabase.value || !previewTable.value) {
    ElMessage.warning('请确保数据库已连接且已选择表');
    return;
  }

  try {
    // 获取所有数据（不分页）
    const result = await window.electronAPI.getTableData(
      conn.connectionId,
      selectedDatabase.value,
      previewTable.value.name,
      {
        page: 1,
        pageSize: -1, // 表示获取所有数据
        search: previewSearch.value
      }
    );

    if (result.success && result.data) {
      // 调用主进程导出数据
      const exportResult = await window.electronAPI.exportToExcel(
        result.data,
        `${previewTable.value.name}_export_${new Date().toISOString().split('T')[0]}.xlsx`
      );
      
      if (exportResult.success) {
        ElMessage.success('数据已成功导出');
      } else {
        ElMessage.error('导出失败：' + exportResult.message);
      }
    } else {
      ElMessage.error('获取导出数据失败');
    }
  } catch (error) {
    console.error('导出数据时发生错误:', error);
    ElMessage.error('导出失败：' + error.message);
  }
};

const handlePreviewSizeChange = (size) => {
  previewPageSize.value = size;
  previewPage.value = 1;
  loadPreviewData();
};

const handlePreviewPageChange = (page) => {
  previewPage.value = page;
  loadPreviewData();
};

// 监听搜索
watch(previewSearch, () => {
  if (previewDialogVisible.value) {
    previewPage.value = 1; // 重置到第一页
    loadPreviewData();
  }
});

const loadConnections = async () => {
  const saved = await window.electronAPI.getConnections();
  saved.forEach(conn => {
    if (!('status' in conn)) conn.status = 'disconnected';
  });
  availableConnections.value = saved;
};

const loadDatabases = async () => {
  const conn = availableConnections.value.find(c => c.id === selectedConnection.value);
  if (!conn || !conn.connectionId) {
    availableDatabases.value = [];
    return;
  }
  try {
    const dbs = await window.electronAPI.getDatabases(conn.connectionId);
    availableDatabases.value = dbs;
  } catch (error) {
    availableDatabases.value = [];
    ElMessage.error('获取数据库列表失败: ' + error.message);
  }
};

const currentConnStatus = computed(() => {
  const conn = availableConnections.value.find(c => c.id === selectedConnection.value);
  return conn?.status === 'connected' ? 'connected' : 'disconnected';
});

const toggleConnectionStatus = async () => {
  const conn = availableConnections.value.find(c => c.id === selectedConnection.value);
  if (!conn) return;
  
  // 记录当前预览状态
  // const currentPreviewTable = previewTable.value;
  try {
    if (conn.status === 'connected') {
      const connectionId = `${conn.type}_${conn.host}_${conn.port}_${conn.database}`;
      await window.electronAPI.closeDatabaseConnection(connectionId);
      conn.status = 'disconnected';
      ElMessage.success('连接已断开');
      // 清理预览和选中状态
      previewDialogVisible.value = false;
      previewTable.value = null;
      selectedTable.value = null;
      console.log('连接已断开，清理预览状态');
    } else {
      const plainConn = JSON.parse(JSON.stringify(conn));
      const result = await window.electronAPI.establishDatabaseConnection(plainConn);
      if (result.success) {
        conn.status = 'connected';
        conn.connectionId = result.connectionId;
        ElMessage.success('连接成功');
        loadDatabases();
      } else {
        ElMessage.error('连接失败：' + result.message);
      }
    }
    // await loadConnections();
  } catch (error) {
    ElMessage.error('操作失败：' + error.message);
  }
};

watch(selectedConnection, async () => {
  selectedDatabase.value = null;
  loadDatabases();
});

watch(selectedDatabase, () => {
  refreshTables();
});

onMounted(() => {
  loadConnections();
});

const handlePreviewDialogClose = () => {
  console.log('对话框关闭前的预览表:', previewTable.value?.name);
  // 只清理数据和分页相关的状态，保留预览表的引用
  previewData.value = [];
  previewColumns.value = [];
  previewPage.value = 1;
  previewSearch.value = '';
  // 不清除 previewTable，保持引用
  console.log('对话框关闭后的预览表:', previewTable.value?.name);
};
// Excel 预览相关的响应式数据
// ...existing code...
</script>

<style scoped>
.tables {
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

.tables-container {
  height: calc(100vh - 200px);
}

.tables-list-card,
.table-detail-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tables-list {
  flex: 1;
  overflow-y: auto;
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

.table-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-bottom: 8px;
}

.table-item:hover {
  background-color: #f5f7fa;
}

.table-item.active {
  background-color: #e6f7ff;
  border: 1px solid #91d5ff;
}

.table-icon {
  font-size: 20px;
  color: #409eff;
  margin-right: 12px;
}

.table-info {
  flex: 1;
}

.table-name {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.table-details {
  font-size: 12px;
  color: #909399;
}

.table-actions {
  opacity: 0;
  transition: opacity 0.3s;
}

.table-item:hover .table-actions {
  opacity: 1;
}

.table-detail-content {
  flex: 1;
  overflow-y: auto;
}

.empty-detail {
  text-align: center;
  padding: 40px 20px;
  color: #909399;
}

.empty-detail .el-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.table-structure,
.table-indexes {
  margin-top: 24px;
}

.table-structure h3,
.table-indexes h3 {
  margin-bottom: 16px;
  color: #303133;
  font-size: 16px;
}

.preview-content {
  padding: 20px 0;
}

.preview-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.preview-pagination {
  margin-top: 16px;
  text-align: center;
}

.excel-info {
  display: flex;
  align-items: center;
  gap: 20px;
  color: #606266;
}

.excel-sheet-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sheet-count {
  color: #909399;
  font-size: 13px;
}

.preview-info {
  margin-top: 16px;
  color: #909399;
  font-size: 13px;
  text-align: center;
}
</style>