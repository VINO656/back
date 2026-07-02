const r = require('express').Router();
const auth = require('../../middleware/auth');
const ctrl = require('./cleaning.controller');

r.get('/', auth, ctrl.getCleaningJobs);
r.post('/', auth, ctrl.createCleaningJob);
r.put('/:id', auth, ctrl.updateCleaningJob);
r.delete('/:id', auth, ctrl.deleteCleaningJob);

module.exports = r;
