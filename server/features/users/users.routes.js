const r = require('express').Router();
const admin = require('../../middleware/admin');
const ctrl = require('./users.controller');

r.get('/', admin, ctrl.getUsers);
r.post('/', admin, ctrl.createUser);
r.put('/:id', admin, ctrl.updateUser);
r.patch('/:id/password', admin, ctrl.resetPassword);

module.exports = r;
