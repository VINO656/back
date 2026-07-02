const r = require('express').Router();
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');
const ctrl = require('./transactions.controller');

r.get('/', auth, ctrl.getTransactions);
r.post('/', auth, ctrl.createTransaction);
r.put('/:id', admin, ctrl.updateTransaction);
r.delete('/:id', admin, ctrl.deleteTransaction);

module.exports = r;
