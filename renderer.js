const { ipcRenderer } = require('electron');

// 全局变量
let currentView = 'dashboard';
let settings = {};

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

function setupDatabaseEvents() {
    const dbConnectBtn = document.getElementById('dbConnectBtn');
    const dbConnStatus = document.getElementById('dbConnStatus');
    const dbQueryBtn = document.getElementById('dbQueryBtn');
    const dbExportBtn = document.getElementById('dbExportBtn');
    const dbImportBtn = document.getElementById('dbImportBtn');
    const dbHost = document.getElementById('dbHost');
    const dbPort = document.getElementById('dbPort');
    const dbUser = document.getElementById('dbUser');
    const dbPassword = document.getElementById('dbPassword');
    const dbName = document.getElementById('dbName');
    const dbQueryInput = document.getElementById('dbQueryInput');
    const dbQueryResult = document.getElementById('dbQueryResult');

    let lastQuery = '';

    if (dbConnectBtn) {
        dbConnectBtn.addEventListener('click', async () => {
            dbConnStatus.textContent = '连接中...';
            dbConnStatus.style.color = '#888';
            const config = {
                host: dbHost.value,
                port: dbPort.value,
                user: dbUser.value,
                password: dbPassword.value,
                database: dbName.value
            };
            const res = await window.electronAPI.invoke('mysql-connect', config);
            if (res.success) {
                dbConnStatus.textContent = '连接成功';
                dbConnStatus.style.color = '#28a745';
            } else {
                dbConnStatus.textContent = '连接失败: ' + res.error;
                dbConnStatus.style.color = '#ff4757';
            }
        });
    }

    if (dbQueryBtn) {
        dbQueryBtn.addEventListener('click', async () => {
            const sql = dbQueryInput.value.trim();
            if (!sql) {
                alert('请输入SQL语句');
                return;
            }
            dbQueryResult.textContent = '查询中...';
            const res = await window.electronAPI.invoke('mysql-query', sql);
            if (res.success) {
                lastQuery = sql;
                dbQueryResult.innerHTML = renderTable(res.rows);
            } else {
                dbQueryResult.textContent = '查询失败: ' + res.error;
            }
        });
    }

    if (dbExportBtn) {
        dbExportBtn.addEventListener('click', async () => {
            if (!lastQuery) {
                dbQueryResult.textContent = '请先执行一次查询';
                return;
            }
            dbQueryResult.textContent = '导出中...';
            const res = await window.electronAPI.invoke('mysql-export', lastQuery);
            if (res.success) {
                dbQueryResult.textContent = '导出成功: ' + res.filePath;
            } else {
                dbQueryResult.textContent = '导出失败: ' + res.error;
            }
        });
    }

    if (dbImportBtn) {
        dbImportBtn.addEventListener('click', async () => {
            // 1. 选择CSV文件
            const res = await window.electronAPI.invoke('open-csv-dialog');
            if (res.canceled || !res.content) return;
            // 2. 获取输入框表名
            const tableInput = document.getElementById('dbImportTable');
            let table = tableInput ? tableInput.value.trim() : '';
            if (!table) {
                alert('请输入表名');
                return;
            }
            // 3. 发送给主进程导入
            dbQueryResult.textContent = '导入中...';
            const importRes = await window.electronAPI.invoke('mysql-import', { table, content: res.content });
            if (importRes.success) {
                dbQueryResult.textContent = `导入成功，成功${importRes.successCount}条，失败${importRes.failCount}条`;
            } else {
                dbQueryResult.textContent = '导入失败: ' + importRes.error;
            }
        });
    }
}

function renderTable(rows) {
    if (!rows || !rows.length) return '<div>无数据</div>';
    let html = '<table><thead><tr>';
    Object.keys(rows[0]).forEach(key => {
        html += `<th>${key}</th>`;
    });
    html += '</tr></thead><tbody>';
    rows.forEach(row => {
        html += '<tr>';
        Object.values(row).forEach(val => {
            html += `<td>${val === null ? '' : val}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
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