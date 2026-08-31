require('dotenv').config();

const bcrypt = require('bcrypt');
const { query } = require('./config/db');

const DEMO_EMAIL = 'demo@storyhub.app';
const NEW_PASSWORD = 'S3cur3L0recraft!2024';
const SALT_ROUNDS = 10;

async function reset() {
  const user = await query('SELECT id FROM users WHERE email = $1', [DEMO_EMAIL]);
  const userId = user.rows[0]?.id;

  if (!userId) {
    console.log('Demo user not found. Nothing to reset.');
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(NEW_PASSWORD, SALT_ROUNDS);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
  console.log(`Password reset for demo user (${userId}).`);
}

reset()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Reset failed:', err);
    process.exit(1);
  });
