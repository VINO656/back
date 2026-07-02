const r = require('express').Router();
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');
const ctrl = require('./units.controller');

r.get('/', auth, ctrl.getUnits);
r.post('/', admin, ctrl.createUnit);
r.put('/:id', admin, ctrl.updateUnit);

module.exports = r;
