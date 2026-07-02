const jwt = require('jsonwebtoken');
const User = require('./models/User');
const mailer = require('../../utils/mailer');
const { sanitizeUpdate } = require('../../utils/sanitize');

const toUserPayload = (user) => ({
  id: user._id,
  name: user.name,
  username: user.username,
  role: user.role,
  unitId: user.unitId,
  initials: user.initials,
  email: user.email,
  status: user.status,
});

const signToken = (user) => jwt.sign(
  { id: user._id, role: user.role, unitId: user.unitId },
  process.env.JWT_SECRET,
  { expiresIn: '12h' }
);

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ ok: false, message: 'Username and password are required' });
    }
    const user = await User.findOne({ username: String(username).trim().toLowerCase(), status: 'Active' });
    if (!user || !(await user.matchPw(password))) {
      return res.status(401).json({ ok: false, message: 'Invalid credentials or account deactivated' });
    }
    const token = signToken(user);
    res.json({ ok: true, token, user: toUserPayload(user) });
  } catch (e) { next(e); }
};

exports.register = (req, res) => {
  res.status(403).json({ ok: false, message: 'Public self-registration is disabled. Please contact your Admin for account creation.' });
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });
    res.json({ ok: true, user: toUserPayload(user) });
  } catch (e) { next(e); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ ok: false, message: 'Current password and new password are required' });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

    if (!(await user.matchPw(currentPassword))) {
      return res.status(400).json({ ok: false, message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();

    if (user.email) {
      await mailer.sendMail({
        to: user.email,
        subject: 'Security Alert: Password Changed',
        text: `Hello ${user.name},\nYour ERP account password was successfully updated on ${new Date().toLocaleString()}.`,
        type: 'PasswordChange'
      }).catch(err => console.error('[MAIL ERROR]', err));
    }

    res.json({ ok: true, message: 'Password updated successfully' });
  } catch (e) { next(e); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const cleanUpdate = sanitizeUpdate(req.body, ['password', 'role', 'username', 'status']);
    const user = await User.findByIdAndUpdate(req.user.id, cleanUpdate, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });
    res.json({ ok: true, user: toUserPayload(user) });
  } catch (e) { next(e); }
};
