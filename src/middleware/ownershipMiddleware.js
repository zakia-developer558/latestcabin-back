import Cabin from '../models/Cabin.js';

export const assertCabinOwner = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const cabin = await Cabin.findOne({ slug });
    if (!cabin) {
      return res.status(404).json({ success: false, message: 'Cabin not found' });
    }
    if (!req.user || String(cabin.owner) !== String(req.user.userId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    req.cabin = cabin;
    return next();
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Ownership check failed' });
  }
};








