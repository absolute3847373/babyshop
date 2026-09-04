let botInstance = null;

function setBot(bot) {
  botInstance = bot;
}

function formatOrderMessage({ orderId, user, items, total_text, address, pharmacy_name, contact_person, contact_phone }) {
  const itemsList = items
    .map(i => `• ${i.name} — ${i.qty} шт. (${i.weight || 'без указания объёма'}) — ${i.price}`)
    .join('\n');

  return (
    `🆕 Новый заказ #${orderId}\n\n` +
    `Аптека: ${pharmacy_name || '-'}\n` +
    `Контактное лицо: ${contact_person || '-'}\n` +
    `Телефон: ${contact_phone || '-'}\n` +
    `Адрес: ${address || '-'}\n\n` +
    `Товары:\n${itemsList}\n\n` +
    `Итого: ${total_text || 'см. позиции'}\n\n` +
    `Клиент (тел. регистрации): ${user ? user.phone : '-'}\n\n` +
    `Позвоните клиенту для подтверждения заказа перед доставкой.`
  );
}

function notifyNewOrder(orderData) {
  if (!botInstance) return;
  const message = formatOrderMessage(orderData);

  const ownerChatId = process.env.OWNER_TELEGRAM_ID;
  const brotherChatId = process.env.BROTHER_TELEGRAM_ID;

  const keyboard = {
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Подтвердить', callback_data: `confirm_${orderData.orderId}` },
        { text: '❌ Отклонить', callback_data: `reject_${orderData.orderId}` },
      ]],
    },
  };

  [ownerChatId, brotherChatId].filter(Boolean).forEach(chatId => {
    botInstance.sendMessage(chatId, message, keyboard).catch(err => {
      console.error('Failed to notify', chatId, err.message);
    });
  });
}

const STATUS_LABELS = {
  owner_confirmed: 'подтверждён администратором ✅',
  rejected: 'отклонён администратором ❌',
  delivered: 'отмечен как доставленный 🚚',
  client_confirmed: 'клиент подтвердил получение 📦',
};

function notifyOrderStatusChange(orderId, status) {
  if (!botInstance) return;
  const label = STATUS_LABELS[status] || status;
  const message = `ℹ️ Заказ #${orderId} — ${label}`;

  const ownerChatId = process.env.OWNER_TELEGRAM_ID;
  const brotherChatId = process.env.BROTHER_TELEGRAM_ID;

  [ownerChatId, brotherChatId].filter(Boolean).forEach(chatId => {
    botInstance.sendMessage(chatId, message).catch(() => {});
  });
}

module.exports = { setBot, notifyNewOrder, notifyOrderStatusChange };
