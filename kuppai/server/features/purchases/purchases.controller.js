const Purchase = require('./models/Purchase');
const Inventory = require('../inventory/models/Inventory');
const { sanitizeUpdate } = require('../../utils/sanitize');

exports.getPurchases = async (req, res, next) => {
  try {
    const q = req.query.unitId ? { unitId: req.query.unitId } : {};
    res.json(await Purchase.find(q).sort({ createdAt: -1 }));
  } catch (e) { next(e); }
};

exports.createPurchase = async (req, res, next) => {
  try {
    const cleanData = sanitizeUpdate(req.body);
    const last = await Purchase.findOne().sort({ _id: -1 });
    let num = (await Purchase.countDocuments()) + 1;
    if (last && last.purId) {
      const m = last.purId.match(/\d+$/);
      if (m) num = Math.max(num, parseInt(m[0], 10) + 1);
    }
    const purId = 'PUR-' + String(num).padStart(3, '0');
    const data = { ...cleanData, purId, outstanding: cleanData.outstanding !== undefined ? cleanData.outstanding : cleanData.totalAmt };

    // If it's a trading purchase, we don't need cleaning.
    if (data.purchaseType === 'Trading') {
      data.cleanStatus = 'Done'; // No cleaning needed
    }

    const doc = await Purchase.create({ ...data, createdBy: req.user?.id });

    if (data.items && data.items.length > 0) {
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const invCount = await Inventory.countDocuments();
        const batchId = 'BAT-' + String(invCount + 1).padStart(4, '0');
        const isTrading = data.purchaseType === 'Trading';

        await Inventory.create({
          batchId,
          unitId: doc.unitId,
          category: isTrading ? 'finished' : 'raw',
          material: item.material,
          quality: isTrading ? 'Trading' : 'Raw Scrap',
          hsn: item.hsn || '',
          rate: +item.rate || 0,
          gstRate: +(item.gstRate || doc.taxRate || 18),
          taxAmt: Math.round(((+item.netWt || 0) * (+item.rate || 0) * (+item.gstRate || doc.taxRate || 18)) / 100),
          totalAmt: ((+item.netWt || 0) * (+item.rate || 0)) + Math.round(((+item.netWt || 0) * (+item.rate || 0) * (+item.gstRate || doc.taxRate || 18)) / 100),
          sourceRef: doc.purId,
          sourceType: 'Purchase',
          createdDate: doc.date,
          createdWt: item.netWt,
          ledger: [{ date: doc.date, type: 'IN', qty: item.netWt, note: `${data.purchaseType || 'Raw'} Purchase` }],
          createdBy: req.user?.id
        });
      }
    }

    res.status(201).json(doc);
  } catch (e) { next(e); }
};

exports.updatePurchase = async (req, res, next) => {
  try {
    const cleanData = sanitizeUpdate(req.body);
    const updated = await Purchase.findByIdAndUpdate(
      req.params.id,
      { ...cleanData, updatedBy: req.user?.id },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: 'Purchase record not found' });
    res.json(updated);
  } catch (e) { next(e); }
};

exports.deletePurchase = async (req, res, next) => {
  try {
    const deleted = await Purchase.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, message: 'Purchase record not found' });
    res.json({ ok: true, message: 'Purchase record deleted successfully' });
  } catch (e) { next(e); }
};
