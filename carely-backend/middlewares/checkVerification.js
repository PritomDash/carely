const User = require('../models/user');

module.exports = async (req, res, next) => {
  const { professionalId } = req.body;
  try {
    const professional = await User.findById(professionalId);
    if (!professional || professional.role !== 'professional') {
      return res.status(404).json({ error: 'Professional not found' });
    }
    if (!professional.isVerified) {
      return res.status(403).json({ error: 'Professional is not yet verified by admin' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Verification check failed' });
  }
};
