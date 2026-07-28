
const Scholar = require('../models/scholarSchema');
const { signToken, cookieOptions } = require('../config/jwt');

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log("register api called", req.body)

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await Scholar.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const user = await Scholar.create({ name, email, password });
    const token = signToken({ id: user._id, email: user.email });

    res.cookie('token', token, cookieOptions);
    return res.status(201).json({ user, token });
  } catch (err) {
    return res.status(500).json({ error: 'Registration failed', details: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("login called", req.body)

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await Scholar.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken({ id: user._id, email: user.email });
    res.cookie('token', token, cookieOptions);

    // toJSON transform strips the password automatically
    return res.status(200).json({ user, token });
  } catch (err) {
    console.log("error", err.message)
    return res.status(500).json({ error: 'Login failed', details: err.message });
  }
};

const logout = (_req, res) => {
  res.clearCookie('token', { ...cookieOptions, maxAge: 0 });
  return res.status(200).json({ message: 'Logged out' });
};

const me = async (req, res) => {
  const user = await Scholar.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.status(200).json({ user });
};

module.exports = { register, login, logout, me };