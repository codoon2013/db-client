const path = require('path');
const Database = require('better-sqlite3');

let db;

function init (dbFilePath) {
  if (!db) {
    db = new Database(dbFilePath);
    // 初始化表
    db.exec(`
      CREATE TABLE IF NOT EXISTS connections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        type TEXT,
        host TEXT,
        port INTEGER,
        database TEXT,
        username TEXT,
        password TEXT,
        ssl INTEGER,
        status TEXT,
        use_ssh INTEGER DEFAULT 0,
        ssh_host TEXT,
        ssh_port INTEGER,
        ssh_username TEXT,
        ssh_auth_type TEXT,
        ssh_password TEXT,
        ssh_private_key_path TEXT,
        ssh_private_key_content TEXT,
        ssh_passphrase TEXT
      )
    `);
  }
  // 检查并添加 SSH 相关字段（升级现有数据库）
  try {
    // 检查 use_ssh 字段是否存在
    const tableInfo = db.pragma('table_info(connections)');
    const columns = tableInfo.map(col => col.name);
    
    if (!columns.includes('use_ssh')) {
      db.exec('ALTER TABLE connections ADD COLUMN use_ssh INTEGER DEFAULT 0');
    }
    if (!columns.includes('ssh_host')) {
      db.exec('ALTER TABLE connections ADD COLUMN ssh_host TEXT');
    }
    if (!columns.includes('ssh_port')) {
      db.exec('ALTER TABLE connections ADD COLUMN ssh_port INTEGER');
    }
    if (!columns.includes('ssh_username')) {
      db.exec('ALTER TABLE connections ADD COLUMN ssh_username TEXT');
    }
    if (!columns.includes('ssh_auth_type')) {
      db.exec('ALTER TABLE connections ADD COLUMN ssh_auth_type TEXT');
    }
    if (!columns.includes('ssh_password')) {
      db.exec('ALTER TABLE connections ADD COLUMN ssh_password TEXT');
    }
    if (!columns.includes('ssh_private_key_path')) {
      db.exec('ALTER TABLE connections ADD COLUMN ssh_private_key_path TEXT');
    }
    if (!columns.includes('ssh_private_key_content')) {
      db.exec('ALTER TABLE connections ADD COLUMN ssh_private_key_content TEXT');
    }
    if (!columns.includes('ssh_passphrase')) {
      db.exec('ALTER TABLE connections ADD COLUMN ssh_passphrase TEXT');
    }
  } catch (err) {
    console.error('数据库升级失败:', err);
    throw err;
  }
}


// 获取所有连接
function getConnections () {
  try {
    return db.prepare('SELECT * FROM connections').all();
  } catch (err) {
    throw err;
  }
}

// 新增或更新连接
function upsertConnection (conn) {
  try {
    if (conn.id) {
      // 更新
      const stmt = db.prepare(
        `UPDATE connections SET 
          name=?, type=?, host=?, port=?, database=?, 
          username=?, password=?, ssl=?, status=?,
          use_ssh=?, ssh_host=?, ssh_port=?, ssh_username=?,
          ssh_auth_type=?, ssh_password=?, ssh_private_key_path=?,
          ssh_private_key_content=?, ssh_passphrase=?
        WHERE id=?`
      );
      const result = stmt.run(
        conn.name,
        conn.type,
        conn.host,
        conn.port,
        conn.database,
        conn.username,
        conn.password,
        conn.ssl,
        conn.status,
        conn.use_ssh,
        conn.ssh_host,
        conn.ssh_port,
        conn.ssh_username,
        conn.ssh_auth_type,
        conn.ssh_password,
        conn.ssh_private_key_path,
        conn.ssh_private_key_content,
        conn.ssh_passphrase,
        conn.id
      );
      return conn.id;
    } else {
      // 新增
      const stmt = db.prepare(
        `INSERT INTO connections (
          name, type, host, port, database, 
          username, password, ssl, status,
          use_ssh, ssh_host, ssh_port, ssh_username,
          ssh_auth_type, ssh_password, ssh_private_key_path,
          ssh_private_key_content, ssh_passphrase
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const result = stmt.run(
        conn.name,
        conn.type,
        conn.host,
        conn.port,
        conn.database,
        conn.username,
        conn.password,
        conn.ssl,
        conn.status,
        conn.use_ssh,
        conn.ssh_host,
        conn.ssh_port,
        conn.ssh_username,
        conn.ssh_auth_type,
        conn.ssh_password,
        conn.ssh_private_key_path,
        conn.ssh_private_key_content,
        conn.ssh_passphrase
      );
      return result.lastInsertRowid;
    }
  } catch (err) {
    throw err;
  }
}


// 删除连接
function deleteConnection (id) {
  try {
    const stmt = db.prepare('DELETE FROM connections WHERE id=?');
    stmt.run(id);
  } catch (err) {
    throw err;
  }
}

module.exports = {
  init,
  getConnections,
  upsertConnection,
  deleteConnection
};