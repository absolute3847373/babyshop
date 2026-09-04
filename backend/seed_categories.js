const db = require('./db');

const categories = [
  { ru: 'Крем для рук / уход', uz: "Qo'l uchun krem / parvarish", en: 'Hand cream / care' },
  { ru: 'Детская гигиена (Johnson\'s)', uz: 'Bolalar gigienasi', en: "Baby hygiene (Johnson's)" },
  { ru: 'Мыло Johnson\'s', uz: "Johnson's sovun", en: "Johnson's soap" },
  { ru: 'Освежители воздуха', uz: 'Havo tozalagichlar', en: 'Air fresheners' },
  { ru: 'Детское мыло', uz: 'Bolalar sovuni', en: 'Baby soap' },
  { ru: 'Парфюмированное мыло', uz: 'Atirli sovun', en: 'Perfumed soap' },
  { ru: 'Товары для кормления/ГВ', uz: 'Emizish uchun mahsulotlar', en: 'Feeding / breastfeeding' },
  { ru: 'Соски / пустышки', uz: 'Sosalar / emizikchalar', en: 'Nipples / pacifiers' },
  { ru: 'Детские бутылочки', uz: 'Bolalar shishachalari', en: 'Baby bottles' },
  { ru: 'Гигиена / салфетки', uz: 'Gigiena / salfetkalar', en: 'Hygiene / wipes' },
  { ru: 'Зубные щётки', uz: 'Tish cho\'tkalari', en: 'Toothbrushes' },
  { ru: 'Чистотело', uz: 'Chistotelo', en: 'Chistotelo' },
  { ru: 'Детские присыпки', uz: 'Bolalar upasi', en: 'Baby powder' },
  { ru: 'Женская гигиена', uz: 'Ayollar gigienasi', en: "Women's hygiene" },
  { ru: 'Подгузники', uz: "Ko'ylakchalar / Памперс", en: 'Diapers' },
  { ru: 'Детские шампуни', uz: 'Bolalar shampuni', en: 'Baby shampoo' },
  { ru: 'Тесты на беременность', uz: 'Homiladorlik testlari', en: 'Pregnancy tests' },
  { ru: 'Медицинские расходники', uz: "Tibbiy sarf materiallari", en: 'Medical supplies' },
];

const insert = db.prepare('INSERT INTO categories (name_ru, name_uz, name_en, sort_order) VALUES (?, ?, ?, ?)');
const count = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;

if (count === 0) {
  categories.forEach((c, i) => insert.run(c.ru, c.uz, c.en, i));
  console.log('Categories seeded:', categories.length);
} else {
  console.log('Categories already exist, skipping seed. Count:', count);
}
