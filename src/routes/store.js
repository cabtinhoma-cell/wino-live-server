const express = require('express');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { success, error } = require('../utils/response');

const router = express.Router();

async function getList(req, res, type) {
  const [items] = await pool.query('SELECT * FROM store_items WHERE type = ? AND available = 1', [type]);
  res.json(success({ list: items.map(i => ({
    id: i.id, type: i.type, name: i.name, desc: i.description, price: i.price,
    imageUrl: i.image_url, category: i.category, durationDays: i.duration_days
  })) }));
}

// Store
router.post('/ride/list', authenticate, (req, res) => getList(req, res, 'ride'));
router.post('/bubble/list', authenticate, (req, res) => getList(req, res, 'bubble'));
router.post('/name/list', authenticate, (req, res) => getList(req, res, 'name'));
router.post('/room/list', authenticate, (req, res) => getList(req, res, 'room'));
router.post('/entrance/list', authenticate, (req, res) => getList(req, res, 'entrance'));
router.post('/root/list', authenticate, async (req, res) => {
  const [items] = await pool.query('SELECT * FROM store_items WHERE type = ? AND available = 1', ['root']);
  res.json(success({ list: items }));
});
router.post('/item/details', authenticate, async (req, res) => {
  const [items] = await pool.query('SELECT * FROM store_items WHERE id = ?', [req.body.itemId]);
  if (items.length === 0) return res.json(error('Item not found'));
  res.json(success(items[0]));
});

// Buy
router.post('/ride/buy', authenticate, (req, res) => buyItem(req, res, 'ride'));
router.post('/bubble/buy', authenticate, (req, res) => buyItem(req, res, 'bubble'));
router.post('/name/buy', authenticate, (req, res) => buyItem(req, res, 'name'));
router.post('/room/buy', authenticate, (req, res) => buyItem(req, res, 'room'));
router.post('/entrance/buy', authenticate, (req, res) => buyItem(req, res, 'entrance'));
router.post('/root/buy', authenticate, (req, res) => buyItem(req, res, 'root'));

// Prices
router.post('/name/prices', authenticate, (req, res) => res.json(success({ prices: { basic: 100, silver: 500, gold: 1000 } })));
router.post('/root/prices', authenticate, (req, res) => res.json(success({ prices: { weekly: 500, monthly: 1500 } })));
router.post('/room/prices', authenticate, (req, res) => res.json(success({ prices: { basic: 200, premium: 1000 } })));

// Change name/fee/renew
router.post('/name/change-name', authenticate, (req, res) => res.json(success()));
router.post('/room/change-name', authenticate, (req, res) => res.json(success()));
router.post('/name/change-fee', authenticate, (req, res) => res.json(success()));
router.post('/room/change-fee', authenticate, (req, res) => res.json(success()));
router.post('/root/change-fee', authenticate, (req, res) => res.json(success()));
router.post('/root/renew', authenticate, (req, res) => res.json(success()));
router.post('/name/renew', authenticate, (req, res) => res.json(success()));
router.post('/room/renew', authenticate, (req, res) => res.json(success()));

// Inventory
router.post('/ride/list', authenticate, (req, res) => getInventory(req, res, 'ride'));
router.post('/bubble/list', authenticate, (req, res) => getInventory(req, res, 'bubble'));
router.post('/name/list', authenticate, (req, res) => getInventory(req, res, 'name'));
router.post('/room/list', authenticate, (req, res) => getInventory(req, res, 'room'));
router.post('/room/root/list', authenticate, (req, res) => getInventory(req, res, 'root'));
router.post('/root/list', authenticate, (req, res) => getInventory(req, res, 'root'));
router.post('/bubble/dress', authenticate, (req, res) => res.json(success()));
router.post('/bubble/undress', authenticate, (req, res) => res.json(success()));
router.post('/ride/dress', authenticate, (req, res) => res.json(success()));
router.post('/ride/undress', authenticate, (req, res) => res.json(success()));
router.post('/entrance/dress', authenticate, (req, res) => res.json(success()));
router.post('/entrance/undress', authenticate, (req, res) => res.json(success()));

async function buyItem(req, res, type) {
  try {
    const { itemId } = req.body;
    const [items] = await pool.query('SELECT * FROM store_items WHERE id = ? AND type = ?', [itemId, type]);
    if (items.length === 0) return res.json(error('Item not found'));
    const item = items[0];

    const [users] = await pool.query('SELECT coins FROM users WHERE aid = ?', [req.user.aid]);
    if (users[0].coins < item.price) return res.json(error('Insufficient coins'));

    await pool.query('UPDATE users SET coins = coins - ? WHERE aid = ?', [item.price, req.user.aid]);
    await pool.query(
      'INSERT INTO user_inventory (user_aid, item_id, type, quantity, expires_at) VALUES (?, ?, ?, 1, UNIX_TIMESTAMP() * 1000 + ? * 86400000) ON DUPLICATE KEY UPDATE quantity = quantity + 1',
      [req.user.aid, itemId, type, item.duration_days || 30]
    );
    await pool.query('INSERT INTO transactions (user_aid, type, amount, balance_after, description) VALUES (?, ?, ?, (SELECT coins FROM users WHERE aid = ?), ?)',
      [req.user.aid, `buy_${type}`, -item.price, req.user.aid, item.name]);

    res.json(success());
  } catch (err) {
    res.json(error('Server error'));
  }
}

async function getInventory(req, res, type) {
  const [items] = await pool.query(
    'SELECT ui.*, si.name, si.description, si.image_url FROM user_inventory ui JOIN store_items si ON ui.item_id = si.id WHERE ui.user_aid = ? AND ui.type = ? AND (ui.expires_at IS NULL OR ui.expires_at > UNIX_TIMESTAMP() * 1000)',
    [req.user.aid, type]
  );
  res.json(success({ list: items.map(i => ({
    id: i.id, itemId: i.item_id, name: i.name, imageUrl: i.image_url,
    quantity: i.quantity, expiresAt: i.expires_at, isActive: i.is_active === 1
  })) }));
}

module.exports = router;
