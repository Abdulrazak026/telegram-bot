const { Telegraf } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

let supportSessions = {};
let supportMembers = [123456789]; // Replace with actual support member user IDs

const startSupportSession = (userId) => {
  supportSessions[userId] = true;
};

const isUserInSupportSession = (userId) => {
  return supportSessions[userId];
};

const sendMessageToSupport = (userId, message) => {
  supportMembers.forEach(supportId => {
    bot.telegram.sendMessage(supportId, `Support request from user ${userId}: ${message}`);
  });
};

const isSupportMember = (userId) => {
  return supportMembers.includes(userId);
};

const replyToUser = (userId, message) => {
  bot.telegram.sendMessage(userId, `Support reply: ${message}`);
  delete supportSessions[userId];
};

module.exports = {
  startSupportSession,
  isUserInSupportSession,
  sendMessageToSupport,
  isSupportMember,
  replyToUser,
};