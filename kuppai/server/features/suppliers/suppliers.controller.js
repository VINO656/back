const Model = require('./models/Supplier');
const { sanitizeUpdate } = require('../../utils/sanitize');

exports.getSuppliers = async (req, res, next) => {
  try {
    const q = req.query.unitId ? { unitId: req.query.unitId } : {};
    res.json(await Model.find(q));
  } catch (e) { next(e); }
};

exports.createSupplier = async (req, res, next) => {
  try {
    const cleanData = sanitizeUpdate(req.body);
    const doc = await Model.create({ ...cleanData, createdBy: req.user?.id });
    res.status(201).json(doc);
  } catch (e) { next(e); }
};

exports.updateSupplier = async (req, res, next) => {
  try {
    const cleanData = sanitizeUpdate(req.body);
    const updated = await Model.findByIdAndUpdate(
      req.params.id,
      { ...cleanData, updatedBy: req.user?.id },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: 'Supplier not found' });
    res.json(updated);
  } catch (e) { next(e); }
};

exports.deleteSupplier = async (req, res, next) => {
  try {
    const deleted = await Model.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, message: 'Supplier not found' });
    res.json({ ok: true, message: 'Supplier deleted successfully' });
  } catch (e) { next(e); }
};
