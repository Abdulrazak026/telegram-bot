const { Telegraf, Markup } = require('telegraf');
const tasks = require('./tasks');
const users = require('./users');
const support = require('./support');
require('dotenv').config();

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

// User commands
bot.start((ctx) => {
  const userId = ctx.from.id;
  users.addUser(userId);
  ctx.reply('Welcome! Use /wallet to check your balance, /tasks to view available tasks, /withdraw to withdraw your balance, or /support to contact support.');
});

bot.command('wallet', (ctx) => {
  const userId = ctx.from.id;
  const balance = users.getBalance(userId);
  ctx.reply(`Your wallet balance is: ${balance} points.`);
});

bot.command('withdraw', (ctx) => {
  ctx.reply('Choose your withdrawal method:', Markup.inlineKeyboard([
    Markup.button.callback('Gift card', 'withdraw_giftcard'),
    Markup.button.callback('Crypto', 'withdraw_crypto'),
    Markup.button.callback('PayPal', 'withdraw_paypal'),
    Markup.button.callback('Bank transfer', 'withdraw_bank'),
  ]));
});

bot.action(/withdraw_(.+)/, (ctx) => {
  const method = ctx.match[1];
  const userId = ctx.from.id;
  const balance = users.getBalance(userId);
  if (balance > 0) {
    users.withdraw(userId, balance, method);
    ctx.reply(`Withdrawal of ${balance} points requested via ${method}.`);
  } else {
    ctx.reply('Insufficient balance for withdrawal.');
  }
});

bot.command('tasks', (ctx) => {
  const userId = ctx.from.id;
  const availableTasks = tasks.getAvailableTasks(userId);
  if (availableTasks.length > 0) {
    const taskButtons = availableTasks.map(task => Markup.button.callback(task.name, `start_task_${task.id}`));
    ctx.reply('Available tasks:', Markup.inlineKeyboard(taskButtons));
  } else {
    ctx.reply('No available tasks at the moment.');
  }
});

bot.command('support', (ctx) => {
  ctx.reply('Please describe your issue and our support team will get back to you.');
  support.startSupportSession(ctx.from.id);
});

// Admin commands
bot.command('admin', (ctx) => {
  const userId = ctx.from.id;
  if (users.isAdmin(userId)) {
    ctx.reply('Welcome Admin! Use /manage_tasks to manage tasks or /manage_users to manage users.');
  } else {
    ctx.reply('You are not authorized to use admin commands.');
  }
});

bot.command('manage_tasks', (ctx) => {
  const userId = ctx.from.id;
  if (users.isAdmin(userId)) {
    const taskButtons = tasks.getAllTasks().map(task => Markup.button.callback(task.name, `edit_task_${task.id}`));
    ctx.reply('Manage tasks:', Markup.inlineKeyboard(taskButtons));
  } else {
    ctx.reply('You are not authorized to manage tasks.');
  }
});

bot.command('manage_users', (ctx) => {
  const userId = ctx.from.id;
  if (users.isAdmin(userId)) {
    ctx.reply('Use /edit_balance user_id amount to edit user balance.');
  } else {
    ctx.reply('You are not authorized to manage users.');
  }
});

bot.command('edit_balance', (ctx) => {
  const userId = ctx.from.id;
  if (users.isAdmin(userId)) {
    const [command, userIdToEdit, amount] = ctx.message.text.split(' ');
    users.editBalance(userIdToEdit, parseInt(amount));
    ctx.reply(`User ${userIdToEdit} balance updated to ${amount} points.`);
  } else {
    ctx.reply('You are not authorized to edit user balances.');
  }
});

// Task and support handlers
bot.action(/start_task_(\d+)/, (ctx) => {
  const taskId = ctx.match[1];
  const userId = ctx.from.id;
  tasks.startTask(userId, taskId, ctx);
});

bot.action(/cancel_task/, (ctx) => {
  const userId = ctx.from.id;
  tasks.cancelTask(userId, ctx);
});

// Support message handler
bot.on('text', (ctx) => {
  const userId = ctx.from.id;
  if (support.isUserInSupportSession(userId)) {
    support.sendMessageToSupport(userId, ctx.message.text);
    ctx.reply('Your message has been sent to support.');
  } else if (support.isSupportMember(userId)) {
    const [command, userIdToReply, ...messageParts] = ctx.message.text.split(' ');
    const message = messageParts.join(' ');
    support.replyToUser(userIdToReply, message);
    ctx.reply(`Reply sent to user ${userIdToReply}.`);
  }
});

bot.launch();
console.log('Bot is running...');