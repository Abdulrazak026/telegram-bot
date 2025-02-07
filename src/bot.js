const { Telegraf } = require('telegraf');
const config = require('./config');
const express = require('express');

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

// Command to fetch the latest commits
bot.command('commits', async (ctx) => {
  console.log('Received /commits command');
  try {
    const fetch = (await import('node-fetch')).default;
    console.log('Fetching commits from GitHub repository:', config.githubRepo);
    const response = await fetch(`https://api.github.com/repos/${config.githubRepo}/commits`, {
      headers: {
        Authorization: `Bearer ${config.githubToken}`,
      },
    });
    console.log('GitHub API response status:', response.status);
    if (!response.ok) throw new Error(`Failed to fetch commits: ${response.statusText}`);
    const commits = await response.json();
    const commitMessages = commits.slice(0, 5).map(commit => commit.commit.message).join('\n');
    console.log('Fetched commits:', commitMessages);
    ctx.reply(`Latest commits:\n${commitMessages}`);
  } catch (error) {
    console.error('Error fetching commits:', error);
    ctx.reply('Failed to fetch commits.');
  }
});

// Express app to handle webhook
const app = express();
app.use(bot.webhookCallback('/secret-path'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Set webhook
bot.telegram.setWebhook(`https://yourdomain.com/secret-path`).then(() => {
  console.log('Webhook set successfully');
});