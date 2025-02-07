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
  const isAdmin = users.isAdmin(userId);
  const buttons = [
    ['📋 Available Tasks', '💼 My Wallet'],
    ['📞 Contact Support']
  ];
  if (isAdmin) {
    buttons.push(['🔧 Admin']);
  }
  ctx.reply('Welcome! Please choose an option:', Markup.keyboard(buttons).resize().extra());
});

bot.hears('📋 Available Tasks', (ctx) => {
  const userId = ctx.from.id;
  const availableTasks = tasks.getAvailableTasks(userId);
  if (availableTasks.length > 0) {
    const taskButtons = availableTasks.map(task => Markup.button.callback(task.name, `start_task_${task.id}`));
    ctx.reply('Available tasks:', Markup.inlineKeyboard(taskButtons));
  } else {
    ctx.reply('No available tasks at the moment.');
  }
});

bot.hears('💼 My Wallet', (ctx) => {
  const userId = ctx.from.id;
  const balance = users.getBalance(userId);
  const message = `💼 *Your Wallet*\n\n*Balance:* ${balance} points\n\nClick the button below to withdraw your balance.`;
  ctx.replyWithMarkdown(message, Markup.inlineKeyboard([
    Markup.button.callback('Withdraw', 'withdraw')
  ]).extra());
});

bot.action('withdraw', (ctx) => {
  const userId = ctx.from.id;
  ctx.reply('Please enter the amount you want to withdraw:');
  bot.once('text', (ctx) => {
    const amount = parseInt(ctx.message.text);
    ctx.reply('Choose your withdrawal method:', Markup.inlineKeyboard([
      Markup.button.callback('Crypto', `withdraw_crypto_${amount}`),
      Markup.button.callback('Bank', `withdraw_bank_${amount}`),
      Markup.button.callback('Gift card', `withdraw_giftcard_${amount}`),
    ]));
  });
});

bot.action(/withdraw_(crypto|bank|giftcard)_(\d+)/, (ctx) => {
  const method = ctx.match[1];
  const amount = parseInt(ctx.match[2]);
  const userId = ctx.from.id;
  const balance = users.getBalance(userId);
  if (balance >= amount) {
    users.withdraw(userId, amount, method);
    ctx.reply(`Withdrawal of ${amount} points requested via ${method}.`);
  } else {
    ctx.reply('Insufficient balance for withdrawal.');
  }
});

bot.hears('📞 Contact Support', (ctx) => {
  ctx.reply('Please describe your issue and our support team will get back to you.');
  support.startSupportSession(ctx.from.id);
});

// Admin commands
bot.hears('🔧 Admin', (ctx) => {
  const userId = ctx.from.id;
  if (users.isAdmin(userId)) {
    ctx.reply('Welcome Admin! Please choose an option:', Markup.keyboard([
      ['📋 Manage Tasks', '👥 Manage Users'],
      ['💸 Withdrawals', '📢 Broadcast']
    ]).resize().extra());
  } else {
    ctx.reply('You are not authorized to use admin commands.');
  }
});

bot.hears('📋 Manage Tasks', (ctx) => {
  const userId = ctx.from.id;
  if (users.isAdmin(userId)) {
    const taskButtons = tasks.getAllTasks().map(task => Markup.button.callback(task.name, `edit_task_${task.id}`));
    ctx.reply('Manage tasks:', Markup.inlineKeyboard(taskButtons));
  } else {
    ctx.reply('You are not authorized to manage tasks.');
  }
});

bot.hears('👥 Manage Users', (ctx) => {
  const userId = ctx.from.id;
  if (users.isAdmin(userId)) {
    ctx.reply('Use /edit_balance user_id amount to edit user balance.');
  } else {
    ctx.reply('You are not authorized to manage users.');
  }
});

bot.hears('💸 Withdrawals', (ctx) => {
  ctx.reply('This feature is not implemented yet.');
});

bot.hears('📢 Broadcast', (ctx) => {
  const userId = ctx.from.id;
  if (users.isAdmin(userId)) {
    ctx.reply('Please send the message you want to broadcast.');
    bot.once('text', (ctx) => {
      const message = ctx.message.text;
      users.broadcastMessage(message);
      ctx.reply('Message broadcasted to all users.');
    });
  } else {
    ctx.reply('You are not authorized to broadcast messages.');
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