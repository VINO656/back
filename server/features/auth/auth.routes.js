const router = require('express').Router();
const auth = require('../../middleware/auth');
const ctrl = require('./auth.controller');

router.post('/login', ctrl.login);
router.post('/register', ctrl.register);
router.get('/me', auth, ctrl.getMe);
router.post('/change-password', auth, ctrl.changePassword);
router.put('/profile', auth, ctrl.updateProfile);

module.exports = router;
