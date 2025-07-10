const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const mysql = require('mysql2/promise');
const fs = require('fs');
// 动态导入 xlsx 库
let XLSX;
async function loadXLSX() {
  if (!XLSX) {
    try {
      XLSX = require('xlsx');
    } catch (error) {
      console.error('Failed to load xlsx module:', error);
      throw new Error('Excel 功能不可用，请检查 xlsx 模块安装');
    }
  }
  return XLSX;
}

// 初始化配置存储
const store = new Store();

let mainWindow;
let tray;
let dbConnections = new Map(); // 存储多个数据库连接
let currentConnectionId = null; // 当前活跃的连接ID

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    titleBarStyle: 'hiddenInset',
    show: false,
    icon: path.join(__dirname, 'assets/icon.png')
  });

  // 加载应用的 index.html
  mainWindow.loadFile('index.html');

  // 当窗口准备好显示时显示窗口
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 当窗口关闭时触发
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 开发模式下打开开发者工具
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

function createTray() {
  // 创建系统托盘图标
  const iconPath = path.join(__dirname, 'assets/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(icon);
  tray.setToolTip('mysql-client');

  // 创建托盘菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        }
      }
    },
    {
      label: '设置',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('open-settings');
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  // 点击托盘图标显示主窗口
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
}

// 当 Electron 完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    // 在 macOS 上，当点击 dock 图标并且没有其他窗口打开时，
    // 通常在应用程序中重新创建一个窗口。
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

// IPC 通信处理
ipcMain.handle('get-settings', () => {
  return store.get('settings', {});
});

ipcMain.handle('save-settings', (event, settings) => {
  store.set('settings', settings);
  return true;
});

ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
});

// 获取保存的数据库连接配置
ipcMain.handle('get-db-connections', () => {
  return store.get('dbConnections', []);
});

// 保存数据库连接配置
ipcMain.handle('save-db-connection', (event, connection) => {
  const connections = store.get('dbConnections', []);
  if (connection.id) {
    // 更新现有连接
    const index = connections.findIndex(c => c.id === connection.id);
    if (index !== -1) {
      connections[index] = { ...connections[index], ...connection };
    }
  } else {
    // 新增连接
    connection.id = Date.now().toString();
    connection.createdAt = new Date().toISOString();
    connections.push(connection);
  }
  store.set('dbConnections', connections);
  return { success: true, connection };
});

// 删除数据库连接配置
ipcMain.handle('delete-db-connection', (event, connectionId) => {
  const connections = store.get('dbConnections', []);
  const filteredConnections = connections.filter(c => c.id !== connectionId);
  store.set('dbConnections', filteredConnections);
  
  // 如果删除的是当前连接，关闭连接
  if (currentConnectionId === connectionId) {
    closeConnection(connectionId);
    currentConnectionId = null;
  }
  
  return { success: true };
});

// 连接MySQL
ipcMain.handle('mysql-connect', async (event, config) => {
  try {
    const connectionId = config.id || Date.now().toString();
    
    // 如果已存在连接，先关闭
    if (dbConnections.has(connectionId)) {
      await closeConnection(connectionId);
    }
    
    // 创建新连接
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectTimeout: 10000
    });
    
    // 测试连接
    await connection.ping();
    
    // 保存连接
    dbConnections.set(connectionId, {
      connection,
      config,
      status: 'connected',
      connectedAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    });
    
    currentConnectionId = connectionId;
    
    return { 
      success: true, 
      connectionId,
      message: '连接成功'
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 关闭指定连接
async function closeConnection(connectionId) {
  if (dbConnections.has(connectionId)) {
    const connInfo = dbConnections.get(connectionId);
    try {
      await connInfo.connection.end();
    } catch (err) {
      console.error('关闭连接失败:', err);
    }
    dbConnections.delete(connectionId);
  }
}

// 关闭所有连接
ipcMain.handle('close-all-connections', async () => {
  for (const [connectionId] of dbConnections) {
    await closeConnection(connectionId);
  }
  currentConnectionId = null;
  return { success: true };
});

// 切换当前连接
ipcMain.handle('switch-connection', async (event, connectionId) => {
  if (dbConnections.has(connectionId)) {
    currentConnectionId = connectionId;
    const connInfo = dbConnections.get(connectionId);
    connInfo.lastUsed = new Date().toISOString();
    return { success: true, connectionId };
  }
  return { success: false, error: '连接不存在' };
});

// 获取连接状态
ipcMain.handle('get-connection-status', () => {
  const status = [];
  for (const [connectionId, connInfo] of dbConnections) {
    status.push({
      id: connectionId,
      name: connInfo.config.name || `${connInfo.config.host}:${connInfo.config.port}`,
      status: connInfo.status,
      connectedAt: connInfo.connectedAt,
      lastUsed: connInfo.lastUsed,
      isCurrent: connectionId === currentConnectionId
    });
  }
  return status;
});

// 测试连接
ipcMain.handle('test-connection', async (event, config) => {
  try {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectTimeout: 5000
    });
    
    await connection.ping();
    await connection.end();
    
    return { success: true, message: '连接测试成功' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

function formatDateToCN(val) {
  if (val == null) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const pad = n => n < 10 ? '0' + n : n;
    return `${val.getFullYear()}-${pad(val.getMonth()+1)}-${pad(val.getDate())} ${pad(val.getHours())}:${pad(val.getMinutes())}:${pad(val.getSeconds())}`;
  }
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const pad = n => n < 10 ? '0' + n : n;
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
  return val;
}

// 查询MySQL - 修改为使用当前连接
ipcMain.handle('mysql-query', async (event, sql) => {
  try {
    if (!currentConnectionId || !dbConnections.has(currentConnectionId)) {
      throw new Error('未连接数据库');
    }
    
    const connInfo = dbConnections.get(currentConnectionId);
    const connection = connInfo.connection;
    
    let query = sql.trim();
    // 如果是SELECT语句且没有LIMIT，自动加上LIMIT 50
    if (/^select\b/i.test(query) && !/\blimit\b/i.test(query)) {
      // 去掉末尾分号
      query = query.replace(/;\s*$/, '');
      query += ' LIMIT 50';
    }
    
    const [rows] = await connection.query(query);
    
    // 更新最后使用时间
    connInfo.lastUsed = new Date().toISOString();
    
    // 格式化所有时间字段
    const formattedRows = rows.map(row => {
      const newRow = { ...row };
      for (const k in newRow) {
        if (newRow[k] instanceof Date || (typeof newRow[k] === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(newRow[k]))) {
          newRow[k] = formatDateToCN(newRow[k]);
        }
      }
      return newRow;
    });
    
    return { success: true, rows: formattedRows };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 导出数据（导出为Excel）- 修改为使用当前连接
ipcMain.handle('mysql-export', async (event, sql) => {
  const { dialog } = require('electron');
  try {
    if (!currentConnectionId || !dbConnections.has(currentConnectionId)) {
      throw new Error('未连接数据库');
    }
    
    const connInfo = dbConnections.get(currentConnectionId);
    const connection = connInfo.connection;
    
    let query = sql.trim();
    
    const [rows] = await connection.query(query);
    
    if (!rows.length) throw new Error('无数据可导出');
    
    // 格式化数据
    const formattedRows = rows.map(row => {
      const newRow = { ...row };
      for (const k in newRow) {
        if (newRow[k] instanceof Date || (typeof newRow[k] === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(newRow[k]))) {
          newRow[k] = formatDateToCN(newRow[k]);
        }
      }
      return newRow;
    });
    
    const { filePath } = await dialog.showSaveDialog({
      title: '导出数据',
      defaultPath: `query_results_${new Date().toISOString().slice(0, 10)}.xlsx`,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    });
    
    if (filePath) {
      // 创建 Excel 工作簿
      const XLSX = await loadXLSX();
      const worksheet = XLSX.utils.json_to_sheet(formattedRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Query Results');
      
      // 写入文件
      XLSX.writeFile(workbook, filePath);
      return { success: true, filePath };
    } else {
      return { success: false, error: '用户取消导出' };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

function formatCSVCell(val) {
  if (val == null) return '';
  if (val instanceof Date) {
    // 格式化为中国时间 YYYY-MM-DD HH:mm:ss
    if (isNaN(val.getTime())) return '';
    const pad = n => n < 10 ? '0' + n : n;
    return `${val.getFullYear()}-${pad(val.getMonth()+1)}-${pad(val.getDate())} ${pad(val.getHours())}:${pad(val.getMinutes())}:${pad(val.getSeconds())}`;
  }
  // 处理字符串中的时区信息
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const pad = n => n < 10 ? '0' + n : n;
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

const parseCSV = (content) => {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error('CSV内容不足');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => {
    // 处理带引号和逗号的字段
    const cells = [];
    let cur = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i+1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        cells.push(cur); cur = '';
      } else {
        cur += c;
      }
    }
    cells.push(cur);
    return headers.reduce((obj, h, idx) => { obj[h] = cells[idx] || null; return obj; }, {});
  });
  return { headers, rows };
};

// 导入数据（从Excel导入）- 修改为使用当前连接
ipcMain.handle('mysql-import', async (event, { table, content }) => {
  try {
    if (!currentConnectionId || !dbConnections.has(currentConnectionId)) {
      throw new Error('未连接数据库');
    }
    
    const connInfo = dbConnections.get(currentConnectionId);
    const connection = connInfo.connection;
    
    if (!table) throw new Error('表名不能为空');
    if (!content) throw new Error('Excel内容为空');
    
    // 解析Excel数据
    let excelData;
    try {
      excelData = JSON.parse(content);
    } catch (e) {
      throw new Error('Excel数据格式错误');
    }
    
    if (!excelData || !Array.isArray(excelData) || excelData.length === 0) {
      throw new Error('Excel无有效数据');
    }
    
    // 获取表头（字段名）
    const headers = Object.keys(excelData[0]);
    const rows = excelData;
    
    let successCount = 0;
    let failCount = 0;
    
    for (const row of rows) {
      // 动态生成字段和参数
      const fields = headers.map(h => `\`${h}\``).join(',');
      const placeholders = headers.map(() => '?').join(',');
      const values = headers.map(h => row[h]);
      const sql = `INSERT INTO \`${table}\` (${fields}) VALUES (${placeholders})`;
      
      try {
        await connection.query(sql, values);
        successCount++;
      } catch (e) {
        console.log(e);
        failCount++;
      }
    }
    
    return { success: true, successCount, failCount };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 选择Excel文件
ipcMain.handle('select-csv-file', async (event) => {
  const { dialog } = require('electron');
  try {
    const result = await dialog.showOpenDialog({
      title: '选择Excel文件',
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
      properties: ['openFile']
    });
    
    if (result.canceled) {
      return { canceled: true };
    }
    
    const filePath = result.filePaths[0];
    
    // 读取Excel文件
    const XLSX = await loadXLSX();
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // 获取第一个工作表
    const worksheet = workbook.Sheets[sheetName];
    
    // 将Excel数据转换为JSON格式
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (rows.length < 2) {
      throw new Error('Excel文件数据不足，至少需要表头和数据行');
    }
    
    // 提取表头和数据
    const headers = rows[0];
    const dataRows = rows.slice(1);
    
    // 转换为对象数组格式
    const jsonData = dataRows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || null;
      });
      return obj;
    });
    
    return { 
      canceled: false, 
      content: JSON.stringify(jsonData),
      headers: headers,
      rows: jsonData
    };
  } catch (err) {
    return { canceled: true, error: err.message };
  }
});

// 防止应用被重复启动
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // 当运行第二个实例时，应该聚焦到主窗口
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

ipcMain.handle('open-csv-dialog', async () => {
  const { dialog } = require('electron');
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: '选择CSV文件',
    filters: [{ name: 'CSV', extensions: ['csv'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths || !filePaths[0]) return { canceled: true };
  const content = fs.readFileSync(filePaths[0], 'utf-8');
  return { canceled: false, content };
}); 