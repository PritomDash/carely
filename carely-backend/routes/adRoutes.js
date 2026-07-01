const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Ad = require('../models/Ad');
const adminAuth = require('../middlewares/adminAuthMiddleware');

const ADS_DIR = path.join(process.cwd(), 'uploads', 'ads');
fs.mkdirSync(ADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '_' + path.basename(file.originalname, ext).replace(/\s+/g, '_') + ext);
  }
});
const upload = multer({ storage });

router.post('/', adminAuth, upload.single('media'), async (req, res) => {
  try {
    const { description, start, end, status = 'Active', placement = 'belowScreenshots' } = req.body;
    if (!description || !start || !end || !req.file)
      return res.status(400).json({ error: 'description, start, end and media are required' });

    const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
    const ad = await Ad.create({
      description, start: new Date(start), end: new Date(end),
      status, mediaType, mediaUrl: '/uploads/ads/' + req.file.filename, placement
    });
    res.status(201).json(ad);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create ad' });
  }
});

router.get('/', adminAuth, async (_req, res) => {
  try {
    const ads = await Ad.find().sort({ createdAt: -1 });
    res.json(ads);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ads' });
  }
});

router.get('/active', async (_req, res) => {
  try {
    const now = new Date();
    const ads = await Ad.find({ status: 'Active', start: { $lte: now }, end: { $gte: now } }).sort({ createdAt: -1 });
    res.json(ads);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch active ads' });
  }
});

router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.status(404).json({ error: 'Ad not found' });
    if (ad.mediaUrl?.startsWith('/uploads/ads/')) {
      fs.promises.unlink(path.join(process.cwd(), ad.mediaUrl.replace(/^\//, ''))).catch(() => {});
    }
    await ad.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete ad' });
  }
});

module.exports = router;
