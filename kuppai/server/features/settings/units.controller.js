const Unit = require('./models/Unit');
const { sanitizeUpdate } = require('../../utils/sanitize');

exports.getUnits = async (req, res, next) => {
  try {
    res.json(await Unit.find());
  } catch (e) { next(e); }
};

exports.createUnit = async (req, res, next) => {
  try {
    const cleanData = sanitizeUpdate(req.body);
    const doc = await Unit.create({ ...cleanData, createdBy: req.user?.id });
    res.status(201).json(doc);
  } catch (e) { next(e); }
};

exports.updateUnit = async (req, res, next) => {
  try {
    const cleanData = sanitizeUpdate(req.body);
    const updated = await Unit.findByIdAndUpdate(
      req.params.id,
      { ...cleanData, updatedBy: req.user?.id },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: 'Unit not found' });
    res.json(updated);
  } catch (e) { next(e); }
};
