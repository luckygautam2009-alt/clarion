const express = require('express');
const router = express.Router();
const notifications = require('../services/notificationService');
const complaints = require('../services/complaintService');
const { attachCustomer } = require('../middleware/customerAuth');
const { upload } = require('../config/upload');
const { validateImages } = require('../utils/fileValidation');

function needSession(req, res, next) {
  if (!req.customer) return res.status(401).json({ success: false, error: 'Please sign in to continue.' });
  next();
}

router.use(attachCustomer, needSession);

router.get('/notifications', (req, res) => {
  const customerId = req.customer.id;
  res.status(200).json({
    success: true,
    data: { notifications: notifications.list({ audience: 'customer', customerId, limit: 30 }), unread: notifications.unreadCount({ audience: 'customer', customerId }) },
  });
});

router.post('/notifications/read', (req, res) => {
  const ids = req.body && Array.isArray(req.body.ids) ? req.body.ids : null;
  const changed = notifications.markRead({ audience: 'customer', customerId: req.customer.id, ids });
  res.status(200).json({ success: true, data: { changed } });
});

// "Clear" is different from "read": cleared notifications are stored as dismissed and never come back
router.post('/notifications/dismiss', (req, res) => {
  const body = req.body || {};
  let changed;
  if (Array.isArray(body.ids)) changed = notifications.dismiss({ audience: 'customer', customerId: req.customer.id, ids: body.ids });
  else if (body.all === true) changed = notifications.dismiss({ audience: 'customer', customerId: req.customer.id });
  else return res.status(400).json({ success: false, error: 'Send { ids: [...] } or { all: true }' });
  res.status(200).json({ success: true, data: { changed } });
});

router.get('/complaints', (req, res) => {
  res.status(200).json({ success: true, data: complaints.listForCustomer(req.customer.id) });
});

// Customers only REGISTER a complaint. The platform investigates; staff handle the exceptions.
router.post('/complaints', upload.array('photos', 3), (req, res) => {
  const body = req.body || {};
  const text = String(body.complaintText || '').trim();
  if (text.length < 8 || text.length > 1000) return res.status(400).json({ success: false, error: 'Please describe the problem in 8 to 1000 characters.' });
  const orderId = body.orderId ? String(body.orderId).trim() : null;
  if (orderId && !/^[A-Za-z0-9_-]{1,50}$/.test(orderId)) return res.status(400).json({ success: false, error: 'Invalid order.' });
  const issueKey = body.issueKey ? String(body.issueKey).replace(/[^a-z_]/gi, '').slice(0, 30) : null;
  const files = req.files || [];
  const bad = validateImages(files);
  if (bad) return res.status(400).json({ success: false, error: bad });
  const out = complaints.register({ customerId: req.customer.id, orderId, issueKey, text, files });
  if (out.status !== 201) return res.status(out.status).json({ success: false, error: out.error });
  res.status(201).json({ success: true, data: { id: out.id, status: 'registered', message: 'Sorry for the inconvenience. Your complaint has been registered successfully. We have also sent a confirmation to your email.' } });
});

// Answer a request for more information (text and/or photos)
router.post('/complaints/:id/reply', upload.array('photos', 3), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, error: 'Invalid complaint.' });
  const message = String((req.body && req.body.message) || '').trim();
  const files = req.files || [];
  if (message.length > 1000) return res.status(400).json({ success: false, error: 'Message is too long.' });
  if (message.length < 8 && !files.length) return res.status(400).json({ success: false, error: 'Add a short message (8+ characters) or at least one photo.' });
  const bad = validateImages(files);
  if (bad) return res.status(400).json({ success: false, error: bad });
  const out = complaints.reply({ complaintId: id, customerId: req.customer.id, message: message.length >= 8 ? message : '', files });
  if (out.status !== 200) return res.status(out.status).json({ success: false, error: out.error });
  res.status(200).json({ success: true, data: { message: 'Thank you. We are checking your complaint again.' } });
});

// A customer can only ever open the photos of their own complaint
router.get('/complaints/:id/files/:fileId', (req, res) => {
  const f = complaints.getFile({ complaintId: Number(req.params.id), fileId: Number(req.params.fileId), customerId: req.customer.id });
  if (!f) return res.status(404).json({ success: false, error: 'Not found' });
  res.set({ 'Content-Type': f.mime, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }).send(f.data);
});

const profile = require('../services/profileService');
const MAX_AVATAR = 2 * 1024 * 1024;

router.get('/profile', (req, res) => {
  res.status(200).json({ success: true, data: profile.get(req.customer.id) });
});

router.post('/profile/photo', upload.single('photo'), (req, res) => {
  const f = req.file;
  if (!f) return res.status(400).json({ success: false, error: 'Choose a photo first.' });
  if (f.size > MAX_AVATAR) return res.status(400).json({ success: false, error: 'The photo must be under 2 MB.' });
  const bad = validateImages([f]);
  if (bad) return res.status(400).json({ success: false, error: bad });
  profile.setAvatar(req.customer.id, f.buffer, f.mimetype);
  res.status(200).json({ success: true, data: profile.get(req.customer.id) });
});

router.get('/profile/photo', (req, res) => {
  const a = profile.getAvatar(req.customer.id);
  if (!a) return res.status(404).json({ success: false, error: 'No photo' });
  res.set({ 'Content-Type': a.mime, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }).send(a.data);
});

router.delete('/profile/photo', (req, res) => {
  profile.removeAvatar(req.customer.id);
  res.status(200).json({ success: true, data: profile.get(req.customer.id) });
});

router.post('/profile/name', (req, res) => {
  const name = String((req.body && req.body.name) || '').replace(/[\u0000-\u001f]/g, '').trim();
  if (name.length < 2 || name.length > 80) return res.status(400).json({ success: false, error: 'Name must be 2-80 characters.' });
  profile.setName(req.customer.id, name);
  res.status(200).json({ success: true, data: profile.get(req.customer.id) });
});

router.post('/profile/details', (req, res) => {
  const body = req.body || {};
  let name = body.name !== undefined ? String(body.name).replace(/[\u0000-\u001f]/g, '').trim() : undefined;
  if (name !== undefined && (name.length < 2 || name.length > 80)) {
    return res.status(400).json({ success: false, error: 'Name must be 2-80 characters.' });
  }
  const phone = body.phone !== undefined ? String(body.phone).trim() : undefined;
  const address = body.address !== undefined ? String(body.address).trim() : undefined;
  const city = body.city !== undefined ? String(body.city).trim() : undefined;
  const pincode = body.pincode !== undefined ? String(body.pincode).trim() : undefined;

  const data = profile.updateDetails(req.customer.id, { name, phone, address, city, pincode });
  res.status(200).json({ success: true, data });
});

module.exports = router;
