const express = require('express');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { success, error, generateId } = require('../utils/response');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// POST message/list
router.post('/message/list', authenticate, async (req, res) => {
  try {
    const { conversationId, cursor, limit = 20 } = req.body;
    let params = [req.user.aid, req.user.aid];
    let sql = 'SELECT * FROM private_messages WHERE (from_aid = ? OR to_aid = ?)';
    if (conversationId) {
      sql = 'SELECT * FROM private_messages WHERE conversation_id = ?';
      params = [conversationId];
    }
    if (cursor) {
      sql += ' AND id < ?';
      params.push(cursor);
    }
    sql += ' ORDER BY id DESC LIMIT ?';
    params.push(parseInt(limit));

    const [rows] = await pool.query(sql, params);
    const messages = rows.reverse().map(m => ({
      id: m.id, chatId: m.conversation_id, fromAid: m.from_aid, toAid: m.to_aid,
      message: m.message, imageUrl: m.image_url, timestamp: m.created_at,
      type: m.type, status: m.status
    }));
    res.json(success({
      list: messages,
      pagination: { nextCursor: rows.length > 0 ? rows[rows.length - 1].id : null, hasMore: rows.length >= limit }
    }));
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST message/send
router.post('/message/send', authenticate, async (req, res) => {
  try {
    const { toAid, message, imageUrl, type } = req.body;
    if (!toAid || (!message && !imageUrl)) return res.json(error('Recipient and content required'));

    // Find or create conversation
    const aids = [req.user.aid, toAid].sort();
    let convId = `${aids[0]}_${aids[1]}`;
    let [convs] = await pool.query('SELECT id FROM conversations WHERE user_aid_1 = ? AND user_aid_2 = ?', [aids[0], aids[1]]);
    if (convs.length === 0) {
      convId = uuidv4();
      await pool.query('INSERT INTO conversations (id, user_aid_1, user_aid_2) VALUES (?, ?, ?)', [convId, aids[0], aids[1]]);
    } else {
      convId = convs[0].id;
    }

    await pool.query(
      'INSERT INTO private_messages (conversation_id, from_aid, to_aid, message, image_url, type, created_at) VALUES (?, ?, ?, ?, ?, ?, UNIX_TIMESTAMP() * 1000)',
      [convId, req.user.aid, toAid, message || null, imageUrl || null, type || 0]
    );

    // Update conversation
    await pool.query('UPDATE conversations SET last_message = ?, last_message_at = UNIX_TIMESTAMP() * 1000 WHERE id = ?',
      [message || '[Image]', convId]);

    res.json(success({ conversationId: convId }));
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST message/conversation/list
router.post('/message/conversation/list', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM conversations WHERE user_aid_1 = ? OR user_aid_2 = ? ORDER BY last_message_at DESC',
      [req.user.aid, req.user.aid]
    );
    const conversations = await Promise.all(rows.map(async (c) => {
      const otherAid = c.user_aid_1 === req.user.aid ? c.user_aid_2 : c.user_aid_1;
      const [users] = await pool.query('SELECT u.id, u.aid, u.name, u.picture_url FROM users u WHERE u.aid = ?', [otherAid]);
      const user = users[0] || {};
      return {
        id: c.id, otherUser: { id: user.id, aid: user.aid, nickname: user.name, imgUrl: user.picture_url },
        lastMessage: { message: c.last_message }, unreadCount: 0, updatedAt: c.last_message_at
      };
    }));
    res.json(success({ list: conversations }));
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST message/mark_read
router.post('/message/mark_read', authenticate, (req, res) => res.json(success()));

// POST message/list/delete
router.post('/message/list/delete', authenticate, async (req, res) => {
  const { conversationId } = req.body;
  if (conversationId) {
    await pool.query('UPDATE private_messages SET status = -1 WHERE conversation_id = ? AND (from_aid = ? OR to_aid = ?)',
      [conversationId, req.user.aid, req.user.aid]);
  }
  res.json(success());
});

module.exports = router;
