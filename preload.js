const { contextBridge, ipcRenderer } = require('electron');

// 暴露受保护的 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取应用信息
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppName: () => ipcRenderer.invoke('get-app-name'),

  // 数据库连接相关
  testDatabaseConnection: (connectionConfig) => ipcRenderer.invoke('test-database-connection', connectionConfig),
  establishDatabaseConnection: (connectionConfig) => ipcRenderer.invoke('establish-database-connection', connectionConfig),
  closeDatabaseConnection: (connectionId) => ipcRenderer.invoke('close-database-connection', connectionId),
  executeQuery: (connectionId, query) => ipcRenderer.invoke('execute-query', connectionId, query),
  exportToExcel: (data, filename) => ipcRenderer.invoke('export-to-excel', data, filename),
  exportToCSV: (data) => ipcRenderer.invoke('export-to-csv', data),
  exportToSQL: (data) => ipcRenderer.invoke('export-to-sql', data),
  importFromFile: (connectionId, tableName, filePath, sheetName) => ipcRenderer.invoke('import-from-file', connectionId, tableName, filePath, sheetName),
  getSheetPreview: (filePath, sheetName) => ipcRenderer.invoke('get-sheet-preview', filePath, sheetName),
  getDatabases: (connectionId) => ipcRenderer.invoke('get-databases', connectionId),
  getTables: (connectionId, databaseName) => ipcRenderer.invoke('get-tables', connectionId, databaseName),
  getTableStructure: (connectionId, databaseName, tableName) => ipcRenderer.invoke('get-table-structure', connectionId, databaseName, tableName),
  getTableData: (connectionId, databaseName, tableName, options) => ipcRenderer.invoke('get-table-data', connectionId, databaseName, tableName, options),

  // 菜单事件监听
  onMenuNew: (callback) => ipcRenderer.on('menu-new', callback),
  onMenuOpen: (callback) => ipcRenderer.on('menu-open', callback),
  onMenuAbout: (callback) => ipcRenderer.on('menu-about', callback),

  // 移除事件监听
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  getConnections: () => ipcRenderer.invoke('get-connections'),
  upsertConnection: (conn) => ipcRenderer.invoke('upsert-connection', conn),
  deleteConnection: (id) => ipcRenderer.invoke('delete-connection', id),
  // 文件对话框相关
  showOpenDialog: (options) => ipcRenderer.invoke('showOpenDialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('showSaveDialog', options),
  loadSQLFile: (filePath) => ipcRenderer.invoke('loadSQLFile', filePath),
  saveSQLFile: (filePath, content) => ipcRenderer.invoke('saveSQLFile', filePath, content),
});