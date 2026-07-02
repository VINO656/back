const Setting = require('./models/Setting');
const { sanitizeUpdate } = require('../../utils/sanitize');

exports.getSettings = async (req, res, next) => {
  try {
    const query = req.query.unitId ? { unitId: req.query.unitId } : {};
    let s = await Setting.findOne(query);
    if (!s) {
      s = await Setting.create(req.query.unitId ? { unitId: req.query.unitId } : {});
    }
    res.json(s);
  } catch (err) { next(err); }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const cleanData = sanitizeUpdate(req.body);
    const query = req.body.unitId ? { unitId: req.body.unitId } : {};
    let s = await Setting.findOne(query);
    if (!s) {
      s = await Setting.create({ ...cleanData, unitId: req.body.unitId });
    } else {
      if (cleanData.cleaningUnitWt && +cleanData.cleaningUnitWt !== +s.cleaningUnitWt) {
        s.history = s.history || [];
        s.history.push({
          date: new Date().toISOString().split('T')[0],
          oldWt: s.cleaningUnitWt,
          newWt: +cleanData.cleaningUnitWt,
          updatedBy: req.user?.username || 'Admin'
        });
      }
      Object.assign(s, cleanData);
      await s.save();
    }
    res.json(s);
  } catch (err) { next(err); }
};
