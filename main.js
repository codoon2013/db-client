const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
// 导入数据库服务
const databaseService = require('./src/services/database');
const connectionsSqlite = require('./src/services/connectionsSqlite');
const xlsx = require('xlsx');
const fs = require('fs');

let mainWindow;

function createWindow() {
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
function createMenu() {
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
  return {success: true, message: app.getName()};
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
    const connectionId = `${connectionConfig.type}_${connectionConfig.host}_${connectionConfig.port}_${connectionConfig.database}`;
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
    let result, columns,fieldMap;
    if (connection.execute) {
      // MySQL
      const [rows,fields] = await connection.execute(query);
      result = rows;
      if (Array.isArray(fields)) {
        fieldMap = fields.map(field => {
          return {
            name:field.name,
            type:field.type
          }
        });
      } else {
        fieldMap = [];  
      }
      columns = rows.length > 0 ? Object.keys(rows[0]) : [];
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
      columns:columns,
      fieldMap:fieldMap,
      affectedRows: result.length
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

ipcMain.handle('export-to-excel', async (event, data) => {
  if (!data || data.length === 0) {
    return { success: false, message: '没有数据可以导出' };
  }

  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'QueryResult');

  const { filePath, canceled } = await dialog.showSaveDialog({
    title: '导出为 Excel',
    defaultPath: `query-result-${Date.now()}.xlsx`,
    filters: [
      { name: 'Excel Files', extensions: ['xlsx'] }
    ]
  });

  if (canceled || !filePath) {
    return { success: false, message: '导出已取消' };
  }

  try {
    const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    fs.writeFileSync(filePath, buffer);
    return { success: true, message: `文件已成功保存到 ${filePath}` };
  } catch (error) {
    console.error('导出 Excel 失败:', error);
    return { success: false, message: `导出失败: ${error.message}` };
  }
}); 