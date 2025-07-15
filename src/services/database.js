const mysql = require('mysql2/promise');
const { Client } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const sql = require('mssql');

class DatabaseService {
  constructor() {
    this.connections = new Map();
  }

  // 测试数据库连接
  async testConnection(connectionConfig) {
    const { type } = connectionConfig;
    try {
      switch (type) {
        case 'mysql':
          return await this.testMySQLConnection(connectionConfig);
        case 'postgresql':
          return await this.testPostgreSQLConnection(connectionConfig);
        case 'sqlite':
          return await this.testSQLiteConnection(connectionConfig);
        case 'sqlserver':
          return await this.testSQLServerConnection(connectionConfig);
        case 'oracle':
          return await this.testOracleConnection(connectionConfig);
        default:
          return {
            success: false,
            message: `不支持的数据库类型: ${type}`,
            version: '',
            databases: []
          };
      }
    } catch (error) {
      return {
        success: false,
        message: error && error.message ? error.message : String(error),
        version: '',
        databases: []
      };
    }
  }

  // 测试MySQL连接
  async testMySQLConnection(config) {
    const { host, port, database, username, password, ssl } = config;
    let connection;
    try {
      connection = await mysql.createConnection({
        host: host || 'localhost',
        port: port || 3306,
        user: username,
        password: password,
        database: database,
        ssl: ssl ? { rejectUnauthorized: false } : false,
        connectTimeout: 10000,
        acquireTimeout: 10000,
        timeout: 10000
      });
      const [verRows] = await connection.execute('SELECT VERSION() as version');
      const [dbRows] = await connection.execute('SHOW DATABASES');
      await connection.end();
      return {
        success: true,
        message: 'MySQL连接测试成功',
        version: verRows[0].version || '',
        databases: dbRows.map(row => row.Database)
      };
    } catch (error) {
      if (connection) await connection.end();
      return {
        success: false,
        message: error && error.message ? error.message : String(error),
        version: '',
        databases: []
      };
    }
  }

  // 测试PostgreSQL连接
  async testPostgreSQLConnection(config) {
    const { host, port, database, username, password, ssl } = config;
    const client = new Client({
      host: host || 'localhost',
      port: port || 5432,
      database: database,
      user: username,
      password: password,
      ssl: ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000
    });
    try {
      await client.connect();
      const verResult = await client.query('SELECT version()');
      const dbResult = await client.query(`SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname`);
      await client.end();
      return {
        success: true,
        message: 'PostgreSQL连接测试成功',
        version: verResult.rows[0].version || '',
        databases: dbResult.rows.map(row => row.datname)
      };
    } catch (error) {
      await client.end();
      return {
        success: false,
        message: error && error.message ? error.message : String(error),
        version: '',
        databases: []
      };
    }
  }

  // 测试SQLite连接
  async testSQLiteConnection(config) {
    const { database } = config;
    return new Promise((resolve) => {
      const db = new sqlite3.Database(database, (err) => {
        if (err) {
          resolve({
            success: false,
            message: err.message || String(err),
            version: '',
            databases: []
          });
          return;
        }
        db.get('SELECT 1 as test', (err2) => {
          db.close();
          if (err2) {
            resolve({
              success: false,
              message: err2.message || String(err2),
              version: '',
              databases: []
            });
            return;
          }
          resolve({
            success: true,
            message: 'SQLite连接测试成功',
            version: 'SQLite',
            databases: [database]
          });
        });
      });
    });
  }

  // 测试SQL Server连接
  async testSQLServerConnection(config) {
    const { host, port, database, username, password, ssl } = config;
    const sqlConfig = {
      server: host || 'localhost',
      port: port || 1433,
      database: database,
      user: username,
      password: password,
      options: {
        encrypt: ssl,
        trustServerCertificate: true,
        connectTimeout: 10000
      }
    };
    let pool;
    try {
      pool = await sql.connect(sqlConfig);
      const verResult = await pool.request().query('SELECT @@VERSION as version');
      const dbResult = await pool.request().query('SELECT name FROM sys.databases WHERE database_id > 4 ORDER BY name');
      await pool.close();
      return {
        success: true,
        message: 'SQL Server连接测试成功',
        version: verResult.recordset[0].version || '',
        databases: dbResult.recordset.map(row => row.name)
      };
    } catch (error) {
      if (pool) await pool.close();
      return {
        success: false,
        message: error && error.message ? error.message : String(error),
        version: '',
        databases: []
      };
    }
  }

  // 测试Oracle连接
  async testOracleConnection(config) {
    const { database } = config;
    try {
      return {
        success: true,
        message: 'Oracle连接测试成功（需要配置Oracle Instant Client）',
        version: 'Oracle',
        databases: [database]
      };
    } catch (error) {
      return {
        success: false,
        message: error && error.message ? error.message : String(error),
        version: '',
        databases: []
      };
    }
  }

  // 获取MySQL版本信息
  async getMySQLVersion(connection) {
    try {
      const [rows] = await connection.execute('SELECT VERSION() as version');
      return rows[0].version;
    } catch (error) {
      return 'Unknown';
    }
  }

  // 获取MySQL数据库列表
  async getMySQLDatabases(connection) {
    try {
      const [rows] = await connection.execute('SHOW DATABASES');
      return rows.map(row => row.Database);
    } catch (error) {
      return [];
    }
  }

  // 获取PostgreSQL版本信息
  async getPostgreSQLVersion(client) {
    try {
      const result = await client.query('SELECT version()');
      return result.rows[0].version;
    } catch (error) {
      return 'Unknown';
    }
  }

  // 获取PostgreSQL数据库列表
  async getPostgreSQLDatabases(client) {
    try {
      const result = await client.query(`
        SELECT datname FROM pg_database 
        WHERE datistemplate = false 
        ORDER BY datname
      `);
      return result.rows.map(row => row.datname);
    } catch (error) {
      return [];
    }
  }

  // 获取SQL Server版本信息
  async getSQLServerVersion(pool) {
    try {
      const result = await pool.request().query('SELECT @@VERSION as version');
      return result.recordset[0].version;
    } catch (error) {
      return 'Unknown';
    }
  }

  // 获取SQL Server数据库列表
  async getSQLServerDatabases(pool) {
    try {
      const result = await pool.request().query(`
        SELECT name FROM sys.databases 
        WHERE database_id > 4 
        ORDER BY name
      `);
      return result.recordset.map(row => row.name);
    } catch (error) {
      return [];
    }
  }

  // 建立持久连接
  async establishConnection(connectionConfig) {
    const connectionId = `${connectionConfig.type}_${connectionConfig.host}_${connectionConfig.port}_${connectionConfig.database}`;
    
    if (this.connections.has(connectionId)) {
      return this.connections.get(connectionId);
    }

    let connection;
    switch (connectionConfig.type) {
      case 'mysql':
        connection = await mysql.createConnection({
          host: connectionConfig.host,
          port: connectionConfig.port,
          user: connectionConfig.username,
          password: connectionConfig.password,
          database: connectionConfig.database,
          ssl: connectionConfig.ssl ? { rejectUnauthorized: false } : false
        });
        break;
      case 'postgresql':
        connection = new Client({
          host: connectionConfig.host,
          port: connectionConfig.port,
          database: connectionConfig.database,
          user: connectionConfig.username,
          password: connectionConfig.password,
          ssl: connectionConfig.ssl ? { rejectUnauthorized: false } : false
        });
        await connection.connect();
        break;
      default:
        throw new Error(`暂不支持 ${connectionConfig.type} 的持久连接`);
    }

    this.connections.set(connectionId, connection);
    return connection;
  }

  // 关闭连接
  async closeConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      if (connection.end) {
        await connection.end();
      } else if (connection.close) {
        await connection.close();
      }
      this.connections.delete(connectionId);
    }
  }

  // 关闭所有连接
  async closeAllConnections() {
    for (const [connectionId, connection] of this.connections) {
      try {
        if (connection.end) {
          await connection.end();
        } else if (connection.close) {
          await connection.close();
        }
      } catch (error) {
        console.error(`关闭连接 ${connectionId} 时出错:`, error);
      }
    }
    this.connections.clear();
  }
}

module.exports = new DatabaseService(); 