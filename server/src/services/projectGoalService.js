const { query } = require('../config/db');

async function countUserProjects(userId) {
  const result = await query('SELECT COUNT(*) AS count FROM projects WHERE user_id = $1', [userId]);
  return parseInt(result.rows[0].count, 10);
}

module.exports = {
  countUserProjects,
};
