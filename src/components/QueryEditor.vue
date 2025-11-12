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
        <el-button
          type="primary"
          size="small"
          @click="refreshTableStructure"
          :loading="refreshingStructure"
          :disabled="currentConnStatus !== 'connected'"
        >
          <el-icon><Refresh /></el-icon>
          刷新表结构
          <span v-if="loadingProgress.total > 0">
            ({{ loadingProgress.current }}/{{ loadingProgress.total }})
          </span>
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
          
          <div class="sql-editor" :style="{height: editorHeight + 'px'}">
            <div id="editor" style="width:100%;height:100%"></div>
            <div
              class="resize-bar"
              @mousedown="startResize"
            ></div>
          </div>
          <div style="display: flex; justify-content: flex-end; margin-top: 8px; gap: 8px;">
              <el-button-group>
                <el-button type="primary" @click="executeQuery" :loading="executing">
                  <el-icon><VideoPlay /></el-icon>
                  执行
                </el-button>
                <el-button @click="clearQuery">
                  <el-icon><Delete /></el-icon>
                  清空
                </el-button>
                <el-button @click="loadSQLFile">
                  <el-icon><Upload /></el-icon>
                  加载
                </el-button>
                <el-button @click="saveSQLFile">
                  <el-icon><Folder /></el-icon>
                  保存
                </el-button>
              </el-button-group>
            </div>


          <!-- 删除查询模板 el-collapse 区域 -->
        </el-card>
      </el-col>

      <!-- 查询结果 -->
      <el-col :span="24">
        <el-card shadow="hover" class="result-card">
          <template #header>
            <div class="card-header">
              <span>查询结果:{{ currentTableName }}</span>
              <div class="result-actions">
                <el-tag v-if="queryResult" :type="queryResult.success ? 'success' : 'danger'">
                  {{ queryResult.success ? '执行成功' : '执行失败' }}
                </el-tag>
                <el-button-group>
                  <el-button type="primary" @click="exportToExcel" :disabled="!queryResult || !queryResult.success">
                    <el-icon><Upload /></el-icon>
                    导出Excel
                  </el-button>
                  <el-button type="primary" @click="exportToCSV" :disabled="!queryResult || !queryResult.success">
                    <el-icon><Upload /></el-icon>
                    导出CSV
                  </el-button>
                  <el-button type="primary" @click="exportToSQL" :disabled="!queryResult || !queryResult.success">
                    <el-icon><Upload /></el-icon>
                    导出SQL
                  </el-button>
                </el-button-group>
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
                  ref="resultTable"
                >
                  <el-table-column
                    v-for="column in queryResult.columns"
                    :key="column"
                    :prop="column"
                    :label="column"
                    min-width="120"
                  >
                    <template #default="scope">
                      {{ formatCellValue(scope.row[column], column)  }}
                    </template>
                  </el-table-column>
                  <el-table-column
                    label="操作"
                    width="150"
                    fixed="right"
                    v-if="shouldShowActions(queryResult.data)"
                  >
                    <template #default="scope">
                      <el-button 
                        type="primary" 
                        size="small" 
                        @click="editRow(scope.row, scope.$index)"
                        :disabled="editingRow === scope.$index"
                      >
                        编辑
                      </el-button>
                      <el-button 
                        type="danger" 
                        size="small" 
                        @click="deleteRow(scope.row, scope.$index)"
                      >
                        删除
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>

                <!-- 编辑对话框 -->
                <el-dialog 
                  v-model="editDialogVisible" 
                  title="编辑数据" 
                  width="800px"
                  :before-close="handleEditDialogClose"
                  class="edit-dialog"
                >
        
                  <el-form 
                    :model="editForm" 
                    label-width="200px" 
                    ref="editFormRef"
                    class="edit-form"
                  >
                  <div class="form-content">
                    <el-form-item 
                      v-for="column in queryResult.columns" 
                      :key="column"
                      :label="column"
                    >
                      <el-input 
                        v-model="editForm[column]" 
                        :placeholder="`请输入${column}`"
                      />
                    </el-form-item>
                  </div>
                  </el-form>
                  <template #footer>
                    <span class="dialog-footer">
                      <el-button @click="cancelEdit">取消</el-button>
                      <el-button 
                        type="primary" 
                        @click="confirmEdit"
                        :loading="editLoading"
                      >
                        确认
                      </el-button>
                    </span>
                  </template>
                </el-dialog>  

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

<script setup>
    import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue';
    import { ElMessage,ElMessageBox } from 'element-plus';
    // import { editor as MonacoEditor } from 'monaco-editor';  
    import * as MonacoEditor from 'monaco-editor';

    // 添加编辑相关的响应式数据
    const editingRow = ref(-1);
    const editDialogVisible = ref(false);
    const editForm = reactive({});
    const editLoading = ref(false);
    const editFormRef = ref(null);
    const resultTable = ref(null);
    const originalRowData = ref(null);
    const currentRowIndex = ref(-1);

    const selectedConnection = ref(null);
    const sqlQuery = ref('select * from user limit 10');
    const executing = ref(false);
    const activeTemplate = ref([]);
    const saveDialogVisible = ref(false);
    const queryResult = ref(null);
    const editorHeight = ref(200); // 初始高度
    const refreshingStructure = ref(false); 
    const loadingProgress = ref({ current: 0, total: 0 }); // 添加进度跟踪
    const connections = ref([]);
    const availableConnections = ref([]);

    // 添加用于存储表名的响应式变量
    const currentTableName = ref(null);
    const currentSql = ref(null);

    const saveForm = reactive({
      name: '',
      description: ''
    });

    let monacoInstance = null;
    let completionProvider = null;
    // 存储表名和字段信息
    const tableInfo = ref({});

    // 监听数据库连接变化，关闭之前的连接
    watch(selectedConnection, async (newConnId, oldConnId) => {
      // 如果有旧的连接且与新连接不同，则关闭旧连接
      if (oldConnId && oldConnId !== newConnId) {
        const oldConn = availableConnections.value.find(c => c.id === oldConnId);
        if (oldConn && oldConn.status === 'connected') {
          try {
            const connectionId = `${oldConn.id}`;
            await window.electronAPI.closeDatabaseConnection(connectionId);
            oldConn.status = 'disconnected';
            // ElMessage.success(`已断开连接: ${oldConn.name}`);
          } catch (error) {
            console.error('关闭旧连接失败:', error);
          }
        }
      }
    });

    const startResize = (e) => {
      const startY = e.clientY;
      const startHeight = editorHeight.value;

      const onMouseMove = (moveEvent) => {
        const delta = moveEvent.clientY - startY;
        editorHeight.value = Math.max(100, startHeight + delta); // 最小高度100px
        if (monacoInstance) {
          // 使用防抖函数避免频繁触发layout
          requestAnimationFrame(() => {
            monacoInstance.layout();
          });
        }
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };


    const isEditableTable = (data) => {
      if (!data || data.length === 0) return false;
      // 检查是否是SELECT查询的结果（简单判断）
      const queryText = sqlQuery.value.trim().toUpperCase();
      return queryText.startsWith('SELECT') && !queryText.includes('JOIN');
    };

    const shouldShowActions = (data) => {
      if (!data || data.length === 0) return false;
      
      // 检查是否是SELECT查询
      const queryText = currentSql.value.trim().toUpperCase();
      if (!queryText.startsWith('SELECT')) return false;
      
      // 不显示JOIN查询的操作列
      if (queryText.includes('JOIN')) return false;
      
      // 检查是否有主键（简化处理，至少需要一个列）
      return queryResult.value && queryResult.value.columns && queryResult.value.columns.length > 0;
    };

    const editRow = (row, index) => {
      editingRow.value = index;
      currentRowIndex.value = index;
      originalRowData.value = { ...row };
      
      // 填充表单数据
      queryResult.value.columns.forEach(column => {
        editForm[column] = formatCellValue(row[column]);
      });
      
      editDialogVisible.value = true;
    };

    // 刷新表结构信息
    const refreshTableStructure = async () => {
      const conn = availableConnections.value.find(c => c.id === selectedConnection.value);
      if (!conn || conn.status !== 'connected' || !conn.connectionId) {
        ElMessage.warning('请先连接数据库');
        return;
      }

      refreshingStructure.value = true;
      try {
        await loadTableStructure(conn.connectionId, conn.database);
        
        // 保存表结构到本地存储
        const structureKey = `tableStructure_${conn.id}`;
        const structureData = {
          database: conn.database,
          tableInfo: tableInfo.value,
          timestamp: Date.now()
        };
        localStorage.setItem(structureKey, JSON.stringify(structureData));
        
        ElMessage.success('表结构刷新成功并已保存到本地');
      } catch (error) {
        ElMessage.error('刷新表结构失败: ' + error.message);
      } finally {
        refreshingStructure.value = false;
      }
    };

    // 从本地存储加载表结构
    const loadTableStructureFromStorage = (connectionId) => {
      try {
        const structureKey = `tableStructure_${connectionId}`;
        const savedStructure = localStorage.getItem(structureKey);
        if (savedStructure) {
          const structureData = JSON.parse(savedStructure);
          // 不检查数据是否过期，总是使用本地存储的数据
          tableInfo.value = structureData.tableInfo;
          registerCompletionProvider();
          return true;
        }
      } catch (error) {
        console.error('从本地加载表结构失败:', error);
      }
      return false;
    };


    // 删除行数据
    const deleteRow = (row, index) => {
      ElMessageBox.confirm(
        '确定要删除这条数据吗？此操作无法撤销。',
        '确认删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      ).then(async () => {
        // 构造DELETE语句（需要根据实际情况调整）
        try {
          const conn = availableConnections.value.find(c => c.id === selectedConnection.value);
          if (!conn || conn.status !== 'connected') {
            ElMessage.error('数据库未连接');
            return;
          }
          
          // 获取主键字段（这里简化处理，实际应该从表结构中获取）
          const primaryKey = queryResult.value.columns[0]; // 假设第一个字段是主键
          const primaryKeyValue = row[primaryKey];
          const tableName = currentTableName.value;
          
          if (!tableName) {
            ElMessage.error('无法确定表名，删除失败');
            return;
          }
          
          // 构造DELETE语句
          const deleteSql = `DELETE FROM ${tableName} WHERE ${primaryKey} = '${primaryKeyValue}'`;
          console.log(deleteSql);
          const connectionId = conn.connectionId;
          const result = await window.electronAPI.executeQuery(connectionId, deleteSql);
          
          if (result.success) {
            // 从表格数据中移除该行
            queryResult.value.data.splice(index, 1);
            ElMessage.success('删除成功');
            
            // 重新执行查询以更新数据
            await executeQuery();
          } else {
            ElMessage.error('删除失败：' + result.message);
          }
        } catch (error) {
          ElMessage.error('删除失败：' + error.message);
        }
      }).catch(() => {
        // 用户取消删除
      });
    };

    // 从SQL查询中提取表名
    const getTableNameFromQuery = (sql) => {
      // 移除注释和多余空格
      const cleanSql = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '').trim();
      
      // 转换为大写以便匹配
      const upperSql = cleanSql.toUpperCase();
      
      // 处理 SHOW CREATE TABLE 语句
      const showCreateMatch = cleanSql.match(/SHOW\s+CREATE\s+TABLE\s+([^\s;]+)/i);
      if (showCreateMatch && showCreateMatch[1]) {
        return showCreateMatch[1].replace(/`/g, ''); // 移除可能的反引号
      }
      
      // 处理 DESCRIBE/DESC 语句
      const descMatch = cleanSql.match(/(?:DESCRIBE|DESC)\s+([^\s;]+)/i);
      if (descMatch && descMatch[1]) {
        return descMatch[1].replace(/`/g, '');
      }
      
      // 处理标准的 SELECT ... FROM 语句
      const fromRegex = /FROM\s+([^\s,)(;]+)/i;
      const fromMatch = cleanSql.match(fromRegex);
      
      if (fromMatch && fromMatch[1]) {
        // 移除可能的别名（AS 或空格后的内容）
        const tableName = fromMatch[1].split(/\s+|AS/i)[0];
        // 移除可能的反引号
        return tableName.replace(/`/g, '');
      }
      
      // 更复杂的匹配，处理多表查询等情况
      const complexFromRegex = /FROM\s+([^;]*?)(?:\s+WHERE|\s+GROUP|\s+ORDER|\s+LIMIT|\s*$)/i;
      const complexMatch = cleanSql.match(complexFromRegex);
      
      if (complexMatch && complexMatch[1]) {
        // 获取第一个表名
        const tables = complexMatch[1].split(',').map(table => table.trim());
        if (tables.length > 0) {
          // 返回第一个表名，移除别名和引号
          return tables[0].split(/\s+|AS/i)[0].replace(/`/g, '');
        }
      }
      
      // 对于其他 DDL/DML 语句 (INSERT, UPDATE, DELETE, etc.)
      const ddlMatches = cleanSql.match(/(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE)\s+([^\s(;]+)/i);
      if (ddlMatches && ddlMatches[1]) {
        return ddlMatches[1].replace(/`/g, '');
      }
      
      return null;
    };

    // 关闭编辑对话框前的处理
    const handleEditDialogClose = (done) => {
      ElMessageBox.confirm('确认关闭编辑窗口吗？未保存的更改将会丢失。', '确认关闭', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }).then(() => {
        cancelEdit();
        done()
      }).catch(() => {
        // 用户取消关闭
      });
    };


  // 确认编辑
  const confirmEdit = async () => {
    editLoading.value = true;
    try {
      const conn = availableConnections.value.find(c => c.id === selectedConnection.value);
      if (!conn || conn.status !== 'connected') {
        ElMessage.error('数据库未连接');
        editLoading.value = false;
        return;
      }
      
      // 获取主键字段（简化处理）
      const primaryKey = queryResult.value.columns[0];
      const primaryKeyValue = originalRowData.value[primaryKey];
      const newPrimaryKeyValue = editForm[primaryKey];

      // 构造UPDATE语句
      let sql = '';
      const tableName = currentTableName.value;
      if (!tableName) {
        ElMessage.error('无法确定表名，更新失败');
        editLoading.value = false;
        return;
      }
      
      
      // 如果主键被修改为0或空，则执行插入操作
      if (newPrimaryKeyValue === 0 || newPrimaryKeyValue === '' || newPrimaryKeyValue === null || newPrimaryKeyValue === undefined) {
        // 构造INSERT语句
        const columns = queryResult.value.columns.filter(column => column !== primaryKey || newPrimaryKeyValue !== 0);
        const values = columns.map(column => {
          const value = editForm[column];
          return value === null || value === undefined ? 'NULL' : `'${value}'`;
        });
        
        sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')})`;
      } else if (primaryKeyValue === 0 || primaryKeyValue === '' || primaryKeyValue === null || primaryKeyValue === undefined) {
        // 原来主键为空，现在有值，执行插入操作
        const columns = queryResult.value.columns;
        const values = columns.map(column => {
          const value = editForm[column];
          return value === null || value === undefined ? 'NULL' : `'${value}'`;
        });
        
        sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')})`;
      } else {
        // 否则执行更新操作
        // 构造SET子句
        const setParts = [];
        queryResult.value.columns.forEach(column => {
          if (column !== primaryKey) {
            // 只有当值发生变化时才添加到更新列表中
            if (editForm[column] !== originalRowData.value[column]) {
              const value = editForm[column];
              setParts.push(`${column} = '${value}'`);
            }
          } else if (newPrimaryKeyValue !== primaryKeyValue) {
            // 如果主键值也发生了变化
            setParts.push(`${column} = '${newPrimaryKeyValue}'`);
          }
        });
        
        if (setParts.length === 0) {
          ElMessage.warning('没有需要更新的字段');
          editLoading.value = false;
          return;
        }
        
        sql = `UPDATE ${tableName} SET ${setParts.join(', ')} WHERE ${primaryKey} = '${primaryKeyValue}'`;
      }
      

      console.log(sql);

      const connectionId = conn.connectionId;
      const result = await window.electronAPI.executeQuery(connectionId, sql);
      
      if (result.success) {
        // 更新表格中的数据
        Object.assign(queryResult.value.data[currentRowIndex.value], editForm);
        editDialogVisible.value = false;
        editingRow.value = -1;
        ElMessage.success('更新成功');
        
        // 重新执行查询以确保数据一致性
        await executeQuery();
      } else {
        ElMessage.error('更新失败：' + result.message);
      }
    } catch (error) {
      ElMessage.error('更新失败：' + error.message);
    } finally {
      editLoading.value = false;
    }
  };

    // 取消编辑
    const cancelEdit = () => {
      editDialogVisible.value = false;
      editingRow.value = -1;
    };
    // 注册自动补全提供者
    const registerCompletionProvider = () => {
      // 如果已经注册过，先移除旧的提供者
      if (completionProvider) {
        completionProvider.dispose();
        completionProvider = null;
      }
      
      // 注册补全项提供者
      completionProvider = MonacoEditor.languages.registerCompletionItemProvider('sql', {
        triggerCharacters: ['.', ' ', ','], // 触发补全的字符
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn
          };

          // 获取当前行文本
          const lineContent = model.getLineContent(position.lineNumber);
          const beforeCursor = lineContent.substring(0, position.column - 1);
          
          // 获取当前数据库中的所有表和字段
          const suggestions = [];
          
          // 根据上下文决定提供哪种类型的建议
          const uppercaseBeforeCursor = beforeCursor.toUpperCase();
          
          // 如果光标前有表名和点，推荐该表的字段
          const tableFieldMatch = beforeCursor.match(/(\w+)\.(\w*)$/);
          if (tableFieldMatch) {
            const tableName = tableFieldMatch[1];
            const columns = tableInfo.value[tableName];
            if (columns && Array.isArray(columns)) {
              columns.forEach(column => {
                suggestions.push({
                  label: column,
                  kind: MonacoEditor.languages.CompletionItemKind.Field,
                  insertText: column,
                  detail: `Column in ${tableName}`,
                  range: {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: position.column - tableFieldMatch[2].length,
                    endColumn: position.column
                  }
                });
              });
            }
            return { suggestions };
          }
          
          // 如果在 SELECT 和 FROM 之间，优先推荐字段
          if (isInSelectClause(uppercaseBeforeCursor)) {
            // 推荐常用函数
            const functions = [
              { label: 'COUNT(*)', insertText: 'COUNT(*)', detail: 'Count all rows' },
              { label: 'COUNT', insertText: 'COUNT()', detail: 'Count rows' },
              { label: 'SUM', insertText: 'SUM()', detail: 'Sum values' },
              { label: 'AVG', insertText: 'AVG()', detail: 'Average value' },
              { label: 'MAX', insertText: 'MAX()', detail: 'Maximum value' },
              { label: 'MIN', insertText: 'MIN()', detail: 'Minimum value' }
            ];
            
            functions.forEach(func => {
              suggestions.push({
                label: func.label,
                kind: MonacoEditor.languages.CompletionItemKind.Function,
                insertText: func.insertText,
                detail: func.detail,
                range: range
              });
            });
            
            // 推荐所有字段（带表前缀和不带表前缀）
            Object.keys(tableInfo.value).forEach(tableName => {
              const columns = tableInfo.value[tableName];
              if (columns && Array.isArray(columns)) {
                columns.forEach(column => {
                  // 带表前缀的字段
                  suggestions.push({
                    label: `${tableName}.${column}`,
                    kind: MonacoEditor.languages.CompletionItemKind.Field,
                    insertText: `${tableName}.${column}`,
                    detail: `Column in ${tableName}`,
                    range: range
                  });
                  
                  // 不带表前缀的字段
                  suggestions.push({
                    label: column,
                    kind: MonacoEditor.languages.CompletionItemKind.Field,
                    insertText: column,
                    detail: `Column in ${tableName}`,
                    range: range
                  });
                });
              }
            });
            
            // 添加别名关键字
            suggestions.push({
              label: 'AS',
              kind: MonacoEditor.languages.CompletionItemKind.Keyword,
              insertText: 'AS ',
              detail: 'Alias keyword',
              range: range
            });
            
            return { suggestions };
          }
          
          // 如果在 FROM 之后，推荐表名
          else if (isInFromClause(uppercaseBeforeCursor)) {
            // 添加表名建议
            Object.keys(tableInfo.value).forEach(tableName => {
              suggestions.push({
                label: tableName,
                kind: MonacoEditor.languages.CompletionItemKind.Class,
                insertText: tableName,
                detail: 'Table',
                range: range
              });
              
              // 添加别名关键字
              suggestions.push({
                label: 'AS',
                kind: MonacoEditor.languages.CompletionItemKind.Keyword,
                insertText: 'AS ',
                detail: 'Alias keyword',
                range: range
              });
            });
            
            return { suggestions };
          }
          
          // 如果在 WHERE 之后，推荐字段和操作符
          else if (isInWhereClause(uppercaseBeforeCursor)) {
            // 推荐所有字段（带表前缀和不带表前缀）
            Object.keys(tableInfo.value).forEach(tableName => {
              const columns = tableInfo.value[tableName];
              if (columns && Array.isArray(columns)) {
                columns.forEach(column => {
                  // 带表前缀的字段
                  suggestions.push({
                    label: `${tableName}.${column}`,
                    kind: MonacoEditor.languages.CompletionItemKind.Field,
                    insertText: `${tableName}.${column}`,
                    detail: `Column in ${tableName}`,
                    range: range
                  });
                  
                  // 不带表前缀的字段
                  suggestions.push({
                    label: column,
                    kind: MonacoEditor.languages.CompletionItemKind.Field,
                    insertText: column,
                    detail: `Column in ${tableName}`,
                    range: range
                  });
                });
              }
            });
            
            // 添加操作符
            const operators = ['=', '!=', '<>', '<', '>', '<=', '>=', 'LIKE', 'IN', 'IS NULL', 'IS NOT NULL'];
            operators.forEach(op => {
              suggestions.push({
                label: op,
                kind: MonacoEditor.languages.CompletionItemKind.Operator,
                insertText: op + ' ',
                detail: 'Operator',
                range: range
              });
            });
            
            return { suggestions };
          }
          
          // 默认情况下，提供基础建议
          else {
            // 添加常用关键字建议
            const commonKeywords = [
              'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE',
              'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON',
              'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT'
            ];
            
            commonKeywords.forEach(keyword => {
              suggestions.push({
                label: keyword,
                kind: MonacoEditor.languages.CompletionItemKind.Keyword,
                insertText: keyword + ' ',
                detail: 'Keyword',
                range: range
              });
            });
            
            // 添加表名建议
            Object.keys(tableInfo.value).forEach(tableName => {
              suggestions.push({
                label: tableName,
                kind: MonacoEditor.languages.CompletionItemKind.Class,
                insertText: tableName,
                detail: 'Table',
                range: range
              });
            });
          }

          return { suggestions };
        }
      });
    };
    
    // 辅助函数：判断是否在SELECT子句中
    const isInSelectClause = (text) => {
      const lastSelect = text.lastIndexOf('SELECT');
      const lastFrom = text.lastIndexOf('FROM');
      return lastSelect !== -1 && (lastFrom === -1 || lastSelect > lastFrom);
    };
    
    // 辅助函数：判断是否在FROM子句中
    const isInFromClause = (text) => {
      const lastFrom = text.lastIndexOf('FROM');
      const lastWhere = text.lastIndexOf('WHERE');
      const lastGroupBy = text.lastIndexOf('GROUP BY');
      const lastOrderBy = text.lastIndexOf('ORDER BY');
      
      return lastFrom !== -1 && 
             (lastWhere === -1 || lastFrom > lastWhere) &&
             (lastGroupBy === -1 || lastFrom > lastGroupBy) &&
             (lastOrderBy === -1 || lastFrom > lastOrderBy);
    };
    
    // 辅助函数：判断是否在WHERE子句中
    const isInWhereClause = (text) => {
      const lastWhere = text.lastIndexOf('WHERE');
      const lastOrderBy = text.lastIndexOf('ORDER BY');
      const lastGroupBy = text.lastIndexOf('GROUP BY');
      
      return lastWhere !== -1 && 
             (lastOrderBy === -1 || lastWhere > lastOrderBy) &&
             (lastGroupBy === -1 || lastWhere > lastGroupBy);
    };

  

    // 获取表结构信息
    const loadTableStructure = async (connectionId, databaseName) => {
      if (!connectionId || !databaseName) return;
      try {
        // 清空之前的表信息
        tableInfo.value = {};
        // 获取所有表
        const tablesResult = await window.electronAPI.getTables(connectionId, databaseName);
        if (tablesResult && tablesResult.length > 0) {
          loadingProgress.value = { current: 0, total: tablesResult.length };
          // 获取每个表的字段信息
          for (const table of tablesResult) {
            // 处理不同数据库返回的表结构差异
            const tableName = table.name || table;
            const structureResult = await window.electronAPI.getTableStructure(
              connectionId, 
              databaseName, 
              tableName
            );
            if (structureResult && structureResult.columns) {
              // 保存字段名列表
              tableInfo.value[tableName] = structureResult.columns.map(col => col.name);
            }
            loadingProgress.value.current++;
          }
          // 重新注册自动补全提供者以更新建议项
          registerCompletionProvider();
        }
        ElMessage.success(`获取${databaseName}表信息成功`);
      } catch (error) {
        console.error('加载表结构失败:', error);
      }
    };

    let autoSaveInterval = null;
    onUnmounted(() => {
        if (autoSaveInterval) {
            clearInterval(autoSaveInterval);
        }
    });

    onMounted(() => {
      const dom = document.getElementById('editor');
      if (dom) {
        // 尝试从localStorage加载保存的内容
        const savedContent = localStorage.getItem('queryEditorContent');
        const initialValue = savedContent || sqlQuery.value;

        monacoInstance = MonacoEditor.editor.create(dom, {
          value: initialValue,
          language: 'sql',
          theme: 'vs-dark',
          automaticLayout: true,
          fontSize: 14,
          minimap: { enabled: false },
          wordWrap: 'on',
          scrollBeyondLastLine: false,
        });

        // 监听内容变化，双向绑定
        monacoInstance.onDidChangeModelContent(() => {
          sqlQuery.value = monacoInstance.getValue();
        });

        // 每5秒自动保存编辑器内容到localStorage
        autoSaveInterval = setInterval(() => {
          if (monacoInstance) {
            const content = monacoInstance.getValue();
            localStorage.setItem('queryEditorContent', content);
          }
        }, 3000);

        

        registerCompletionProvider();

      }
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
          const connectionId = `${conn.id}`;
          console.log('关闭数据库连接:', connectionId);
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
            // 首先尝试从本地存储加载表结构
            if (!loadTableStructureFromStorage(conn.id)) {
              // 如果本地没有或者过期，则从数据库加载
              // 异步加载表结构，不阻塞UI
              // loadTableStructure(conn.connectionId, conn.database)
              //   .then(() => {
              //     // 加载成功后保存到本地
              //     const structureKey = `tableStructure_${conn.id}`;
              //     const structureData = {
              //       database: conn.database,
              //       tableInfo: tableInfo.value,
              //       timestamp: Date.now()
              //     };
              //     localStorage.setItem(structureKey, JSON.stringify(structureData));
              //   })
              //   .catch(error => {
              //     console.error('加载表结构失败:', error);
              //     ElMessage.error('加载表结构失败: ' + error.message);
              //   });
            }
            
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

    const getSelectionValue = ( instance) => {
        const selection = instance.getSelection(); // 获取光标选中的值
        const { startLineNumber, endLineNumber, startColumn, endColumn } = selection;
        const model = instance.getModel();
        return model.getValueInRange({
          startLineNumber,
          startColumn,
          endLineNumber,
          endColumn,
        });
      }

      const appendLimitIfMissing = (sql) => {
        let s = sql.trim().replace(/;$/, '').trim();
        
        // 只对SELECT语句添加LIMIT子句
        if (!/^select/i.test(s)) return sql;
        
        // 如果已经有LIMIT子句就不添加
        if (/\blimit\b/i.test(s)) return sql;
        
        // 对于某些特定的SELECT语句可能也不需要添加LIMIT
        // 例如：SELECT COUNT(*) 通常不需要LIMIT
        if (/\bcount\s*\(\s*\*\s*\)/i.test(s)) return sql;
        
        // 对于包含聚合函数的查询也不添加LIMIT
        if (/\b(avg|sum|max|min)\s*\(/i.test(s)) return sql;
        
        return s + ' limit 100';
      } 

      const hasDangerousSql = (sql) => {
        return sql
          .split(';')
          .map(s => s.trim())
          .filter(Boolean)
          .some(s =>
            ((/^delete\s+/i.test(s) || /^update\s+/i.test(s)) && !/\bwhere\b/i.test(s))
          );
      }

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
      let sql = sqlQuery.value.trim();

      if (monacoInstance) {
        const selectionValue = getSelectionValue(monacoInstance);
        sql = selectionValue;
      }
      if (sql.trim() === '') {
        ElMessage.warning('请选中SQL查询语句并执行');
        return;
      }

      if ((sql.match(/;/g) || []).length > 1) {
        ElMessage.warning('禁止执行多条SQL语句');
        return;
      }

      sql = appendLimitIfMissing(sql);
      
      if (hasDangerousSql(sql)) {
        ElMessage.warning('禁止执行删除或更新语句');
        return;
      }

      executing.value = true;
      try {
        const connectionId = conn.connectionId;
        console.log(connectionId,sql);
        const result = await window.electronAPI.executeQuery(connectionId, sql);

        queryResult.value = result;
        console.log(result);
        if (result.success) {
          ElMessage.success('查询执行成功');
          currentSql.value = sql;
          currentTableName.value = getTableNameFromQuery(sql);
          console.log('当前表名:', currentTableName.value);
        } else {
          ElMessage.error('查询执行失败：' + result.message);
        }
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
      monacoInstance.setValue('');
      ElMessage.info('查询已清空');
    };


    // 加载SQL文件
    const loadSQLFile = async () => {
      try {
        const result = await window.electronAPI.showOpenDialog({
          properties: ['openFile'],
          filters: [
            { name: 'SQL Files', extensions: ['sql'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });
        
        if (!result.canceled && result.filePaths.length > 0) {
          const filePath = result.filePaths[0];
          const fileContent = await window.electronAPI.loadSQLFile(filePath);
          if (monacoInstance) {
            monacoInstance.setValue(fileContent);
          } else {
            sqlQuery.value = fileContent;
          }
          ElMessage.success('SQL文件加载成功');
        }
      } catch (error) {
        ElMessage.error('加载SQL文件失败: ' + error.message);
      }
    };

    // 保存SQL文件
    const saveSQLFile = async () => {
      try {
        const content = monacoInstance ? monacoInstance.getValue() : sqlQuery.value;
        if (!content.trim()) {
          ElMessage.warning('没有内容可保存');
          return;
        }
        
        const result = await window.electronAPI.showSaveDialog({
          filters: [
            { name: 'SQL Files', extensions: ['sql'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });
        
        if (!result.canceled) {
          const filePath = result.filePath;
          await window.electronAPI.saveSQLFile(filePath, content);
          ElMessage.success('SQL文件保存成功');
        }
      } catch (error) {
        ElMessage.error('保存SQL文件失败: ' + error.message);
      }
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

    // 去除 limit 子句
    function removeLimitClause(sql) {
      // 只处理最后的 limit 子句
      return sql.replace(/\s+limit\s+\d+\s*;?$/i, '').replace(/;$/, '');
    }

    const exportToExcel = async () => {
      if (!queryResult.value || !queryResult.value.success || !queryResult.value.data || queryResult.value.data.length === 0) {
        ElMessage.warning('没有可以导出的数据。');
        return;
      }
      try {
        // 重新执行无 limit 的 SQL 查询
        let sql = currentSql.value || sqlQuery.value;
        sql = removeLimitClause(sql);
        const conn = availableConnections.value.find(c => c.id === selectedConnection.value);
        if (!conn || conn.status !== 'connected') {
          ElMessage.error('数据库未连接');
          return;
        }
        const connectionId = conn.connectionId;
        const result = await window.electronAPI.executeQuery(connectionId, sql);
        if (!result.success || !result.data || result.data.length === 0) {
          ElMessage.warning('没有可以导出的数据。');
          return;
        }
        // 对导出数据应用格式化
        const formattedData = result.data.map(row => {
          const formattedRow = {};
          result.columns.forEach(column => {
            formattedRow[column] = formatCellValue(row[column], column);
          });
          return formattedRow;
        });
        // 获取本地日期格式，避免时区问题
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        const json = JSON.parse(JSON.stringify(formattedData));
        // 传递字段映射信息，以便在导出时更好地处理数据类型
        const exportOptions = {
          data: json,
          fieldMap: result.fieldMap,
          filename: `query_result_${dateString}.xlsx`
        };
        const s = JSON.parse(JSON.stringify(exportOptions));
        const exportResult = await window.electronAPI.exportToExcel(s);
        if (exportResult.success) {
          ElMessage.success('结果已成功导出！');
        } else {
          if (exportResult.message !== '导出已取消') {
            ElMessage.error(exportResult.message);
          }
          console.log(exportResult.message);
        }
      } catch (error) {
        console.error('导出失败:', error);
        ElMessage.error(`导出失败: ${error.message}`);
      }
    };


    
    const exportToCSV = async () => {
      if (!queryResult.value || !queryResult.value.success || !queryResult.value.data || queryResult.value.data.length === 0) {
        ElMessage.warning('没有可以导出的数据。');
        return;
      }
      try {
        // 重新执行无 limit 的 SQL 查询
        let sql = currentSql.value || sqlQuery.value;
        sql = removeLimitClause(sql);
        const conn = availableConnections.value.find(c => c.id === selectedConnection.value);
        if (!conn || conn.status !== 'connected') {
          ElMessage.error('数据库未连接');
          return;
        }
        const connectionId = conn.connectionId;
        const result = await window.electronAPI.executeQuery(connectionId, sql);
        if (!result.success || !result.data || result.data.length === 0) {
          ElMessage.warning('没有可以导出的数据。');
          return;
        }
        // 对导出数据应用格式化
        const formattedData = result.data.map(row => {
          const formattedRow = {};
          result.columns.forEach(column => {
            formattedRow[column] = formatCellValue(row[column], column);
          });
          return formattedRow;
        });
        const data = JSON.parse(JSON.stringify(formattedData));
        const columns = JSON.parse(JSON.stringify(result.columns));
        // 传递字段映射信息，以便在导出时更好地处理数据类型
        const exportOptions = {
          data,
          columns,
          fieldMap: result.fieldMap
        };
        const s = JSON.parse(JSON.stringify(exportOptions));
        const exportResult = await window.electronAPI.exportToCSV(s);
        if (exportResult.success) {
          ElMessage.success('结果已成功导出为CSV！');
        } else {
          if (exportResult.message !== '导出已取消') {
            ElMessage.error(exportResult.message);
          }
          console.log(exportResult.message);
        }
      } catch (error) {
        console.error('导出CSV失败:', error);
        ElMessage.error(`导出CSV失败: ${error.message}`);
      }
    };

    const exportToSQL = async () => {
      if (!queryResult.value || !queryResult.value.success || !queryResult.value.data || !queryResult.value.data.length === 0) {
        ElMessage.warning('没有可以导出的数据。');
        return;
      }
      try {
        // 重新执行无 limit 的 SQL 查询
        let sql = currentSql.value || sqlQuery.value;
        sql = removeLimitClause(sql);
        const conn = availableConnections.value.find(c => c.id === selectedConnection.value);
        if (!conn || conn.status !== 'connected') {
          ElMessage.error('数据库未连接');
          return;
        }
        const connectionId = conn.connectionId;
        const result = await window.electronAPI.executeQuery(connectionId, sql);
        if (!result.success || !result.data || result.data.length === 0) {
          ElMessage.warning('没有可以导出的数据。');
          return;
        }
        const data = JSON.parse(JSON.stringify(result.data));
        const columns = JSON.parse(JSON.stringify(result.columns));
        const exportResult = await window.electronAPI.exportToSQL({ data, columns });
        if (exportResult.success) {
          ElMessage.success('结果已成功导出为SQL！');
        } else {
          if (exportResult.message !== '导出已取消') {
            ElMessage.error(exportResult.message);
          }
          console.log(exportResult.message);
        }
      } catch (error) {
        console.error('导出SQL失败:', error);
        ElMessage.error(`导出SQL失败: ${error.message}`);
      }
    };

    const formatCellValue = (value, columnName) => {
      // 根据字段类型处理数据格式
      if (columnName && queryResult.value && queryResult.value.fieldMap) {
        const fieldInfo = queryResult.value.fieldMap.find(field => field.name === columnName);
        if (fieldInfo) {
          // 根据 MySQL 字段类型编号处理数据
          switch (fieldInfo.type) {
            // 字符串类型 (VARCHAR, CHAR, TEXT 等)
            case 253: // MYSQL_TYPE_VAR_STRING
            case 254: // MYSQL_TYPE_STRING
              return value === null || value === undefined ? '' : String(value);
            
            // 整数类型
            case 1:   // MYSQL_TYPE_TINY
            case 2:   // MYSQL_TYPE_SHORT
            case 3:   // MYSQL_TYPE_LONG
            case 8:   // MYSQL_TYPE_LONGLONG
            case 9:   // MYSQL_TYPE_INT24
              if (value === null || value === undefined) return '';
              const num = Number(value);
              return isNaN(num) ? value : num.toString();
            
            // 浮点数类型
            case 4:   // MYSQL_TYPE_FLOAT
            case 5:   // MYSQL_TYPE_DOUBLE
            case 246: // MYSQL_TYPE_DECIMAL
              if (value === null || value === undefined) return '';
              const floatNum = parseFloat(value);
              return isNaN(floatNum) ? value : floatNum.toString();
            
            // 日期时间类型
            case 7:   // MYSQL_TYPE_TIMESTAMP
            case 10:  // MYSQL_TYPE_DATE
            case 11:  // MYSQL_TYPE_TIME
            case 12:  // MYSQL_TYPE_DATETIME
            case 13:  // MYSQL_TYPE_YEAR
              if (value === null || value === undefined) return '';
              try {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                  // 根据具体类型格式化日期
                  switch (fieldInfo.type) {
                    case 10: // DATE
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      return `${year}-${month}-${day}`;
                    
                    case 11: // TIME
                      const hours = String(date.getHours()).padStart(2, '0');
                      const minutes = String(date.getMinutes()).padStart(2, '0');
                      const seconds = String(date.getSeconds()).padStart(2, '0');
                      return `${hours}:${minutes}:${seconds}`;
                    
                    default: // DATETIME, TIMESTAMP
                      const fullYear = date.getFullYear();
                      const fullMonth = String(date.getMonth() + 1).padStart(2, '0');
                      const fullDay = String(date.getDate()).padStart(2, '0');
                      const fullHours = String(date.getHours()).padStart(2, '0');
                      const fullMinutes = String(date.getMinutes()).padStart(2, '0');
                      const fullSeconds = String(date.getSeconds()).padStart(2, '0');
                      return `${fullYear}-${fullMonth}-${fullDay} ${fullHours}:${fullMinutes}:${fullSeconds}`;
                  }
                }
              } catch (e) {
                // 如果日期转换失败，返回原始值
                return value;
              }
              return value;
            
            // BLOB 类型
            case 252: // MYSQL_TYPE_BLOB
              if (value instanceof Uint8Array) {
                // 尝试将 Uint8Array 转换为 UUID 字符串
                try {
                  // 如果长度为16，则按标准UUID格式处理
                  if (value.length === 16) {
                    const hex = Array.from(value)
                      .map(b => b.toString(16).padStart(2, '0'))
                      .join('');
                    const uuid = `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
                    return uuid;
                  }
                  // 如果长度为36，可能是包含ASCII码的UUID字符串
                  else if (value.length === 36) {
                    // 将Uint8Array转换为字符串
                    const str = Array.from(value)
                      .map(b => String.fromCharCode(b))
                      .join('');
                    // 检查是否为有效的UUID格式
                    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) ||
                        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.replace(/-/g, ''))) {
                      return str;
                    }
                    // 如果不是UUID格式，返回原始字符串
                    return str;
                  }
                  // 其他情况返回数组表示
                  else {
                    return Array.from(value).join(',');
                  }
                } catch (e) {
                  // 如果转换失败，返回原始数组表示
                  return Array.from(value).join(',');
                }
              }
              return value;
            
            // 布尔类型
            case 16: // MYSQL_TYPE_BIT
              if (value === 1 || value === true) return '1';
              if (value === 0 || value === false) return '0';
              return value;
          }
        }
      }
      
      // 如果没有字段信息或未匹配到特定类型，使用原来的处理逻辑
      if (value instanceof Uint8Array) {
        // 尝试将 Uint8Array 转换为 UUID 字符串
        try {
          // 如果长度为16，则按标准UUID格式处理
          if (value.length === 16) {
            const hex = Array.from(value)
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');
            const uuid = `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
            return uuid;
          }
          // 如果长度为36，可能是包含ASCII码的UUID字符串
          else if (value.length === 36) {
            // 将Uint8Array转换为字符串
            const str = Array.from(value)
              .map(b => String.fromCharCode(b))
              .join('');
            // 检查是否为有效的UUID格式
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) ||
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.replace(/-/g, ''))) {
              return str;
            }
            // 如果不是UUID格式，返回原始字符串
            return str;
          }
          // 其他情况返回数组表示
          else {
            return Array.from(value).join(',');
          }
        } catch (e) {
          // 如果转换失败，返回原始数组表示
          return Array.from(value).join(',');
        }
      }
      
      // 检查是否为日期对象或日期字符串
      if (value instanceof Date || (typeof value === 'string' && !/^\d+$/.test(value) && !isNaN(Date.parse(value)))) {
        try {
          const date = new Date(value);
          // 检查日期是否有效
          if (!isNaN(date.getTime())) {
            // 格式化为 YYYY-MM-DD HH:mm:ss
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
          } else {
            return '';
          }
        } catch (e) {
          // 如果转换失败，返回原始值
          return '';
        }
      }
      
      // 默认处理
      return value === null || value === undefined ? '' : value;
    };


    // 格式化执行时间显示为中国格式
    const formatExecutionTime = (milliseconds) => {
      if (milliseconds < 1000) {
        return `${milliseconds}ms`;
      } else if (milliseconds < 60000) {
        const seconds = (milliseconds / 1000).toFixed(2);
        return `${seconds}s`;
      } else {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = ((milliseconds % 60000) / 1000).toFixed(2);
        return `${minutes}分${seconds}秒`;
      }
    };


    const loadConnections = async () => {
      const saved = await window.electronAPI.getConnections();
      console.log(saved);
      connections.value = saved;
      availableConnections.value = saved;
    };

    onMounted(loadConnections);

    
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

/* .editor-container {
  height: calc(100vh - 200px);
} */

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
  position: relative;
  width: 100%;
  min-height: 120px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
  /* transition: height 0.1s; */
}
.resize-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 8px;
  cursor: ns-resize;
  background: #f2f2f2;
  border-top: 1px solid #e4e7ed;
  z-index: 10;
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

.sql-editor {
  width: 100%;
  min-height: 220px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.sql-editor :deep(.monaco-editor) {
  min-height: 200px;
}

.edit-dialog :deep(.el-dialog__body) {
  padding: 10px 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.edit-form {
  height: 100%;
}

.form-content {
  max-height: 50vh;
  overflow-y: auto;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.sql-editor {
  width: 100%;
  min-height: 220px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.sql-editor :deep(.monaco-editor) {
  min-height: 200px;
}
</style> 