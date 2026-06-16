const express = require('express');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { success, error } = require('../utils/response');

const router = express.Router();

const uploadFields = upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 10 },
  { name: 'audio', maxCount: 1 }
]);

function handleUpload(req, res) {
  try {
    const files = req.files;
    let filename = null;
    if (files) {
      const fileField = files.file || files.image || files.images || files.audio || [];
      if (fileField.length > 0) {
        filename = fileField[0].filename;
      }
    }
    if (!filename) return res.json(error('No file uploaded'));
    res.json(success({ url: filename, filename }));
  } catch (err) {
    res.json(error('Upload failed'));
  }
}

router.post('/user-avatar', authenticate, uploadFields, handleUpload);
router.post('/profile-image', authenticate, uploadFields, handleUpload);
router.post('/profile-cover', authenticate, uploadFields, handleUpload);
router.post('/profile-bg', authenticate, uploadFields, handleUpload);
router.post('/profile-album', authenticate, uploadFields, handleUpload);
router.post('/image/room-chat', authenticate, uploadFields, handleUpload);
router.post('/voice/room-chat', authenticate, uploadFields, handleUpload);
router.post('/image/cam-report', authenticate, uploadFields, handleUpload);
router.post('/moment-image', authenticate, uploadFields, (req, res) => {
  try {
    const files = req.files;
    const filenames = [];
    if (files) {
      for (const field of Object.values(files)) {
        for (const f of field) {
          filenames.push(f.filename);
        }
      }
    }
    res.json(success({ urls: filenames.map(f => ({ url: f, filename: f })) }));
  } catch (err) {
    res.json(error('Upload failed'));
  }
});

module.exports = router;
