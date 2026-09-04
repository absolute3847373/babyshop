const db = require('./db');
const products = require('./products_data');

const getCatId = db.prepare('SELECT id FROM categories WHERE name_ru = ?');
const insert = db.prepare(`
  INSERT INTO products (category_id, name, description, weight, price, photo_url, active)
  VALUES (?, ?, ?, ?, ?, ?, 1)
`);

const existingCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;

if (existingCount === 0) {
  let inserted = 0;
  let skipped = 0;
  for (const p of products) {
    const cat = getCatId.get(p.category);
    if (!cat) {
      console.log('Category not found, skipping product:', p.name, '| category:', p.category);
      skipped++;
      continue;
    }
    insert.run(cat.id, p.name, p.description, p.weight, p.price, null);
    inserted++;
  }
  console.log(`Products seeded: ${inserted}, skipped: ${skipped}`);
} else {
  console.log('Products already exist, skipping seed. Count:', existingCount);
}
