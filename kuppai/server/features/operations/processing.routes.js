const r = require('express').Router();
const auth = require('../../middleware/auth');
const ctrl = require('./processing.controller');

r.get('/', auth, ctrl.getProcessingJobs);
r.post('/', auth, ctrl.createProcessingJob);
r.post('/efficiency-alert', auth, ctrl.dispatchEfficiencyAlert);
r.put('/:id', auth, ctrl.updateProcessingJob);
r.delete('/:id', auth, ctrl.deleteProcessingJob);

module.exports = r;
