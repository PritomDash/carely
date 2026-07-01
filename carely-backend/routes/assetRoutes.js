const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const SiteAsset = require('../models/SiteAsset');
const adminAuth = require('../middlewares/adminAuthMiddleware');

const DEST = path.join(process.cwd(), 'uploads', 'branding');
fs.mkdirSync(DEST, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, DEST),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '_' + path.basename(file.originalname, ext).replace(/\s+/g, '_') + ext);
  }
});
const upload = multer({ storage });

router.get('/', adminAuth, async (_req, res) => {
  const list = await SiteAsset.find().sort({ kind: 1, order: 1, createdAt: -1 });
  res.json(list);
});

router.post('/logo', adminAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });
  await SiteAsset.updateMany({ kind: 'logo', status: 'Active' }, { status: 'Inactive' });
  const doc = await SiteAsset.create({ kind: 'logo', title: 'Carely Logo', url: '/uploads/branding/' + req.file.filename });
  res.status(201).json(doc);
});

router.post('/screenshot', adminAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });
  const doc = await SiteAsset.create({
    kind: 'screenshot', title: req.body.title || 'Screenshot',
    url: '/uploads/branding/' + req.file.filename,
    order: Number(req.body.order) || 0
  });
  res.status(201).json(doc);
});

router.delete('/:id', adminAuth, async (req, res) => {
  const doc = await SiteAsset.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  if (doc.url?.startsWith('/uploads/branding/')) {
    fs.promises.unlink(path.join(process.cwd(), doc.url.replace(/^\//, ''))).catch(() => {});
  }
  await doc.deleteOne();
  res.json({ success: true });
});

router.get('/public', async (_req, res) => {
  const all = await SiteAsset.find({ status: 'Active' }).sort({ kind: 1, order: 1, createdAt: -1 });
  const logo = all.find(a => a.kind === 'logo') || null;
  const screenshots = all.filter(a => a.kind === 'screenshot').sort((a,b) => a.order - b.order);
  res.json({
    logoUrl: logo ? logo.url : null,
    screenshots: screenshots.map(s => ({ url: s.url, title: s.title }))
  });
});

module.exports = router;
