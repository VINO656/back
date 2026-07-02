const r = require('express').Router();
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');
const ctrl = require('./suppliers.controller');

r.get('/', auth, ctrl.getSuppliers);
r.post('/', admin, ctrl.createSupplier);
r.put('/:id', admin, ctrl.updateSupplier);
r.delete('/:id', admin, ctrl.deleteSupplier);

module.exports = r;
