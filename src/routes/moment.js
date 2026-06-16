const express = require('express');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { success, error } = require('../utils/response');

const router = express.Router();

// POST moment/list
router.post('/moment/list', authenticate, async (req, res) => {
  try {
    const { cursor, limit = 20, userId } = req.body;
    let params = [];
    let sql = 'SELECT m.* FROM moments m WHERE m.deleted = 0';

    if (userId) {
      params.push(userId);
      sql += ' AND m.user_aid = ?';
    }
    if (cursor) {
      params.push(cursor);
      sql += ' AND m.id < ?';
    }
    sql += ' ORDER BY m.id DESC LIMIT ?';
    params.push(parseInt(limit));

    const [rows] = await pool.query(sql, params);
    const moments = await Promise.all(rows.map(m => formatMoment(m)));

    res.json(success({
      list: moments,
      pagination: { nextCursor: rows.length > 0 ? rows[rows.length - 1].id : null, hasMore: rows.length >= limit }
    }));
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST moment/detail
router.post('/moment/detail', authenticate, async (req, res) => {
  try {
    const { momentId } = req.body;
    const [rows] = await pool.query('SELECT * FROM moments WHERE id = ? AND deleted = 0', [momentId]);
    if (rows.length === 0) return res.json(error('Moment not found'));
    res.json(success(await formatMoment(rows[0])));
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST moment/create
router.post('/moment/create', authenticate, async (req, res) => {
  try {
    const { content, images } = req.body;
    const [result] = await pool.query(
      'INSERT INTO moments (user_aid, content, type, created_at) VALUES (?, ?, 0, UNIX_TIMESTAMP() * 1000)',
      [req.user.aid, content || null]
    );
    const momentId = result.insertId;

    if (images && Array.isArray(images)) {
      for (let i = 0; i < images.length; i++) {
        await pool.query('INSERT INTO moment_images (moment_id, image_url, sort_order) VALUES (?, ?, ?)',
          [momentId, images[i], i]);
      }
    }
    res.json(success({ momentId }));
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST moment/update
router.post('/moment/update', authenticate, async (req, res) => {
  try {
    const { momentId, content } = req.body;
    await pool.query('UPDATE moments SET content = ?, updated_at = UNIX_TIMESTAMP() * 1000 WHERE id = ? AND user_aid = ?',
      [content, momentId, req.user.aid]);
    res.json(success());
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST moment/delete
router.post('/moment/delete', authenticate, async (req, res) => {
  try {
    const { momentId } = req.body;
    await pool.query('UPDATE moments SET deleted = 1 WHERE id = ? AND user_aid = ?', [momentId, req.user.aid]);
    res.json(success());
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST moment/like/add
router.post('/moment/like/add', authenticate, async (req, res) => {
  try {
    const { momentId } = req.body;
    await pool.query('INSERT INTO moment_likes (moment_id, user_aid) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = id',
      [momentId, req.user.aid]);
    await pool.query('UPDATE moments SET likes = (SELECT COUNT(*) FROM moment_likes WHERE moment_id = ?) WHERE id = ?',
      [momentId, momentId]);
    res.json(success());
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST moment/like/remove
router.post('/moment/like/remove', authenticate, async (req, res) => {
  try {
    const { momentId } = req.body;
    await pool.query('DELETE FROM moment_likes WHERE moment_id = ? AND user_aid = ?', [momentId, req.user.aid]);
    await pool.query('UPDATE moments SET likes = (SELECT COUNT(*) FROM moment_likes WHERE moment_id = ?) WHERE id = ?',
      [momentId, momentId]);
    res.json(success());
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST moment/comment/list
router.post('/moment/comment/list', authenticate, async (req, res) => {
  try {
    const { momentId } = req.body;
    const [rows] = await pool.query('SELECT * FROM moment_comments WHERE moment_id = ? AND deleted = 0 ORDER BY id ASC', [momentId]);
    const comments = await Promise.all(rows.map(async (c) => {
      const [users] = await pool.query('SELECT u.aid, u.name, u.picture_url FROM users u WHERE u.id = (SELECT id FROM users WHERE aid = ?)', [c.user_aid]);
      const u = users[0] || {};
      return { id: c.id, userInfo: { aid: c.user_aid, name: u.name, imgUrl: u.picture_url }, content: c.content, createdAt: c.created_at };
    }));
    res.json(success({ list: comments }));
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST moment/comment/add
router.post('/moment/comment/add', authenticate, async (req, res) => {
  try {
    const { momentId, content } = req.body;
    const [result] = await pool.query(
      'INSERT INTO moment_comments (moment_id, user_aid, content, created_at) VALUES (?, ?, ?, UNIX_TIMESTAMP() * 1000)',
      [momentId, req.user.aid, content]
    );
    res.json(success({ id: result.insertId, createdAt: Date.now() }));
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST moment/comment/delete
router.post('/moment/comment/delete', authenticate, async (req, res) => {
  try {
    const { commentId } = req.body;
    await pool.query('UPDATE moment_comments SET deleted = 1 WHERE id = ? AND user_aid = ?', [commentId, req.user.aid]);
    res.json(success());
  } catch (err) {
    res.json(error('Server error'));
  }
});

async function formatMoment(m) {
  const [images] = await pool.query('SELECT * FROM moment_images WHERE moment_id = ? ORDER BY sort_order', [m.id]);
  const [users] = await pool.query('SELECT u.aid, u.name, u.picture_url FROM users u WHERE u.id = (SELECT id FROM users WHERE aid = ?)', [m.user_aid]);
  const u = users[0] || {};
  return {
    id: m.id, userInfo: { aid: m.user_aid, nickname: u.name, imgUrl: u.picture_url },
    content: m.content, images: images.map(img => img.image_url),
    likes: m.likes, isLiked: false, commentCount: 0,
    createdAt: m.created_at, updatedAt: m.updated_at
  };
}

module.exports = router;
