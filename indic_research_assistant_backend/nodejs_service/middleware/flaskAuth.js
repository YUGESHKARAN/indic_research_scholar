// Guards routes meant to be called by Flask, not by end-user browsers.
// Flask has no user JWT — it authenticates with a shared secret instead.
require('dotenv').config()
const flaskAuth = (req, res, next) => {
  const key = req.headers['x-internal-key'];

  if (!key || key !== process.env.INTERNAL_API_KEY) {
    return res.status(403).json({ error: 'Forbidden: invalid internal service key' });
  }

  next();
};

module.exports = flaskAuth;