let users = {};
let admins = [123456789]; // Replace with actual admin user IDs

const addUser = (userId) => {
  if (!users[userId]) {
    users[userId] = { balance: 0 };
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

const withdraw = (userId, amount) => {
  if (users[userId] && users[userId].balance >= amount) {
    users[userId].balance -= amount;
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

module.exports = {
  addUser,
  getBalance,
  addReward,
  withdraw,
  editBalance,
  isAdmin,
};