require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { setBot } = require('./notify');

const TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL; // например https://yourdomain.com/webapp

if (!TOKEN) {
  console.error('BOT_TOKEN не задан в .env — бот не запущен');
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });
setBot(bot);

const texts = {
  ru: {
    welcome: 'Добро пожаловать в Babyshop! Нажмите кнопку ниже, чтобы открыть каталог.',
    openCatalog: 'Открыть каталог',
  },
};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, texts.ru.welcome, {
    reply_markup: {
      inline_keyboard: [[
        { text: texts.ru.openCatalog, web_app: { url: WEBAPP_URL } }
      ]]
    }
  });
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Babyshop — маркетплейс товаров для аптек.\n/start — открыть каталог');
});

// Обработка кнопок «Подтвердить» / «Отклонить» под уведомлением о заказе.
// Доступно только владельцу и брату (их chat id должны совпадать с переменными окружения).
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const allowedIds = [process.env.OWNER_TELEGRAM_ID, process.env.BROTHER_TELEGRAM_ID].filter(Boolean);

  if (!allowedIds.includes(String(chatId))) {
    return bot.answerCallbackQuery(query.id, { text: 'Недоступно', show_alert: true });
  }

  const data = query.data || '';
  const [action, orderId] = data.split('_');

  if (!orderId) return bot.answerCallbackQuery(query.id);

  try {
    const db = require('./db');
    if (action === 'confirm') {
      db.prepare(`UPDATE orders SET status = 'owner_confirmed', reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`).run(orderId);
      db.prepare('INSERT INTO order_logs (order_id, event, actor_role) VALUES (?, ?, ?)').run(orderId, 'confirmed_by_owner_via_bot', 'superuser');
      await bot.answerCallbackQuery(query.id, { text: 'Заказ подтверждён ✅' });
      await bot.editMessageReplyMarkup({ inline_keyboard: [[{ text: '✅ Подтверждён', callback_data: 'noop' }]] }, {
        chat_id: chatId, message_id: query.message.message_id,
      });
    } else if (action === 'reject') {
      db.prepare(`UPDATE orders SET status = 'rejected', reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`).run(orderId);
      db.prepare('INSERT INTO order_logs (order_id, event, actor_role) VALUES (?, ?, ?)').run(orderId, 'rejected_by_owner_via_bot', 'superuser');
      await bot.answerCallbackQuery(query.id, { text: 'Заказ отклонён ❌' });
      await bot.editMessageReplyMarkup({ inline_keyboard: [[{ text: '❌ Отклонён', callback_data: 'noop' }]] }, {
        chat_id: chatId, message_id: query.message.message_id,
      });
    } else {
      await bot.answerCallbackQuery(query.id);
    }
  } catch (err) {
    console.error('callback_query error:', err.message);
    bot.answerCallbackQuery(query.id, { text: 'Ошибка обработки', show_alert: true });
  }
});

bot.on('polling_error', (err) => {
  console.error('Polling error:', err.message);
});

console.log('Babyshop bot started, waiting for messages...');

module.exports = bot;
