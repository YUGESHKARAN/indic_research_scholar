const express = require('express');
const router = express.Router();
require("dotenv").config();
const passport = require('../config/passport');
const authenticate = require('../middleware/authMiddleware');
const { register, login, logout, sendOTP, resetPassword, me, githubCallback } = require('../controllers/scholar.Controller');

router.post('/register', register);
router.post('/login', login);
router.post("/send-otp",sendOTP);
router.post("/reset-password",resetPassword);
router.post('/logout', logout);
router.get('/me', authenticate, me);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
 
// Step 1: browser is redirected here, GitHub shows its consent screen
router.get('/github', passport.authenticate('github', { session: false }));
 
// Step 2: GitHub redirects back here. Using a custom callback (not
// failureRedirect) so a specific rejection reason (e.g. no public email)
// can be passed to the frontend as a query param, not just a generic failure.
router.get('/github/callback', (req, res, next) => {
  passport.authenticate('github', { session: false }, (err, user, info) => {
    if (err) {
      return res.redirect(`${CLIENT_ORIGIN}/login?error=github_auth_failed`);
    }
    if (!user) {
      const reason = info?.reason || 'github_auth_failed';
      return res.redirect(`${CLIENT_ORIGIN}/login?error=${reason}`);
    }
 
    const token = githubCallback(user);
    res.cookie('token', token, cookieOptions);
    return res.redirect(CLIENT_ORIGIN);
  })(req, res, next);
});
 

module.exports = router;