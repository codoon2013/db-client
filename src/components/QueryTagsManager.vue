<template>
  <div class="query-tags-manager">
    <div class="page-header">
      <h2>查询标签管理</h2>
      <div class="header-actions">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索标签..."
          clearable
          style="width: 200px"
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" @click="refreshTags">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>


    <!-- 标签列表 -->
    <el-card shadow="hover" class="tags-card">
      <template #header>
        <div class="card-header">
          <span>查询标签列表</span>
          <el-button type="danger" size="small" @click="showClearDialog">
            <el-icon><Delete /></el-icon>
            清理
          </el-button>
        </div>
      </template>

      <el-table
        :data="filteredTags"
        style="width: 100%"
        v-loading="loading"
        border
      >
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="key" label="Storage Key" min-width="250">
          <template #default="{ row }">
            <code class="storage-key">{{ row.key }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="标签名称" min-width="200">
          <template #default="{ row }">
            <el-tag size="large" effect="dark" type="primary" class="tag-fullname">
              {{ row.name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="contentLength" label="内容长度" width="100">
          <template #default="{ row }">
            {{ row.contentLength }} 字符
          </template>
        </el-table-column>
        <el-table-column prop="updateTime" label="最后更新时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.updateTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button type="primary" size="small" @click="openTag(row.name)">
                <el-icon><Edit /></el-icon>
                打开
              </el-button>
              <el-button type="info" size="small" @click="viewContent(row)">
                <el-icon><View /></el-icon>
                查看
              </el-button>
              <el-button type="danger" size="small" @click="deleteTag(row)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="filteredTags.length === 0" description="暂无查询标签" />
    </el-card>

    <!-- 表结构缓存 -->
    <el-card shadow="hover" class="structure-card" style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <span>表结构缓存 (structureKey)</span>
          <el-button type="danger" size="small" @click="clearAllStructureCache">
            <el-icon><Delete /></el-icon>
            清空所有缓存
          </el-button>
        </div>
      </template>

      <el-table
        :data="structureKeys"
        style="width: 100%"
        border
      >
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="connectionId" label="连接ID" width="100" />
        <el-table-column prop="database" label="数据库" min-width="150" />
        <el-table-column prop="tableCount" label="表数量" width="100">
          <template #default="{ row }">
            <el-tag type="success">{{ row.tableCount }} 个表</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="timestamp" label="缓存时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.timestamp) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" size="small" @click="deleteStructureKey(row.key)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 查看内容对话框 -->
    <el-dialog v-model="viewDialogVisible" title="SQL内容预览" width="800px">
      <div class="sql-preview">
        <pre>{{ currentViewContent }}</pre>
      </div>
      <template #footer>
        <el-button @click="viewDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="copyContent">复制内容</el-button>
      </template>
    </el-dialog>

    <!-- 清理对话框 -->
    <el-dialog v-model="clearDialogVisible" title="清理标签" width="400px">
      <el-form :model="clearForm" label-width="120px">
        <el-form-item label="清理范围">
          <el-radio-group v-model="clearForm.scope">
            <el-radio label="empty">仅空标签</el-radio>
            <el-radio label="all">所有标签</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="clearDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmClear">确定清理</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Search, Refresh, Download, Delete, Edit, View
} from '@element-plus/icons-vue';

const emit = defineEmits(['openQueryTag']);

// 数据
const allTags = ref([]);
const structureKeys = ref([]);
const loading = ref(false);
const searchKeyword = ref('');

// 对话框
const viewDialogVisible = ref(false);
const clearDialogVisible = ref(false);
const currentViewContent = ref('');
const currentViewTag = ref('');

const clearForm = ref({
  scope: 'empty'
});

// 过滤后的标签
const filteredTags = computed(() => {
  if (!searchKeyword.value) return allTags.value;
  const keyword = searchKeyword.value.toLowerCase();
  return allTags.value.filter(tag => 
    tag.name.toLowerCase().includes(keyword)
  );
});

// 有内容的标签
const tagsWithContent = computed(() => {
  return allTags.value.filter(tag => tag.hasContent);
});

// 空标签
const emptyTags = computed(() => {
  return allTags.value.filter(tag => !tag.hasContent);
});

// 加载所有标签
const loadTags = () => {
  loading.value = true;
  try {
    const tags = [];
    const structures = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // 查询标签 - 以 queryEditorContent_ 开头的都是
      // 格式: queryEditorContent_xxx -> 标签名: xxx (queryEditorContent_ 后面的全部内容)
      // 举例: queryEditorContent_editor_1 -> 标签名: editor_1
      // 举例: queryEditorContent_editor_ -> 标签名: editor_ (空)
      if (key.startsWith('queryEditorContent_')) {
        const tagName = key.substring('queryEditorContent_'.length);
        const content = localStorage.getItem(key) || '';
        tags.push({
          name: tagName,
          key: key,
          hasContent: content.length > 0,
          contentLength: content.length,
          content: content,
          updateTime: getStorageItemTime(key)
        });
      }

      // 表结构缓存
      if (key.startsWith('tableStructure_')) {
        const match = key.match(/tableStructure_(.+)/);
        if (match && match[1]) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            const tableCount = data.tableInfo ? Object.keys(data.tableInfo).length : 0;
            structures.push({
              key: key,
              connectionId: match[1],
              database: data.database || '未知',
              tableCount: tableCount,
              timestamp: data.timestamp || 0
            });
          } catch (e) {
            console.error('解析表结构缓存失败:', key);
          }
        }
      }
    }

    allTags.value = tags.sort((a, b) => b.updateTime - a.updateTime);
    structureKeys.value = structures.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('加载标签失败:', error);
    ElMessage.error('加载标签失败');
  } finally {
    loading.value = false;
  }
};

// 获取存储项的时间（模拟，localStorage 不存储时间）
const getStorageItemTime = (key) => {
  // 这里返回当前时间，实际应用中可能需要额外存储时间
  return Date.now();
};

// 刷新
const refreshTags = () => {
  loadTags();
  ElMessage.success('刷新成功');
};

// 搜索
const handleSearch = () => {
  // 已使用 computed 自动过滤
};

// 打开标签
const openTag = (tagName) => {
  console.log("11111",tagName)
  emit('openQueryTag', tagName);
};

// 查看内容
const viewContent = (tag) => {
  currentViewTag.value = tag.name;
  currentViewContent.value = tag.content || '-- 无内容 --';
  viewDialogVisible.value = true;
};

// 复制内容
const copyContent = async () => {
  try {
    await navigator.clipboard.writeText(currentViewContent.value);
    ElMessage.success('内容已复制');
  } catch (error) {
    ElMessage.error('复制失败');
  }
};

// 删除标签
const deleteTag = (tag) => {
  ElMessageBox.confirm(
    `确定删除标签 "${tag.name}" 吗？此操作不可恢复。`,
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // 使用实际的 key 删除，而不是重新构造
    localStorage.removeItem(tag.key);
    loadTags();
    ElMessage.success('删除成功');
  }).catch(() => {});
};

// 删除表结构缓存
const deleteStructureKey = (key) => {
  ElMessageBox.confirm('确定删除此表结构缓存吗？', '确认删除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    localStorage.removeItem(key);
    loadTags();
    ElMessage.success('删除成功');
  }).catch(() => {});
};

// 清空所有表结构缓存
const clearAllStructureCache = () => {
  ElMessageBox.confirm('确定清空所有表结构缓存吗？', '确认清空', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    const keysToDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('tableStructure_')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => localStorage.removeItem(key));
    loadTags();
    ElMessage.success(`已清空 ${keysToDelete.length} 个缓存`);
  }).catch(() => {});
};

// 显示清理对话框
const showClearDialog = () => {
  clearDialogVisible.value = true;
};

// 确认清理
const confirmClear = () => {
  const keysToDelete = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    // 以 queryEditorContent_ 开头的都是查询标签
    if (key && key.startsWith('queryEditorContent_')) {
      if (clearForm.value.scope === 'all') {
        keysToDelete.push(key);
      } else {
        // 仅空标签
        const content = localStorage.getItem(key);
        if (!content || content.length === 0) {
          keysToDelete.push(key);
        }
      }
    }
  }

  keysToDelete.forEach(key => localStorage.removeItem(key));
  loadTags();
  clearDialogVisible.value = false;
  ElMessage.success(`已清理 ${keysToDelete.length} 个标签`);
};

// 导出标签清单
const exportTags = async () => {
  if (allTags.value.length === 0) {
    ElMessage.warning('暂无标签可导出');
    return;
  }

  try {
    const lines = allTags.value.map((tag, index) => {
      const status = tag.hasContent ? '有内容' : '空';
      return `${index + 1}. ${tag.name} [${status}] - ${tag.contentLength}字符`;
    });
    
    const content = `查询标签清单\n生成时间: ${new Date().toLocaleString()}\n总计: ${allTags.value.length} 个标签\n\n${lines.join('\n')}`;
    
    const result = await window.electronAPI.showSaveDialog({
      defaultPath: `查询标签清单_${new Date().toISOString().split('T')[0]}.txt`,
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      await window.electronAPI.saveSQLFile(result.filePath, content);
      ElMessage.success('导出成功');
    }
  } catch (error) {
    ElMessage.error('导出失败: ' + error.message);
  }
};

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return '未知';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN');
};

onMounted(() => {
  loadTags();
});
</script>

<style scoped>
.query-tags-manager {
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
  gap: 12px;
  align-items: center;
}

.stats-row {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tags-card,
.structure-card {
  margin-bottom: 20px;
}

.sql-preview {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 4px;
  max-height: 400px;
  overflow: auto;
}

.sql-preview pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
}

:deep(.el-statistic__content) {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
}

:deep(.el-statistic__title) {
  font-size: 14px;
  color: #909399;
}

/* 标签全名显示 */
.tag-fullname {
  max-width: none !important;
  white-space: nowrap !important;
  overflow: visible !important;
  text-overflow: clip !important;
}

.tags-list .tag-item {
  max-width: none !important;
  white-space: nowrap !important;
}

/* Storage Key 样式 */
.storage-key {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: #606266;
  background: #f5f7fa;
  padding: 4px 8px;
  border-radius: 4px;
  word-break: break-all;
}

:deep(.el-statistic__title) {
  font-size: 14px;
  color: #909399;
}
</style>
