const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const config = require('../config/config');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const { success, error, generateAid, generateSessionToken } = require('../utils/response');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST auth/phone/login
router.post('/phone/login', async (req, res) => {
  try {
    const { token: password, deviceId } = req.body;
    if (!password) return res.json(error('Password required'));

    const [users] = await pool.query('SELECT * FROM users WHERE password IS NOT NULL');
    // Find user by verifying password
    let foundUser = null;
    for (const u of users) {
      if (await bcrypt.compare(password, u.password)) {
        foundUser = u;
        break;
      }
    }
    if (!foundUser) return res.json(error('Invalid credentials'));

    const tokens = generateTokens({ aid: foundUser.aid, id: foundUser.id });
    const sessionToken = generateSessionToken();
    await pool.query('UPDATE users SET refresh_token = ?, session_token = ? WHERE id = ?',
      [tokens.refreshToken, sessionToken, foundUser.id]);

    res.json(success({
      account: {
        id: foundUser.id,
        aid: foundUser.aid,
        name: foundUser.name,
        coins: foundUser.coins,
        picture_url: foundUser.picture_url,
        pictureUrl: foundUser.picture_url ? `${config.baseUrl}:${config.mediaPort}/image/profile/${foundUser.picture_url}` : null,
        profileComplete: foundUser.profile_complete === 1
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      sessionToken
    }));
  } catch (err) {
    console.error('Login error:', err);
    res.json(error('Server error'));
  }
});

// POST auth/phone/verify (Firebase phone auth)
router.post('/phone/verify', async (req, res) => {
  try {
    const { firebaseIdToken, deviceId } = req.body;
    if (!firebaseIdToken) return res.json(error('Token required'));

    // For now, create or find user by firebase token
    // In production, verify Firebase ID token here
    const phone = `user_${Date.now()}`;
    const aid = generateAid();
    const [result] = await pool.query(
      'INSERT INTO users (aid, name, phone, profile_complete) VALUES (?, ?, ?, 0)',
      [aid, `User${aid}`, phone]
    );

    const id = result.insertId;
    // Create empty profile
    await pool.query('INSERT INTO user_profiles (id, nickname, presence, status) VALUES (?, ?, 1, ?)',
      [id, `User${aid}`, 'online']);

    const tokens = generateTokens({ aid, id });
    const sessionToken = generateSessionToken();
    await pool.query('UPDATE users SET refresh_token = ?, session_token = ? WHERE id = ?',
      [tokens.refreshToken, sessionToken, id]);

    res.json(success({
      account: { id, aid, name: `User${aid}`, coins: 0, picture_url: null, pictureUrl: null, profileComplete: false },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      sessionToken
    }));
  } catch (err) {
    console.error('Verify error:', err);
    res.json(error('Server error'));
  }
});

// POST auth/login (social login)
router.post('/login', async (req, res) => {
  try {
    const { type, token, deviceId, codeVerifier } = req.body;

    // For social login types, create or return existing user
    const aid = generateAid();
    const [result] = await pool.query(
      'INSERT INTO users (aid, name, login_type, profile_complete) VALUES (?, ?, ?, 0)',
      [aid, `User${aid}`, type || 'social']
    );
    const id = result.insertId;
    await pool.query('INSERT INTO user_profiles (id, nickname, presence, status) VALUES (?, ?, 1, ?)',
      [id, `User${aid}`, 'online']);

    const tokens = generateTokens({ aid, id });
    const sessionToken = generateSessionToken();
    await pool.query('UPDATE users SET refresh_token = ?, session_token = ? WHERE id = ?',
      [tokens.refreshToken, sessionToken, id]);

    res.json(success({
      account: { id, aid, name: `User${aid}`, coins: 0, picture_url: null, pictureUrl: null, profileComplete: false },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      sessionToken
    }));
  } catch (err) {
    console.error('Social login error:', err);
    res.json(error('Server error'));
  }
});

// POST auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(error('No refresh token'));
    }
    const token = authHeader.split(' ')[1];

    const decoded = verifyRefreshToken(token);
    const tokens = generateTokens({ aid: decoded.aid, id: decoded.id });

    await pool.query('UPDATE users SET refresh_token = ? WHERE id = ?',
      [tokens.refreshToken, decoded.id]);

    res.json(success({
      account: { id: decoded.id, aid: decoded.aid },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      sessionToken: generateSessionToken()
    }));
  } catch (err) {
    return res.status(401).json(error('Invalid refresh token'));
  }
});

// POST auth/phone/register
router.post('/phone/register', async (req, res) => {
  try {
    const { token: password, deviceId } = req.body;
    if (!password) return res.json(error('Password required'));

    const aid = generateAid();
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (aid, name, password, profile_complete) VALUES (?, ?, ?, 0)',
      [aid, `User${aid}`, hashedPassword]
    );
    const id = result.insertId;
    await pool.query('INSERT INTO user_profiles (id, nickname, presence, status) VALUES (?, ?, 1, ?)',
      [id, `User${aid}`, 'online']);

    const tokens = generateTokens({ aid, id });
    const sessionToken = generateSessionToken();
    await pool.query('UPDATE users SET refresh_token = ?, session_token = ? WHERE id = ?',
      [tokens.refreshToken, sessionToken, id]);

    res.json(success({
      account: { id, aid, name: `User${aid}`, coins: 0, picture_url: null, pictureUrl: null, profileComplete: false },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      sessionToken
    }));
  } catch (err) {
    console.error('Register error:', err);
    res.json(error('Server error'));
  }
});

// POST user/logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    await pool.query('UPDATE users SET refresh_token = NULL, session_token = NULL WHERE aid = ?', [req.user.aid]);
    res.json(success());
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST user/info
router.all('/user/info', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, aid, name, coins, picture_url, profile_complete FROM users WHERE aid = ?',
      [req.user.aid]
    );
    if (rows.length === 0) return res.json(error('User not found'));
    const u = rows[0];
    res.json(success({
      id: u.id,
      aid: u.aid,
      name: u.name,
      coins: u.coins,
      picture_url: u.picture_url,
      pictureUrl: u.picture_url ? `${config.baseUrl}:${config.mediaPort}/image/profile/${u.picture_url}` : null,
      profileComplete: u.profile_complete === 1
    }));
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST user/wallet
router.all('/user/wallet', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT coins FROM users WHERE aid = ?', [req.user.aid]);
    if (rows.length === 0) return res.json(error('User not found'));
    res.json(success({ coins: rows[0].coins }));
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST user/search
router.post('/user/search', authenticate, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.json(error('Query required'));
    const [rows] = await pool.query(
      'SELECT id, aid, name, picture_url, profile_complete FROM users WHERE name LIKE ? LIMIT 20',
      [`%${query}%`]
    );
    res.json(success({ users: rows.map(u => ({
      id: u.id, aid: u.aid, name: u.name,
      picture_url: u.picture_url,
      pictureUrl: u.picture_url ? `${config.baseUrl}:${config.mediaPort}/image/profile/${u.picture_url}` : null,
      profileComplete: u.profile_complete === 1
    })) }));
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST user/push/fcm_token
router.post('/user/push/fcm_token', authenticate, async (req, res) => {
  try {
    const { token, deviceId } = req.body;
    if (!token) return res.json(error('Token required'));
    await pool.query(
      'INSERT INTO fcm_tokens (user_aid, token, device_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE updated_at = UNIX_TIMESTAMP() * 1000',
      [req.user.aid, token, deviceId || null]
    );
    res.json(success());
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST user/transactions
router.post('/user/transactions', authenticate, async (req, res) => {
  try {
    const { cursor, limit = 20 } = req.body;
    let query = 'SELECT id, type, amount, created_at FROM transactions WHERE user_aid = ?';
    const params = [req.user.aid];
    if (cursor) {
      query += ' AND id < ?';
      params.push(cursor);
    }
    query += ' ORDER BY id DESC LIMIT ?';
    params.push(limit);

    const [rows] = await pool.query(query, params);
    res.json(success({
      items: rows.map(t => ({ id: t.id, type: t.type, amount: t.amount, createdAt: t.created_at })),
      pagination: { nextCursor: rows.length > 0 ? rows[rows.length - 1].id : null, hasMore: rows.length >= limit }
    }));
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST user/profile/update
router.post('/user/profile/update', authenticate, async (req, res) => {
  try {
    const fields = [];
    const values = [];
    const allowedFields = ['name', 'nickname', 'fullname', 'gender', 'age', 'description', 'birthday', 'country_code', 'img_shape'];

    for (const [key, value] of Object.entries(req.body)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length > 0) {
      values.push(req.user.id);
      await pool.query(`UPDATE user_profiles SET ${fields.join(', ')} WHERE id = ?`, values);
      if (req.body.name) {
        await pool.query('UPDATE users SET name = ? WHERE id = ?', [req.body.name, req.user.id]);
      }
    }

    res.json(success());
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST user/profile/other
router.post('/user/profile/other', authenticate, async (req, res) => {
  try {
    const { aid } = req.body;
    const targetAid = aid || req.user.aid;
    const [rows] = await pool.query(
      'SELECT * FROM user_profiles WHERE id = (SELECT id FROM users WHERE aid = ?)',
      [targetAid]
    );
    if (rows.length === 0) return res.json(error('Profile not found'));
    const p = rows[0];
    res.json(success({
      id: p.id, nameType: p.name_type, nickname: p.nickname, fullname: p.fullname,
      pictureUrl: p.picture_url, imgUrl: p.img_url, coverUrl: p.cover_url,
      bg: p.bg, customBg: p.custom_bg, customBgUrl: p.custom_bg_url, bgUrl: p.bg_url,
      countryCode: p.country_code, level: p.level, neededXP: p.needed_xp,
      remainingXP: p.remaining_xp, totalXP: p.total_xp, percentageXP: p.percentage_xp,
      imgShape: p.img_shape, gender: p.gender, status: p.status, desc: p.description,
      birthday: p.birthday, age: p.age, visitors: p.visitors, bans: p.bans,
      presence: p.presence, talkTime: p.talk_time, likes: p.likes, isLiked: false,
      createdAt: p.created_at, expireDays: p.expire_days
    }));
  } catch (err) {
    res.json(error('Server error'));
  }
});

// GET network/list — returns { code: 1, data: { networks: [...], rooms: [...] } }
router.all('/network/list', async (req, res) => {
  try {
    const [networks] = await pool.query('SELECT * FROM networks');
    const [rooms] = await pool.query(
      'SELECT r.*, n.flag as network_flag, n.name as network_name FROM rooms r LEFT JOIN networks n ON r.network_id = n.id'
    );

    // Compute roomCount and userCount per network
    const networkCounts = {};
    for (const r of rooms) {
      if (!networkCounts[r.network_id]) {
        networkCounts[r.network_id] = { roomCount: 0, userCount: 0 };
      }
      networkCounts[r.network_id].roomCount++;
      networkCounts[r.network_id].userCount += (r.user_count || 0);
    }

    res.json(success({
      networks: networks.map(n => ({
        id: n.id,
        name: n.name,
        nameEn: n.name,
        flagCode: n.flag,
        roomCount: networkCounts[n.id]?.roomCount || 0,
        userCount: networkCounts[n.id]?.userCount || 0,
        selected: false
      })),
      rooms: rooms.map(r => ({
        roomId: r.id,
        roomType: 0,
        netId: r.network_id,
        name: r.name,
        title: r.title,
        imgUrl: r.img_url,
        userCount: r.user_count,
        lock: r.is_locked || 0,
        flagCode: r.network_flag || null
      }))
    }));
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST /v1/config
router.post('/config', async (req, res) => {
  res.json({
    code: 1,
    msg: 'success',
    data: {
      appVersion: { min: 1, current: 3 },
      maintenanceMode: false,
      features: { ludo: true, wuno: true, live: true }
    }
  });
});

// POST validation/name
router.post('/validation/name', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.json(error('Name required'));
    const valid = /^[a-zA-Z0-9_\u0600-\u06FF\u0750-\u077F ]{2,20}$/.test(name);
    res.json(success({ valid, errorCode: valid ? 0 : 1, invalidChar: valid ? null : name.match(/[^a-zA-Z0-9_\u0600-\u06FF ]/)?.[0] || null }));
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST device/fingerprint
router.post('/device/fingerprint', (req, res) => {
  console.log('device/fingerprint body:', JSON.stringify(req.body));
  res.json({ code: 1, msg: 'success', data: JSON.stringify({ ok: true }) });
});

module.exports = router;
