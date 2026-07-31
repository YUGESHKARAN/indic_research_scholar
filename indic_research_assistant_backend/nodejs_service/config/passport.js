const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const Scholar = require('../models/scholarSchema');
require("dotenv").config()
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
      scope: ['user:email'], // needed even for "public" emails — GitHub won't include email otherwise
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        // profile.emails is populated by passport-github2 via GitHub's /user/emails
        // endpoint when the user:email scope is granted — but can still be empty
        // if the user has no verified email or has it fully hidden.
        const primaryEmail =
          profile.emails?.find((e) => e.primary)?.value || profile.emails?.[0]?.value;

        if (!primaryEmail) {
          // Decision: reject rather than fabricate an email — surfaced to the
          // frontend via `info.reason` so it can show a specific message.
          return done(null, false, {
            reason: 'no_email',
            message:
              'Your GitHub email is private. Please make it public on GitHub, or register with email/password instead.',
          });
        }

        const email = primaryEmail.toLowerCase();

        // Auto-link: match by email regardless of how the account was originally created
        let user = await Scholar.findOne({ email });

        if (user) {
          if (!user.githubId) {
            user.githubId = String(profile.id);
            await user.save();
          }
        } else {
          user = await Scholar.create({
            name: profile.displayName || profile.username || email.split('@')[0],
            email,
            githubId: String(profile.id),
            authProvider: 'github',
          });
        }

        // console.log("user", user)

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

module.exports = passport;