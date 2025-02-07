const { Telegraf } = require('telegraf');

test('Telegraf should be a function', () => {
  expect(typeof Telegraf).toBe('function');
});