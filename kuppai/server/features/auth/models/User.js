const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const s = new mongoose.Schema({
  name:         { type: String, required: true },
  firstName:    { type: String, default: '' },
  lastName:     { type: String, default: '' },
  unitId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
  username:     { type: String, required: true, unique: true },
  password:     { type: String, required: true },
  email:        { type: String, default: '' },
  phone:        { type: String, default: '' },
  dob:          { type: String, default: '' },
  address:      { type: String, default: '' },
  shortAddress: { type: String, default: '' },
  cityState:    { type: String, default: '' },
  postalCode:   { type: String, default: '' },
  designation:  { type: String, default: '' }, // desg
  role:         { type: String, enum: ['Admin','Employee'], default: 'Employee' },
  isAdmin:      { type: Boolean, default: false },
  managerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status:       { type: String, enum: ['Active','Inactive'], default: 'Active' },
  initials:     { type: String, default: '' },
  img:          { type: String, default: '' },
  bankName:     { type: String, default: '' },
  bankBranch:   { type: String, default: '' },
  bankAcc:      { type: String, default: '' },
  ifsc:         { type: String, default: '' },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

s.pre('save', async function() {
  if (this.isModified('password'))
    this.password = await bcrypt.hash(this.password, 10);
  if (this.role === 'Admin') this.isAdmin = true;
});

s.pre('findOneAndUpdate', async function(next) {
  const update = this.getUpdate();
  if (update && update.password) {
    update.password = await bcrypt.hash(update.password, 10);
  } else if (update && update.$set && update.$set.password) {
    update.$set.password = await bcrypt.hash(update.$set.password, 10);
  }
  next();
});

s.methods.matchPw = function(pw) { return bcrypt.compare(pw, this.password); };

module.exports = mongoose.model('User', s);
