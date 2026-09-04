const API_BASE = window.location.origin.replace(/\/webapp.*$/, '') + '/api';

function authHeaders() {
  const user = getCurrentUser();
  if (!user) return {};
  const headers = { 'x-user-id': user.id };
  const tgId = getTelegramId();
  if (tgId) headers['x-telegram-id'] = tgId;
  return headers;
}

async function apiGet(path, opts = {}) {
  const res = await fetch(API_BASE + path, {
    headers: opts.auth ? authHeaders() : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'API error: ' + res.status);
  }
  return res.json();
}

async function apiPost(path, body, opts = {}) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(opts.auth ? authHeaders() : {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'API error: ' + res.status);
  }
  return res.json();
}

async function apiPut(path, body, opts = {}) {
  const res = await fetch(API_BASE + path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(opts.auth ? authHeaders() : {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'API error: ' + res.status);
  }
  return res.json();
}

async function apiDelete(path, opts = {}) {
  const res = await fetch(API_BASE + path, {
    method: 'DELETE',
    headers: opts.auth ? authHeaders() : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'API error: ' + res.status);
  }
  return res.json();
}

// Отправка формы (FormData) с авторизацией — для загрузки файлов (аватар и т.п.)
async function apiPutForm(path, formData) {
  const res = await fetch(API_BASE + path, {
    method: 'PUT',
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'API error: ' + res.status);
  }
  return res.json();
}

// ---------- Локальное состояние пользователя и корзины ----------
function getCurrentUser() {
  const raw = localStorage.getItem('babyshop_user');
  return raw ? JSON.parse(raw) : null;
}

function setCurrentUser(user) {
  localStorage.setItem('babyshop_user', JSON.stringify(user));
}

function isSuperuser() {
  const user = getCurrentUser();
  return !!user && user.role === 'superuser';
}

function logout() {
  localStorage.removeItem('babyshop_user');
}

// Тихо сверяет локальные данные пользователя (включая роль superuser) с сервером.
// Нужно вызывать при открытии каждой страницы, если пользователь залогинен —
// иначе смена роли или other-серверные изменения не долетят до старой сессии
// в localStorage, пока человек не выйдет и не зайдёт заново вручную.
async function refreshCurrentUser() {
  const user = getCurrentUser();
  if (!user) return null;
  try {
    const fresh = await apiGet('/users/me', { auth: true });
    setCurrentUser(fresh);
    return fresh;
  } catch (err) {
    // Если сервер ответил unauthorized — значит аккаунт был удалён или сессия
    // больше не валидна, разлогиниваем локально, чтобы не зависать в тупике.
    if (err.message === 'unauthorized') {
      logout();
    }
    return null;
  }
}

function getCart() {
  const raw = localStorage.getItem('babyshop_cart');
  return raw ? JSON.parse(raw) : [];
}

function setCart(cart) {
  localStorage.setItem('babyshop_cart', JSON.stringify(cart));
}

function addToCart(product) {
  const cart = getCart();
  const existing = cart.find(i => i.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      weight: product.weight,
      photo_url: product.photo_url,
      qty: 1,
    });
  }
  setCart(cart);
  return cart;
}

function removeFromCart(productId) {
  const cart = getCart().filter(i => i.id !== productId);
  setCart(cart);
  return cart;
}

function updateCartQty(productId, qty) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (item) {
    if (qty <= 0) return removeFromCart(productId);
    item.qty = qty;
  }
  setCart(cart);
  return cart;
}

function clearCart() {
  setCart([]);
}

function cartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}
