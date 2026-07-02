const r = require('express').Router();
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');
const ctrl = require('./inventory.controller');

r.get('/', auth, ctrl.getInventory);
r.post('/', admin, ctrl.createInventoryItem);
r.put('/:id', admin, ctrl.updateInventoryItem);
r.delete('/:id', admin, ctrl.deleteInventoryItem);

module.exports = r;
