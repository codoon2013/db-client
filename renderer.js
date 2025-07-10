const { ipcRenderer } = require('electron');

// 全局变量
let currentView = 'dashboard';
let settings = {};
let savedConnections = []; // 保存的数据库连接配置
let currentConnectionId = null; // 当前活跃的连接ID
let queryHistory = []; // 查询历史记录

// DOM 元素
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');
const settingsBtn = document.getElementById('settingsBtn');
const minimizeBtn = document.getElementById('minimizeBtn');
const maximizeBtn = document.getElementById('maximizeBtn');
const closeBtn = document.getElementById('closeBtn');

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    startSystemMonitoring();
    loadSettings();
    setupDatabaseEvents();
});

// 初始化应用
function initializeApp() {
    console.log('mysql-client 初始化中...');
    
    // 设置当前时间
    updateTime();
    setInterval(updateTime, 1000);
    
    // 初始化应用程序网格
    initializeAppsGrid();
    
    // 初始化网络信息
    initializeNetworkInfo();
}

// 设置事件监听器
function setupEventListeners() {
    // 导航事件
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewName = item.dataset.view;
            switchView(viewName);
        });
    });

    // 工具栏按钮事件
    minimizeBtn.addEventListener('click', () => {
        ipcRenderer.send('minimize-window');
    });

    maximizeBtn.addEventListener('click', () => {
        ipcRenderer.send('maximize-window');
    });

    closeBtn.addEventListener('click', () => {
        ipcRenderer.send('close-window');
    });

    settingsBtn.addEventListener('click', () => {
        switchView('system');
    });

    // 设置相关事件
    setupSettingsEvents();
}

// 切换视图
function switchView(viewName) {
    // 移除所有活动状态
    navItems.forEach(item => item.classList.remove('active'));
    views.forEach(view => view.classList.remove('active'));

    // 设置新的活动状态
    const activeNavItem = document.querySelector(`[data-view="${viewName}"]`);
    const activeView = document.getElementById(`${viewName}-view`);

    if (activeNavItem && activeView) {
        activeNavItem.classList.add('active');
        activeView.classList.add('active');
        currentView = viewName;
        // 每次切换到数据库视图时，重新绑定数据库事件
        if (viewName === 'database') {
            setupDatabaseEvents();
        }
    }
}

// 更新时间显示
function updateTime() {
    const now = new Date();
    const timeElement = document.getElementById('currentTime');
    const dateElement = document.getElementById('currentDate');

    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString('zh-CN');
    }

    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// 系统监控
function startSystemMonitoring() {
    // 模拟系统信息更新
    setInterval(() => {
        updateSystemInfo();
    }, 2000);
}

// 更新系统信息
function updateSystemInfo() {
    // 模拟CPU使用率
    const cpuUsage = Math.floor(Math.random() * 100);
    const memoryUsage = Math.floor(Math.random() * 100);
    const diskUsage = Math.floor(Math.random() * 100);

    const cpuElement = document.getElementById('cpuUsage');
    const memoryElement = document.getElementById('memoryUsage');
    const diskElement = document.getElementById('diskUsage');

    if (cpuElement) cpuElement.textContent = `${cpuUsage}%`;
    if (memoryElement) memoryElement.textContent = `${memoryUsage}%`;
    if (diskElement) diskElement.textContent = `${diskUsage}%`;
}

// 初始化应用程序网格
function initializeAppsGrid() {
    const appsGrid = document.getElementById('appsGrid');
    
    // 模拟应用程序数据
    const apps = [
        { name: 'Safari', icon: 'fas fa-globe' },
        { name: '邮件', icon: 'fas fa-envelope' },
        { name: '日历', icon: 'fas fa-calendar' },
        { name: '照片', icon: 'fas fa-camera' },
        { name: '音乐', icon: 'fas fa-music' },
        { name: '视频', icon: 'fas fa-video' },
        { name: '地图', icon: 'fas fa-map' },
        { name: '天气', icon: 'fas fa-cloud-sun' },
        { name: '计算器', icon: 'fas fa-calculator' },
        { name: '时钟', icon: 'fas fa-clock' },
        { name: '备忘录', icon: 'fas fa-sticky-note' },
        { name: '设置', icon: 'fas fa-cog' }
    ];

    apps.forEach(app => {
        const appItem = createAppItem(app);
        appsGrid.appendChild(appItem);
    });
}

// 创建应用程序项目
function createAppItem(app) {
    const appItem = document.createElement('div');
    appItem.className = 'app-item';
    appItem.innerHTML = `
        <div class="app-icon">
            <i class="${app.icon}"></i>
        </div>
        <div class="app-name">${app.name}</div>
    `;
    
    appItem.addEventListener('click', () => {
        launchApp(app.name);
    });

    return appItem;
}

// 启动应用程序
function launchApp(appName) {
    console.log('启动应用程序:', appName);
    // 这里可以实现应用程序启动功能
}

// 初始化网络信息
function initializeNetworkInfo() {
    const networkInfo = document.getElementById('networkInfo');
    
    if (networkInfo) {
        networkInfo.innerHTML = `
            <div class="network-item">
                <span class="label">连接状态:</span>
                <span class="value">已连接</span>
            </div>
            <div class="network-item">
                <span class="label">网络类型:</span>
                <span class="value">Wi-Fi</span>
            </div>
            <div class="network-item">
                <span class="label">IP地址:</span>
                <span class="value">192.168.1.100</span>
            </div>
            <div class="network-item">
                <span class="label">信号强度:</span>
                <span class="value">强</span>
            </div>
        `;
    }
}

// 加载设置
async function loadSettings() {
    try {
        settings = await ipcRenderer.invoke('get-settings');
        applySettings(settings);
    } catch (error) {
        console.error('加载设置失败:', error);
    }
}

// 应用设置
function applySettings(settings) {
    // 应用主题设置
    if (settings.theme) {
        document.documentElement.setAttribute('data-theme', settings.theme);
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.value = settings.theme;
        }
    }

    // 应用字体大小设置
    if (settings.fontSize) {
        document.documentElement.style.fontSize = `${settings.fontSize}px`;
        const fontSizeSlider = document.getElementById('fontSizeSlider');
        const fontSizeValue = document.getElementById('fontSizeValue');
        if (fontSizeSlider && fontSizeValue) {
            fontSizeSlider.value = settings.fontSize;
            fontSizeValue.textContent = `${settings.fontSize}px`;
        }
    }

    // 应用其他设置
    const autoStartCheckbox = document.getElementById('autoStartCheckbox');
    const trayCheckbox = document.getElementById('trayCheckbox');
    
    if (autoStartCheckbox && settings.autoStart !== undefined) {
        autoStartCheckbox.checked = settings.autoStart;
    }
    
    if (trayCheckbox && settings.tray !== undefined) {
        trayCheckbox.checked = settings.tray;
    }
}

// 设置设置相关事件
function setupSettingsEvents() {
    const themeSelect = document.getElementById('themeSelect');
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    const fontSizeValue = document.getElementById('fontSizeValue');
    const autoStartCheckbox = document.getElementById('autoStartCheckbox');
    const trayCheckbox = document.getElementById('trayCheckbox');

    // 主题切换
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            settings.theme = e.target.value;
            saveSettings();
            applySettings(settings);
        });
    }

    // 字体大小调整
    if (fontSizeSlider && fontSizeValue) {
        fontSizeSlider.addEventListener('input', (e) => {
            const fontSize = e.target.value;
            fontSizeValue.textContent = `${fontSize}px`;
            settings.fontSize = parseInt(fontSize);
            saveSettings();
            applySettings(settings);
        });
    }

    // 自动启动设置
    if (autoStartCheckbox) {
        autoStartCheckbox.addEventListener('change', (e) => {
            settings.autoStart = e.target.checked;
            saveSettings();
        });
    }

    // 系统托盘设置
    if (trayCheckbox) {
        trayCheckbox.addEventListener('change', (e) => {
            settings.tray = e.target.checked;
            saveSettings();
        });
    }
}

// 保存设置
async function saveSettings() {
    try {
        await ipcRenderer.invoke('save-settings', settings);
        console.log('设置已保存');
    } catch (error) {
        console.error('保存设置失败:', error);
    }
}

// 监听来自主进程的消息
ipcRenderer.on('open-settings', () => {
    switchView('system');
});

// 添加文件项目的CSS样式
const style = document.createElement('style');
style.textContent = `
    .file-item, .app-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 15px;
        background: rgba(255, 255, 255, 0.8);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        text-align: center;
    }

    .file-item:hover, .app-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        background: rgba(255, 255, 255, 1);
    }

    .file-icon, .app-icon {
        font-size: 32px;
        margin-bottom: 8px;
        color: #667eea;
    }

    .file-name, .app-name {
        font-size: 12px;
        color: #333;
        word-break: break-word;
        max-width: 100px;
    }

    .network-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
        padding: 8px 0;
    }

    .network-item .label {
        color: #666;
        font-weight: 500;
    }

    .network-item .value {
        color: #333;
        font-weight: 600;
    }
`;
document.head.appendChild(style);

// 设置数据库事件
function setupDatabaseEvents() {
    // 加载保存的连接配置
    loadSavedConnections();
    
    // 新建连接按钮 - 打开模态对话框
    const newConnectionBtn = document.getElementById('newConnectionBtn');
    if (newConnectionBtn) {
        newConnectionBtn.addEventListener('click', () => {
            openConnectionModal();
        });
    }
    
    // 模态对话框相关事件
    setupModalEvents();
    
    // 查询按钮
    const dbQueryBtn = document.getElementById('dbQueryBtn');
    if (dbQueryBtn) {
        dbQueryBtn.addEventListener('click', executeQuery);
    }
    
    // 导出按钮
    const dbExportBtn = document.getElementById('dbExportBtn');
    if (dbExportBtn) {
        dbExportBtn.addEventListener('click', exportData);
    }
    
    // 导入按钮
    const dbImportBtn = document.getElementById('dbImportBtn');
    if (dbImportBtn) {
        dbImportBtn.addEventListener('click', () => {
            const importConfig = document.getElementById('importConfig');
            importConfig.style.display = importConfig.style.display === 'none' ? 'flex' : 'none';
        });
    }
    
    // 确认导入按钮
    const confirmImportBtn = document.getElementById('confirmImportBtn');
    if (confirmImportBtn) {
        confirmImportBtn.addEventListener('click', showImportTableModal);
    }
    
    // 查询历史按钮
    const showHistoryBtn = document.getElementById('showHistoryBtn');
    if (showHistoryBtn) {
        showHistoryBtn.addEventListener('click', showQueryHistory);
    }
}

// 设置模态对话框事件
function setupModalEvents() {
    const modal = document.getElementById('connectionModal');
    const closeBtn = document.getElementById('closeConnectionModal');
    const cancelBtn = document.getElementById('cancelConnectionModalBtn');
    const testBtn = document.getElementById('testConnectionModalBtn');
    const saveBtn = document.getElementById('saveConnectionModalBtn');
    
    // 导入表名模态对话框
    const importTableModal = document.getElementById('importTableModal');
    const closeImportBtn = document.getElementById('closeImportTableModal');
    const cancelImportBtn = document.getElementById('cancelImportTableBtn');
    const confirmImportTableBtn = document.getElementById('confirmImportTableBtn');
    
    // 关闭模态对话框
    if (closeBtn) {
        closeBtn.addEventListener('click', closeConnectionModal);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeConnectionModal);
    }
    
    // 关闭导入表名模态对话框
    if (closeImportBtn) {
        closeImportBtn.addEventListener('click', closeImportTableModal);
    }
    
    if (cancelImportBtn) {
        cancelImportBtn.addEventListener('click', closeImportTableModal);
    }
    
    // 确认导入表名
    if (confirmImportTableBtn) {
        confirmImportTableBtn.addEventListener('click', () => {
            const tableName = document.getElementById('importTableName').value.trim();
            if (!tableName) {
                showMessage('请输入目标表名', 'error');
                return;
            }
            closeImportTableModal();
            importData(tableName);
        });
    }
    
    // 点击遮罩层关闭
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeConnectionModal();
            }
        });
    }
    
    // 点击遮罩层关闭导入表名模态对话框
    if (importTableModal) {
        importTableModal.addEventListener('click', (e) => {
            if (e.target === importTableModal) {
                closeImportTableModal();
            }
        });
    }
    
    // 测试连接
    if (testBtn) {
        testBtn.addEventListener('click', testConnectionModal);
    }
    
    // 保存连接
    if (saveBtn) {
        saveBtn.addEventListener('click', saveConnectionModal);
    }
    
    // ESC键关闭模态对话框
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.classList.contains('show')) {
            closeConnectionModal();
        }
        if (e.key === 'Escape' && importTableModal && importTableModal.classList.contains('show')) {
            closeImportTableModal();
        }
    });
}

// 打开连接模态对话框
function openConnectionModal() {
    const modal = document.getElementById('connectionModal');
    if (modal) {
        clearModalForm();
        setModalTitle('新建数据库连接');
        modal.classList.add('show');
        // 聚焦到第一个输入框
        setTimeout(() => {
            document.getElementById('modalConnName').focus();
        }, 100);
    }
}

// 编辑连接
function editConnection(connectionId) {
    const connection = savedConnections.find(c => c.id === connectionId);
    if (!connection) {
        showMessage('连接配置不存在', 'error');
        return;
    }
    
    // 如果正在编辑当前连接的配置，给出提示
    if (connectionId === currentConnectionId) {
        if (!confirm('您正在编辑当前使用的连接配置。修改后需要重新连接才能生效。是否继续？')) {
            return;
        }
    }
    
    const modal = document.getElementById('connectionModal');
    if (modal) {
        // 填充表单数据
        document.getElementById('modalConnectionId').value = connection.id;
        document.getElementById('modalConnName').value = connection.name || '';
        document.getElementById('modalDbHost').value = connection.host || '';
        document.getElementById('modalDbPort').value = connection.port || '3306';
        document.getElementById('modalDbUser').value = connection.user || '';
        document.getElementById('modalDbPassword').value = connection.password || '';
        document.getElementById('modalDbName').value = connection.database || '';
        
        setModalTitle('编辑数据库连接');
        modal.classList.add('show');
        
        // 聚焦到第一个输入框
        setTimeout(() => {
            document.getElementById('modalConnName').focus();
        }, 100);
    }
}

// 设置模态对话框标题
function setModalTitle(title) {
    const titleElement = document.getElementById('modalTitle');
    if (titleElement) {
        titleElement.textContent = title;
    }
}

// 关闭连接模态对话框
function closeConnectionModal() {
    const modal = document.getElementById('connectionModal');
    if (modal) {
        modal.classList.remove('show');
        clearModalForm();
    }
}

// 显示导入表名模态对话框
function showImportTableModal() {
    if (!currentConnectionId) {
        showMessage('请先连接数据库', 'error');
        return;
    }
    
    const modal = document.getElementById('importTableModal');
    if (modal) {
        // 设置默认表名
        document.getElementById('importTableName').value = 'change_club_user_score';
        modal.classList.add('show');
        // 聚焦到表名输入框
        setTimeout(() => {
            document.getElementById('importTableName').focus();
        }, 100);
    }
}

// 关闭导入表名模态对话框
function closeImportTableModal() {
    const modal = document.getElementById('importTableModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// 清空模态对话框表单
function clearModalForm() {
    document.getElementById('modalConnectionId').value = '';
    document.getElementById('modalConnName').value = '';
    document.getElementById('modalDbHost').value = 'localhost';
    document.getElementById('modalDbPort').value = '3306';
    document.getElementById('modalDbUser').value = '';
    document.getElementById('modalDbPassword').value = '';
    document.getElementById('modalDbName').value = '';
    
    // 清除验证状态
    clearFormValidation();
}

// 清除表单验证状态
function clearFormValidation() {
    const formGroups = document.querySelectorAll('.form-group');
    formGroups.forEach(group => {
        group.classList.remove('success', 'error');
        const errorMsg = group.querySelector('.error-message');
        const successMsg = group.querySelector('.success-message');
        if (errorMsg) errorMsg.remove();
        if (successMsg) successMsg.remove();
    });
}

// 测试模态对话框中的连接
async function testConnectionModal() {
    const config = getModalConnectionConfig();
    if (!validateModalConnectionConfig(config)) return;
    
    const testBtn = document.getElementById('testConnectionModalBtn');
    const originalText = testBtn.innerHTML;
    
    try {
        // 显示加载状态
        testBtn.classList.add('loading');
        testBtn.innerHTML = '测试中...';
        
        const result = await ipcRenderer.invoke('test-connection', config);
        if (result.success) {
            showFormSuccess('modalDbHost', '连接测试成功！');
            showMessage('连接测试成功！', 'success');
        } else {
            showFormError('modalDbHost', `连接测试失败: ${result.error}`);
            showMessage(`连接测试失败: ${result.error}`, 'error');
        }
    } catch (error) {
        showFormError('modalDbHost', `连接测试失败: ${error.message}`);
        showMessage(`连接测试失败: ${error.message}`, 'error');
    } finally {
        // 恢复按钮状态
        testBtn.classList.remove('loading');
        testBtn.innerHTML = originalText;
    }
}

// 保存模态对话框中的连接
async function saveConnectionModal() {
    const config = getModalConnectionConfig();
    if (!validateModalConnectionConfig(config)) return;
    
    const saveBtn = document.getElementById('saveConnectionModalBtn');
    const originalText = saveBtn.innerHTML;
    
    try {
        // 显示加载状态
        saveBtn.classList.add('loading');
        saveBtn.innerHTML = '保存中...';
        
        const result = await ipcRenderer.invoke('save-db-connection', config);
        if (result.success) {
            const isEdit = config.id ? '编辑' : '新建';
            showMessage(`连接配置${isEdit}成功！`, 'success');
            
            // 如果是编辑当前连接，提示用户重新连接
            if (config.id && config.id === currentConnectionId) {
                showMessage('连接配置已更新，建议重新连接以确保配置生效', 'info');
            }
            
            await loadSavedConnections();
            closeConnectionModal();
        } else {
            showMessage('保存失败', 'error');
        }
    } catch (error) {
        showMessage(`保存失败: ${error.message}`, 'error');
    } finally {
        // 恢复按钮状态
        saveBtn.classList.remove('loading');
        saveBtn.innerHTML = originalText;
    }
}

// 获取模态对话框中的连接配置
function getModalConnectionConfig() {
    return {
        id: document.getElementById('modalConnectionId').value || null,
        name: document.getElementById('modalConnName').value,
        host: document.getElementById('modalDbHost').value,
        port: parseInt(document.getElementById('modalDbPort').value),
        user: document.getElementById('modalDbUser').value,
        password: document.getElementById('modalDbPassword').value,
        database: document.getElementById('modalDbName').value
    };
}

// 验证模态对话框中的连接配置
function validateModalConnectionConfig(config) {
    clearFormValidation();
    let isValid = true;
    
    if (!config.name.trim()) {
        showFormError('modalConnName', '请输入连接名称');
        isValid = false;
    }
    
    if (!config.host.trim()) {
        showFormError('modalDbHost', '请输入主机地址');
        isValid = false;
    }
    
    if (!config.port || config.port < 1 || config.port > 65535) {
        showFormError('modalDbPort', '请输入有效的端口号');
        isValid = false;
    }
    
    if (!config.user.trim()) {
        showFormError('modalDbUser', '请输入用户名');
        isValid = false;
    }
    
    if (!config.password.trim()) {
        showFormError('modalDbPassword', '请输入密码');
        isValid = false;
    }
    
    if (!config.database.trim()) {
        showFormError('modalDbName', '请输入数据库名');
        isValid = false;
    }
    
    return isValid;
}

// 显示表单错误
function showFormError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const formGroup = field.closest('.form-group');
    
    formGroup.classList.add('error');
    formGroup.classList.remove('success');
    
    // 移除现有的错误消息
    const existingError = formGroup.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // 添加新的错误消息
    const errorMsg = document.createElement('div');
    errorMsg.className = 'error-message';
    errorMsg.textContent = message;
    formGroup.appendChild(errorMsg);
    
    // 聚焦到错误字段
    field.focus();
}

// 显示表单成功
function showFormSuccess(fieldId, message) {
    const field = document.getElementById(fieldId);
    const formGroup = field.closest('.form-group');
    
    formGroup.classList.add('success');
    formGroup.classList.remove('error');
    
    // 移除现有的成功消息
    const existingSuccess = formGroup.querySelector('.success-message');
    if (existingSuccess) {
        existingSuccess.remove();
    }
    
    // 添加新的成功消息
    const successMsg = document.createElement('div');
    successMsg.className = 'success-message';
    successMsg.textContent = message;
    formGroup.appendChild(successMsg);
}

// 加载保存的连接配置
async function loadSavedConnections() {
    try {
        savedConnections = await ipcRenderer.invoke('get-db-connections');
        renderConnectionsList();
        updateConnectionStatus();
    } catch (error) {
        console.error('加载连接配置失败:', error);
    }
}

// 渲染连接列表
function renderConnectionsList() {
    const connectionsList = document.getElementById('connectionsList');
    if (!connectionsList) return;
    
    connectionsList.innerHTML = '';
    
    if (savedConnections.length === 0) {
        connectionsList.innerHTML = `
            <div class="no-connections">
                <p>暂无保存的连接配置</p>
                <p>点击"新建连接"添加数据库连接</p>
            </div>
        `;
        return;
    }
    
    savedConnections.forEach(connection => {
        const connectionItem = createConnectionItem(connection);
        connectionsList.appendChild(connectionItem);
    });
}

// 创建连接项目
function createConnectionItem(connection) {
    const connectionItem = document.createElement('div');
    connectionItem.className = 'connection-item';
    connectionItem.dataset.connectionId = connection.id;
    
    const isActive = connection.id === currentConnectionId;
    if (isActive) {
        connectionItem.classList.add('active');
    }
    
    connectionItem.innerHTML = `
        <div class="connection-info">
            <div class="connection-status ${isActive ? 'connected' : 'disconnected'}"></div>
            <div class="connection-details">
                <div class="connection-name">${connection.name || '未命名连接'}</div>
                <div class="connection-host">${connection.host}:${connection.port}/${connection.database}</div>
            </div>
        </div>
        <div class="connection-actions">
            ${isActive ? 
                `<button class="connection-action-btn disconnect" onclick="disconnectFromDatabase('${connection.id}')">断开</button>` :
                `<button class="connection-action-btn connect" onclick="connectToSavedDatabase('${connection.id}')">连接</button>`
            }
            <button class="connection-action-btn edit" onclick="editConnection('${connection.id}')" title="编辑连接">
                <i class="fas fa-edit"></i>
            </button>
            <button class="connection-action-btn delete" onclick="deleteConnection('${connection.id}')" title="删除连接">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    // 单击连接项目切换到该连接
    connectionItem.addEventListener('click', (e) => {
        if (!e.target.classList.contains('connection-action-btn') && !e.target.closest('.connection-action-btn')) {
            // 直接连接，不再加载到表单
            connectToSavedDatabase(connection.id);
        }
    });
    
    // 双击连接项目编辑配置
    connectionItem.addEventListener('dblclick', (e) => {
        if (!e.target.classList.contains('connection-action-btn') && !e.target.closest('.connection-action-btn')) {
            editConnection(connection.id);
        }
    });
    
    return connectionItem;
}

// 更新连接状态显示
async function updateConnectionStatus() {
    const statusElement = document.getElementById('currentConnectionStatus');
    if (!statusElement) return;
    
    try {
        const status = await ipcRenderer.invoke('get-connection-status');
        const currentConnection = status.find(s => s.isCurrent);
        
        if (currentConnection) {
            statusElement.innerHTML = `
                <div class="status-indicator">
                    <i class="fas fa-circle status-dot connected"></i>
                    <span>已连接到: ${currentConnection.name}</span>
                </div>
            `;
        } else {
            statusElement.innerHTML = `
                <div class="status-indicator">
                    <i class="fas fa-circle status-dot"></i>
                    <span>未连接</span>
                </div>
            `;
        }
    } catch (error) {
        console.error('获取连接状态失败:', error);
    }
}

// 执行查询
async function executeQuery() {
    const queryInput = document.getElementById('dbQueryInput');
    const sql = queryInput.value.trim();
    
    if (!sql) {
        showMessage('请输入SQL语句', 'error');
        return;
    }
    
    if (!currentConnectionId) {
        showMessage('请先连接数据库', 'error');
        return;
    }
    
    const startTime = Date.now();
    
    try {
        const result = await ipcRenderer.invoke('mysql-query', sql);
        const endTime = Date.now();
        const executionTime = endTime - startTime;
        
        if (result.success) {
            renderTable(result.rows, executionTime);
            showMessage(`查询成功，返回 ${result.rows.length} 条记录，耗时 ${executionTime}ms`, 'success');
            // 保存到查询历史
            saveQueryHistory(sql, result.rows.length);
        } else {
            showMessage(`查询失败: ${result.error}`, 'error');
        }
    } catch (error) {
        showMessage(`查询失败: ${error.message}`, 'error');
    }
}

// 渲染查询结果表格
function renderTable(rows, executionTime = null) {
    const resultContainer = document.getElementById('dbQueryResult');
    if (!resultContainer) return;
    
    let html = '';
    
    // 添加查询统计信息
    if (executionTime !== null) {
        html += `
            <div class="query-stats">
                <span class="row-count">返回 ${rows ? rows.length : 0} 条记录</span>
                <span class="execution-time">执行时间: ${executionTime}ms</span>
            </div>
        `;
    }
    
    if (!rows || rows.length === 0) {
        html += '<div class="no-data">查询结果为空</div>';
        resultContainer.innerHTML = html;
        return;
    }
    
    // 获取所有列名
    const columns = Object.keys(rows[0]);
    
    // 创建表格HTML
    html += '<div class="table-container"><table><thead><tr>';
    
    // 添加表头
    columns.forEach(column => {
        html += `<th>${escapeHtml(column)}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    // 添加数据行
    rows.forEach(row => {
        html += '<tr>';
        columns.forEach(column => {
            const value = row[column];
            html += `<td>${formatCellValue(value)}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    
    resultContainer.innerHTML = html;
}

// 格式化单元格值
function formatCellValue(value) {
    if (value === null || value === undefined) {
        return '<span class="null-value">NULL</span>';
    }
    
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }
    
    if (typeof value === 'number') {
        return value.toString();
    }
    
    if (typeof value === 'string') {
        // 如果是JSON字符串，尝试格式化
        if (value.startsWith('{') || value.startsWith('[')) {
            try {
                const parsed = JSON.parse(value);
                return `<pre class="json-value">${JSON.stringify(parsed, null, 2)}</pre>`;
            } catch (e) {
                // 不是有效的JSON，按普通字符串处理
            }
        }
        
        // 如果是长文本，截断显示
        if (value.length > 100) {
            return `<span title="${escapeHtml(value)}">${escapeHtml(value.substring(0, 100))}...</span>`;
        }
        
        return value;
    }
    
    return String(value);
}

// HTML转义函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 导出数据
async function exportData() {
    const queryInput = document.getElementById('dbQueryInput');
    const sql = queryInput.value.trim();

    // const sql = getSqlQuery();
    
    if (!sql) {
        showMessage('请输入SQL语句', 'error');
        return;
    }
    
    if (!currentConnectionId) {
        showMessage('请先连接数据库', 'error');
        return;
    }
    
    // 防重复点击
    const exportBtn = document.getElementById('dbExportBtn');
    if (exportBtn.disabled) {
        return; // 如果按钮已禁用，直接返回
    }
    
    // 禁用按钮并显示加载状态
    exportBtn.disabled = true;
    const originalText = exportBtn.innerHTML;
    exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 导出Excel中...';
    
    try {
        const result = await ipcRenderer.invoke('mysql-export', sql);
        if (result.success) {
            showMessage(`数据导出成功: ${result.filePath}`, 'success');
        } else {
            showMessage(`导出失败: ${result.error}`, 'error');
        }
    } catch (error) {
        showMessage(`导出失败: ${error.message}`, 'error');
    } finally {
        // 恢复按钮状态
        exportBtn.disabled = false;
        exportBtn.innerHTML = originalText;
    }
}

// 导入数据
async function importData(tableName) {
    if (!currentConnectionId) {
        showMessage('请先连接数据库', 'error');
        return;
    }
    
    try {
        const result = await ipcRenderer.invoke('select-csv-file');
        if (!result.canceled) {
            const importResult = await ipcRenderer.invoke('mysql-import', {
                table: tableName,
                content: result.content
            });
            
            if (importResult.success) {
                showMessage(`导入成功: ${importResult.successCount} 条成功, ${importResult.failCount} 条失败`, 'success');
            } else {
                showMessage(`导入失败: ${importResult.error}`, 'error');
            }
        }
    } catch (error) {
        showMessage(`导入失败: ${error.message}`, 'error');
    }
}

// 显示查询历史
function showQueryHistory() {
    const history = getQueryHistory();
    if (history.length === 0) {
        showMessage('暂无查询历史', 'info');
        return;
    }
    
    // 创建历史记录列表
    const historyList = history.map((item, index) => `
        <div class="history-item" onclick="loadQueryFromHistory('${escapeHtml(item.sql)}')">
            <div class="history-sql">${escapeHtml(item.sql.substring(0, 50))}${item.sql.length > 50 ? '...' : ''}</div>
            <div class="history-meta">
                <span class="history-time">${formatTime(item.timestamp)}</span>
                <span class="history-rows">${item.rows} 条记录</span>
            </div>
        </div>
    `).join('');
    
    // 显示历史记录对话框
    showHistoryModal(historyList);
}

// 获取查询历史
function getQueryHistory() {
    const history = localStorage.getItem('queryHistory');
    return history ? JSON.parse(history) : [];
}

// 保存查询历史
function saveQueryHistory(sql, rows) {
    const history = getQueryHistory();
    const newItem = {
        sql: sql,
        rows: rows,
        timestamp: Date.now()
    };
    
    // 避免重复保存相同的查询
    const existingIndex = history.findIndex(item => item.sql === sql);
    if (existingIndex !== -1) {
        history.splice(existingIndex, 1);
    }
    
    // 添加到开头
    history.unshift(newItem);
    
    // 只保留最近20条记录
    if (history.length > 20) {
        history.splice(20);
    }
    
    localStorage.setItem('queryHistory', JSON.stringify(history));
}

// 从历史记录加载查询
function loadQueryFromHistory(sql) {
    document.getElementById('dbQueryInput').value = sql;
    closeHistoryModal();
    showMessage('已加载查询语句', 'success');
}

// 格式化时间
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // 1分钟内
        return '刚刚';
    } else if (diff < 3600000) { // 1小时内
        return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) { // 1天内
        return `${Math.floor(diff / 3600000)}小时前`;
    } else {
        return date.toLocaleDateString('zh-CN');
    }
}

// 显示历史记录模态对话框
function showHistoryModal(content) {
    // 创建模态对话框
    const modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-history"></i> 查询历史</h3>
                <button class="modal-close" onclick="closeHistoryModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="history-list">
                    ${content}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 点击遮罩层关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeHistoryModal();
        }
    });
}

// 关闭历史记录模态对话框
function closeHistoryModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// 显示消息
function showMessage(message, type = 'info') {
    // 创建消息元素
    const messageElement = document.createElement('div');
    messageElement.className = `message message-${type}`;
    messageElement.textContent = message;
    
    // 添加到页面
    document.body.appendChild(messageElement);
    
    // 3秒后自动移除
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
        }
    }, 3000);
}

// CSV解析函数
function parseCSV(content) {
    const lines = content.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
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
        const row = {};
        headers.forEach((h, idx) => row[h] = cells[idx] || '');
        return row;
    });
}

// 兼容性处理：如果window.electronAPI不存在，则自动polyfill（开发环境下）
if (!window.electronAPI) {
    window.electronAPI = {
        invoke: (...args) => require('electron').ipcRenderer.invoke(...args)
    };
}

// 连接到已保存的数据库
async function connectToSavedDatabase(connectionId) {
    const connection = savedConnections.find(c => c.id === connectionId);
    if (!connection) {
        showMessage('连接配置不存在', 'error');
        return;
    }
    
    try {
        const result = await ipcRenderer.invoke('mysql-connect', connection);
        if (result.success) {
            currentConnectionId = result.connectionId;
            showMessage('数据库连接成功！', 'success');
            updateConnectionStatus();
            renderConnectionsList();
        } else {
            showMessage(`连接失败: ${result.error}`, 'error');
        }
    } catch (error) {
        showMessage(`连接失败: ${error.message}`, 'error');
    }
}

// 断开数据库连接
async function disconnectFromDatabase(connectionId) {
    try {
        await ipcRenderer.invoke('close-all-connections');
        currentConnectionId = null;
        showMessage('已断开数据库连接', 'info');
        updateConnectionStatus();
        renderConnectionsList();
    } catch (error) {
        showMessage(`断开连接失败: ${error.message}`, 'error');
    }
}

// 删除连接配置
async function deleteConnection(connectionId) {
    if (!confirm('确定要删除这个连接配置吗？')) return;
    
    try {
        const result = await ipcRenderer.invoke('delete-db-connection', connectionId);
        if (result.success) {
            showMessage('连接配置删除成功！', 'success');
            await loadSavedConnections();
        } else {
            showMessage('删除失败', 'error');
        }
    } catch (error) {
        showMessage(`删除失败: ${error.message}`, 'error');
    }
} 