const express = require('express');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { success, error } = require('../utils/response');

const router = express.Router();

// GET user/profile/info/me
router.all('/info/me', authenticate, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM user_profiles WHERE id = ?', [req.user.id]);
  if (rows.length === 0) return res.json(error('Profile not found'));
  const p = rows[0];
  res.json(success(profileToJson(p)));
});

// POST user/profile/info
router.post('/info', authenticate, async (req, res) => {
  const aid = req.body.aid || req.user.aid;
  const [rows] = await pool.query('SELECT * FROM user_profiles WHERE id = (SELECT id FROM users WHERE aid = ?)', [aid]);
  if (rows.length === 0) return res.json(error('Profile not found'));
  res.json(success(profileToJson(rows[0])));
});

// POST user/profile/data
router.post('/data', authenticate, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM user_profiles WHERE id = ?', [req.user.id]);
  if (rows.length === 0) return res.json(error('Profile not found'));
  res.json(success(profileToJson(rows[0])));
});

// Profile update endpoints
router.post('/info/update', authenticate, async (req, res) => {
  await updateProfile(req, res);
});
router.post('/image/update', authenticate, (req, res) => res.json(success()));
router.post('/cover/update', authenticate, (req, res) => res.json(success()));
router.post('/bg/update', authenticate, (req, res) => res.json(success()));
router.post('/album/add', authenticate, async (req, res) => {
  const { imageUrl } = req.body;
  if (imageUrl) {
    await pool.query('INSERT INTO profile_albums (user_id, image_url) VALUES (?, ?)', [req.user.id, imageUrl]);
  }
  res.json(success());
});
router.post('/album/update', authenticate, (req, res) => res.json(success()));
router.post('/pwd/update', authenticate, (req, res) => res.json(success()));
router.post('/like', authenticate, (req, res) => res.json(success()));

function profileToJson(p) {
  return {
    id: p.id, nameType: p.name_type, nickname: p.nickname, fullname: p.fullname,
    pictureUrl: p.picture_url, imgUrl: p.img_url, coverUrl: p.cover_url,
    bg: p.bg, customBg: p.custom_bg, customBgUrl: p.custom_bg_url, bgUrl: p.bg_url,
    countryCode: p.country_code, level: p.level, neededXP: p.needed_xp,
    remainingXP: p.remaining_xp, totalXP: p.total_xp, percentageXP: p.percentage_xp,
    imgShape: p.img_shape, gender: p.gender, age: p.age, status: p.status,
    desc: p.description, birthday: p.birthday, visitors: p.visitors, bans: p.bans,
    presence: p.presence, talkTime: p.talk_time, likes: p.likes, isLiked: false,
    createdAt: p.created_at, expireDays: p.expire_days
  };
}

async function updateProfile(req, res) {
  try {
    const allowed = ['nickname', 'fullname', 'gender', 'age', 'description', 'birthday', 'country_code', 'img_shape', 'status'];
    const updates = [];
    const values = [];
    for (const [k, v] of Object.entries(req.body)) {
      if (allowed.includes(k)) { updates.push(`${k} = ?`); values.push(v); }
    }
    if (updates.length > 0) {
      values.push(req.user.id);
      await pool.query(`UPDATE user_profiles SET ${updates.join(', ')} WHERE id = ?`, values);
    }
    res.json(success());
  } catch (err) {
    res.json(error('Server error'));
  }
}

module.exports = router;
