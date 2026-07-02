const r = require('express').Router();
const auth = require('../../middleware/auth');
const ctrl = require('./purchases.controller');

r.get('/', auth, ctrl.getPurchases);
r.post('/', auth, ctrl.createPurchase);
r.put('/:id', auth, ctrl.updatePurchase);
r.delete('/:id', auth, ctrl.deletePurchase);

module.exports = r;
