CREATE DATABASE IF NOT EXISTS wino_live CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wino_live;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  aid INT NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL,
  nickname VARCHAR(50) DEFAULT NULL,
  password VARCHAR(255) DEFAULT NULL,
  coins INT DEFAULT 0,
  picture_url VARCHAR(255) DEFAULT NULL,
  profile_complete TINYINT(1) DEFAULT 0,
  phone VARCHAR(20) DEFAULT NULL,
  country_code VARCHAR(5) DEFAULT NULL,
  firebase_uid VARCHAR(255) DEFAULT NULL,
  login_type VARCHAR(20) DEFAULT 'phone',
  created_at BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000),
  refresh_token VARCHAR(500) DEFAULT NULL,
  session_token VARCHAR(500) DEFAULT NULL,
  INDEX idx_aid (aid),
  INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id INT PRIMARY KEY,
  name_type INT DEFAULT 1,
  nickname VARCHAR(50) DEFAULT NULL,
  fullname VARCHAR(100) DEFAULT NULL,
  picture_url VARCHAR(255) DEFAULT NULL,
  img_url VARCHAR(255) DEFAULT NULL,
  cover_url VARCHAR(255) DEFAULT NULL,
  bg VARCHAR(255) DEFAULT NULL,
  custom_bg VARCHAR(255) DEFAULT NULL,
  custom_bg_url VARCHAR(255) DEFAULT NULL,
  bg_url VARCHAR(255) DEFAULT NULL,
  country_code VARCHAR(5) DEFAULT NULL,
  level INT DEFAULT 1,
  total_xp INT DEFAULT 0,
  needed_xp INT DEFAULT 100,
  remaining_xp INT DEFAULT 100,
  percentage_xp VARCHAR(10) DEFAULT '0%',
  img_shape INT DEFAULT 0,
  gender INT DEFAULT 0,
  age INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'online',
  description TEXT DEFAULT NULL,
  birthday VARCHAR(10) DEFAULT NULL,
  visitors INT DEFAULT 0,
  bans INT DEFAULT 0,
  presence INT DEFAULT 1,
  talk_time INT DEFAULT 0,
  likes INT DEFAULT 0,
  expire_days INT DEFAULT 0,
  created_at BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000),
  FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Profile album pictures
CREATE TABLE IF NOT EXISTS profile_albums (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  created_at BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Networks (countries/categories)
CREATE TABLE IF NOT EXISTS networks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  flag VARCHAR(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  network_id INT DEFAULT NULL,
  name VARCHAR(100) NOT NULL,
  title VARCHAR(200) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  img_url VARCHAR(255) DEFAULT NULL,
  user_count INT DEFAULT 0,
  room_size INT DEFAULT 50,
  password VARCHAR(255) DEFAULT NULL,
  is_locked TINYINT(1) DEFAULT 0,
  created_at BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000),
  expire_at BIGINT DEFAULT NULL,
  expire_days INT DEFAULT 30,
  created_by INT DEFAULT NULL,
  FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Room configurations
CREATE TABLE IF NOT EXISTS room_configs (
  room_id INT PRIMARY KEY,
  room_name VARCHAR(100) DEFAULT NULL,
  img_url VARCHAR(255) DEFAULT NULL,
  welcome_txt TEXT DEFAULT NULL,
  title VARCHAR(200) DEFAULT NULL,
  private_chat INT DEFAULT 1,
  camera INT DEFAULT 1,
  room_lock INT DEFAULT 0,
  lock_reason VARCHAR(255) DEFAULT NULL,
  lock_type INT DEFAULT 0,
  send_image TINYINT(1) DEFAULT 1,
  enable_ludo TINYINT(1) DEFAULT 0,
  private_audio TINYINT(1) DEFAULT 0,
  add_master TINYINT(1) DEFAULT 0,
  theme VARCHAR(50) DEFAULT 'default',
  mic INT DEFAULT 0,
  mics TINYINT(1) DEFAULT 0,
  mic_mode INT DEFAULT 0,
  mic_count INT DEFAULT 1,
  time_guest INT DEFAULT 0,
  time_member INT DEFAULT 0,
  time_admin INT DEFAULT 0,
  time_sadmin INT DEFAULT 0,
  time_master INT DEFAULT 0,
  is_ludo TINYINT(1) DEFAULT 0,
  is_wuno TINYINT(1) DEFAULT 0,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Room info (statistics)
CREATE TABLE IF NOT EXISTS room_infos (
  room_id INT PRIMARY KEY,
  room_name VARCHAR(100) DEFAULT NULL,
  members INT DEFAULT 0,
  admins INT DEFAULT 0,
  sadmins INT DEFAULT 0,
  masters INT DEFAULT 0,
  created_at BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000),
  expire_at BIGINT DEFAULT NULL,
  expire_days INT DEFAULT 30,
  room_size INT DEFAULT 50,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Room users (currently in room)
CREATE TABLE IF NOT EXISTS room_users (
  user_id BIGINT NOT NULL,
  room_id INT NOT NULL,
  aid INT NOT NULL,
  nickname VARCHAR(50) DEFAULT NULL,
  image_url VARCHAR(255) DEFAULT NULL,
  type INT DEFAULT 0,
  name_type INT DEFAULT 1,
  perms VARCHAR(15) DEFAULT '000000000000000',
  level INT DEFAULT 1,
  icon_id INT DEFAULT 0,
  mic INT DEFAULT 0,
  cam INT DEFAULT 0,
  audio INT DEFAULT 1,
  state INT DEFAULT 0,
  block_cam INT DEFAULT 0,
  block_talk INT DEFAULT 0,
  block_private INT DEFAULT 0,
  block_public INT DEFAULT 0,
  profile_status VARCHAR(100) DEFAULT NULL,
  is_ignored TINYINT(1) DEFAULT 0,
  is_typing TINYINT(1) DEFAULT 0,
  bg_url VARCHAR(255) DEFAULT NULL,
  custom_bg_url VARCHAR(255) DEFAULT NULL,
  background VARCHAR(255) DEFAULT NULL,
  background_url VARCHAR(255) DEFAULT NULL,
  joined_at BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000),
  PRIMARY KEY (user_id, room_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Room accounts (for room login/bots)
CREATE TABLE IF NOT EXISTS room_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  account_name VARCHAR(100) DEFAULT NULL,
  account_type INT DEFAULT 0,
  type_color VARCHAR(20) DEFAULT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Room messages
CREATE TABLE IF NOT EXISTS room_messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  from_aid INT NOT NULL,
  from_nickname VARCHAR(50) DEFAULT NULL,
  from_img_url VARCHAR(255) DEFAULT NULL,
  type INT DEFAULT 0,
  content TEXT DEFAULT NULL,
  image_url VARCHAR(255) DEFAULT NULL,
  voice_url VARCHAR(255) DEFAULT NULL,
  voice_duration INT DEFAULT 0,
  created_at BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000),
  deleted TINYINT(1) DEFAULT 0,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Room bans
CREATE TABLE IF NOT EXISTS room_bans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  user_aid INT NOT NULL,
  nickname VARCHAR(50) DEFAULT NULL,
  banned_by INT DEFAULT NULL,
  reason VARCHAR(255) DEFAULT NULL,
  created_at BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  UNIQUE KEY uk_room_user (room_id, user_aid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Room logs
CREATE TABLE IF NOT EXISTS room_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  by_aid INT DEFAULT NULL,
  target_aid INT DEFAULT NULL,
  details TEXT DEFAULT NULL,
  created_at BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Room reports
CREATE TABLE IF NOT EXISTS room_reports (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  reporter_aid INT NOT NULL,
  target_aid INT NOT NULL,
  reason VARCHAR(255) DEFAULT NULL,
  status INT DEFAULT 0,
  created_at BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Private conversations
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(36) PRIMARY KEY,
  user_aid_1 INT NOT NULL,
  user_aid_2 INT NOT NULL,
  last_message TEXT DEFAULT NULL,
  last_message_at BIGINT DEFAULT NULL,
  created_at BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000),
  UNIQUE KEY uk_users (user_aid_1, user_aid_2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Private messages
CREATE TABLE IF NOT EXISTS private_messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  conversation_id VARCHAR(36) NOT NULL,
  from_aid INT NOT NULL,
  to_aid INT NOT NULL,
  message TEXT DEFAULT NULL,
  image_url VARCHAR(255) DEFAULT NULL,
  type INT DEFAULT 0,
  status INT DEFAULT 0,
  created_at BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Friends
CREATE TABLE IF NOT EXISTS friends (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_aid INT NOT NULL,
  friend_aid INT NOT NULL,
  status INT DEFAULT 1,
  is_muted TINYINT(1) DEFAULT 0,
  created_at BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000),
  UNIQUE KEY uk_friend (user_aid, friend_aid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Friend requests
CREATE TABLE IF NOT EXISTS friend_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_aid INT NOT NULL,
  to_aid INT NOT NULL,
  status INT DEFAULT 0,
  created_at BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000),
  UNIQUE KEY uk_request (from_aid, to_aid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Moments (posts)
CREATE TABLE IF NOT EXISTS moments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_aid INT NOT NULL,
  content TEXT DEFAULT NULL,
  type INT DEFAULT 0,
  created_at BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000),
  updated_at BIGINT DEFAULT NULL,
  deleted TINYINT(1) DEFAULT 0,
  likes INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Moment images
CREATE TABLE IF NOT EXISTS moment_images (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  moment_id BIGINT NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  sort_order INT DEFAULT 0,
  FOREIGN KEY (moment_id) REFERENCES moments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Moment likes
CREATE TABLE IF NOT EXISTS moment_likes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  moment_id BIGINT NOT NULL,
  user_aid INT NOT NULL,
  created_at BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000),
  FOREIGN KEY (moment_id) REFERENCES moments(id) ON DELETE CASCADE,
  UNIQUE KEY uk_like (moment_id, user_aid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Moment comments
CREATE TABLE IF NOT EXISTS moment_comments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  moment_id BIGINT NOT NULL,
  user_aid INT NOT NULL,
  content TEXT NOT NULL,
  created_at BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000),
  deleted TINYINT(1) DEFAULT 0,
  FOREIGN KEY (moment_id) REFERENCES moments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Store items
CREATE TABLE IF NOT EXISTS store_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT NULL,
  price INT NOT NULL,
  image_url VARCHAR(255) DEFAULT NULL,
  category VARCHAR(50) DEFAULT NULL,
  duration_days INT DEFAULT 30,
  available TINYINT(1) DEFAULT 1,
  created_at BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User inventory
CREATE TABLE IF NOT EXISTS user_inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_aid INT NOT NULL,
  item_id INT NOT NULL,
  type VARCHAR(20) NOT NULL,
  quantity INT DEFAULT 1,
  expires_at BIGINT DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 0,
  created_at BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000),
  FOREIGN KEY (item_id) REFERENCES store_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_aid INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  amount INT NOT NULL,
  balance_after INT DEFAULT 0,
  description VARCHAR(255) DEFAULT NULL,
  created_at BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- FCM tokens
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_aid INT NOT NULL,
  token VARCHAR(500) NOT NULL,
  device_id VARCHAR(255) DEFAULT NULL,
  created_at BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000),
  updated_at BIGINT DEFAULT NULL,
  UNIQUE KEY uk_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default network
INSERT INTO networks (id, name, flag) VALUES
(1, 'Saudi Arabia', '🇸🇦'),
(2, 'UAE', '🇦🇪'),
(3, 'Egypt', '🇪🇬'),
(4, 'Kuwait', '🇰🇼'),
(5, 'Qatar', '🇶🇦'),
(6, 'Bahrain', '🇧🇭'),
(7, 'Oman', '🇴🇲'),
(8, 'Global', '🌍');

-- Insert some default rooms
INSERT INTO rooms (network_id, name, title, user_count, room_size) VALUES
(1, 'الساحة العامة', 'الساحة العامة', 0, 100),
(1, 'غرفة الشباب', 'غرفة الشباب', 0, 50),
(1, 'للاسترخاء', 'للاسترخاء', 0, 50);

-- Add room configs for default rooms
INSERT INTO room_configs (room_id, room_name, title, theme, mics, send_image) VALUES
(1, 'الساحة العامة', 'الساحة العامة', 'default', 1, 1),
(2, 'غرفة الشباب', 'غرفة الشباب', 'default', 1, 1),
(3, 'للاسترخاء', 'للاسترخاء', 'default', 1, 1);

-- Add room infos
INSERT INTO room_infos (room_id, room_name, room_size) VALUES
(1, 'الساحة العامة', 100),
(2, 'غرفة الشباب', 50),
(3, 'للاسترخاء', 50);
