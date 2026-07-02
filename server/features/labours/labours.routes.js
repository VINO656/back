const r = require('express').Router();
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');
const ctrl = require('./labours.controller');

r.get('/', auth, ctrl.getLabours);
r.post('/', admin, ctrl.createLabour);
r.put('/:id', admin, ctrl.updateLabour);
r.delete('/:id', admin, ctrl.deleteLabour);

module.exports = r;
