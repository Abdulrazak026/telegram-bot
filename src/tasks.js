const users = require('./users');
const { Markup } = require('telegraf');

let tasks = [
  { id: 1, name: 'Task 1', reward: 10 },
  { id: 2, name: 'Task 2', reward: 20 },
];

let activeTasks = {};

const getAvailableTasks = (userId) => {
  return tasks.filter(task => !activeTasks[userId]);
};

const getAllTasks = () => {
  return tasks;
};

const startTask = (userId, taskId, ctx) => {
  const task = tasks.find(t => t.id === parseInt(taskId));
  if (task) {
    activeTasks[userId] = task;
    ctx.reply(`Task "${task.name}" started.`, Markup.inlineKeyboard([Markup.button.callback('Cancel', 'cancel_task')]));
    setTimeout(() => {
      if (activeTasks[userId] && activeTasks[userId].id === task.id) {
        delete activeTasks[userId];
        users.addReward(userId, task.reward);
        ctx.reply(`Task "${task.name}" completed! You've earned ${task.reward} points.`);
      }
    }, 10000); // 10 seconds timer for demonstration
  }
};

const cancelTask = (userId, ctx) => {
  if (activeTasks[userId]) {
    delete activeTasks[userId];
    ctx.reply('Task cancelled.');
  } else {
    ctx.reply('No active task to cancel.');
  }
};

module.exports = {
  getAvailableTasks,
  getAllTasks,
  startTask,
  cancelTask,
};