// Ensure bot instance is imported correctly
const bot = require('./bot');

let supportSessions = {};
let supportMembers = [Replace]; // Replace with actual support member user IDs

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