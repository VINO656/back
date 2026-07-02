const Model = require('./models/Client');
const { sanitizeUpdate } = require('../../utils/sanitize');

exports.getClients = async (req, res, next) => {
  try {
    const q = req.query.unitId ? { unitId: req.query.unitId } : {};
    const clients = await Model.find(q);
    res.json(clients);
  } catch (e) { next(e); }
};

exports.createClient = async (req, res, next) => {
  try {
    const cleanData = sanitizeUpdate(req.body);
    const doc = await Model.create({ ...cleanData, createdBy: req.user?.id });
    res.status(201).json(doc);
  } catch (e) { next(e); }
};

exports.updateClient = async (req, res, next) => {
  try {
    const cleanData = sanitizeUpdate(req.body);
    const updated = await Model.findByIdAndUpdate(
      req.params.id,
      { ...cleanData, updatedBy: req.user?.id },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: 'Client record not found' });
    res.json(updated);
  } catch (e) { next(e); }
};

exports.deleteClient = async (req, res, next) => {
  try {
    const deleted = await Model.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, message: 'Client record not found' });
    res.json({ ok: true, message: 'Client record deleted successfully' });
  } catch (e) { next(e); }
};
