const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '../../connections.sqlite');
const db = new sqlite3.Database(dbPath);

// 初始化表
// id 主键自增，ssl 存储为 0/1
// status 允许为 null

db.serialize(() => {
  db.run(`
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
});

// 获取所有连接
function getConnections() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM connections', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// 新增或更新连接
function upsertConnection(conn) {
  return new Promise((resolve, reject) => {
    if (conn.id) {
      // 更新
      db.run(
        `UPDATE connections SET name=?, type=?, host=?, port=?, database=?, username=?, password=?, ssl=?, status=? WHERE id=?`,
        [conn.name, conn.type, conn.host, conn.port, conn.database, conn.username, conn.password, conn.ssl ? 1 : 0, conn.status, conn.id],
        function (err) {
          if (err) reject(err);
          else resolve(conn.id);
        }
      );
    } else {
      // 新增
      db.run(
        `INSERT INTO connections (name, type, host, port, database, username, password, ssl, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [conn.name, conn.type, conn.host, conn.port, conn.database, conn.username, conn.password, conn.ssl ? 1 : 0, conn.status],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    }
  });
}

// 删除连接
function deleteConnection(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM connections WHERE id=?', [id], function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = {
  getConnections,
  upsertConnection,
  deleteConnection
}; 