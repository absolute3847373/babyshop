function getTheme() {
  return localStorage.getItem('babyshop_theme') || 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('babyshop_theme', theme);
}

function initTheme() {
  applyTheme(getTheme());
}

// Инициализация Telegram WebApp
function initTelegram() {
  if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    return tg;
  }
  return null;
}

// Возвращает Telegram ID текущего пользователя (число в виде строки), если приложение
// открыто внутри Telegram. Возвращает null, если открыто в обычном браузере —
// в этом случае роль superuser присвоена не будет, это ожидаемо и безопасно.
function getTelegramId() {
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
    const user = window.Telegram.WebApp.initDataUnsafe.user;
    if (user && user.id) return String(user.id);
  }
  return null;
}
