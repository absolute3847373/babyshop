require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const { encrypt, decrypt } = require('./crypto-utils');

require('./seed_categories');
require('./seed_products');

const app = express();
// Railway (и большинство облачных хостингов) работает через прокси и передаёт
// реальный IP клиента в заголовке X-Forwarded-For. Без этой настройки Express
// не доверяет этому заголовку, и express-rate-limit падает с ошибкой
// ERR_ERL_UNEXPECTED_X_FORWARDED_FOR на каждом запросе к /login и /register.
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

// Защита от перебора паролей: не больше 10 попыток входа/регистрации
// с одного IP за 15 минут.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'too_many_attempts' },
  standardHeaders: true,
  legacyHeaders: false,
});

const fs = require('fs');
// DATA_DIR — та же переменная, что и в db.js: на Railway сюда монтируется
// постоянный Volume, чтобы загруженные фото не стирались при каждом деплое.
const dataDir = process.env.DATA_DIR || __dirname;
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use('/uploads', express.static(uploadsDir));
app.use('/webapp', express.static(path.join(__dirname, 'webapp')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

app.get('/', (req, res) => {
  res.redirect('/webapp');
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ---------- helpers ----------
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_SECRET_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

function getSuperuserTelegramIds() {
  return [process.env.OWNER_TELEGRAM_ID, process.env.BROTHER_TELEGRAM_ID]
    .filter(Boolean)
    .map(id => String(id).trim());
}

function isSuperuserTelegramId(telegramId) {
  if (!telegramId) return false;
  return getSuperuserTelegramIds().includes(String(telegramId));
}

// Шифруем чувствительные поля пользователя перед сохранением в БД
function encryptUserFields(fields) {
  return {
    ...fields,
    address: fields.address !== undefined ? encrypt(fields.address) : undefined,
    contact_person: fields.contact_person !== undefined ? encrypt(fields.contact_person) : undefined,
    recipient_name: fields.recipient_name !== undefined ? encrypt(fields.recipient_name) : undefined,
  };
}

// Расшифровываем перед отправкой клиенту
function decryptUser(user) {
  if (!user) return user;
  return {
    ...user,
    address: decrypt(user.address),
    contact_person: decrypt(user.contact_person),
    recipient_name: decrypt(user.recipient_name),
  };
}

function decryptOrder(order) {
  return {
    ...order,
    address: decrypt(order.address),
    contact_person: decrypt(order.contact_person),
  };
}

// Требует авторизации обычного пользователя (заголовок x-user-id + проверка существования)
function requireUser(req, res, next) {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'unauthorized' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  req.currentUser = user;
  next();
}

// Требует, чтобы пользователь имел роль superuser
function requireSuperuser(req, res, next) {
  requireUser(req, res, () => {
    if (req.currentUser.role !== 'superuser') {
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  });
}

// ---------- ADMIN LOGIN ----------
app.post('/api/admin/login', (req, res) => {
  const { login, password } = req.body;
  if (login === process.env.ADMIN_LOGIN && password === process.env.ADMIN_PASSWORD) {
    return res.json({ token: process.env.ADMIN_SECRET_TOKEN });
  }
  res.status(401).json({ error: 'invalid_admin_credentials' });
});

// ---------- CATEGORIES ----------
app.get('/api/categories', (req, res) => {
  const rows = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
  res.json(rows);
});

// ---------- PRODUCTS ----------
app.get('/api/products', (req, res) => {
  const { search, category_id } = req.query;
  let query = 'SELECT * FROM products WHERE active = 1';
  const params = [];
  if (category_id) {
    query += ' AND category_id = ?';
    params.push(category_id);
  }
  if (search) {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  query += ' ORDER BY id';
  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

app.get('/api/products/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

// ---------- ADMIN: products CRUD ----------
app.post('/api/admin/products', requireAdmin, upload.single('photo'), (req, res) => {
  const { category_id, name, description, weight, price } = req.body;
  const photo_url = req.file ? `/uploads/${req.file.filename}` : null;
  const result = db.prepare(`
    INSERT INTO products (category_id, name, description, weight, price, photo_url, active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(category_id, name, description, weight, price || 'error404', photo_url);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/admin/products/:id', requireAdmin, upload.single('photo'), (req, res) => {
  const { category_id, name, description, weight, price, active } = req.body;
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const photo_url = req.file ? `/uploads/${req.file.filename}` : existing.photo_url;
  db.prepare(`
    UPDATE products SET category_id=?, name=?, description=?, weight=?, price=?, photo_url=?, active=?
    WHERE id=?
  `).run(
    category_id ?? existing.category_id,
    name ?? existing.name,
    description ?? existing.description,
    weight ?? existing.weight,
    price ?? existing.price,
    photo_url,
    active !== undefined ? Number(active) : existing.active,
    req.params.id
  );
  res.json({ ok: true });
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- AUTH: register / login ----------
// Приводим номер телефона к единому виду перед сохранением/поиском:
// убираем пробелы, скобки, дефисы; "998771234567" и "+998 77 123 45 67" и "77 123 45 67"
// (без кода страны) считаются ОДНИМ и тем же номером — иначе можно было бы
// зарегистрировать несколько аккаунтов на один телефон, просто меняя пробелы или "+".
function normalizePhone(raw) {
  if (!raw) return '';
  let digits = String(raw).replace(/[^\d]/g, ''); // оставляем только цифры
  if (!digits.startsWith('998') && digits.length === 9) {
    digits = '998' + digits; // короткий локальный номер без кода страны
  }
  return '+' + digits;
}

const REQUIRED_REGISTER_FIELDS = [
  'phone', 'password', 'recipient_name', 'pharmacy_name',
  'contact_person', 'address', 'city', 'district',
];

app.post('/api/register', authLimiter, (req, res) => {
  const body = req.body || {};
  const { password, terms_accepted, language, telegram_id } = body;
  const phone = normalizePhone(body.phone);

  // Проверка обязательных полей — регистрация без полного набора данных невозможна
  const missing = REQUIRED_REGISTER_FIELDS.filter(f => !body[f] || String(body[f]).trim() === '');
  if (missing.length) {
    return res.status(400).json({ error: 'missing_required_fields', fields: missing });
  }
  if (!terms_accepted) {
    return res.status(400).json({ error: 'terms_not_accepted' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
  if (existing) return res.status(409).json({ error: 'phone_already_registered' });

  const password_hash = bcrypt.hashSync(password, 12);
  // Роль superuser присваивается только по Telegram ID из SUPERUSER_TELEGRAM_IDS —
  // это ID, который Mini App получает от самого Telegram и подделать его пользователю нельзя.
  const role = isSuperuserTelegramId(telegram_id) ? 'superuser' : 'customer';
  const enc = encryptUserFields({
    address: body.address,
    contact_person: body.contact_person,
    recipient_name: body.recipient_name,
  });

  const result = db.prepare(`
    INSERT INTO users (
      phone, password_hash, telegram_id, role, recipient_name, pharmacy_name, contact_person,
      address, city, district, language, terms_accepted_at, terms_version
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
  `).run(
    phone, password_hash, telegram_id || null, role, enc.recipient_name, body.pharmacy_name, enc.contact_person,
    enc.address, body.city, body.district, language || 'ru', 'v1'
  );

  res.json({ id: result.lastInsertRowid, role });
});

app.post('/api/login', authLimiter, (req, res) => {
  const { password, telegram_id } = req.body;
  const phone = normalizePhone(req.body.phone);
  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  // Если у пользователя ещё не был сохранён telegram_id (например, зарегистрировался
  // до внедрения этой проверки) — сохраняем его сейчас и пересчитываем роль.
  // Если суперюзерский Telegram ID сменился в .env, роль тоже подхватится автоматически.
  const shouldBeSuperuser = isSuperuserTelegramId(telegram_id || user.telegram_id);
  const newRole = shouldBeSuperuser ? 'superuser' : (user.role === 'superuser' ? 'customer' : user.role);

  if (telegram_id && (telegram_id !== user.telegram_id || newRole !== user.role)) {
    db.prepare('UPDATE users SET telegram_id = ?, role = ? WHERE id = ?').run(telegram_id, newRole, user.id);
    user.telegram_id = telegram_id;
    user.role = newRole;
  }

  const { password_hash, ...safeUser } = user;
  res.json(decryptUser(safeUser));
});

// Отдаёт актуальные данные текущего пользователя (используется, чтобы Mini App
// подхватил изменение роли superuser или другие изменения без необходимости
// заново вводить логин/пароль). Если передан свежий telegram_id — тут же
// пересчитывает роль, так же как это делает /api/login.
app.get('/api/users/me', requireUser, (req, res) => {
  const telegram_id = req.headers['x-telegram-id'];
  const user = req.currentUser;

  if (telegram_id) {
    const shouldBeSuperuser = isSuperuserTelegramId(telegram_id);
    const newRole = shouldBeSuperuser ? 'superuser' : (user.role === 'superuser' ? 'customer' : user.role);
    if (telegram_id !== user.telegram_id || newRole !== user.role) {
      db.prepare('UPDATE users SET telegram_id = ?, role = ? WHERE id = ?').run(telegram_id, newRole, user.id);
      user.telegram_id = telegram_id;
      user.role = newRole;
    }
  }

  const { password_hash, ...safeUser } = user;
  res.json(decryptUser(safeUser));
});

app.put('/api/users/:id', requireUser, upload.single('avatar'), (req, res) => {
  if (String(req.currentUser.id) !== String(req.params.id)) {
    return res.status(403).json({ error: 'forbidden' });
  }
  const { pharmacy_name, contact_person, address, city, district, language, theme, recipient_name } = req.body;
  const existing = req.currentUser;

  const enc = encryptUserFields({
    address: address !== undefined ? address : undefined,
    contact_person: contact_person !== undefined ? contact_person : undefined,
    recipient_name: recipient_name !== undefined ? recipient_name : undefined,
  });

  const avatar_url = req.file ? `/uploads/${req.file.filename}` : existing.avatar_url;

  db.prepare(`
    UPDATE users SET pharmacy_name=?, contact_person=?, address=?, city=?, district=?, language=?, theme=?, recipient_name=?, avatar_url=?
    WHERE id=?
  `).run(
    pharmacy_name ?? existing.pharmacy_name,
    enc.contact_person !== undefined ? enc.contact_person : existing.contact_person,
    enc.address !== undefined ? enc.address : existing.address,
    city ?? existing.city,
    district ?? existing.district,
    language ?? existing.language,
    theme ?? existing.theme,
    enc.recipient_name !== undefined ? enc.recipient_name : existing.recipient_name,
    avatar_url,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  const { password_hash, ...safeUser } = updated;
  res.json(decryptUser(safeUser));
});

// ---------- ORDERS ----------
const { notifyNewOrder, notifyOrderStatusChange } = require('./notify');

app.post('/api/orders', requireUser, (req, res) => {
  const { items, total_text, address, pharmacy_name, contact_person, contact_phone } = req.body;
  if (!items || !items.length) {
    return res.status(400).json({ error: 'invalid_order' });
  }
  const user_id = req.currentUser.id;
  const items_json = JSON.stringify(items);
  const result = db.prepare(`
    INSERT INTO orders (user_id, items_json, total_text, address, pharmacy_name, contact_person, contact_phone, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'new')
  `).run(user_id, items_json, total_text, encrypt(address), pharmacy_name, encrypt(contact_person), contact_phone);

  const orderId = result.lastInsertRowid;
  db.prepare('INSERT INTO order_logs (order_id, event, details, actor_id, actor_role) VALUES (?, ?, ?, ?, ?)')
    .run(orderId, 'created', items_json, user_id, 'customer');

  notifyNewOrder({
    orderId, user: req.currentUser, items, total_text,
    address, pharmacy_name, contact_person, contact_phone,
  });

  res.json({ id: orderId });
});

// Заказы текущего покупателя (только свои)
app.get('/api/orders/mine', requireUser, (req, res) => {
  const rows = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.currentUser.id);
  res.json(rows.map(r => ({ ...decryptOrder(r), items: JSON.parse(r.items_json) })));
});

// Покупатель подтверждает получение своего заказа
app.post('/api/orders/:id/confirm', requireUser, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order || order.user_id !== req.currentUser.id) {
    return res.status(403).json({ error: 'forbidden' });
  }
  db.prepare(`UPDATE orders SET status = 'client_confirmed', confirmed_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(req.params.id);
  db.prepare('INSERT INTO order_logs (order_id, event, actor_id, actor_role) VALUES (?, ?, ?, ?)')
    .run(req.params.id, 'confirmed_by_client', req.currentUser.id, 'customer');
  res.json({ ok: true });
});

// ---------- SUPERUSER: все заказы, управление статусами ----------
// Список всех зарегистрированных пользователей — виден только superuser
// (владельцу и брату). Пароли и телефон не расшифровываются в открытую без нужды —
// но superuser'у телефон и данные показываются, т.к. это его собственный бизнес.
// Статистика по доходу — только для superuser. Считаем только заказы с реальной
// суммой (total_text не null, т.е. цены уже проставлены, а не error404),
// и только те, что дошли до статуса client_confirmed (реально доставлены и подтверждены) —
// это защищает от завышения статистики отменёнными/спорными заказами.
app.get('/api/stats/revenue', requireSuperuser, (req, res) => {
  const orders = db.prepare(`
    SELECT total_text, created_at FROM orders
    WHERE status = 'client_confirmed' AND total_text IS NOT NULL
  `).all();

  const parseAmount = (t) => {
    const num = parseFloat(String(t).replace(/[^\d.]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let totalAllTime = 0;
  let totalThisMonth = 0;
  const byMonth = {}; // { "2026-08": 12345, "2026-09": 6789 }

  orders.forEach(o => {
    const amount = parseAmount(o.total_text);
    totalAllTime += amount;

    const d = new Date(o.created_at);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    byMonth[monthKey] = (byMonth[monthKey] || 0) + amount;

    if (monthKey === currentMonthKey) totalThisMonth += amount;
  });

  // Отдаём последние 12 месяцев по порядку для графика, даже если в каких-то месяцах заказов не было (0)
  const monthlySeries = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlySeries.push({ month: key, total: byMonth[key] || 0 });
  }

  res.json({
    total_all_time: totalAllTime,
    total_this_month: totalThisMonth,
    orders_count_all_time: orders.length,
    orders_count_this_month: orders.filter(o => {
      const d = new Date(o.created_at);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === currentMonthKey;
    }).length,
    monthly_series: monthlySeries,
  });
});

app.get('/api/users/all', requireSuperuser, (req, res) => {
  const rows = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  const safe = rows.map(u => {
    const { password_hash, ...rest } = u;
    return decryptUser(rest);
  });
  res.json(safe);
});

app.get('/api/orders/all', requireSuperuser, (req, res) => {
  const rows = db.prepare(`
    SELECT orders.*, users.phone as customer_phone, users.pharmacy_name as customer_pharmacy
    FROM orders JOIN users ON users.id = orders.user_id
    ORDER BY orders.created_at DESC
  `).all();
  res.json(rows.map(r => ({ ...decryptOrder(r), items: JSON.parse(r.items_json) })));
});

// Superuser подтверждает заказ (после звонка клиенту)
app.post('/api/orders/:id/owner-confirm', requireSuperuser, (req, res) => {
  db.prepare(`UPDATE orders SET status = 'owner_confirmed', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(req.currentUser.id, req.params.id);
  db.prepare('INSERT INTO order_logs (order_id, event, actor_id, actor_role) VALUES (?, ?, ?, ?)')
    .run(req.params.id, 'confirmed_by_owner', req.currentUser.id, 'superuser');
  notifyOrderStatusChange(req.params.id, 'owner_confirmed');
  res.json({ ok: true });
});

// Superuser отклоняет заказ (клиент не подтвердил по звонку)
app.post('/api/orders/:id/reject', requireSuperuser, (req, res) => {
  const { reason } = req.body;
  db.prepare(`UPDATE orders SET status = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = ? WHERE id = ?`)
    .run(req.currentUser.id, reason || null, req.params.id);
  db.prepare('INSERT INTO order_logs (order_id, event, details, actor_id, actor_role) VALUES (?, ?, ?, ?, ?)')
    .run(req.params.id, 'rejected_by_owner', reason || '', req.currentUser.id, 'superuser');
  notifyOrderStatusChange(req.params.id, 'rejected');
  res.json({ ok: true });
});

// Superuser отмечает заказ как доставленный (брат довёз товар)
app.post('/api/orders/:id/deliver', requireSuperuser, (req, res) => {
  db.prepare(`UPDATE orders SET status = 'delivered', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(req.currentUser.id, req.params.id);
  db.prepare('INSERT INTO order_logs (order_id, event, actor_id, actor_role) VALUES (?, ?, ?, ?)')
    .run(req.params.id, 'marked_delivered', req.currentUser.id, 'superuser');
  res.json({ ok: true });
});

// Superuser редактирует состав/данные заказа
app.put('/api/orders/:id', requireSuperuser, (req, res) => {
  const { items, total_text, address, pharmacy_name, contact_person, contact_phone } = req.body;
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });

  db.prepare(`
    UPDATE orders SET items_json=?, total_text=?, address=?, pharmacy_name=?, contact_person=?, contact_phone=?
    WHERE id=?
  `).run(
    items ? JSON.stringify(items) : existing.items_json,
    total_text ?? existing.total_text,
    address !== undefined ? encrypt(address) : existing.address,
    pharmacy_name ?? existing.pharmacy_name,
    contact_person !== undefined ? encrypt(contact_person) : existing.contact_person,
    contact_phone ?? existing.contact_phone,
    req.params.id
  );

  db.prepare('INSERT INTO order_logs (order_id, event, actor_id, actor_role) VALUES (?, ?, ?, ?)')
    .run(req.params.id, 'edited_by_owner', req.currentUser.id, 'superuser');

  res.json({ ok: true });
});

// Superuser удаляет заказ полностью
app.delete('/api/orders/:id', requireSuperuser, (req, res) => {
  db.prepare('INSERT INTO order_logs (order_id, event, actor_id, actor_role) VALUES (?, ?, ?, ?)')
    .run(req.params.id, 'deleted_by_owner', req.currentUser.id, 'superuser');
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/orders/:id/logs', requireUser, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'not found' });
  if (order.user_id !== req.currentUser.id && req.currentUser.role !== 'superuser') {
    return res.status(403).json({ error: 'forbidden' });
  }
  const rows = db.prepare('SELECT * FROM order_logs WHERE order_id = ? ORDER BY created_at').all(req.params.id);
  res.json(rows);
});

// ---------- ADMIN PANEL: заказы (для веб-админки, отдельно от Mini App superuser) ----------
app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  res.json(rows.map(r => ({ ...decryptOrder(r), items: JSON.parse(r.items_json) })));
});

app.get('/api/admin/orders/:id/logs', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM order_logs WHERE order_id = ? ORDER BY created_at').all(req.params.id);
  res.json(rows);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Babyshop backend running on port ${PORT}`));

// Запускаем Telegram-бота вместе с сервером
require('./bot');
