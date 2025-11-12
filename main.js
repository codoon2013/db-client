const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
// 导入数据库服务
const databaseService = require(path.join(__dirname, 'src/services/database.js'));
const connectionsSqlite = require(path.join(__dirname, 'src/services/connectionsSqlite.js'));
const xlsx = require('xlsx');
const fs = require('fs');

let mainWindow;

// 初始化 SQLite 连接存储到可写目录
databaseFilePath = path.join(app.getPath('userData'), 'connections.sqlite');
connectionsSqlite.init(databaseFilePath);

function createWindow () {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    show: false
  });

  // 加载应用
  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
    // 打开开发工具
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  // 当窗口准备好显示时显示窗口
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 当窗口关闭时触发
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 当 Electron 完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
  createWindow();

  // 在 macOS 上，当点击 dock 图标并且没有其他窗口打开时，
  // 通常在应用程序中重新创建一个窗口。
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 当所有窗口都关闭时退出应用
app.on('window-all-closed', () => {
  // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
  // 否则绝大部分应用及其菜单栏会保持激活。
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 创建应用菜单
function createMenu () {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new');
          }
        },
        {
          label: '打开',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('menu-open');
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '切换开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '切换全屏' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            mainWindow.webContents.send('menu-about');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 创建菜单
createMenu();

// IPC 通信示例
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-app-name', () => {
  return { success: true, message: app.getName() };
});

// 数据库连接相关的IPC处理器
ipcMain.handle('test-database-connection', async (event, connectionConfig) => {
  console.log("test-database-connection");
  console.log(connectionConfig);
  try {
    const result = await databaseService.testConnection(connectionConfig);
    return result;
  } catch (error) {
    return {
      success: false,
      message: error && error.message ? error.message : String(error)
    };
  }
});

ipcMain.handle('establish-database-connection', async (event, connectionConfig) => {
  try {
    const connection = await databaseService.establishConnection(connectionConfig);
    const connectionId = `${connectionConfig.id}`;
    return { success: true, connectionId, message: '连接建立成功' };
  } catch (error) {
    return {
      success: false,
      message: error && error.message ? error.message : String(error)
    };
  }
});

ipcMain.handle('close-database-connection', async (event, connectionId) => {
  try {
    await databaseService.closeConnection(connectionId);
    return { success: true, message: '连接关闭成功' };
  } catch (error) {
    return {
      success: false,
      message: error && error.message ? error.message : String(error)
    };
  }
});

ipcMain.handle('execute-query', async (event, connectionId, query) => {
  try {
    const connection = databaseService.connections.get(connectionId);
    if (!connection) {
      return { success: false, message: '连接不存在' };
    }
    let result, columns, fieldMap, affectedRows;
    if (connection.execute) {
      // MySQL
      const [rows, fields] = await connection.query(query);
      result = rows;
      if (Array.isArray(fields)) {
        fieldMap = fields.map(field => {
          return {
            name: field.name,
            type: field.type
          }
        });
      } else {
        fieldMap = [];
      }

      columns = rows.length > 0 ? Object.keys(rows[0]) : fields.map(field => field.name);
      affectedRows = fields ? rows.length : rows.changedRows;

    } else if (connection.query) {
      // PostgreSQL
      const queryResult = await connection.query(query);
      result = queryResult.rows;
      columns = result.length > 0 ? Object.keys(result[0]) : [];
    } else {
      return { success: false, message: '不支持的连接类型' };
    }
    return {
      success: true,
      data: result,
      columns: columns,
      fieldMap: fieldMap,
      affectedRows: affectedRows
    };
  } catch (error) {
    return {
      success: false,
      message: error && error.message ? error.message : String(error)
    };
  }
});

// 应用退出时关闭所有数据库连接
app.on('before-quit', async () => {
  await databaseService.closeAllConnections();
});

console.log('Registering get-connections handler');
ipcMain.handle('get-connections', async () => {
  console.log('get-connections called');
  return await connectionsSqlite.getConnections();
});
ipcMain.handle('upsert-connection', async (event, conn) => {
  return await connectionsSqlite.upsertConnection(conn);
});
ipcMain.handle('delete-connection', async (event, id) => {
  await connectionsSqlite.deleteConnection(id);
  return { success: true };
});

// 导出数据到 Excel
ipcMain.handle('export-to-excel', async (event, exportOptions) => {
  try {
    // 处理传入的参数，兼容旧版本调用方式
    let data, filename, fieldMap;
    if (typeof exportOptions === 'object' && exportOptions !== null) {
      // 新的调用方式，包含fieldMap等信息
      data = exportOptions.data;
      filename = exportOptions.filename || 'export.xlsx';
      fieldMap = exportOptions.fieldMap || [];
    } else {
      // 旧的调用方式，只有数据和文件名
      data = exportOptions;
      filename = arguments[2] || 'export.xlsx';
      fieldMap = [];
    }

    // 根据字段类型处理数据
    const processedData = data.map(row => {
      const processedRow = {};
      for (const key in row) {
        const value = row[key];
        // 查找字段信息
        const fieldInfo = fieldMap.find(field => field.name === key);

        if (fieldInfo) {
          // 根据字段类型处理
          switch (fieldInfo.type) {
            // 日期时间类型 - 转换为字符串格式
            case 7:   // MYSQL_TYPE_TIMESTAMP
            case 10:  // MYSQL_TYPE_DATE
            case 11:  // MYSQL_TYPE_TIME
            case 12:  // MYSQL_TYPE_DATETIME
            case 13:  // MYSQL_TYPE_YEAR
              if (value instanceof Date) {
                // 根据具体类型格式化日期
                switch (fieldInfo.type) {
                  case 10: // DATE
                    const date = new Date(value);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    processedRow[key] = `${year}-${month}-${day}`;
                    break;

                  case 11: // TIME
                    const time = new Date(value);
                    const hours = String(time.getHours()).padStart(2, '0');
                    const minutes = String(time.getMinutes()).padStart(2, '0');
                    const seconds = String(time.getSeconds()).padStart(2, '0');
                    processedRow[key] = `${hours}:${minutes}:${seconds}`;
                    break;

                  case 13: // YEAR
                    const yearValue = new Date(value);
                    processedRow[key] = yearValue.getFullYear().toString();
                    break;

                  default: // DATETIME, TIMESTAMP
                    const datetime = new Date(value);
                    const fullYear = datetime.getFullYear();
                    const fullMonth = String(datetime.getMonth() + 1).padStart(2, '0');
                    const fullDay = String(datetime.getDate()).padStart(2, '0');
                    const fullHours = String(datetime.getHours()).padStart(2, '0');
                    const fullMinutes = String(datetime.getMinutes()).padStart(2, '0');
                    const fullSeconds = String(datetime.getSeconds()).padStart(2, '0');
                    processedRow[key] = `${fullYear}-${fullMonth}-${fullDay} ${fullHours}:${fullMinutes}:${fullSeconds}`;
                }
              } else if (typeof value === 'string' && !isNaN(Date.parse(value))) {
                // 尝试解析日期字符串
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                  switch (fieldInfo.type) {
                    case 10: // DATE
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      processedRow[key] = `${year}-${month}-${day}`;
                      break;

                    case 11: // TIME
                      const hours = String(date.getHours()).padStart(2, '0');
                      const minutes = String(date.getMinutes()).padStart(2, '0');
                      const seconds = String(date.getSeconds()).padStart(2, '0');
                      processedRow[key] = `${hours}:${minutes}:${seconds}`;
                      break;

                    case 13: // YEAR
                      processedRow[key] = date.getFullYear().toString();
                      break;

                    default: // DATETIME, TIMESTAMP
                      const fullYear = date.getFullYear();
                      const fullMonth = String(date.getMonth() + 1).padStart(2, '0');
                      const fullDay = String(date.getDate()).padStart(2, '0');
                      const fullHours = String(date.getHours()).padStart(2, '0');
                      const fullMinutes = String(date.getMinutes()).padStart(2, '0');
                      const fullSeconds = String(date.getSeconds()).padStart(2, '0');
                      processedRow[key] = `${fullYear}-${fullMonth}-${fullDay} ${fullHours}:${fullMinutes}:${fullSeconds}`;
                  }
                } else {
                  processedRow[key] = value;
                }
              } else if (value === null || value === undefined) {
                processedRow[key] = '';
              } else {
                processedRow[key] = value.toString();
              }
              break;

            // 数值类型
            case 1:   // MYSQL_TYPE_TINY
            case 2:   // MYSQL_TYPE_SHORT
            case 3:   // MYSQL_TYPE_LONG
            case 8:   // MYSQL_TYPE_LONGLONG
            case 9:   // MYSQL_TYPE_INT24
            case 4:   // MYSQL_TYPE_FLOAT
            case 5:   // MYSQL_TYPE_DOUBLE
            case 246: // MYSQL_TYPE_DECIMAL
              if (value === null || value === undefined || value === '') {
                processedRow[key] = value;
              } else {
                const num = Number(value);
                processedRow[key] = isNaN(num) ? value : num;
              }
              break;

            default:
              processedRow[key] = value;
          }
        } else {
          // 没有字段信息时，使用通用处理方式
          if (value instanceof Date) {
            const date = new Date(value);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            processedRow[key] = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
          } else if (typeof value === 'string' && !isNaN(Date.parse(value))) {
            // 尝试解析日期字符串
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const hours = String(date.getHours()).padStart(2, '0');
              const minutes = String(date.getMinutes()).padStart(2, '0');
              const seconds = String(date.getSeconds()).padStart(2, '0');
              processedRow[key] = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            } else {
              processedRow[key] = value;
            }
          } else {
            processedRow[key] = value;
          }
        }
      }
      return processedRow;
    });

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(processedData);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // 让用户选择保存位置
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: '保存 Excel 文件',
      defaultPath: filename,
      filters: [
        { name: 'Excel Files', extensions: ['xlsx'] }
      ]
    });

    if (canceled || !filePath) {
      return { success: false, message: '导出已取消' };
    }

    // 写入文件
    xlsx.writeFile(workbook, filePath);
    return { success: true };
  } catch (error) {
    console.error('导出到 Excel 失败:', error);
    return { success: false, message: error.message };
  }
});


// 导出数据到 CSV
ipcMain.handle('export-to-csv', async (event, exportOptions) => {
  try {
    // 处理传入的参数，兼容旧版本调用方式
    let data, columns, fieldMap;
    if (typeof exportOptions === 'object' && exportOptions !== null) {
      // 新的调用方式，包含fieldMap等信息
      data = exportOptions.data;
      columns = exportOptions.columns;
      fieldMap = exportOptions.fieldMap || [];
    } else {
      // 旧的调用方式
      data = exportOptions.data;
      columns = exportOptions.columns;
      fieldMap = [];
    }

    // 根据字段类型处理数据
    const processedData = data.map(row => {
      const processedRow = {};
      for (const key in row) {
        const value = row[key];
        // 查找字段信息
        const fieldInfo = fieldMap.find(field => field.name === key);

        if (fieldInfo) {
          // 根据字段类型处理
          switch (fieldInfo.type) {
            // 日期时间类型 - 转换为字符串格式
            case 7:   // MYSQL_TYPE_TIMESTAMP
            case 10:  // MYSQL_TYPE_DATE
            case 11:  // MYSQL_TYPE_TIME
            case 12:  // MYSQL_TYPE_DATETIME
            case 13:  // MYSQL_TYPE_YEAR
              if (value instanceof Date) {
                // 根据具体类型格式化日期
                switch (fieldInfo.type) {
                  case 10: // DATE
                    const date = new Date(value);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    processedRow[key] = `${year}-${month}-${day}`;
                    break;

                  case 11: // TIME
                    const time = new Date(value);
                    const hours = String(time.getHours()).padStart(2, '0');
                    const minutes = String(time.getMinutes()).padStart(2, '0');
                    const seconds = String(time.getSeconds()).padStart(2, '0');
                    processedRow[key] = `${hours}:${minutes}:${seconds}`;
                    break;

                  case 13: // YEAR
                    const yearValue = new Date(value);
                    processedRow[key] = yearValue.getFullYear().toString();
                    break;

                  default: // DATETIME, TIMESTAMP
                    const datetime = new Date(value);
                    const fullYear = datetime.getFullYear();
                    const fullMonth = String(datetime.getMonth() + 1).padStart(2, '0');
                    const fullDay = String(datetime.getDate()).padStart(2, '0');
                    const fullHours = String(datetime.getHours()).padStart(2, '0');
                    const fullMinutes = String(datetime.getMinutes()).padStart(2, '0');
                    const fullSeconds = String(datetime.getSeconds()).padStart(2, '0');
                    processedRow[key] = `${fullYear}-${fullMonth}-${fullDay} ${fullHours}:${fullMinutes}:${fullSeconds}`;
                }
              } else if (typeof value === 'string' && !isNaN(Date.parse(value))) {
                // 尝试解析日期字符串
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                  switch (fieldInfo.type) {
                    case 10: // DATE
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      processedRow[key] = `${year}-${month}-${day}`;
                      break;

                    case 11: // TIME
                      const hours = String(date.getHours()).padStart(2, '0');
                      const minutes = String(date.getMinutes()).padStart(2, '0');
                      const seconds = String(date.getSeconds()).padStart(2, '0');
                      processedRow[key] = `${hours}:${minutes}:${seconds}`;
                      break;

                    case 13: // YEAR
                      processedRow[key] = date.getFullYear().toString();
                      break;

                    default: // DATETIME, TIMESTAMP
                      const fullYear = date.getFullYear();
                      const fullMonth = String(date.getMonth() + 1).padStart(2, '0');
                      const fullDay = String(date.getDate()).padStart(2, '0');
                      const fullHours = String(date.getHours()).padStart(2, '0');
                      const fullMinutes = String(date.getMinutes()).padStart(2, '0');
                      const fullSeconds = String(date.getSeconds()).padStart(2, '0');
                      processedRow[key] = `${fullYear}-${fullMonth}-${fullDay} ${fullHours}:${fullMinutes}:${fullSeconds}`;
                  }
                } else {
                  processedRow[key] = value;
                }
              } else if (value === null || value === undefined) {
                processedRow[key] = '';
              } else {
                processedRow[key] = value.toString();
              }
              break;

            // 数值类型
            case 1:   // MYSQL_TYPE_TINY
            case 2:   // MYSQL_TYPE_SHORT
            case 3:   // MYSQL_TYPE_LONG
            case 8:   // MYSQL_TYPE_LONGLONG
            case 9:   // MYSQL_TYPE_INT24
            case 4:   // MYSQL_TYPE_FLOAT
            case 5:   // MYSQL_TYPE_DOUBLE
            case 246: // MYSQL_TYPE_DECIMAL
              if (value === null || value === undefined || value === '') {
                processedRow[key] = value;
              } else {
                const num = Number(value);
                processedRow[key] = isNaN(num) ? value : num;
              }
              break;

            default:
              processedRow[key] = value;
          }
        } else {
          // 没有字段信息时，使用通用处理方式
          if (value instanceof Date) {
            const date = new Date(value);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            processedRow[key] = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
          } else if (typeof value === 'string' && !isNaN(Date.parse(value))) {
            // 尝试解析日期字符串
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const hours = String(date.getHours()).padStart(2, '0');
              const minutes = String(date.getMinutes()).padStart(2, '0');
              const seconds = String(date.getSeconds()).padStart(2, '0');
              processedRow[key] = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            } else {
              processedRow[key] = value;
            }
          } else {
            processedRow[key] = value;
          }
        }
      }
      return processedRow;
    });

    const worksheet = xlsx.utils.json_to_sheet(processedData);
    const csv = xlsx.utils.sheet_to_csv(worksheet);

    // 让用户选择保存位置
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: '保存 CSV 文件',
      defaultPath: 'export.csv',
      filters: [
        { name: 'CSV Files', extensions: ['csv'] }
      ]
    });

    if (canceled || !filePath) {
      return { success: false, message: '导出已取消' };
    }

    // 写入文件
    fs.writeFileSync(filePath, csv, 'utf8');
    return { success: true };
  } catch (error) {
    console.error('导出到 CSV 失败:', error);
    return { success: false, message: error.message };
  }
});



ipcMain.handle('export-to-sql', async (event, data) => {
  try {
    const { data: exportData, columns } = data;

    // 生成简单的 INSERT 语句
    let sql = "-- Exported SQL Data\n\n";

    if (exportData.length > 0) {
      // 获取表名（这里使用默认名称，实际应用中可能需要用户提供）
      const tableName = 'exported_table';

      // 生成 CREATE TABLE 语句（简化版）
      sql += `-- Table structure for ${tableName}\n`;
      sql += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
      sql += "  id INTEGER PRIMARY KEY AUTOINCREMENT,\n";

      // 添加字段定义（简化处理，都作为 TEXT 类型）
      columns.forEach((column, index) => {
        sql += `  ${column} TEXT`;
        if (index < columns.length - 1) {
          sql += ",";
        }
        sql += "\n";
      });

      sql += ");\n\n";

      // 生成 INSERT 语句
      sql += `-- Data for ${tableName}\n`;
      exportData.forEach(row => {
        let values = columns.map(column => {
          const value = row[column];
          if (value === null || value === undefined) {
            return 'NULL';
          } else if (typeof value === 'string') {
            // 转义单引号
            return `'${value.replace(/'/g, "''")}'`;
          } else {
            return `'${value}'`;
          }
        });

        sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
      });
    }

    // 让用户选择保存位置
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: '保存 SQL 文件',
      defaultPath: 'export.sql',
      filters: [
        { name: 'SQL Files', extensions: ['sql'] }
      ]
    });

    if (canceled || !filePath) {
      return { success: false, message: '导出已取消' };
    }

    // 写入文件
    fs.writeFileSync(filePath, sql, 'utf8');
    return { success: true };
  } catch (error) {
    console.error('导出到 SQL 失败:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('import-from-file', async (event, connectionId, tableName, filePath = null, sheetName = null) => {
  if (!connectionId || !tableName) {
    return { success: false, message: '无效的连接或表名' };
  }

  let selectedFile = filePath;

  // 如果没有传入文件路径，则打开文件选择对话框（预览模式）
  if (!selectedFile) {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: '选择要导入的 Excel 文件',
      properties: ['openFile'],
      filters: [
        { name: 'Excel Files', extensions: ['xlsx'] }
      ]
    });

    if (canceled || filePaths.length === 0) {
      return { success: false, message: '导入已取消' };
    }

    selectedFile = filePaths[0];
  }

  try {
    // 2. Read and parse the excel file
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return { success: false, message: '文件中没有找到可导入的数据' };
    }

    // 3. Get database connection and perform insertion
    const connection = databaseService.connections.get(connectionId);
    if (!connection) {
      return { success: false, message: '数据库连接不存在或已断开' };
    }

    const columns = Object.keys(data[0]);
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

    // 4. Use a transaction
    let importedRowCount = 0;
    if (connection.execute) { // MySQL
      await connection.beginTransaction();
      try {
        for (const row of data) {
          const values = columns.map(col => row[col]);
          const [result] = await connection.query(sql, values);
          importedRowCount += result.affectedRows;
        }
        await connection.commit();
      } catch (e) {
        await connection.rollback();
        throw e; // re-throw error to be caught by outer catch
      }
    } else if (connection.query) { // PostgreSQL
      await connection.query('BEGIN');
      try {
        for (const row of data) {
          const values = columns.map(col => row[col]);
          const pgSql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})`;
          const result = await connection.query(pgSql, values);
          importedRowCount += result.rowCount;
        }
        await connection.query('COMMIT');
      } catch (e) {
        await connection.query('ROLLBACK');
        throw e;
      }
    } else {
      return { success: false, message: '当前数据库类型不支持导入操作' };
    }

    return { success: true, message: `成功导入 ${importedRowCount} 条记录！` };

  } catch (error) {
    console.error('导入数据失败:', error);
    return { success: false, message: `导入失败: ${error.message}` };
  }
});

ipcMain.handle('get-databases', async (event, connectionId) => {
  try {
    const connection = databaseService.connections.get(connectionId);
    if (!connection) return [];
    if (connection.execute) {
      // MySQL
      return await databaseService.getMySQLDatabases(connection);
    } else if (connection.query) {
      // PostgreSQL
      return await databaseService.getPostgreSQLDatabases(connection);
    } else {
      // SQLite 或其他
      return [connectionId.split('_').pop()];
    }
  } catch (error) {
    return [];
  }
});

ipcMain.handle('get-tables', async (event, connectionId, databaseName) => {
  try {
    const connection = databaseService.connections.get(connectionId);
    if (!connection) return [];
    if (connection.execute) {
      // MySQL
      await connection.changeUser({ database: databaseName });
      const [rows] = await connection.execute('SHOW TABLE STATUS');
      return rows.map(row => ({
        name: row.Name,
        rows: row.Rows,
        size: `${row.Data_length || 0} B`,
        engine: row.Engine,
        charset: row.Collation ? row.Collation.split('_')[0] : '',
        collation: row.Collation,
        columns: [],
        indexes: []
      }));
    } else if (connection.query) {
      // PostgreSQL
      const sql = `
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
      `;
      const result = await connection.query(sql);
      return result.rows.map(row => ({
        name: row.tablename,
        rows: null,
        size: null,
        engine: 'PostgreSQL',
        charset: '',
        collation: '',
        columns: [],
        indexes: []
      }));
    } else {
      // SQLite
      const sql = `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`;
      return new Promise((resolve, reject) => {
        connection.all(sql, (err, rows) => {
          if (err) return resolve([]);
          resolve(rows.map(row => ({
            name: row.name,
            rows: null,
            size: null,
            engine: 'SQLite',
            charset: '',
            collation: '',
            columns: [],
            indexes: []
          })));
        });
      });
    }
  } catch (error) {
    return [];
  }
});

ipcMain.handle('get-table-structure', async (event, connectionId, databaseName, tableName) => {
  try {
    const connection = databaseService.connections.get(connectionId);
    if (!connection) return { columns: [], indexes: [] };
    // MySQL
    if (connection.execute) {
      await connection.changeUser({ database: databaseName });
      // 获取字段
      const [columns] = await connection.execute(`SHOW FULL COLUMNS FROM \`${tableName}\``.replace(/\\`/g, '`'));
      // 获取索引
      const [indexes] = await connection.execute(`SHOW INDEX FROM \`${tableName}\``.replace(/\\`/g, '`'));
      return {
        columns: columns.map(col => ({
          name: col.Field,
          type: col.Type,
          length: null,
          nullable: col.Null === 'YES',
          default: col.Default,
          key: col.Key,
          comment: col.Comment
        })),
        indexes: indexes.map(idx => ({
          name: idx.Key_name,
          type: idx.Index_type,
          columns: idx.Column_name,
          cardinality: idx.Cardinality
        }))
      };
    }
    // PostgreSQL
    if (connection.query) {
      // 字段
      const colSql = `SELECT column_name AS name, data_type AS type, is_nullable, column_default AS default, '' AS key, '' AS comment FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`;
      const colRes = await connection.query(colSql, [tableName]);
      // 索引
      const idxSql = `SELECT indexname AS name, indexdef AS type, regexp_replace(indexdef, '.*\\((.*)\\).*', '\\1') AS columns, null AS cardinality FROM pg_indexes WHERE schemaname = 'public' AND tablename = $1`;
      const idxRes = await connection.query(idxSql, [tableName]);
      return {
        columns: colRes.rows.map(col => ({
          name: col.name,
          type: col.type,
          length: null,
          nullable: col.is_nullable === 'YES',
          default: col.default,
          key: col.key,
          comment: col.comment
        })),
        indexes: idxRes.rows.map(idx => ({
          name: idx.name,
          type: idx.type,
          columns: idx.columns,
          cardinality: idx.cardinality
        }))
      };
    }
    // SQLite
    if (connection.all) {
      // 字段
      const colSql = `PRAGMA table_info(\`${tableName}\`)`;
      const columns = await new Promise((resolve, reject) => {
        connection.all(colSql, (err, rows) => {
          if (err) return resolve([]);
          resolve(rows.map(col => ({
            name: col.name,
            type: col.type,
            length: null,
            nullable: !col.notnull,
            default: col.dflt_value,
            key: col.pk ? 'PRI' : '',
            comment: ''
          })));
        });
      });
      // 索引
      const idxSql = `PRAGMA index_list(\`${tableName}\`)`;
      const indexes = await new Promise((resolve, reject) => {
        connection.all(idxSql, (err, rows) => {
          if (err) return resolve([]);
          resolve(rows.map(idx => ({
            name: idx.name,
            type: idx.origin,
            columns: idx.name,
            cardinality: null
          })));
        });
      });
      return { columns, indexes };
    }
    return { columns: [], indexes: [] };
  } catch (error) {
    return { columns: [], indexes: [] };
  }
});

ipcMain.handle('get-table-data', async (event, connectionId, databaseName, tableName, options = {}) => {
  try {
    const connection = databaseService.connections.get(connectionId);
    if (!connection) {
      return { success: false, message: '数据库连接不存在或已断开' };
    }

    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const search = options.search || '';
    let data = [];
    let total = 0;

    // MySQL
    if (connection.execute) {
      await connection.changeUser({ database: databaseName });

      // 构建查询条件
      const whereClause = search
        ? `WHERE CONCAT_WS('', ${await getMySQLTableColumns(connection, tableName)}) LIKE ?`
        : '';

      // 获取总数
      const [countRows] = await connection.query(
        `SELECT COUNT(*) as total FROM \`${tableName}\` ${whereClause}`.replace(/\\`/g, '`'),
        search ? [`%${search}%`] : []
      );
      total = countRows[0].total;

      // 获取分页数据
      const [rows] = await connection.query(
        `SELECT * FROM \`${tableName}\` ${whereClause} LIMIT ? OFFSET ?`.replace(/\\`/g, '`'),
        search ? [`%${search}%`, pageSize, (page - 1) * pageSize] : [pageSize, (page - 1) * pageSize]
      );
      data = rows;
    }
    // PostgreSQL
    else if (connection.query) {
      // 构建查询条件
      const whereClause = search
        ? `WHERE CONCAT_WS('', ${await getPostgreSQLTableColumns(connection, tableName)}) ILIKE $1`
        : '';

      // 获取总数
      const countResult = await connection.query(
        `SELECT COUNT(*) as total FROM "${tableName}" ${whereClause}`,
        search ? [`%${search}%`] : []
      );
      total = parseInt(countResult.rows[0].total);

      // 获取分页数据
      const result = await connection.query(
        `SELECT * FROM "${tableName}" ${whereClause} LIMIT $${search ? '2' : '1'} OFFSET $${search ? '3' : '2'}`,
        search ? [`%${search}%`, pageSize, (page - 1) * pageSize] : [pageSize, (page - 1) * pageSize]
      );
      data = result.rows;
    }
    // SQLite
    else if (connection.all) {
      return new Promise((resolve, reject) => {
        // 获取总数
        connection.get(
          `SELECT COUNT(*) as total FROM "${tableName}"`,
          [],
          (err, row) => {
            if (err) {
              resolve({ success: false, message: err.message });
              return;
            }
            total = row.total;

            // 获取分页数据
            connection.all(
              `SELECT * FROM "${tableName}" LIMIT ? OFFSET ?`,
              [pageSize, (page - 1) * pageSize],
              (err, rows) => {
                if (err) {
                  resolve({ success: false, message: err.message });
                  return;
                }
                resolve({
                  success: true,
                  data: rows,
                  total
                });
              }
            );
          }
        );
      });
    }

    return {
      success: true,
      data,
      total
    };

  } catch (error) {
    console.error('获取表数据失败:', error);
    return {
      success: false,
      message: error.message
    };
  }
});

// 辅助函数：获取 MySQL 表的所有列名
async function getMySQLTableColumns (connection, tableName) {
  const [columns] = await connection.execute(
    `SHOW COLUMNS FROM \`${tableName}\``.replace(/\\`/g, '`')
  );
  return columns.map(col => `\`${col.Field}\``).join(',');
}

// 辅助函数：获取 PostgreSQL 表的所有列名
async function getPostgreSQLTableColumns (connection, tableName) {
  const result = await connection.query(
    'SELECT column_name FROM information_schema.columns WHERE table_name = $1',
    [tableName]
  );
  return result.rows.map(row => `"${row.column_name}"`).join(',');
}

ipcMain.handle('get-sheet-preview', async (event, filePath = null, sheetName = null) => {
  try {
    // 如果没有传入文件路径，打开文件选择对话框
    if (!filePath) {
      const { filePaths, canceled } = await dialog.showOpenDialog({
        title: '选择要导入的 Excel 文件',
        properties: ['openFile'],
        filters: [
          { name: 'Excel Files', extensions: ['xlsx'] }
        ]
      });

      if (canceled || filePaths.length === 0) {
        return { success: false, message: '导入已取消' };
      }

      filePath = filePaths[0];
    }

    if (!filePath) {
      return { success: false, message: '无效的文件路径' };
    }

    const workbook = xlsx.readFile(filePath);
    const targetSheet = sheetName || workbook.SheetNames[0];
    if (!workbook.SheetNames.includes(targetSheet)) {
      return { success: false, message: '未找到指定的工作表' };
    }

    const worksheet = workbook.Sheets[targetSheet];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return { success: false, message: '工作表中没有找到可导入的数据' };
    }

    return {
      success: true,
      preview: true,
      data: data.slice(0, 10),
      total: data.length,
      columns: Object.keys(data[0]),
      sheets: workbook.SheetNames,
      filePath
    };

  } catch (error) {
    console.error('获取工作表预览失败:', error);
    return { success: false, message: error.message };
  }
});

// 显示文件选择对话框
ipcMain.handle('showOpenDialog', async (event, options) => {
  const result = await dialog.showOpenDialog(options);
  return result;
});



// 显示文件保存对话框
ipcMain.handle('showSaveDialog', async (event, options) => {
  const result = await dialog.showSaveDialog(options);
  return result;
});

// 加载SQL文件
ipcMain.handle('loadSQLFile', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content;
  } catch (error) {
    throw new Error(`无法读取文件: ${error.message}`);
  }
});

// 保存SQL文件
ipcMain.handle('saveSQLFile', async (event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    throw new Error(`无法保存文件: ${error.message}`);
  }
});