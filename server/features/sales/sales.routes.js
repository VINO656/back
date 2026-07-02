const r = require('express').Router();
const auth = require('../../middleware/auth');
const ctrl = require('./sales.controller');

r.get('/', auth, ctrl.getSales);
r.post('/', auth, ctrl.createSale);
r.post('/return', auth, ctrl.processReturn);
r.put('/:id', auth, ctrl.updateSale);
r.delete('/:id', auth, ctrl.deleteSale);

module.exports = r;
