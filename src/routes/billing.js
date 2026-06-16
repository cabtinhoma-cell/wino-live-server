const express = require('express');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { success, error } = require('../utils/response');

const router = express.Router();

// POST billing/product/list
router.post('/product/list', authenticate, async (req, res) => {
  res.json(success({
    products: [
      { id: 'coins_100', name: '100 Coins', price: 0.99, coins: 100 },
      { id: 'coins_500', name: '500 Coins', price: 3.99, coins: 500 },
      { id: 'coins_1000', name: '1000 Coins', price: 6.99, coins: 1000 },
      { id: 'coins_5000', name: '5000 Coins', price: 29.99, coins: 5000 }
    ]
  }));
});

// POST billing/verify
router.post('/verify', authenticate, async (req, res) => {
  try {
    const { productId, purchaseToken } = req.body;
    // In production, verify with Google Play Billing
    const coins = { coins_100: 100, coins_500: 500, coins_1000: 1000, coins_5000: 5000 };
    const amount = coins[productId] || 0;
    if (amount > 0) {
      await pool.query('UPDATE users SET coins = coins + ? WHERE aid = ?', [amount, req.user.aid]);
      await pool.query('INSERT INTO transactions (user_aid, type, amount, balance_after, description) VALUES (?, ?, ?, (SELECT coins FROM users WHERE aid = ?), ?)',
        [req.user.aid, 'purchase', amount, req.user.aid, `Purchased ${amount} coins`]);
    }
    res.json(success({ coins: amount }));
  } catch (err) {
    res.json(error('Server error'));
  }
});

// POST billing/verify/gift
router.post('/verify/gift', authenticate, async (req, res) => {
  res.json(success());
});

// GET assets/user-bg/list
router.all('/user-bg/list', authenticate, async (req, res) => {
  res.json(success({
    backgrounds: [
      { id: 1, name: 'Default', url: 'default_bg.jpg', price: 0 },
      { id: 2, name: 'Ocean', url: 'ocean_bg.jpg', price: 100 },
      { id: 3, name: 'Night', url: 'night_bg.jpg', price: 200 }
    ]
  }));
});

module.exports = router;
