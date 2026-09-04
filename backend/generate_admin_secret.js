const crypto = require('crypto');
const token = crypto.randomBytes(32).toString('hex');
console.log('Ваш новый ADMIN_SECRET_TOKEN (вставьте в .env):');
console.log(token);
