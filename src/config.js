require('dotenv').config();

module.exports = {
  telegramToken: process.env.TELEGRAM_TOKEN,
  githubToken: process.env.GITHUB_TOKEN,
  githubRepo: process.env.GITHUB_REPO,
  adminChatId: process.env.ADMIN_CHAT_ID,
};