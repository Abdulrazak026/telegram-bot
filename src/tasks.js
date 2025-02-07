const users = require('./users');
const { Markup } = require('telegraf');

let tasks = [
  { id: 1, title: 'Task 1', description: 'Description 1', reward: 10, duration: 60 },
  { id: 2, title: 'Task 2', description: 'Description 2', reward: 20, duration: 120 },
];

let activeTasks = {};

const getAvailableTasks = (userId) => {
  return tasks.filter(task => !activeTasks[userId]);
};

const getAllTasks = () => {
  return tasks;
};

const getTask = (taskId) => {
  return tasks.find(t => t.id === taskId);
};

const createTask = (title, description, reward, duration) => {
  const newTask = { id: tasks.length + 1, title, description, reward, duration };
  tasks.push(newTask);
  return newTask;
};

const editTask = (taskId, title, description, reward, duration) => {
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    task.title = title;
    task.description = description;
    task.reward = reward;
    task.duration = duration;
  }
  return task;
};

const deleteTask = (taskId) => {
  tasks = tasks.filter(t => t.id !== taskId);
};

const startTask = (userId, taskId, ctx) => {
  const task = tasks.find(t => t.id === parseInt(taskId));
  if (task) {
    activeTasks[userId] = task;
    ctx.reply(`Task "${task.title}" started.`, Markup.inlineKeyboard([Markup.button.callback('Cancel', 'cancel_task')]));
    setTimeout(() => {
      if (activeTasks[userId] && activeTasks[userId].id === task.id) {
        delete activeTasks[userId];
        users.addReward(userId, task.reward);
        ctx.reply(`Task "${task.title}" completed! You've earned ${task.reward} points.`);
      }
    }, task.duration * 1000); // Task duration in seconds
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
  getTask,
  createTask,
  editTask,
  deleteTask,
  startTask,
  cancelTask,
};