const ADMIN_API_BASE = window.location.origin.replace(/\/admin.*$/, '') + '/api';

async function testAdminAuth(login, password) {
  try {
    const res = await fetch(ADMIN_API_BASE + '/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password }),
    });
    if (!res.ok) {
      alert('Неверный логин или пароль');
      return;
    }
    const data = await res.json();
    localStorage.setItem('babyshop_admin_token', data.token);
    location.href = 'dashboard.html';
  } catch (err) {
    alert('Ошибка соединения: ' + err.message);
  }
}

function getAdminToken() {
  return localStorage.getItem('babyshop_admin_token');
}

function requireAdminAuth() {
  if (!getAdminToken()) {
    location.href = 'index.html';
  }
}

async function adminFetch(path, options = {}) {
  const headers = Object.assign({}, options.headers, { 'x-admin-token': getAdminToken() });
  const res = await fetch(ADMIN_API_BASE + path, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('babyshop_admin_token');
    location.href = 'index.html';
    throw new Error('unauthorized');
  }
  return res;
}
