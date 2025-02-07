const { Telegraf } = require('telegraf');
const config = require('./config');

const bot = new Telegraf(config.telegramToken);

// Middleware to check if the user is an admin
bot.use((ctx, next) => {
  if (ctx.from.id.toString() === config.adminChatId) {
    return next();
  } else {
    ctx.reply('You are not authorized to use this bot.');
  }
});

// Command to handle the start
bot.start((ctx) => {
  ctx.reply('Welcome to the GitHub Telegram Bot!');
});

// Command to handle GitHub integration (example)
bot.command('github', (ctx) => {
  ctx.reply('GitHub integration is not yet implemented.');
});

// Launch the bot
bot.launch().then(() => {
  console.log('Bot is running...');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));