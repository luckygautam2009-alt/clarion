const express = require('express');
const router = express.Router();
const { upload } = require('../config/upload');
const { requireAdminPassword } = require('../middleware/adminAuth');
const { verifyValidationRules } = require('../middleware/validators/verificationValidator');
const { validate } = require('../middleware/validate');
const { uploadReference, referenceStatus, verify } = require('../controllers/verification.controller');

router.get('/reference/status', referenceStatus);
router.post('/reference', upload.single('idCard'), requireAdminPassword, uploadReference);
router.post('/', upload.single('idCard'), verifyValidationRules, validate, requireAdminPassword, verify);

module.exports = router;
