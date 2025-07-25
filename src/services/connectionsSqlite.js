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
        status TEXT
      )
    `);
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
        `UPDATE connections SET name=?, type=?, host=?, port=?, database=?, username=?, password=?, ssl=?, status=? WHERE id=?`
      );
      const result = stmt.run(
        conn.name,
        conn.type,
        conn.host,
        conn.port,
        conn.database,
        conn.username,
        conn.password,
        conn.ssl ? 1 : 0,
        conn.status,
        conn.id
      );
      return conn.id;
    } else {
      // 新增
      const stmt = db.prepare(
        `INSERT INTO connections (name, type, host, port, database, username, password, ssl, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const result = stmt.run(
        conn.name,
        conn.type,
        conn.host,
        conn.port,
        conn.database,
        conn.username,
        conn.password,
        conn.ssl ? 1 : 0,
        conn.status
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