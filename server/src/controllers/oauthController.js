const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GithubStrategy = require('passport-github2').Strategy;
const jwt = require('jsonwebtoken');
const { findUserByEmail, createUser, getUserById } = require('../services/userService');

function issueToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

function serializeUser(user) {
  return { id: user.id, username: user.username, email: user.email };
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await getUserById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  console.log('[OAuth] Registering Google strategy');
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback',
      },
        async (accessToken, refreshToken, profile, done) => {
          try {
            let user = await findUserByEmail(profile.emails[0].value);
            if (!user) {
              const username = profile.displayName?.replace(/\s+/g, '').toLowerCase() || `user_${profile.id}`;
              user = await createUser({
                username,
                email: profile.emails[0].value,
                passwordHash: null,
              });
            }
            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
    )
  );
} else {
  console.warn('[OAuth] Google strategy NOT registered: missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  console.log('[OAuth] Registering GitHub strategy');
  passport.use(
    new GithubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: '/api/auth/github/callback',
        scope: ['user:email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value || `${profile.id}@github.local`;
          let user = await findUserByEmail(email);
          if (!user) {
            const username = profile.username || `user_${profile.id}`;
            user = await createUser({
              username,
              email,
              passwordHash: null,
            });
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
} else {
  console.warn('[OAuth] GitHub strategy NOT registered: missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET');
}

module.exports = { passport, issueToken, serializeUser };
