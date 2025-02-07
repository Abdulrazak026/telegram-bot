const { Telegraf, Markup } = require('telegraf');
const express = require('express');
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
  ctx.reply('Welcome! Please choose an option:', Markup.keyboard(buttons).resize());
});

bot.hears('📋 Available Tasks', (ctx) => {
  const userId = ctx.from.id;
  const availableTasks = tasks.getAvailableTasks(userId);
  if (availableTasks.length > 0) {
    const taskButtons = availableTasks.map(task => Markup.button.callback(task.title, `start_task_${task.id}`));
    ctx.reply('Available tasks:', Markup.inlineKeyboard(taskButtons, { columns: 2 }));
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
  ]));
});

bot.action('withdraw', (ctx) => {
  const userId = ctx.from.id;
  ctx.reply('Please enter the amount you want to withdraw:');
  bot.on('text', (ctx) => {
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
    users.requestWithdrawal(userId, amount, method);
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
    ]).resize());
  } else {
    ctx.reply('You are not authorized to use admin commands.');
  }
});

bot.hears('📋 Manage Tasks', (ctx) => {
  const userId = ctx.from.id;
  if (users.isAdmin(userId)) {
    ctx.reply('Manage tasks:', Markup.inlineKeyboard([
      Markup.button.callback('➕ Create Task', 'create_task'),
      Markup.button.callback('✏️ Edit Task', 'edit_task'),
      Markup.button.callback('🗑 Delete Task', 'delete_task')
    ]));
  } else {
    ctx.reply('You are not authorized to manage tasks.');
  }
});

bot.action('create_task', (ctx) => {
  ctx.reply('Enter the task title:');
  bot.on('text', (ctx) => {
    const title = ctx.message.text;
    ctx.reply('Enter the task description:');
    bot.on('text', (ctx) => {
      const description = ctx.message.text;
      ctx.reply('Enter the task reward (starting from 0.1):');
      bot.on('text', (ctx) => {
        const reward = parseFloat(ctx.message.text);
        if (isNaN(reward) || reward < 0.1) {
          ctx.reply('Please enter a valid reward (starting from 0.1)');
          return;
        }
        ctx.reply('Enter the task duration in seconds:');
        bot.on('text', (ctx) => {
          const duration = parseInt(ctx.message.text);
          if (isNaN(duration) || duration <= 0) {
            ctx.reply('Please enter a valid duration (greater than 0)');
            return;
          }
          const task = tasks.createTask(title, description, reward, duration);
          ctx.reply(`✅ Task Created Successfully\n\n*Title:* ${task.title}\n*Description:* ${task.description}\n*Reward:* ${task.reward}\n*Duration:* ${task.duration} seconds`, { parse_mode: 'Markdown' });
        });
      });
    });
  });
});

bot.action('edit_task', (ctx) => {
  const taskList = tasks.getAllTasks();
  if (taskList.length === 0) {
    ctx.reply('No tasks available to edit.');
    return;
  }
  const taskButtons = taskList.map(task => Markup.button.callback(task.title, `select_edit_task_${task.id}`));
  ctx.reply('Select a task to edit:', Markup.inlineKeyboard(taskButtons, { columns: 2 }));
});

bot.action(/select_edit_task_(\d+)/, (ctx) => {
  const taskId = parseInt(ctx.match[1]);
  const task = tasks.getTask(taskId);
  if (!task) {
    ctx.reply('Task not found.');
    return;
  }
  ctx.reply(`Editing task: ${task.title}\nEnter the new title (or send the current title to keep it):`);
  bot.on('text', (ctx) => {
    const newTitle = ctx.message.text;
    ctx.reply('Enter the new description (or send the current description to keep it):');
    bot.on('text', (ctx) => {
      const newDescription = ctx.message.text;
      ctx.reply('Enter the new reward (or send the current reward to keep it):');
      bot.on('text', (ctx) => {
        const newReward = parseFloat(ctx.message.text);
        if (isNaN(newReward) || newReward < 0.1) {
          ctx.reply('Please enter a valid reward (starting from 0.1)');
          return;
        }
        ctx.reply('Enter the new duration in seconds (or send the current duration to keep it):');
        bot.on('text', (ctx) => {
          const newDuration = parseInt(ctx.message.text);
          if (isNaN(newDuration) || newDuration <= 0) {
            ctx.reply('Please enter a valid duration (greater than 0)');
            return;
          }
          const updatedTask = tasks.editTask(taskId, newTitle, newDescription, newReward, newDuration);
          ctx.reply(`✅ Task Updated Successfully\n\n*Title:* ${updatedTask.title}\n*Description:* ${updatedTask.description}\n*Reward:* ${updatedTask.reward}\n*Duration:* ${updatedTask.duration} seconds`, { parse_mode: 'Markdown' });
        });
      });
    });
  });
});

bot.action('delete_task', (ctx) => {
  const taskList = tasks.getAllTasks();
  if (taskList.length === 0) {
    ctx.reply('No tasks available to delete.');
    return;
  }
  const taskButtons = taskList.map(task => Markup.button.callback(task.title, `select_delete_task_${task.id}`));
  ctx.reply('Select a task to delete:', Markup.inlineKeyboard(taskButtons, { columns: 2 }));
});

bot.action(/select_delete_task_(\d+)/, (ctx) => {
  const taskId = parseInt(ctx.match[1]);
  const task = tasks.getTask(taskId);
  if (!task) {
    ctx.reply('Task not found.');
    return;
  }
  tasks.deleteTask(taskId);
  ctx.reply(`🗑 Task "${task.title}" deleted successfully.`);
});

bot.hears('👥 Manage Users', (ctx) => {
  const userId = ctx.from.id;
  if (users.isAdmin(userId)) {
    const userList = users.getAllUsers();
    if (userList.length === 0) {
      ctx.reply('No users available to manage.');
      return;
    }
    const userButtons = userList.map(user => Markup.button.callback(user.id.toString(), `manage_user_${user.id}`));
    ctx.reply('Select a user to manage:', Markup.inlineKeyboard(userButtons, { columns: 2 }));
  } else {
    ctx.reply('You are not authorized to manage users.');
  }
});

bot.action(/manage_user_(\d+)/, (ctx) => {
  const userId = parseInt(ctx.match[1]);
  const user = users.getUser(userId);
  if (!user) {
    ctx.reply('User not found.');
    return;
  }
  ctx.reply(`Managing user: ${user.id}\n\n*Balance:* ${user.balance} points\n\nChoose an action:`, Markup.inlineKeyboard([
    Markup.button.callback('➕ Add Balance', `add_balance_${user.id}`),
    Markup.button.callback('➖ Subtract Balance', `subtract_balance_${user.id}`),
    Markup.button.callback('✉️ Message User', `message_user_${user.id}`)
  ]));
});

bot.action(/add_balance_(\d+)/, (ctx) => {
  const userId = parseInt(ctx.match[1]);
  ctx.reply('Enter the amount to add:');
  bot.on('text', (ctx) => {
    const amount = parseFloat(ctx.message.text);
    if (isNaN(amount) || amount <= 0) {
      ctx.reply('Please enter a valid amount.');
      return;
    }
    const newBalance = users.updateBalance(userId, amount);
    ctx.reply(`✅ User's balance updated. New balance: ${newBalance} points`);
    bot.telegram.sendMessage(userId, `Your balance has been credited by ${amount} points. New balance: ${newBalance} points.`);
  });
});

bot.action(/subtract_balance_(\d+)/, (ctx) => {
  const userId = parseInt(ctx.match[1]);
  ctx.reply('Enter the amount to subtract:');
  bot.on('text', (ctx) => {
    const amount = parseFloat(ctx.message.text);
    if (isNaN(amount) || amount <= 0) {
      ctx.reply('Please enter a valid amount.');
      return;
    }
    const newBalance = users.updateBalance(userId, -amount);
    ctx.reply(`✅ User's balance updated. New balance: ${newBalance} points`);
    bot.telegram.sendMessage(userId, `Your balance has been debited by ${amount} points. New balance: ${newBalance} points.`);
  });
});

bot.action(/message_user_(\d+)/, (ctx) => {
  const userId = parseInt(ctx.match[1]);
  ctx.reply('Enter the message to send:');
  bot.on('text', (ctx) => {
    const message = ctx.message.text;
    bot.telegram.sendMessage(userId, `Admin message: ${message}`);
    ctx.reply('Message sent to user.');
  });
});

bot.hears('💸 Withdrawals', (ctx) => {
  const userId = ctx.from.id;
  if (users.isAdmin(userId)) {
    const pendingWithdrawals = users.getPendingWithdrawals();
    if (pendingWithdrawals.length === 0) {
      ctx.reply('No pending withdrawals.');
      return;
    }
    pendingWithdrawals.forEach(withdrawal => {
      ctx.reply(`Withdrawal request from user ${withdrawal.userId}\nAmount: ${withdrawal.amount}\nMethod: ${withdrawal.method}`, Markup.inlineKeyboard([
        Markup.button.callback('✅ Approve', `approve_withdrawal_${withdrawal.id}`),
        Markup.button.callback('❌ Reject', `reject_withdrawal_${withdrawal.id}`)
      ]));
    });
  } else {
    ctx.reply('You are not authorized to manage withdrawals.');
  }
});

bot.action(/approve_withdrawal_(\d+)/, (ctx) => {
  const withdrawalId = parseInt(ctx.match[1]);
  const withdrawal = users.getWithdrawal(withdrawalId);
  if (withdrawal) {
    users.approveWithdrawal(withdrawalId);
    ctx.reply(`✅ Withdrawal approved for user ${withdrawal.userId}.`);
    bot.telegram.sendMessage(withdrawal.userId, `Your withdrawal request of ${withdrawal.amount} points via ${withdrawal.method} has been approved.`);
  } else {
    ctx.reply('Withdrawal not found.');
  }
});

bot.action(/reject_withdrawal_(\d+)/, (ctx) => {
  const withdrawalId = parseInt(ctx.match[1]);
  ctx.reply('Enter the reason for rejection:');
  bot.on('text', (ctx) => {
    const reason = ctx.message.text;
    const withdrawal = users.getWithdrawal(withdrawalId);
    if (withdrawal) {
      users.rejectWithdrawal(withdrawalId, reason);
      ctx.reply(`❌ Withdrawal rejected for user ${withdrawal.userId}.`);
      bot.telegram.sendMessage(withdrawal.userId, `Your withdrawal request of ${withdrawal.amount} points via ${withdrawal.method} has been rejected. Reason: ${reason}`);
    } else {
      ctx.reply('Withdrawal not found.');
    }
  });
});

bot.hears('📢 Broadcast', (ctx) => {
  const userId = ctx.from.id;
  if (users.isAdmin(userId)) {
    ctx.reply('Please send the message you want to broadcast.');
    bot.on('text', (ctx) => {
      const message = ctx.message.text;
      users.broadcastMessage(`📢 *Announcement*\n\n${message}`);
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

// Keep the bot running by binding to a port
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is running...');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});