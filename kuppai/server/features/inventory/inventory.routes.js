const r = require('express').Router();
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');
const Inventory = require('./models/Inventory');

r.get('/', auth, async (req, res) => {
  try {
    const q = {};
    if (req.query.unitId)   q.unitId = req.query.unitId;
    if (req.query.category) q.category = req.query.category;

    const limit = Number(req.query.limit) || 500;
    const page = Number(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const totalCount = await Inventory.countDocuments(q);
    const list = await Inventory.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit);

    res.set('X-Total-Count', totalCount);
    res.set('X-Page', page);
    res.set('X-Limit', limit);

    if (req.query.paginated === 'true') {
      return res.json({ data: list, total: totalCount, page, limit, pages: Math.ceil(totalCount / limit) });
    }

    res.json(list);
  } catch(e) { res.status(500).json({message:e.message}); }
});
r.post('/', admin, async (req, res) => {
  try { res.status(201).json(await Inventory.create(req.body)); } catch(e) { res.status(400).json({message:e.message}); }
});
r.put('/:id', admin, async (req, res) => {
  try { res.json(await Inventory.findByIdAndUpdate(req.params.id, req.body, {new:true})); } catch(e) { res.status(400).json({message:e.message}); }
});
r.delete('/:id', admin, async (req, res) => {
  try { await Inventory.findByIdAndDelete(req.params.id); res.json({message:'Deleted'}); } catch(e) { res.status(400).json({message:e.message}); }
});
module.exports = r;
