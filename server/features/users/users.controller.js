const User = require('../auth/models/User');
const mailer = require('../../utils/mailer');
const { sanitizeUpdate } = require('../../utils/sanitize');

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().populate('unitId').select('-password');
    res.json(users);
  } catch (e) { next(e); }
};

exports.createUser = async (req, res, next) => {
  try {
    const cleanData = sanitizeUpdate(req.body);
    const doc = await User.create(cleanData);
    if (doc.email) {
      await mailer.sendMail({
        to: doc.email,
        subject: 'Welcome to Recycle ERP - Account Created',
        text: `Hello ${doc.name},\nYour account (${doc.username}) has been created by Admin. Role: ${doc.role}.`,
        type: 'Onboarding'
      }).catch(err => console.error('[MAIL ERROR]', err));
    }
    const userObj = doc.toObject();
    delete userObj.password;
    res.status(201).json(userObj);
  } catch (e) { next(e); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const upd = sanitizeUpdate(req.body);
    if (!upd.password) delete upd.password;
    const u = await User.findByIdAndUpdate(req.params.id, upd, { new: true, runValidators: true }).select('-password');
    if (!u) return res.status(404).json({ ok: false, message: 'User not found' });
    res.json(u);
  } catch (e) { next(e); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    if (!req.body.password) {
      return res.status(400).json({ ok: false, message: 'New password is required' });
    }
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ ok: false, message: 'User not found' });

    u.password = req.body.password;
    await u.save();

    if (u.email) {
      await mailer.sendMail({
        to: u.email,
        subject: 'Password Reset by Admin',
        text: `Hello ${u.name},\nYour password was reset by Admin on ${new Date().toLocaleString()}.`,
        type: 'PasswordChange'
      }).catch(err => console.error('[MAIL ERROR]', err));
    }
    res.json({ ok: true, message: 'Password reset successfully' });
  } catch (e) { next(e); }
};
