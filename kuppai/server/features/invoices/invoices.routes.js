const r = require('express').Router();
const auth = require('../../middleware/auth');
const ctrl = require('./invoices.controller');

r.get('/', auth, ctrl.getInvoices);
r.post('/', auth, ctrl.createInvoice);
r.put('/:id/status', auth, ctrl.updateInvoiceStatus);
r.put('/:id', auth, ctrl.updateInvoice);
r.delete('/:id', auth, ctrl.deleteInvoice);

module.exports = r;
