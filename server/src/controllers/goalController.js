const goalService = require('../services/goalService');
const projectGoalService = require('../services/projectGoalService');
const followService = require('../services/followService');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const listGoals = asyncHandler(async (req, res) => {
  console.log('Goals: listGoals called for user', req.user.id);
  const goals = await goalService.getGoalsForUser(req.user.id);
  console.log('Goals: listGoals result', goals);
  return res.json(goals);
});

const completeGoal = asyncHandler(async (req, res) => {
  const goal = await goalService.markGoalCompleted(req.user.id, req.params.key);
  if (!goal) {
    return res.status(404).json({ error: 'Goal not found' });
  }
  return res.json(goal);
});

const checkGoals = asyncHandler(async (req, res) => {
  console.log('Goals: checkGoals called for user', req.user.id);
  const userId = req.user.id;
  const updates = {};

  if (!updates['create_first_project']) {
    const projectCount = await projectGoalService.countUserProjects(userId);
    if (projectCount > 0) updates['create_first_project'] = true;
  }

  if (!updates['follow_architect']) {
    const followCount = await followService.countFollows(userId);
    if (followCount > 0) updates['follow_architect'] = true;
  }

  const completed = [];
  for (const [key, shouldComplete] of Object.entries(updates)) {
    if (shouldComplete) {
      await goalService.markGoalCompleted(userId, key);
      completed.push(key);
    }
  }

  const goals = await goalService.getGoalsForUser(userId);
  return res.json({ goals, completed });
});

module.exports = {
  listGoals,
  completeGoal,
  checkGoals,
};
