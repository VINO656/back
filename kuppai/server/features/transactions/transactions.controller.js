const Model = require('./models/Transaction');
const { sanitizeUpdate } = require('../../utils/sanitize');

exports.getTransactions = async (req, res, next) => {
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
        pages: Math.ceil(totalCount / limit) || 1
      });
    }

    res.json(results);
  } catch (e) { next(e); }
};

exports.createTransaction = async (req, res, next) => {
  try {
    const payload = { ...req.body, createdBy: req.user?.id };
    res.status(201).json(await Model.create(payload));
  } catch (e) { next(e); }
};

exports.updateTransaction = async (req, res, next) => {
  try {
    const cleanData = sanitizeUpdate(req.body);
    const payload = { ...cleanData, updatedBy: req.user?.id };
    const updated = await Model.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ ok: false, message: 'Transaction not found' });
    res.json(updated);
  } catch (e) { next(e); }
};

exports.deleteTransaction = async (req, res, next) => {
  try {
    const deleted = await Model.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, message: 'Transaction not found' });
    res.json({ ok: true, message: 'Transaction deleted successfully' });
  } catch (e) { next(e); }
};
