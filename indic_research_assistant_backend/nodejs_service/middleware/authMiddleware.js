const { verifyToken } = require('../config/jwt');

const authenticate = (req, res, next) => {
    console.log("Cookies:", req.cookies);
console.log("Headers:", req.headers.cookie);

  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : null;

  const token = req.cookies?.token || bearer;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }


  try {
    const decoded = verifyToken(token);
    req.user = decoded; // { id, email }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authenticate;



