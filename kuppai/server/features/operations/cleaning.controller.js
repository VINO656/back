const CleaningJob = require('./models/CleaningJob');
const Inventory = require('../inventory/models/Inventory');
const { sanitizeUpdate } = require('../../utils/sanitize');

exports.getCleaningJobs = async (req, res, next) => {
  try {
    const q = req.query.unitId ? { unitId: req.query.unitId } : {};
    res.json(await CleaningJob.find(q).sort({ createdAt: -1 }));
  } catch (e) { next(e); }
};

exports.createCleaningJob = async (req, res, next) => {
  try {
    const cleanBody = sanitizeUpdate(req.body);
    if (cleanBody.batches && Array.isArray(cleanBody.batches) && cleanBody.batches.length > 0) {
      for (const b of cleanBody.batches) {
        if (!b.material || !+b.inputWt) continue;
        const stocks = await Inventory.find({
          unitId: cleanBody.unitId,
          category: 'raw',
          material: b.material,
          status: { $in: ['Available', 'Partial'] }
        });
        const totalAvail = stocks.reduce((acc, s) => acc + (s.createdWt - (s.soldWt || 0) - (s.returnedWt || 0)), 0);
        if (totalAvail < +b.inputWt) {
          return res.status(400).json({ ok: false, message: `Insufficient raw stock for ${b.material}. Available: ${totalAvail} kg, Requested: ${b.inputWt} kg` });
        }
      }

      for (const b of cleanBody.batches) {
        if (!b.material || !+b.inputWt) continue;
        let rem = +b.inputWt;
        const stocks = await Inventory.find({
          unitId: cleanBody.unitId,
          category: 'raw',
          material: b.material,
          status: { $in: ['Available', 'Partial'] }
        }).sort({ createdAt: 1 });

        for (const s of stocks) {
          if (rem <= 0) break;
          const avail = s.createdWt - (s.soldWt || 0) - (s.returnedWt || 0);
          if (avail <= 0) continue;
          const deduct = Math.min(avail, rem);
          s.soldWt = (s.soldWt || 0) + deduct;
          rem -= deduct;
          if (s.soldWt >= s.createdWt) s.status = 'Consumed';
          else if (s.soldWt > 0) s.status = 'Partial';
          s.ledger = s.ledger || [];
          s.ledger.push({ date: cleanBody.date || new Date().toISOString().slice(0, 10), type: 'OUT', qty: deduct, note: 'Cleaning Job Input' });
          await s.save();
        }
      }
    }

    const last = await CleaningJob.findOne().sort({ _id: -1 });
    let num = (await CleaningJob.countDocuments()) + 1;
    if (last && last.jobId) {
      const m = last.jobId.match(/\d+$/);
      if (m) num = Math.max(num, parseInt(m[0], 10) + 1);
    }
    const jobId = 'CLN-' + String(num).padStart(3, '0');
    const doc = await CleaningJob.create({
      ...cleanBody,
      jobId,
      outstanding: cleanBody.outstanding !== undefined ? cleanBody.outstanding : (cleanBody.labourAmt || 0),
      createdBy: req.user?.id
    });
    res.status(201).json(doc);
  } catch (e) { next(e); }
};

exports.updateCleaningJob = async (req, res, next) => {
  try {
    const cleanData = sanitizeUpdate(req.body);
    const updated = await CleaningJob.findByIdAndUpdate(
      req.params.id,
      { ...cleanData, updatedBy: req.user?.id },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: 'Cleaning job not found' });
    res.json(updated);
  } catch (e) { next(e); }
};

exports.deleteCleaningJob = async (req, res, next) => {
  try {
    const job = await CleaningJob.findById(req.params.id);
    if (job) {
      await Inventory.deleteMany({ sourceRef: job.jobId, sourceType: 'cleaning' });

      if (job.batches && Array.isArray(job.batches) && job.batches.length > 0) {
        for (const b of job.batches) {
          if (!b.material || !+b.inputWt) continue;
          let rem = +b.inputWt;
          const stocks = await Inventory.find({
            unitId: job.unitId,
            category: 'raw',
            material: b.material,
            status: { $in: ['Consumed', 'Partial', 'Sold'] }
          }).sort({ createdAt: -1 });

          for (const s of stocks) {
            if (rem <= 0) break;
            const used = s.soldWt || 0;
            if (used <= 0) continue;
            const restore = Math.min(used, rem);
            s.soldWt -= restore;
            rem -= restore;
            if (s.soldWt <= 0) s.status = 'Available';
            else if (s.soldWt < s.createdWt) s.status = 'Partial';
            s.ledger = s.ledger || [];
            s.ledger.push({ date: new Date().toISOString().slice(0, 10), type: 'IN', qty: restore, note: `Restored from deleted Cleaning Job (${job.jobId})` });
            await s.save();
          }
        }
      }
      await CleaningJob.findByIdAndDelete(req.params.id);
    }
    res.json({ ok: true, message: 'Cleaning job deleted successfully' });
  } catch (e) { next(e); }
};
