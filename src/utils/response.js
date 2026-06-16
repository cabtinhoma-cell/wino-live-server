const crypto = require('crypto');

const SUCCESS_CODES = [1, 1000];

function success(data = null, msg = 'success', code = 100) {
  if (data === null || data === undefined) {
    return { code, msg };
  }
  return { code, msg, data };
}

function error(msg = 'error', code = 400) {
  return { code, msg };
}

function generateId() {
  return crypto.randomInt(100000, 999999999);
}

function generateAid() {
  return crypto.randomInt(10000, 999999999);
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { success, error, generateId, generateAid, generateSessionToken, SUCCESS_CODES };
