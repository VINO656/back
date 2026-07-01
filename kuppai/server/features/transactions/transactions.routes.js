const r = require('express').Router();
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');
const Model = require('./models/Transaction');

r.get('/', auth, async (req, res) => {
  try {
    const q = {};
    if (req.query.unitId) q.unitId = req.query.unitId;
    if (req.query.transactionType) q.transactionType = req.query.transactionType;
    if (req.query.flowType) q.flowType = req.query.flowType;
    if (req.query.refModule) q.refModule = req.query.refModule;

    const limit = Number(req.query.limit) || 500;
    const page = Number(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const totalCount = await Model.countDocuments(q);
    const results = await Model.find(q).sort({ transactionDate: -1, createdAt: -1 }).skip(skip).limit(limit);

    res.set('X-Total-Count', totalCount);
    res.set('X-Page', page);
    res.set('X-Limit', limit);

    if (req.query.paginated === 'true') {
      return res.json({
        data: results,
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      });
    }

    res.json(results);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

r.post('/', auth, async (req, res) => {
  try {
    const payload = { ...req.body, createdBy: req.user.id };
    res.status(201).json(await Model.create(payload));
  } catch (e) { res.status(400).json({ message: e.message }); }
});

r.put('/:id', admin, async (req, res) => {
  try {
    const payload = { ...req.body, updatedBy: req.user.id };
    res.json(await Model.findByIdAndUpdate(req.params.id, payload, { new: true }));
  } catch (e) { res.status(400).json({ message: e.message }); }
});

r.delete('/:id', admin, async (req, res) => {
  try {
    await Model.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

module.exports = r;
