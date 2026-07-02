const Inventory = require('./models/Inventory');
const { sanitizeUpdate } = require('../../utils/sanitize');

exports.getInventory = async (req, res, next) => {
  try {
    const q = {};
    if (req.query.unitId) q.unitId = req.query.unitId;
    if (req.query.category) q.category = req.query.category;
    res.json(await Inventory.find(q).sort({ createdAt: -1 }));
  } catch (e) { next(e); }
};

exports.createInventoryItem = async (req, res, next) => {
  try {
    const cleanData = sanitizeUpdate(req.body);
    const doc = await Inventory.create({ ...cleanData, createdBy: req.user?.id });
    res.status(201).json(doc);
  } catch (e) { next(e); }
};

exports.updateInventoryItem = async (req, res, next) => {
  try {
    const cleanData = sanitizeUpdate(req.body);
    const updated = await Inventory.findByIdAndUpdate(
      req.params.id,
      { ...cleanData, updatedBy: req.user?.id },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: 'Inventory item not found' });
    res.json(updated);
  } catch (e) { next(e); }
};

exports.deleteInventoryItem = async (req, res, next) => {
  try {
    const deleted = await Inventory.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, message: 'Inventory item not found' });
    res.json({ ok: true, message: 'Inventory item deleted successfully' });
  } catch (e) { next(e); }
};
