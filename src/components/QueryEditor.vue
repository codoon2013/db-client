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
              <span>查询结果</span>
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
                  />
                  <el-table-column
                    label="操作"
                    width="150"
                    fixed="right"
                    v-if="isEditableTable(queryResult.data)"
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
                  width="500px"
                  :before-close="handleEditDialogClose"
                >
                  <el-form 
                    :model="editForm" 
                    label-width="100px" 
                    ref="editFormRef"
                  >
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
    import { ref, reactive, onMounted, computed, watch } from 'vue';
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

    const connections = ref([]);
    const availableConnections = ref([]);

    const saveForm = reactive({
      name: '',
      description: ''
    });

    let monacoInstance = null;
    let completionProvider = null;
    // 存储表名和字段信息
    const tableInfo = ref({});

    const startResize = (e) => {
      const startY = e.clientY;
      const startHeight = editorHeight.value;

      const onMouseMove = (moveEvent) => {
        const delta = moveEvent.clientY - startY;
        editorHeight.value = Math.max(100, startHeight + delta); // 最小高度100px
        if (monacoInstance) {
          monacoInstance.layout();
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

    const editRow = (row, index) => {
      editingRow.value = index;
      currentRowIndex.value = index;
      originalRowData.value = { ...row };
      
      // 填充表单数据
      queryResult.value.columns.forEach(column => {
        editForm[column] = row[column];
      });
      
      editDialogVisible.value = true;
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
          const tableName = getTableNameFromQuery(sqlQuery.value); // 从查询语句中提取表名
          
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
      const match = sql.match(/FROM\s+(\w+)/i);
      return match ? match[1] : null;
    };

    // 关闭编辑对话框前的处理
    const handleEditDialogClose = (done) => {
      ElMessageBox.confirm('确认关闭编辑窗口吗？未保存的更改将会丢失。', '确认关闭', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }).then(() => {
        done();
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
      
      // 构造UPDATE语句
      const tableName = getTableNameFromQuery(sqlQuery.value);
      if (!tableName) {
        ElMessage.error('无法确定表名，更新失败');
        editLoading.value = false;
        return;
      }
      
      // 获取主键字段（简化处理）
      const primaryKey = queryResult.value.columns[0];
      const primaryKeyValue = originalRowData.value[primaryKey];
      
      // 构造SET子句
      const setParts = [];
      queryResult.value.columns.forEach(column => {
        if (column !== primaryKey) {
           // 只有当值发生变化时才添加到更新列表中
          if (editForm[column] !== originalRowData.value[column]) {
            const value = editForm[column];
            setParts.push(`${column} = '${value}'`);
          }
        }
      });
      
      if (setParts.length === 0) {
        ElMessage.warning('没有需要更新的字段');
        editLoading.value = false;
        return;
      }
      
      const updateSql = `UPDATE ${tableName} SET ${setParts.join(', ')} WHERE ${primaryKey} = '${primaryKeyValue}'`;
      
      console.log(updateSql);

      const connectionId = conn.connectionId;
      const result = await window.electronAPI.executeQuery(connectionId, updateSql);
      
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
          }
          
          // 重新注册自动补全提供者以更新建议项
          registerCompletionProvider();
        }
      } catch (error) {
        console.error('加载表结构失败:', error);
      }
    };

    onMounted(() => {
      const dom = document.getElementById('editor');
      if (dom) {
        monacoInstance = MonacoEditor.editor.create(dom, {
          value: sqlQuery.value,
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
            loadTableStructure(conn.connectionId, conn.database);
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
        if (!/^select/i.test(s)) return sql;
        // 只要有 limit 关键字就不加
        if (s.includes('limit')) return sql;
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
        console.log(connectionId);
        const result = await window.electronAPI.executeQuery(connectionId, sql);
      
        queryResult.value = result;
        console.log(result);
        if (result.success) {
          ElMessage.success('查询执行成功');
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

    const exportToExcel = async () => {
      if (!queryResult.value || !queryResult.value.success || !queryResult.value.data || queryResult.value.data.length === 0) {
        ElMessage.warning('没有可以导出的数据。');
        return;
      }
      
      try {
        const json = JSON.parse(JSON.stringify(queryResult.value.data));
        const result = await window.electronAPI.exportToExcel(json);
        if (result.success) {
          ElMessage.success('结果已成功导出！');
        } else {
          // 如果用户取消了保存，只在控制台记录，不打扰用户
          if (result.message !== '导出已取消') {
            ElMessage.error(result.message);
          }
          console.log(result.message);
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
        const data = JSON.parse(JSON.stringify(queryResult.value.data));
        const columns = JSON.parse(JSON.stringify(queryResult.value.columns));
        const result = await window.electronAPI.exportToCSV({ data, columns });
        if (result.success) {
          ElMessage.success('结果已成功导出为CSV！');
        } else {
          if (result.message !== '导出已取消') {
            ElMessage.error(result.message);
          }
          console.log(result.message);
        }
      } catch (error) {
        console.error('导出CSV失败:', error);
        ElMessage.error(`导出CSV失败: ${error.message}`);
      }
    };

    const exportToSQL = async () => {
      if (!queryResult.value || !queryResult.value.success || !queryResult.value.data || queryResult.value.data.length === 0) {
        ElMessage.warning('没有可以导出的数据。');
        return;
      }
      
      try {
        const data = JSON.parse(JSON.stringify(queryResult.value.data));
        const columns = JSON.parse(JSON.stringify(queryResult.value.columns));
        const result = await window.electronAPI.exportToSQL({ data, columns });
        if (result.success) {
          ElMessage.success('结果已成功导出为SQL！');
        } else {
          if (result.message !== '导出已取消') {
            ElMessage.error(result.message);
          }
          console.log(result.message);
        }
      } catch (error) {
        console.error('导出SQL失败:', error);
        ElMessage.error(`导出SQL失败: ${error.message}`);
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
</style> 