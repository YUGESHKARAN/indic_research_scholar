// const jwt = require('jsonwebtoken');
// require("dotenv").config()

// const JWT_SECRET = process.env.JWT_SECRET;
// const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

// if (!JWT_SECRET) {
//   throw new Error('JWT_SECRET is not set in environment variables');
// }

// const signToken = (payload) => {
//   return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
// };

// const verifyToken = (token) => {
//   return jwt.verify(token, JWT_SECRET);
// };

// // httpOnly cookie — 7 days to match default token expiry, adjust together if you change JWT_EXPIRES_IN
// const cookieOptions = {
//   httpOnly: true,
//   secure: process.env.NODE_ENV === 'production',
//   sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
//   maxAge: 7 * 24 * 60 * 60 * 1000,
// };

// module.exports = { signToken, verifyToken, cookieOptions };

const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in environment variables');
}

const signToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

const isProduction = process.env.NODE_ENV === 'production';

// const cookieOptions = {
//   httpOnly: true,
//   secure: isProduction,              // HTTPS only in production
//   sameSite: isProduction ? 'none' : 'lax', // Required for cross-origin cookies
//   path: '/',
//   maxAge: 7 * 24 * 60 * 60 * 1000,
// };
// config/jwt.js

// const cookieOptions = {
//   httpOnly: true,
//   secure: process.env.NODE_ENV === 'production',
//   sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
//   maxAge: 7 * 24 * 60 * 60 * 1000,
// };

const cookieOptions = {
  httpOnly: true,
  secure: true,        // required for sameSite: 'none' — must always be true in production over HTTPS
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const COOKIE_NAME = 'indic_research_token'; // was 'token' — too generic for local dev with multiple projects


module.exports = {
  signToken,
  verifyToken,
  cookieOptions,
  COOKIE_NAME
};