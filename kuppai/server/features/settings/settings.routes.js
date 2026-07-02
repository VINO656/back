const router = require('express').Router();
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');
const ctrl = require('./settings.controller');

router.get('/', auth, ctrl.getSettings);
router.put('/', admin, ctrl.updateSettings);

module.exports = router;
