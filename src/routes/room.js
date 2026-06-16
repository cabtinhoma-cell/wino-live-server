const express = require('express');
const pool = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { success, error } = require('../utils/response');

const router = express.Router();

// GET room/info
router.all('/info', authenticate, async (req, res) => {
  try {
    const roomId = parseInt(req.query.roomId) || parseInt(req.body?.roomId) || 0;
    if (!roomId) return res.json(error('Room ID required'));

    const [rooms] = await pool.query('SELECT * FROM rooms WHERE id = ?', [roomId]);
    if (rooms.length === 0) return res.json(error('Room not found'));
    const r = rooms[0];

    const [configs] = await pool.query('SELECT * FROM room_configs WHERE room_id = ?', [roomId]);
    const [infos] = await pool.query('SELECT * FROM room_infos WHERE room_id = ?', [roomId]);
    const [accounts] = await pool.query('SELECT * FROM room_accounts WHERE room_id = ?', [roomId]);

    const cfg = configs[0] || {};
    const info = infos[0] || {};

    res.json(success({
      roomInfo: {
        roomId: r.id, roomName: r.name, createdAt: r.created_at, expireAt: r.expire_at,
        expireDays: r.expire_days, roomSize: r.room_size, members: info.members || 0,
        admins: info.admins || 0, sadmins: info.sadmins || 0, masters: info.masters || 0
      },
      roomConfig: {
        roomId: r.id, roomName: cfg.room_name || r.name, imgUrl: cfg.img_url, welcomeTxt: cfg.welcome_txt,
        title: cfg.title, privateChat: cfg.private_chat ?? 1, camera: cfg.camera ?? 1,
        roomLock: cfg.room_lock ?? 0, lockReason: cfg.lock_reason, sendImage: cfg.send_image === 1,
        enableLudo: cfg.enable_ludo === 1, privateAudio: cfg.private_audio === 1,
        addMaster: cfg.add_master === 1, theme: cfg.theme || 'default',
        mic: cfg.mic ?? 0, mics: cfg.mics === 1, micMode: cfg.mic_mode ?? 0,
        micCount: cfg.mic_count ?? 1, timeGuest: cfg.time_guest ?? 0, timeMember: cfg.time_member ?? 0,
        timeAdmin: cfg.time_admin ?? 0, timeSuperAdmin: cfg.time_sadmin ?? 0, timeMaster: cfg.time_master ?? 0,
        isLudo: cfg.is_ludo === 1, isWuno: cfg.is_wuno === 1
      },
      roomLoginInfo: {
        accounts: accounts.map(a => ({ id: a.id, roomId: a.room_id, accountName: a.account_name, accountType: a.account_type }))
      }
    }));
  } catch (err) {
    console.error('Room info error:', err);
    res.json(error('Server error'));
  }
});

// POST room/join
router.post('/join', optionalAuth, async (req, res) => {
  try {
    console.log('[ROOM JOIN] Body:', JSON.stringify(req.body));
    console.log('[ROOM JOIN] Headers:', JSON.stringify(req.headers));
    const roomId = parseInt(req.query.roomId) || parseInt(req.body?.roomId) || 0;
    const { password, nickname, accountId } = req.body;
    if (!roomId) return res.json(error('Room ID required'));

    const [rooms] = await pool.query('SELECT * FROM rooms WHERE id = ?', [roomId]);
    if (rooms.length === 0) return res.json(error('Room not found'));
    const room = rooms[0];

    // Check password if locked
    if (room.is_locked && room.password && password !== room.password) {
      return res.json(error('Wrong password'));
    }

    const userAid = req.user ? req.user.aid : null;
    const userId = req.user ? req.user.id : null;
    const userName = (req.user && req.user.name) || nickname || `Guest${Date.now()}`;

    // Add user to room
    const userPerms = '111000000000000';
    if (userAid) {
      const [existing] = await pool.query('SELECT * FROM room_users WHERE aid = ? AND room_id = ?', [userAid, roomId]);
      if (existing.length === 0) {
        await pool.query(
          'INSERT INTO room_users (user_id, room_id, aid, nickname, type, name_type, level, perms, mic, cam, audio, state, joined_at) VALUES (?, ?, ?, ?, 1, 1, 1, ?, 0, 0, 1, 0, UNIX_TIMESTAMP() * 1000)',
          [BigInt(userId), roomId, userAid, userName, userPerms]
        );
        await pool.query('UPDATE rooms SET user_count = user_count + 1 WHERE id = ?', [roomId]);
      }
    }

    // Get room users
    const [users] = await pool.query('SELECT * FROM room_users WHERE room_id = ?', [roomId]);
    const [messages] = await pool.query(
      'SELECT * FROM room_messages WHERE room_id = ? ORDER BY id DESC LIMIT 20',
      [roomId]
    );
    const [accounts] = await pool.query('SELECT * FROM room_accounts WHERE room_id = ?', [roomId]);
    const [configs] = await pool.query('SELECT * FROM room_configs WHERE room_id = ?', [roomId]);

    const cfg = configs[0] || {};
    const r = room;

    const guestUserId = BigInt(Date.now());
    const guestUserNickname = nickname || `Guest${Date.now()}`;
    res.json({
      code: 1,
      msg: 'success',
      data: {
        roomData: {
          roomConfig: {
            roomId: r.id, roomName: cfg.room_name || r.name, imgUrl: cfg.img_url, welcomeTxt: cfg.welcome_txt,
            title: cfg.title, privateChat: cfg.private_chat ?? 1, camera: cfg.camera ?? 1,
            roomLock: cfg.room_lock ?? 0, lockReason: cfg.lock_reason, sendImage: cfg.send_image === 1,
            enableLudo: cfg.enable_ludo === 1, privateAudio: cfg.private_audio === 1,
            addMaster: cfg.add_master === 1, theme: cfg.theme || 'default',
            mic: cfg.mic ?? 0, mics: cfg.mics === 1, micMode: cfg.mic_mode ?? 0,
            micCount: cfg.mic_count ?? 1, timeGuest: cfg.time_guest ?? 0, timeMember: cfg.time_member ?? 0,
            timeAdmin: cfg.time_admin ?? 0, timeSuperAdmin: cfg.time_sadmin ?? 0, timeMaster: cfg.time_master ?? 0,
            isLudo: cfg.is_ludo === 1, isWuno: cfg.is_wuno === 1
          },
          userList: users.map(u => ({
            id: Number(u.user_id), nickname: u.nickname, imgUrl: u.image_url ? `http://192.168.1.37:8890/image/profile/thumbnail/${u.image_url}` : null,
            image_url: u.image_url, type: u.type, nameType: u.name_type, permissions: u.perms,
            level: u.level, icon: u.icon_id, mic: u.mic, cam: u.cam, audio: u.audio,
            state: u.state, block_camera: u.block_cam, block_talk: u.block_talk,
            block_private: u.block_private, block_public: u.block_public,
            profileStatus: u.profile_status, isIgnored: u.is_ignored, isTyping: u.is_typing,
            bgUrl: u.bg_url, customBgUrl: u.custom_bg_url, background: u.background, background_url: u.background_url
          })),
          micList: [],
          multiMicList: [],
          roomToken: 'guest_token_' + Date.now(),
          roomUser: {
            id: Number(guestUserId),
            nickname: guestUserNickname,
            imgUrl: null,
            image_url: null,
            type: 0,
            nameType: 0,
            permissions: '111000000000000',
            level: 1,
            icon: 0,
            mic: 0,
            cam: 0,
            audio: 1,
            state: 0,
            block_camera: 0,
            block_talk: 0,
            block_private: 0,
            block_public: 0,
            profileStatus: null,
            profile_status: null,
            isIgnored: false,
            isTyping: false,
            bgUrl: null,
            customBgUrl: null,
            background: null,
            background_url: null
          }
        },
        message: null,
        lockReason: null,
        invalid: null,
        banDuration: 0
      }
    });
  } catch (err) {
    console.error('Room join error:', err);
    res.json(error('Server error'));
  }
});

// POST room/rejoin
router.post('/rejoin', authenticate, async (req, res) => {
  return router.handle(req, res, '/join');
});

// POST room/leave
router.post('/leave', authenticate, async (req, res) => {
  try {
    const { roomId } = req.body;
    await pool.query('DELETE FROM room_users WHERE aid = ? AND room_id = ?', [req.user.aid, roomId]);
    await pool.query('UPDATE rooms SET user_count = GREATEST(0, user_count - 1) WHERE id = ?', [roomId]);
    res.json(success());
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST room/heartbeat
router.post('/heartbeat', authenticate, (req, res) => {
  res.json(success());
});

// POST room/message/send
router.post('/message/send', authenticate, async (req, res) => {
  try {
    const { roomId, type, content, imageUrl, voiceUrl, voiceDuration } = req.body;
    if (!roomId || !content) return res.json(error('Room ID and content required'));

    const [result] = await pool.query(
      'INSERT INTO room_messages (room_id, from_aid, from_nickname, from_img_url, type, content, image_url, voice_url, voice_duration, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, UNIX_TIMESTAMP() * 1000)',
      [roomId, req.user.aid, req.body.nickname || req.user.name, null, type || 0, content, imageUrl || null, voiceUrl || null, voiceDuration || 0]
    );

    res.json(success({ messageId: result.insertId }));
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST room/message/delete
router.post('/message/delete', authenticate, async (req, res) => {
  try {
    const { roomId, messageId } = req.body;
    await pool.query('UPDATE room_messages SET deleted = 1 WHERE id = ? AND room_id = ?', [messageId, roomId]);
    res.json(success());
  } catch (err) {
    res.json(error('Server error'));
  }
});

// Generic room update endpoint
async function handleRoomUpdate(req, res, field, valueFn) {
  try {
    const { roomId } = req.body;
    if (!roomId) return res.json(error('Room ID required'));
    const value = valueFn ? valueFn(req.body) : req.body.value;
    if (field) {
      await pool.query(`UPDATE room_configs SET ${field} = ? WHERE room_id = ?`, [value, roomId]);
    }
    res.json(success());
  } catch (err) {
    res.json(error('Server error'));
  }
}

router.post('/gate/accept', authenticate, (req, res) => res.json(success()));
router.post('/gate/reject', authenticate, (req, res) => res.json(success()));
router.post('/join/cancel', authenticate, (req, res) => res.json(success()));
router.post('/user/typing', authenticate, (req, res) => res.json(success()));
router.post('/mute-audio', authenticate, (req, res) => res.json(success()));
router.post('/clear/text', authenticate, (req, res) => res.json(success()));
router.post('/send-broadcast', authenticate, (req, res) => res.json(success()));

// Mic management
router.post('/mic/up', authenticate, async (req, res) => {
  await pool.query('UPDATE room_users SET mic = 1 WHERE aid = ? AND room_id = ?', [req.user.aid, req.body.roomId]);
  res.json(success());
});
router.post('/mic/down', authenticate, async (req, res) => {
  await pool.query('UPDATE room_users SET mic = 0 WHERE aid = ? AND room_id = ?', [req.user.aid, req.body.roomId]);
  res.json(success());
});
router.post('/mic/request', authenticate, (req, res) => res.json(success()));
router.post('/mic/give', authenticate, (req, res) => res.json(success()));
router.post('/mic/pull', authenticate, (req, res) => res.json(success()));
router.post('/mic/remove', authenticate, (req, res) => res.json(success()));
router.post('/mic/lock', authenticate, (req, res) => res.json(success()));
router.post('/mic/mute', authenticate, (req, res) => res.json(success()));
router.post('/mic/update-time', authenticate, (req, res) => res.json(success()));
router.post('/mic/duplex', authenticate, (req, res) => res.json(success()));

// User management
router.post('/user/block', authenticate, (req, res) => res.json(success()));
router.post('/user/unblock', authenticate, (req, res) => res.json(success()));
router.post('/user/kick', authenticate, (req, res) => res.json(success()));
router.post('/user/pwd', authenticate, (req, res) => res.json(success()));
router.post('/user/send-warning', authenticate, (req, res) => res.json(success()));
router.post('/user/state/update', authenticate, (req, res) => res.json(success()));
router.post('/user/info', authenticate, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT * FROM room_users WHERE room_id = ? AND aid = ?', [req.body.roomId, req.body.aid || req.user.aid]);
    if (users.length === 0) return res.json(error('User not in room'));
    const u = users[0];
    res.json(success({
      id: Number(u.user_id), nickname: u.nickname, imgUrl: u.image_url ? `http://192.168.1.37:8890/image/profile/thumbnail/${u.image_url}` : null,
      image_url: u.image_url, type: u.type, nameType: u.name_type, perms: u.perms,
      level: u.level, iconId: u.icon_id, mic: u.mic, cam: u.cam, audio: u.audio,
      state: u.state, profileStatus: u.profile_status, isIgnored: u.is_ignored
    }));
  } catch (err) {
    res.json(error('Server error'));
  }
});

// Room updates
router.post('/update/title', authenticate, (req, res) => handleRoomUpdate(req, res, 'title'));
router.post('/update/lock', authenticate, (req, res) => handleRoomUpdate(req, res, 'room_lock'));
router.post('/update/image', authenticate, (req, res) => handleRoomUpdate(req, res, 'img_url'));
router.post('/update/welcome', authenticate, (req, res) => handleRoomUpdate(req, res, 'welcome_txt'));
router.post('/update/private', authenticate, (req, res) => handleRoomUpdate(req, res, 'private_chat'));
router.post('/update/advanced', authenticate, (req, res) => res.json(success()));
router.post('/update/talk2', authenticate, (req, res) => res.json(success()));
router.post('/update/camera', authenticate, (req, res) => handleRoomUpdate(req, res, 'camera'));
router.post('/update/theme', authenticate, (req, res) => handleRoomUpdate(req, res, 'theme'));

// Room accounts
router.post('/account/list', authenticate, async (req, res) => {
  const [accounts] = await pool.query('SELECT * FROM room_accounts WHERE room_id = ?', [req.body.roomId]);
  res.json(success({ accounts }));
});
router.post('/account/add', authenticate, async (req, res) => {
  await pool.query('INSERT INTO room_accounts (room_id, account_name, account_type) VALUES (?, ?, ?)', [req.body.roomId, req.body.name, req.body.type || 0]);
  res.json(success());
});
router.post('/account/update', authenticate, (req, res) => res.json(success()));
router.post('/account/delete', authenticate, (req, res) => {
  pool.query('DELETE FROM room_accounts WHERE id = ?', [req.body.id]);
  res.json(success());
});

// Room sub-APIs
router.post('/ban/list', authenticate, async (req, res) => {
  const [bans] = await pool.query('SELECT * FROM room_bans WHERE room_id = ?', [req.body.roomId]);
  res.json(success({ list: bans }));
});
router.post('/ban/add', authenticate, async (req, res) => {
  const { roomId, userId, reason } = req.body;
  await pool.query('INSERT INTO room_bans (room_id, user_aid, nickname, banned_by, reason) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE reason = VALUES(reason)',
    [roomId, userId, req.body.nickname, req.user.aid, reason]);
  res.json(success());
});
router.post('/ban/remove', authenticate, async (req, res) => {
  await pool.query('DELETE FROM room_bans WHERE room_id = ? AND user_aid = ?', [req.body.roomId, req.body.userId]);
  res.json(success());
});

router.post('/logs/list', authenticate, async (req, res) => {
  const [logs] = await pool.query('SELECT * FROM room_logs WHERE room_id = ? ORDER BY id DESC LIMIT 50', [req.body.roomId]);
  res.json(success({ list: logs }));
});
router.post('/logs/clear', authenticate, (req, res) => {
  pool.query('DELETE FROM room_logs WHERE room_id = ?', [req.body.roomId]);
  res.json(success());
});

router.post('/reports/list', authenticate, async (req, res) => {
  const [reports] = await pool.query('SELECT * FROM room_reports WHERE room_id = ? ORDER BY id DESC LIMIT 50', [req.body.roomId]);
  res.json(success({ list: reports }));
});
router.post('/reports/clear', authenticate, (req, res) => {
  pool.query('DELETE FROM room_reports WHERE room_id = ?', [req.body.roomId]);
  res.json(success());
});

// Room live
router.post('/live/request', authenticate, (req, res) => res.json(success()));
router.post('/live/request/accept', authenticate, (req, res) => res.json(success()));
router.post('/live/request/reject', authenticate, (req, res) => res.json(success()));
router.post('/live/start', authenticate, (req, res) => res.json(success({ token: 'live_token', config: { url: 'http://192.168.1.37:5051', version: 1 } })));
router.post('/live/stop', authenticate, (req, res) => res.json(success()));
router.post('/live/report', authenticate, (req, res) => res.json(success()));
router.post('/live/viewer/remove', authenticate, (req, res) => res.json(success()));

module.exports = router;
