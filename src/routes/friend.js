const express = require('express');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { success, error } = require('../utils/response');

const router = express.Router();

// POST friend/list
router.post('/friend/list', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT f.*, u.name, u.picture_url FROM friends f JOIN users u ON f.friend_aid = u.aid WHERE f.user_aid = ? AND f.status = 1',
      [req.user.aid]
    );
    res.json(success({
      list: rows.map(f => ({
        id: f.id, aid: f.friend_aid, name: f.name,
        pictureUrl: f.picture_url,
        isMuted: f.is_muted === 1, createdAt: f.created_at
      }))
    }));
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST friend/request/list
router.post('/friend/request/list', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT fr.*, u.name, u.picture_url FROM friend_requests fr JOIN users u ON fr.from_aid = u.aid WHERE fr.to_aid = ? AND fr.status = 0',
      [req.user.aid]
    );
    res.json(success({ list: rows.map(r => ({ id: r.id, fromAid: r.from_aid, name: r.name, pictureUrl: r.picture_url })) }));
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST friend/request/add
router.post('/friend/request/add', authenticate, async (req, res) => {
  try {
    const { toAid, message } = req.body;
    if (!toAid) return res.json(error('Recipient required'));
    await pool.query('INSERT INTO friend_requests (from_aid, to_aid, status) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE status = 0',
      [req.user.aid, toAid]);
    res.json(success({ requestId: 1 }));
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST friend/request/accept
router.post('/friend/request/accept', authenticate, async (req, res) => {
  try {
    const { requestId, fromAid } = req.body;
    const aid = fromAid;
    await pool.query('UPDATE friend_requests SET status = 1 WHERE (id = ? OR from_aid = ?) AND to_aid = ?', [requestId, aid, req.user.aid]);
    await pool.query('INSERT INTO friends (user_aid, friend_aid, status) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE status = 1',
      [req.user.aid, aid]);
    await pool.query('INSERT INTO friends (user_aid, friend_aid, status) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE status = 1',
      [aid, req.user.aid]);
    res.json(success());
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST friend/request/reject
router.post('/friend/request/reject', authenticate, async (req, res) => {
  const { requestId, fromAid } = req.body;
  await pool.query('UPDATE friend_requests SET status = -1 WHERE (id = ? OR from_aid = ?) AND to_aid = ?', [requestId, fromAid, req.user.aid]);
  res.json(success());
});

// POST friend/remove
router.post('/friend/remove', authenticate, async (req, res) => {
  const { friendAid } = req.body;
  await pool.query('DELETE FROM friends WHERE (user_aid = ? AND friend_aid = ?) OR (user_aid = ? AND friend_aid = ?)',
    [req.user.aid, friendAid, friendAid, req.user.aid]);
  res.json(success());
});

// POST friend/mute
router.post('/friend/mute', authenticate, async (req, res) => {
  const { friendAid, mute } = req.body;
  await pool.query('UPDATE friends SET is_muted = ? WHERE user_aid = ? AND friend_aid = ?', [mute ? 1 : 0, req.user.aid, friendAid]);
  res.json(success());
});

module.exports = router;
