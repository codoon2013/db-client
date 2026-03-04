const mysql = require('mysql2/promise');
const { Client } = require('pg');
const Database = require('better-sqlite3');
const sql = require('mssql');
const { Client: SshClient } = require('ssh2');

class DatabaseService {
  constructor() {
    this.connections = new Map();
    this.sshClients = new Map(); // 存储 SSH 连接
  }

  // 建立 SSH 隧道
  createSshTunnel(config) {
    return new Promise((resolve, reject) => {
      console.log('[SSH] === 开始建立 SSH 隧道 ===');
      console.log('[SSH] 目标服务器:', config.host + ':' + config.port);
      console.log('[SSH] SSH 服务器:', config.ssh_host + ':' + (config.ssh_port || 22));
      console.log('[SSH] 用户名:', config.ssh_username);
      console.log('[SSH] 认证方式:', config.ssh_auth_type);
      
      const sshConfig = {
        host: config.ssh_host,
        port: config.ssh_port || 22,
        username: config.ssh_username,
        readyTimeout: 20000,
        keepaliveInterval: 10000,
        algorithms: {
          kex: [
            'diffie-hellman-group-exchange-sha256',
            'diffie-hellman-group14-sha256',
            'diffie-hellman-group14-sha1',
            'diffie-hellman-group1-sha1',
            'ecdh-sha2-nistp256',
            'ecdh-sha2-nistp384',
            'ecdh-sha2-nistp521'
          ],
          cipher: [
            'aes128-ctr',
            'aes192-ctr',
            'aes256-ctr',
            'aes128-gcm',
            'aes128-gcm@openssh.com',
            'aes256-gcm',
            'aes256-gcm@openssh.com',
            'aes256-cbc',
            'aes128-cbc',
            '3des-cbc'
          ],
          serverHostKey: [
            'ssh-rsa',
            'ecdsa-sha2-nistp256',
            'ecdsa-sha2-nistp384',
            'ecdsa-sha2-nistp521',
            'ssh-ed25519'
          ]
        }
      };

      if (config.ssh_auth_type === 'password') {
        if (!config.ssh_password) {
          console.error('[SSH] 密码不能为空');
          reject(new Error('SSH 密码不能为空'));
          return;
        }
        sshConfig.password = config.ssh_password;
        console.log('[SSH] 使用密码认证');
      } else if (config.ssh_auth_type === 'key') {
        let privateKey = null;
        
        if (config.ssh_private_key_content) {
          privateKey = config.ssh_private_key_content.trim();
          console.log('[SSH] 使用私钥内容认证，长度:', privateKey.length, '字节');
          
          if (!privateKey.startsWith('-----BEGIN')) {
            console.error('[SSH] 私钥格式不正确');
            reject(new Error('私钥格式不正确，必须以 -----BEGIN 开头'));
            return;
          }
        } else if (config.ssh_private_key_path) {
          try {
            const fs = require('fs');
            const cleanPath = config.ssh_private_key_path.trim();
            privateKey = fs.readFileSync(cleanPath, 'utf8').trim();
            console.log('[SSH] 从文件读取私钥:', cleanPath);
          } catch (err) {
            console.error('[SSH] 读取私钥文件失败:', err);
            reject(new Error(`无法读取私钥文件：${err.message}`));
            return;
          }
        }
        
        if (!privateKey) {
          console.error('[SSH] 未提供私钥');
          reject(new Error('未提供私钥'));
          return;
        }
        
        sshConfig.privateKey = privateKey;
        
        if (config.ssh_passphrase) {
          sshConfig.passphrase = config.ssh_passphrase;
          console.log('[SSH] 私钥有密码保护');
        } else {
          console.log('[SSH] 私钥无密码保护');
        }
      }

      console.log('[SSH] 创建 SSH 客户端...');
      const sshClient = new SshClient();
      
      let connectionAttempted = false;
      let connectionStartTime = Date.now();
      
      sshClient.on('ready', () => {
        if (connectionAttempted) return;
        connectionAttempted = true;
        
        const connectTime = Date.now() - connectionStartTime;
        console.log('[SSH] ✅ 连接成功！耗时:', connectTime + 'ms');
        
        console.log('[SSH] 开始创建本地服务器进行端口转发...');
        
        const net = require('net');
        const localServer = net.createServer((localSocket) => {
          console.log('[SSH] 本地客户端连接');
          
          sshClient.forwardOut(
            localSocket.remoteAddress,
            localSocket.remotePort,
            config.host,
            config.port,
            (err, stream) => {
              if (err) {
                console.error('[SSH] forwardOut 失败:', err);
                localSocket.end();
                return;
              }
              
              localSocket.pipe(stream);
              stream.pipe(localSocket);
              
              stream.on('close', () => {
                localSocket.end();
              });
              
              localSocket.on('close', () => {
                stream.end();
              });
            }
          );
        });
        
        localServer.on('error', (err) => {
          console.error('[SSH] 本地服务器错误:', err);
          sshClient.end();
          reject(new Error(`创建本地转发服务器失败：${err.message}`));
        });
        
        localServer.on('listening', () => {
          const address = localServer.address();
          const assignedLocalPort = typeof address === 'object' && address !== null ? address.port : 0;
          console.log('[SSH] ✅ 本地转发服务器已启动，监听端口:', assignedLocalPort);
          
          resolve({ localPort: assignedLocalPort, sshClient, localServer });
        });
        
        localServer.on('close', () => {
          console.log('[SSH] 本地服务器关闭');
        });
        
        localServer.listen(0, '127.0.0.1');
        
      }).on('error', (err) => {
        if (!connectionAttempted) {
          connectionAttempted = true;
          const errorTime = Date.now() - connectionStartTime;
          console.error('[SSH] ❌ 连接错误，耗时:', errorTime + 'ms');
          console.error('[SSH] 错误详情:', err);
          console.error('[SSH] 错误消息:', err.message);
          console.error('[SSH] 错误代码:', err.code);
          reject(new Error(`SSH 连接失败：${err.message}`));
        }
      }).on('close', () => {
        console.log('[SSH] 连接已关闭');
      }).on('end', () => {
        console.log('[SSH] 连接结束');
      }).connect(sshConfig);
      
      console.log('[SSH] 正在连接 SSH 服务器...');
      
      setTimeout(() => {
        if (!connectionAttempted) {
          connectionAttempted = true;
          console.log('[SSH] ⏱️ 连接超时 (20 秒)');
          sshClient.end();
          reject(new Error('SSH 连接超时，请检查网络或 SSH 服务器配置'));
        }
      }, 20000);
    });
  }



  // 测试数据库连接
  async testConnection (connectionConfig) {
    const { type, use_ssh } = connectionConfig;
    let sshClient = null;
    let localPort = null;
    console.log('[DB] === 开始测试数据库连接 ===');
    console.log('[DB] 数据库类型:', type);
    console.log('[DB] 是否使用 SSH:', use_ssh);
    try {
      // 如果启用了 SSH 代理，先建立 SSH 隧道
      if (use_ssh) {
        const tunnel = await this.createSshTunnel(connectionConfig);
        localPort = tunnel.localPort;
        sshClient = tunnel.sshClient;
        console.log('[SSH] SSH 隧道已建立，本地端口:', localPort);
      }
      
      switch (type) {
        case 'mysql':
          return await this.testMySQLConnection(connectionConfig, sshClient, localPort);
        case 'postgresql':
          return await this.testPostgreSQLConnection(connectionConfig, sshClient, localPort);
        case 'sqlite':
          return await this.testSQLiteConnection(connectionConfig);
        case 'sqlserver':
          return await this.testSQLServerConnection(connectionConfig, sshClient, localPort);
        case 'oracle':
          return await this.testOracleConnection(connectionConfig);
        default:
          return {
            success: false,
            message: `不支持的数据库类型：${type}`,
            version: '',
            databases: []
          };
      }
    } catch (error) {
      // 清理 SSH 连接
      if (sshClient) {
        sshClient.end();
      }
      return {
        success: false,
        message: error && error.message ? error.message : String(error),
        version: '',
        databases: []
      };
    }
  }



  // 测试 MySQL 连接
  async testMySQLConnection (config, sshClient = null, localPort = null) {
    const { host, port, database, username, password, use_ssh } = config;
    console.log("11111",use_ssh,localPort)
    let connection;
    try {
      connection = await mysql.createConnection({
        host: sshClient ? '127.0.0.1' : (host || 'localhost'),
        port: sshClient ? localPort : (port || 3306),
        user: username,
        password: password,
        database: database,
        ssl:  false,
        connectTimeout: 10000
      });
      const [verRows] = await connection.execute('SELECT VERSION() as version');
      const [dbRows] = await connection.execute('SHOW DATABASES');
      await connection.end();
      
      // 如果有 SSH 连接，关闭它
      if (sshClient) {
        sshClient.end();
      }
      
      return {
        success: true,
        message: 'MySQL 连接测试成功',
        version: verRows[0].version || '',
        databases: dbRows.map(row => row.Database)
      };
    } catch (error) {
      if (connection) await connection.end();
      if (sshClient) sshClient.end();
      return {
        success: false,
        message: error && error.message ? error.message : String(error),
        version: '',
        databases: []
      };
    }
  }

  // 测试 PostgreSQL 连接
  async testPostgreSQLConnection (config, sshClient = null, localPort = null) {
    const { host, port, database, username, password, ssl } = config;
    const client = new Client({
      host: sshClient ? '127.0.0.1' : (host || 'localhost'),
      port: sshClient ? localPort : (port || 5432),
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
      
      // 如果有 SSH 连接，关闭它
      if (sshClient) {
        sshClient.end();
      }
      
      return {
        success: true,
        message: 'PostgreSQL 连接测试成功',
        version: verResult.rows[0].version || '',
        databases: dbResult.rows.map(row => row.datname)
      };
    } catch (error) {
      await client.end();
      if (sshClient) sshClient.end();
      return {
        success: false,
        message: error && error.message ? error.message : String(error),
        version: '',
        databases: []
      };
    }
  }

// ... existing code ...

  // 测试 SQL Server 连接
  async testSQLServerConnection (config, sshClient = null, localPort = null) {
    const { host, port, database, username, password, ssl } = config;
    const sqlConfig = {
      server: sshClient ? '127.0.0.1' : (host || 'localhost'),
      port: sshClient ? localPort : (port || 1433),
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
      
      // 如果有 SSH 连接，关闭它
      if (sshClient) {
        sshClient.end();
      }
      
      return {
        success: true,
        message: 'SQL Server 连接测试成功',
        version: verResult.recordset[0].version || '',
        databases: dbResult.recordset.map(row => row.name)
      };
    } catch (error) {
      if (pool) await pool.close();
      if (sshClient) sshClient.end();
      return {
        success: false,
        message: error && error.message ? error.message : String(error),
        version: '',
        databases: []
      };
    }
  }

  // 获取PostgreSQL版本信息
  async getPostgreSQLVersion (client) {
    try {
      const result = await client.query('SELECT version()');
      return result.rows[0].version;
    } catch (error) {
      return 'Unknown';
    }
  }

  // 获取PostgreSQL数据库列表
  async getPostgreSQLDatabases (client) {
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
  async getSQLServerVersion (pool) {
    try {
      const result = await pool.request().query('SELECT @@VERSION as version');
      return result.recordset[0].version;
    } catch (error) {
      return 'Unknown';
    }
  }

  // 获取SQL Server数据库列表
  async getSQLServerDatabases (pool) {
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
  async establishConnection (connectionConfig) {
    const connectionId = `${connectionConfig.id}`;
    
    // if (this.connections.has(connectionId)) {
    //   return this.connections.get(connectionId);
    // }

    let connection;
    // 如果启用了 SSH 代理
      if (connectionConfig.use_ssh) {
        const tunnel = await this.createSshTunnel(connectionConfig);
        
        // 使用 SSH 隧道的本地端口连接数据库
        switch (connectionConfig.type) {
          case 'mysql':
            connection = await mysql.createConnection({
              host: '127.0.0.1',
              port: tunnel.localPort,
              user: connectionConfig.username,
              password: connectionConfig.password,
              database: connectionConfig.database
            });
            break;
          case 'postgresql':
            connection = new Client({
              host: '127.0.0.1',
              port: tunnel.localPort,
              database: connectionConfig.database,
              user: connectionConfig.username,
              password: connectionConfig.password
            });
            await connection.connect();
            break;
          // ... 其他数据库类型
        }
        
        // 保存 SSH 客户端引用以便后续关闭
        connection._sshClient = tunnel.sshClient;
      } else {
        // 原有逻辑 (不使用 SSH)
        switch (connectionConfig.type) {
          case 'mysql':
            connection = await mysql.createConnection({
              host: connectionConfig.host,
              port: connectionConfig.port,
              user: connectionConfig.username,
              password: connectionConfig.password,
              database: connectionConfig.database
            });
            break;
          // ... 其他数据库类型
        }
      }

    this.connections.set(connectionId, connection);
    return connection;
  }

  // 关闭连接
  async closeConnection (connectionId) {
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
  async closeAllConnections () {
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