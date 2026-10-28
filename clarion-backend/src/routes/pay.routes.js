const express = require('express');
const router = express.Router();
const c = require('../controllers/pay.controller');
const { attachCustomer, enforceAuth, bindCustomer } = require('../middleware/customerAuth');

const authed = [attachCustomer, enforceAuth, bindCustomer];

router.post('/pay', ...authed, c.payNow);
router.get('/wallet', ...authed, c.myWallet);
router.get('/wallet/ledger', ...authed, c.ledger);
router.post('/qr/parse', ...authed, c.parseQr);
router.get('/payee/lookup', ...authed, c.lookupPayee);
router.get('/merchants', c.merchants);
router.post('/refunds/:id/settle', ...authed, c.settleRefund);

const svc = require('../controllers/service.controller');
router.post('/pay/service', ...authed, svc.payService);
router.post('/wallet/topup', ...authed, svc.topUp);

module.exports = router;
