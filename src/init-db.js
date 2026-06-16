const pool = require('./config/database');

const schema = `
CREATE TABLE IF NOT EXISTS networks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  flag VARCHAR(10) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255) DEFAULT NULL,
  network_id INT DEFAULT NULL,
  img_url VARCHAR(500) DEFAULT NULL,
  user_count INT DEFAULT 0,
  is_locked TINYINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  aid VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  password VARCHAR(255) DEFAULT NULL,
  login_type VARCHAR(50) DEFAULT NULL,
  coins INT DEFAULT 0,
  picture_url VARCHAR(500) DEFAULT NULL,
  profile_complete TINYINT DEFAULT 0,
  refresh_token TEXT DEFAULT NULL,
  session_token TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id INT PRIMARY KEY,
  nickname VARCHAR(255) DEFAULT NULL,
  fullname VARCHAR(255) DEFAULT NULL,
  name_type VARCHAR(50) DEFAULT NULL,
  picture_url VARCHAR(500) DEFAULT NULL,
  img_url VARCHAR(500) DEFAULT NULL,
  cover_url VARCHAR(500) DEFAULT NULL,
  bg VARCHAR(100) DEFAULT NULL,
  custom_bg TINYINT DEFAULT 0,
  custom_bg_url VARCHAR(500) DEFAULT NULL,
  bg_url VARCHAR(500) DEFAULT NULL,
  country_code VARCHAR(10) DEFAULT NULL,
  level INT DEFAULT 1,
  needed_xp INT DEFAULT 100,
  remaining_xp INT DEFAULT 100,
  total_xp INT DEFAULT 0,
  percentage_xp INT DEFAULT 0,
  img_shape INT DEFAULT 0,
  gender TINYINT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'online',
  description TEXT DEFAULT NULL,
  birthday DATE DEFAULT NULL,
  age INT DEFAULT 0,
  visitors INT DEFAULT 0,
  bans INT DEFAULT 0,
  presence INT DEFAULT 1,
  talk_time INT DEFAULT 0,
  likes INT DEFAULT 0,
  expire_days INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fcm_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_aid VARCHAR(50) NOT NULL,
  token TEXT NOT NULL,
  device_id VARCHAR(255) DEFAULT NULL,
  updated_at BIGINT DEFAULT NULL,
  UNIQUE KEY unique_token (user_aid, token(255)),
  FOREIGN KEY (user_aid) REFERENCES users(aid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_aid VARCHAR(50) NOT NULL,
  type VARCHAR(50) DEFAULT NULL,
  amount INT DEFAULT 0,
  created_at BIGINT DEFAULT NULL,
  FOREIGN KEY (user_aid) REFERENCES users(aid) ON DELETE CASCADE
);
`;

const seedNetworks = `
INSERT IGNORE INTO networks (id, name, flag) VALUES
  (1, 'Saudi Arabia', '🇸🇦'),
  (2, 'UAE', '🇦🇪'),
  (3, 'Egypt', '🇪🇬'),
  (4, 'Kuwait', '🇰🇼'),
  (5, 'Qatar', '🇶🇦'),
  (6, 'Bahrain', '🇧🇭'),
  (7, 'Oman', '🇴🇲'),
  (8, 'Global', '🌍');
`;

const seedRooms = `
INSERT IGNORE INTO rooms (id, name, title, network_id, user_count) VALUES
  (1, 'الساحة العامة', 'الساحة العامة', 1, 0),
  (2, 'غرفة الشباب', 'غرفة الشباب', 1, 0),
  (3, 'للاسترخاء', 'للاسترخاء', 1, 0),
  (4, 'Welcome Room', 'Welcome Room', 1, 0),
  (5, 'غرفة المبيعات', 'غرفة المبيعات', 8, 1000),
  (6, 'Dubai Chat', 'Dubai Chat Room', 2, 5),
  (7, 'أبوظبي', 'أبوظبي', 2, 3),
  (8, 'القاهرة', 'القاهرة', 3, 12),
  (9, 'الإسكندرية', 'الإسكندرية', 3, 8),
  (10, 'الكويت', 'الكويت', 4, 7),
  (11, 'الدوحة', 'الدوحة', 5, 4),
  (12, 'المنامة', 'المنامة', 6, 2),
  (13, 'مسقط', 'مسقط', 7, 3),
  (14, 'English Chat', 'English Chat Room', 8, 15),
  (15, 'International', 'International Room', 8, 20);
`;

async function initDB() {
  try {
    console.log('🔧 Initializing database...');
    const statements = schema.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      await pool.query(stmt);
    }
    console.log('✅ Tables created');

    await pool.query(seedNetworks);
    console.log('✅ Networks seeded');

    await pool.query(seedRooms);
    console.log('✅ Rooms seeded');

    console.log('🎉 Database initialized successfully');
  } catch (err) {
    console.error('❌ Database init error:', err.message);
  }
}

module.exports = initDB;
