const TERMS_TEXT = {
  uz: `Xizmatdan foydalanish shartlari (Babyshop)

1. Umumiy qoidalar
Ushbu shartlar Babyshop platformasi orqali dorixonalar uchun mahsulotlarni buyurtma qilish xizmatidan foydalanish tartibini belgilaydi. Ro'yxatdan o'tish va buyurtma berish orqali foydalanuvchi ushbu shartlarga rozilik bildiradi.

2. Buyurtmalar va ma'lumotlar to'g'riligi
Foydalanuvchi ro'yxatdan o'tishda va buyurtma berishda ko'rsatilgan barcha ma'lumotlar (telefon raqami, manzil, dorixona nomi, aloqa uchun shaxs) to'g'ri va dolzarb bo'lishi kerak. Noto'g'ri yoki eskirgan ma'lumotlar tufayli yuzaga kelgan yetkazib berish muammolari uchun xizmat ma'muriyati javobgar emas.

3. Buyurtmani tasdiqlash
Har bir buyurtma administrator tomonidan telefon orqali tasdiqlanadi. Agar foydalanuvchi buyurtmani tasdiqlagan bo'lsa va keyinchalik uni rad etsa yoki "bunday buyurtma bermaganman" desa, tizimda saqlanadigan harakatlar jurnali (loglar) — buyurtma vaqti, tarkibi va tasdiqlash holati — dalil sifatida ishlatiladi.

4. Javobgarlikni cheklash
Xizmat ma'muriyati (Babyshop) mahsulotlarni yetkazib berish jarayonidagi nizolar, shuningdek foydalanuvchi tomonidan noto'g'ri ko'rsatilgan ma'lumotlar natijasida yuzaga kelgan har qanday yo'qotish yoki zarar uchun javobgar emas. Barcha to'lovlar naqd pul asosida amalga oshiriladi, moliyaviy hisob-kitoblar tomonlar o'rtasida to'g'ridan-to'g'ri amalga oshiriladi.

5. Shaxsiy ma'lumotlar
Foydalanuvchi tomonidan taqdim etilgan shaxsiy ma'lumotlar (telefon, manzil, F.I.Sh.) faqat buyurtmalarni qayta ishlash maqsadida ishlatiladi va shifrlangan holda saqlanadi. Ma'lumotlar uchinchi shaxslarga uzatilmaydi, tijorat maqsadida sotilmaydi.

6. Nizolarni hal qilish
Tomonlar o'rtasidagi barcha nizolar muzokaralar yo'li bilan hal qilinadi. Kelishuvga erishilmagan taqdirda, tizim jurnallari (loglar) asosiy dalil hisoblanadi.

7. Shartlarning o'zgarishi
Xizmat ma'muriyati ushbu shartlarni istalgan vaqtda o'zgartirish huquqiga ega. O'zgarishlar platformada e'lon qilingan kundan boshlab kuchga kiradi.`,

  ru: `Условия использования сервиса (Babyshop)

1. Общие положения
Настоящие условия определяют порядок пользования сервисом Babyshop для заказа товаров аптеками. Регистрируясь и оформляя заказ, пользователь подтверждает своё согласие с данными условиями.

2. Заказы и достоверность данных
Пользователь обязуется указывать достоверные и актуальные данные при регистрации и оформлении заказа (номер телефона, адрес, название аптеки, контактное лицо). Администрация сервиса не несёт ответственности за проблемы с доставкой, возникшие из-за неверных или устаревших данных.

3. Подтверждение заказа
Каждый заказ подтверждается администратором по телефону перед доставкой. Если пользователь подтвердил заказ, а впоследствии заявляет, что «не оформлял такой заказ», в качестве доказательства используется журнал действий (логи), который фиксирует время, состав заказа и статус подтверждения.

4. Ограничение ответственности
Администрация сервиса (Babyshop) не несёт ответственности за споры, возникающие в процессе доставки товара, а также за любые убытки, вызванные неверно указанными пользователем данными. Все расчёты производятся наличными, напрямую между сторонами.

5. Персональные данные
Персональные данные пользователя (телефон, адрес, ФИО) используются исключительно для обработки заказов и хранятся в зашифрованном виде. Данные не передаются третьим лицам и не используются в коммерческих целях.

6. Разрешение споров
Все споры между сторонами разрешаются путём переговоров. При недостижении согласия основным доказательством являются системные журналы (логи).

7. Изменение условий
Администрация сервиса вправе изменять данные условия в любое время. Изменения вступают в силу с момента публикации на платформе.`,

  en: `Terms of Service (Babyshop)

1. General Provisions
These terms govern the use of the Babyshop service for pharmacies to order products. By registering and placing an order, the user agrees to these terms.

2. Orders and Accuracy of Information
The user agrees to provide accurate and up-to-date information during registration and ordering (phone number, address, pharmacy name, contact person). The service administration is not responsible for delivery issues caused by incorrect or outdated information.

3. Order Confirmation
Each order is confirmed by the administrator by phone before delivery. If a user confirmed an order and later claims they "did not place such an order," the system's action log — recording order time, contents, and confirmation status — serves as evidence.

4. Limitation of Liability
The service administration (Babyshop) is not liable for disputes arising during delivery, nor for any losses caused by information incorrectly provided by the user. All payments are made in cash, directly between the parties.

5. Personal Data
The user's personal data (phone, address, full name) is used solely for order processing and is stored encrypted. Data is not shared with third parties or used for commercial purposes.

6. Dispute Resolution
All disputes between parties are resolved through negotiation. If agreement cannot be reached, system logs serve as the primary evidence.

7. Changes to Terms
The service administration reserves the right to change these terms at any time. Changes take effect upon publication on the platform.`,
};

function getTermsText() {
  const lang = getLang();
  return TERMS_TEXT[lang] || TERMS_TEXT.ru;
}
