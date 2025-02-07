const config = require('../config');

class MessageHandler {
    constructor(bot, walletHandler, taskHandler) {
        this.bot = bot;
        this.walletHandler = walletHandler;
        this.taskHandler = taskHandler;
        this.userStates = new Map();
    }

    setUserState(userId, state, data = {}) {
        this.userStates.set(userId.toString(), { state, data });
    }

    getUserState(userId) {
        return this.userStates.get(userId.toString());
    }

    clearUserState(userId) {
        this.userStates.delete(userId.toString());
    }

    async handleMessage(msg) {
        try {
            const chatId = msg.chat.id;
            const text = msg.text;
            const isAdmin = chatId.toString() === config.ADMIN_ID;

            const userState = this.getUserState(chatId);
            if (userState) {
                switch (userState.state) {
                    case 'WITHDRAWING':
                        await this.handleWithdrawalProcess(msg);
                        return;
                    case 'TASK_CREATION':
                        await this.handleTaskCreation(msg);
                        return;
                    case 'TASK_EDITING':
                        await this.handleTaskEditing(msg);
                        return;
                    case 'SUPPORT_MESSAGE':
                        await this.handleSupportMessage(msg);
                        return;
                    case 'ADMIN_REPLYING':
                        await this.handleAdminReplyMessage(msg);
                        return;
                    case 'POSTING_MESSAGE':
                        await this.handleMessageToAllUsers(msg);
                        return;
                    case 'MESSAGING_USER':
                        await this.handleMessageUser(msg);
                        return;
                    case 'EDITING_BALANCE':
                        await this.handleEditBalanceMessage(msg);
                        return;
                    case 'REJECTING_WITHDRAWAL':
                        await this.handleWithdrawalRejectionMessage(msg);
                        return;
                }
            }

            if (isAdmin) {
                switch (text) {
                    case '/start':
                        await this.handleAdminStart(msg);
                        return;
                    case '📋 Task Management':
                        await this.showTaskManagement(chatId);
                        return;
                    case '💰 Manage Wallets':
                        await this.showWalletManagement(chatId);
                        return;
                    case '💰 Manage Withdrawals':
                        await this.showPendingWithdrawals(chatId);
                        return;
                    case '📝 Post Message':
                        await this.handlePostMessage(chatId);
                        return;
                }
            }

            switch (text) {
                case '/start':
                    await this.handleStart(msg);
                    break;
                case '📋 Available Tasks':
                    await this.showAvailableTasks(chatId);
                    break;
                case '👛 My Wallet':
                    await this.showWallet(chatId);
                    break;
                case '📞 Contact Support':
                    await this.showContactSupport(chatId);
                    break;
                default:
                    await this.handleUnknownCommand(msg);
            }
        } catch (error) {
            console.error('Error handling message:', error);
            try {
                await this.bot.sendMessage(msg.chat.id,
                    '❌ An error occurred while processing your request.\n' +
                    'Please try again later.',
                    { parse_mode: 'Markdown' }
                );
            } catch (sendError) {
                console.error('Error sending error message:', sendError);
            }
        }
    }

    async handleStart(msg) {
        const chatId = msg.chat.id;
        const user = msg.from;
        const isAdmin = chatId.toString() === config.ADMIN_ID;

        try {
            let userDoc = await this.walletHandler.getUser(chatId);
            if (!userDoc) {
                userDoc = await this.walletHandler.createUser(chatId, user.first_name);
            }

            if (isAdmin) {
                await this.handleAdminStart(msg);
                return;
            }

            await this.bot.sendMessage(chatId,
                '👋 *Welcome to Task Wallet Bot!*\n\n' +
                'Complete tasks to earn rewards and manage your wallet.\n' +
                'Use the menu below to get started:',
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        keyboard: [
                            ['📋 Available Tasks', '👛 My Wallet'],
                            ['📞 Contact Support']
                        ],
                        resize_keyboard: true
                    }
                }
            );
        } catch (error) {
            console.error('Error in handleStart:', error);
            throw error;
        }
    }

    async handleAdminStart(msg) {
        const chatId = msg.chat.id;
        if (chatId.toString() !== config.ADMIN_ID) {
            throw new Error('Unauthorized access');
        }

        await this.bot.sendMessage(chatId,
            '👋 *Welcome to Admin Panel*\n\n' +
            'Use the menu below to manage tasks, wallets, and withdrawals:',
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: [
                        ['📋 Task Management', '💰 Manage Wallets'],
                        ['💰 Manage Withdrawals', '📝 Post Message']
                    ],
                    resize_keyboard: true
                }
            }
        );
    }

    async showAllTasks(chatId, tasks) {
        const taskList = Object.values(tasks);
        if (taskList.length === 0) {
            await this.bot.sendMessage(chatId,
                '📋 *Task List*\n\nNo tasks available.',
                { parse_mode: 'Markdown' }
            );
            return;
        }

        for (const task of taskList) {
            await this.bot.sendMessage(chatId,
                '📋 *Task Details*\n\n' +
                `Name: ${task.name}\n` +
                `Description: ${task.description}\n` +
                `Reward: *$${task.reward}*\n` +
                `Duration: ${task.duration} seconds\n` +
                `Status: ${task.status}\n` +
                `Completed by: ${task.completedBy.length} users`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🗑 Delete', callback_data: `delete_task_${task.id}` },
                            { text: '✏️ Edit', callback_data: `edit_task_${task.id}` }
                        ]]
                    }
                }
            );
        }
    }

    async showActiveTasks(chatId) {
        const tasks = this.taskHandler.getAllTasks();
        const activeTasks = Object.values(tasks).filter(task => task.status === 'in_progress');

        if (activeTasks.length === 0) {
            await this.bot.sendMessage(chatId,
                '📋 *Active Tasks*\n\nNo active tasks at the moment.',
                { parse_mode: 'Markdown'}
            );
            return;
        }

        for (const task of activeTasks) {
            const user = await this.walletHandler.getUser(task.assignedTo);
            await this.bot.sendMessage(chatId,
                '📋 *Active Task*\n\n' +
                `Name: ${task.name}\n` +
                `Assigned to: ${user ? user.name : 'Unknown'}\n` +
                `Started: ${new Date(task.startTime).toLocaleString()}\n` +
                `Time remaining: ${Math.max(0, Math.floor((task.startTime + task.duration * 1000 - Date.now()) / 1000))} seconds`,
                { parse_mode: 'Markdown' }
            );
        }
    }

    async handleDeleteTask(chatId, taskId) {
        try {
            if (chatId.toString() !== config.ADMIN_ID) {
                throw new Error('Unauthorized access');
            }

            const task = this.taskHandler.getTask(taskId);
            if (!task) {
                throw new Error('Task not found');
            }

            await this.taskHandler.deleteTask(taskId);
            await this.bot.sendMessage(chatId,
                '✅ *Task Deleted Successfully*\n\n' +
                `Name: ${task.name}`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    }

    async handleEditTask(chatId, taskId) {
        try {
            if (chatId.toString() !== config.ADMIN_ID) {
                throw new Error('Unauthorized access');
            }

            const task = this.taskHandler.getTask(taskId);
            if (!task) {
                throw new Error('Task not found');
            }

            this.setUserState(chatId, 'TASK_EDITING', {
                taskId,
                step: 'name',
                currentTask: task
            });

            await this.bot.sendMessage(chatId,
                '✏️ *Edit Task*\n\n' +
                'Current name: ' + task.name + '\n' +
                'Enter new name (or send current name to keep it):',
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        keyboard: [['❌ Cancel']],
                        resize_keyboard: true
                    }
                }
            );
        } catch (error) {
            console.error('Error initiating task edit:', error);
            throw error;
        }
    }

    async handleTaskEditing(msg) {
        const chatId = msg.chat.id;
        const text = msg.text;
        const userState = this.getUserState(chatId);

        if (!userState || !userState.data) {
            return;
        }

        try {
            const { step, taskId, currentTask } = userState.data;

            switch (step) {
                case 'name':
                    userState.data.name = text;
                    userState.data.step = 'description';
                    await this.bot.sendMessage(chatId,
                        '📝 *Edit Task*\n\n' +
                        'Current description: ' + currentTask.description + '\n' +
                        'Enter new description (or send current description to keep it):',
                        {
                            parse_mode: 'Markdown',
                            reply_markup: {
                                keyboard: [['❌ Cancel']],
                                resize_keyboard: true
                            }
                        }
                    );
                    break;

                case 'description':
                    userState.data.description = text;
                    userState.data.step = 'reward';
                    await this.bot.sendMessage(chatId,
                        '📝 *Edit Task*\n\n' +
                        'Current reward: ' + currentTask.reward + ' USD\n' +
                        'Enter new reward amount (or send current reward to keep it):',
                        {
                            parse_mode: 'Markdown',
                            reply_markup: {
                                keyboard: [['❌ Cancel']],
                                resize_keyboard: true
                            }
                        }
                    );
                    break;

                case 'reward':
                    const reward = parseFloat(text);
                    if (isNaN(reward) || reward <= 0) {
                        throw new Error('Please enter a valid reward amount (greater than 0)');
                    }
                    userState.data.reward = reward;
                    userState.data.step = 'duration';
                    await this.bot.sendMessage(chatId,
                        '📝 *Edit Task*\n\n' +
                        'Current duration: ' + currentTask.duration + ' seconds\n' +
                        'Enter new duration in seconds (or send current duration to keep it):',
                        {
                            parse_mode: 'Markdown',
                            reply_markup: {
                                keyboard: [['❌ Cancel']],
                                resize_keyboard: true
                            }
                        }
                    );
                    break;

                case 'duration':
                    const duration = parseInt(text);
                    if (isNaN(duration) || duration <= 0) {
                        throw new Error('Please enter a valid duration (greater than 0)');
                    }

                    const updatedTask = await this.taskHandler.editTask(taskId, {
                        name: userState.data.name === currentTask.name ? undefined : userState.data.name,
                        description: userState.data.description === currentTask.description ? undefined : userState.data.description,
                        reward: userState.data.reward === currentTask.reward ? undefined : userState.data.reward,
                        duration: duration === currentTask.duration ? undefined : duration
                    });

                    this.clearUserState(chatId);
                    await this.bot.sendMessage(chatId,
                        '✅ *Task Updated Successfully*\n\n' +
                        `Name: ${updatedTask.name}\n` +
                        `Description: ${updatedTask.description}\n` +
                        `Reward: *$${updatedTask.reward}*\n` +
                        `Duration: ${updatedTask.duration} seconds`,
                        {
                            parse_mode: 'Markdown',
                            reply_markup: {
                                keyboard: [
                                    ['📋 Task Management', '💰 Manage Wallets'],
                                    ['💰 Manage Withdrawals', '📝 Post Message']
                                ],
                                resize_keyboard: true
                            }
                        }
                    );
                    break;
            }
        } catch (error) {
            console.error('Error in task editing:', error);
            await this.bot.sendMessage(chatId,
                '❌ Error: ' + error.message + '\nPlease try again.',
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        keyboard: [
                            ['📋 Task Management', '💰 Manage Wallets'],
                            ['💰 Manage Withdrawals', '📝 Post Message']
                        ],
                        resize_keyboard: true
                    }
                }
            );
            this.clearUserState(chatId);
        }
    }

    async showWallet(chatId) {
        try {
            const user = await this.walletHandler.getUser(chatId);
            if (!user) {
                throw new Error('User not found');
            }

            const withdrawalHistory = await this.walletHandler.getWithdrawalHistory(chatId);

            let message = '🌟 *Premium Wallet*\n';
            message += '━━━━━━━━━━━━━━━━\n\n';

            message += '💰 *Available Balance*\n';
            message += `*$${user.balance.toLocaleString()}*\n`;
            message += '_Available for withdrawal_\n\n';

            message += '📊 *Quick Stats*\n';
            const totalWithdrawn = withdrawalHistory
                .filter(w => w.status === 'completed')
                .reduce((sum, w) => sum + w.amount, 0);

            message += `💳 Total Withdrawn: *$${totalWithdrawn.toLocaleString()}*\n`;
            message += `✅ Completed: ${withdrawalHistory.filter(w => w.status === 'completed').length} transactions\n\n`;

            if (withdrawalHistory.length > 0) {
                message += '📋 *Recent Transactions*\n';
                message += '┈'.repeat(20) + '\n';
                withdrawalHistory.slice(-3).reverse().forEach(w => {
                    const date = new Date(w.timestamp).toLocaleString();
                    const statusEmoji = w.status === 'completed' ? '✅' :
                        w.status === 'rejected' ? '❌' : '⏳';
                    const shortId = w.id.slice(-4);

                    message += `${statusEmoji} Transaction #${shortId}\n`;
                    message += `💰 Amount: *$${w.amount.toLocaleString()}*\n`;
                    message += `💳 Method: ${w.method}\n`;
                    message += `🕒 ${date}\n`;
                    if (w.status === 'rejected' && w.rejectionReason) {
                        message += `❗ Reason: ${w.rejectionReason}\n`;
                    }
                    message += '┈'.repeat(20) + '\n';
                });
            }

            message += '\n✨ _Choose an action below_';

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '💳 Withdraw', callback_data: 'withdraw' },
                        { text: '📜 Full History', callback_data: 'history' }
                    ],
                    [
                        { text: '🔄 Refresh', callback_data: 'refresh_balance' },
                        { text: '❓ Help', callback_data: 'wallet_help' }
                    ]
                ]
            };

            await this.bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } catch (error) {
            console.error('Error showing wallet:', error);
            await this.bot.sendMessage(chatId,
                '❌ Error fetching wallet information.',
                { parse_mode: 'Markdown' }
            );
        }
    }

    async showContactSupport(chatId) {
        try {
            this.setUserState(chatId, 'SUPPORT_MESSAGE');

            await this.bot.sendMessage(chatId,
                '📞 *Contact Support*\n' +
                '━━━━━━━━━━━━━━━━\n\n' +
                '✉️ Send your message below:\n' +
                '• Technical issues\n' +
                '• Withdrawal problems\n' +
                '• General questions\n\n' +
                '_Our support team will respond within 24 hours_',
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        keyboard: [['❌ Cancel']],
                        resize_keyboard: true
                    }
                }
            );
        } catch (error) {
            console.error('Error showing contact support:', error);
            await this.bot.sendMessage(chatId,
                '❌ Error displaying contact support information.',
                { parse_mode: 'Markdown' }
            );
        }
    }

    async handleSupportMessage(msg) {
        const chatId = msg.chat.id;
        const text = msg.text;

        if (text === '❌ Cancel') {
            this.clearUserState(chatId);
            await this.showMainMenu(chatId);
            return;
        }

        try {
            const user = await this.walletHandler.getUser(chatId);
            if (!user) {
                throw new Error('User not found');
            }

            await this.bot.sendMessage(config.ADMIN_ID,
                '📨 *New Support Message*\n' +
                '━━━━━━━━━━━━━━━━\n\n' +
                `From: ${user.name} (ID: \`${user.id}\`)\n\n` +
                `Message: ${text}`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '↩️ Reply', callback_data: `reply_support_${user.id}` }
                        ]]
                    }
                }
            );

            await this.bot.sendMessage(chatId,
                '✅ *Message Sent Successfully*\n\n' +
                'Our support team will review your message and respond shortly.\n' +
                'Thank you for your patience!',
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        keyboard: [
                            ['📋 Available Tasks', '👛 My Wallet'],
                            ['📞 Contact Support']
                        ],
                        resize_keyboard: true
                    }
                }
            );

            this.clearUserState(chatId);
        } catch (error) {
            console.error('Error handling support message:', error);
            await this.bot.sendMessage(chatId,
                '❌ Error sending support message. Please try again.',
                { parse_mode: 'Markdown' }
            );
        }
    }

    async showWalletHelp(chatId) {
        await this.bot.sendMessage(chatId,
            '❓ *Wallet Help*\n' +
            '━━━━━━━━━━━━━━━━\n\n' +
            'This section provides information about your wallet and how to use it.\n\n' +
            '• **Available Balance:** Shows the amount of USD you can withdraw.\n' +
            '• **Total Withdrawn:** Shows the total amount of USD you have withdrawn.\n' +
            '• **Recent Transactions:** Displays your three most recent withdrawals.\n' +
            '• **Full History:** Accesses your complete withdrawal history.\n' +
            '• **Withdraw:** Initiates a new withdrawal request.\n\n' +