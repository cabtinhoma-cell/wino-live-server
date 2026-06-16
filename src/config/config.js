require('dotenv').config();

let dbConfig;

if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  dbConfig = {
    host: url.hostname,
    port: parseInt(url.port) || 4000,
    user: url.username,
    password: decodeURIComponent(url.password),
    database: url.pathname.replace('/', ''),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: { rejectUnauthorized: true }
  };
} else {
  dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'wino_live',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
}

module.exports = {
  port: parseInt(process.env.PORT) || 3000,
  apiPort: parseInt(process.env.PORT) || 3000,
  wssPort: parseInt(process.env.WSS_PORT) || 3002,
  signalingPort: parseInt(process.env.SIGNALING_PORT) || 5051,
  host: process.env.HOST || '0.0.0.0',
  baseUrl: process.env.BASE_URL || 'http://192.168.1.37',
  mediaPort: parseInt(process.env.MEDIA_PORT) || 8890,

  db: dbConfig,

  jwt: {
    secret: process.env.JWT_SECRET || 'wino-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'wino-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },

  media: {
    url: process.env.MEDIA_URL || 'http://192.168.1.37:8890',
    secret: process.env.MEDIA_SECRET || 'media-secret'
  }
};
