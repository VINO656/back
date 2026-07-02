const Sale = require('./models/Sale');
const Inventory = require('../inventory/models/Inventory');
const Client = require('../clients/models/Client');
const Purchase = require('../purchases/models/Purchase');
const { sanitizeUpdate } = require('../../utils/sanitize');

exports.getSales = async (req, res, next) => {
  try {
    const q = req.query.unitId ? { unitId: req.query.unitId } : {};
    res.json(await Sale.find(q).populate('clientId').sort({ createdAt: -1 }));
  } catch (e) { next(e); }
};

exports.createSale = async (req, res, next) => {
  try {
    const cleanBody = sanitizeUpdate(req.body);
    const last = await Sale.findOne().sort({ _id: -1 });
    let num = (await Sale.countDocuments()) + 1;
    if (last && last.saleId) {
      const m = last.saleId.match(/\d+$/);
      if (m) num = Math.max(num, parseInt(m[0], 10) + 1);
    }
    const saleId = 'SALE-' + String(num).padStart(4, '0');

    // Prepare items with costRate and profit
    const processedItems = [];
    let totalProfit = 0;

    if (cleanBody.items && Array.isArray(cleanBody.items)) {
      for (const item of cleanBody.items) {
        let costRate = 0;
        if (item.inventoryId) {
          const inv = await Inventory.findById(item.inventoryId);
          if (inv) {
            if (inv.sourceType === 'Purchase' && inv.sourceRef) {
              const p = await Purchase.findOne({ purId: inv.sourceRef });
              if (p && Array.isArray(p.items)) {
                const pItem = p.items.find(x => x.material === inv.material);
                if (pItem) costRate = pItem.rate || 0;
              }
            }

            item.costRate = costRate;
            item.profit = ((+item.rate || 0) - costRate) * (+item.qty || 0);
            totalProfit += item.profit;

            inv.soldWt += (+item.qty || 0);
            inv.ledger = inv.ledger || [];
            inv.ledger.push({
              date: cleanBody.date,
              type: 'OUT',
              qty: +item.qty || 0,
              note: `Sale ${saleId}`
            });

            if (inv.soldWt >= inv.createdWt) {
              inv.status = 'Sold';
            } else if (inv.soldWt > 0) {
              inv.status = 'Partial';
            }
            await inv.save();
          }
        }
        processedItems.push(item);
      }
    }

    const doc = await Sale.create({
      ...cleanBody,
      saleId,
      items: processedItems,
      outstanding: cleanBody.outstanding !== undefined ? cleanBody.outstanding : cleanBody.totalAmt,
      createdBy: req.user?.id
    });

    if (cleanBody.clientId) {
      const client = await Client.findById(cleanBody.clientId);
      if (client) {
        const out = cleanBody.outstanding !== undefined ? +cleanBody.outstanding : +cleanBody.totalAmt;
        client.outstanding += (out || 0);
        client.txns = client.txns || [];
        client.txns.push({
          date: cleanBody.date,
          desc: `Sale ${saleId}`,
          dr: +cleanBody.totalAmt || 0,
          cr: +cleanBody.paidAmt || 0
        });
        await client.save();
      }
    }

    res.status(201).json(doc);
  } catch (e) { next(e); }
};

exports.processReturn = async (req, res, next) => {
  try {
    const { saleId, returnWt, isDamaged, date, note } = req.body;
    if (!saleId) return res.status(400).json({ ok: false, message: 'Sale ID is required for returns' });

    const sale = await Sale.findById(saleId);
    if (!sale) return res.status(404).json({ ok: false, message: 'Sale not found' });

    const wt = Number(returnWt);
    if (wt <= 0 || ((sale.returnedWt || 0) + wt) > sale.totalQty) {
      return res.status(400).json({ ok: false, message: 'Invalid return quantity exceeding sold amount' });
    }

    const ratePerKg = sale.totalQty > 0 ? (sale.totalAmt / sale.totalQty) : 0;
    const refundAmt = Math.round(wt * ratePerKg);

    const invCount = await Inventory.countDocuments();
    const batchId = 'BAT-' + String(invCount + 1).padStart(4, '0');

    await Inventory.create({
      batchId,
      unitId: sale.unitId,
      category: isDamaged ? 'returned' : 'finished',
      material: sale.items?.[0]?.material || 'Returned Material',
      quality: isDamaged ? 'Damaged Scrap' : 'Client Return Stock',
      rate: ratePerKg,
      totalAmt: refundAmt,
      sourceRef: sale.saleId,
      sourceType: 'SalesReturn',
      createdDate: date || new Date().toISOString().split('T')[0],
      createdWt: wt,
      ledger: [{ date: date || new Date().toISOString().split('T')[0], type: 'IN', qty: wt, note: `Return from ${sale.saleId}` }],
      createdBy: req.user?.id
    });

    sale.returnedWt = (sale.returnedWt || 0) + wt;
    sale.returnLog = sale.returnLog || [];
    sale.returnLog.push({ date: date || new Date().toISOString().split('T')[0], wt, isDamaged: !!isDamaged, note });
    sale.outstanding = Math.max(0, (sale.outstanding || 0) - refundAmt);
    await sale.save();

    if (sale.clientId) {
      const client = await Client.findById(sale.clientId);
      if (client) {
        client.outstanding = Math.max(0, (client.outstanding || 0) - refundAmt);
        client.txns = client.txns || [];
        client.txns.push({
          date: date || new Date().toISOString().split('T')[0],
          desc: `Sales Return (${sale.saleId})`,
          dr: 0,
          cr: refundAmt
        });
        await client.save();
      }
    }

    res.json({ ok: true, message: 'Sales return processed successfully', sale });
  } catch (e) { next(e); }
};

exports.updateSale = async (req, res, next) => {
  try {
    const cleanData = sanitizeUpdate(req.body);
    const doc = await Sale.findByIdAndUpdate(
      req.params.id,
      { ...cleanData, updatedBy: req.user?.id },
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ ok: false, message: 'Sale record not found' });

    if (doc.invoiceRef) {
      const Invoice = require('../invoices/models/Invoice');
      await Invoice.findOneAndUpdate({ invoiceId: doc.invoiceRef }, {
        paidAmt: doc.paidAmt,
        outstanding: doc.outstanding,
        payStatus: doc.payStatus,
        payLog: doc.payLog
      });
    }
    res.json(doc);
  } catch (e) { next(e); }
};

exports.deleteSale = async (req, res, next) => {
  try {
    const deleted = await Sale.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, message: 'Sale record not found' });
    res.json({ ok: true, message: 'Sale record deleted successfully' });
  } catch (e) { next(e); }
};
