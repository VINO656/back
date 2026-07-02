const r = require('express').Router();
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');
const ctrl = require('./clients.controller');

r.get('/', auth, ctrl.getClients);
r.post('/', admin, ctrl.createClient);
r.put('/:id', admin, ctrl.updateClient);
r.delete('/:id', admin, ctrl.deleteClient);

module.exports = r;
