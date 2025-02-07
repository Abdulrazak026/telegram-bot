let users = {};
let admins = [673973285]; // Replace with actual admin user IDs

const addUser = (userId) => {
  if (!users[userId]) {
    users[userId] = { balance: 0, withdrawals: [] };
  }
};

const getBalance = (userId) => {
  return users[userId] ? users[userId].balance : 0;
};

const addReward = (userId, amount) => {
  if (users[userId]) {
    users[userId].balance += amount;
  }
};

const withdraw = (userId, amount, method) => {
  if (users[userId] && users[userId].balance >= amount) {
    users[userId].balance -= amount;
    users[userId].withdrawals.push({ amount, method, date: new Date().toISOString() });
  }
};

const editBalance = (userId, amount) => {
  if (users[userId]) {
    users[userId].balance = amount;
  }
};

const isAdmin = (userId) => {
  return admins.includes(userId);
};

const broadcastMessage = (message) => {
  Object.keys(users).forEach(userId => {
    bot.telegram.sendMessage(userId, message);
  });
};

module.exports = {
  addUser,
  getBalance,
  addReward,
  withdraw,
  editBalance,
  isAdmin,
  broadcastMessage,
};