const { query } = require('../config/db');

const ONBOARDING_GOALS = [
  { key: 'create_first_project', label: 'Create your first project', description: 'Start by creating a new project from the dashboard.', icon: 'folder_open' },
  { key: 'add_first_node', label: 'Add your first node', description: 'Open the editor and add a character, location, or event.', icon: 'add_circle' },
  { key: 'connect_nodes', label: 'Connect two nodes', description: 'Draw an edge between nodes to build relationships.', icon: 'timeline' },
  { key: 'follow_architect', label: 'Follow another architect', description: 'Explore the community and follow someone inspiring.', icon: 'person_add' },
  { key: 'complete_challenge', label: 'Complete a writing prompt', description: 'Accept a challenge and turn it into a project.', icon: 'auto_awesome' },
  { key: 'share_project', label: 'Share your first universe', description: 'Set a project public so others can discover it.', icon: 'public' },
];

async function getGoalsForUser(userId) {
  const result = await query('SELECT * FROM user_goals WHERE user_id = $1 ORDER BY created_at ASC', [userId]);
  const rows = result.rows;

  const byKey = new Map();
  for (const row of rows) {
    byKey.set(row.goal_key, row);
  }

  return ONBOARDING_GOALS.map((goal) => {
    const record = byKey.get(goal.key);
    return {
      ...goal,
      completed: record ? record.completed : false,
      completed_at: record ? record.completed_at : null,
    };
  });
}

async function markGoalCompleted(userId, goalKey) {
  const result = await query(
    `INSERT INTO user_goals (user_id, goal_key, completed, completed_at)
     VALUES ($1, $2, TRUE, NOW())
     ON CONFLICT (user_id, goal_key)
     DO UPDATE SET completed = TRUE, completed_at = NOW(), updated_at = NOW()
     RETURNING *`,
    [userId, goalKey]
  );
  return result.rows[0];
}

module.exports = {
  ONBOARDING_GOALS,
  getGoalsForUser,
  markGoalCompleted,
};
