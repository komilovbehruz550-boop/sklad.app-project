# OMBOR — Sklad boshqaruv tizimi

To'liq ishlaydigan sklad (ombor) boshqaruv dasturi: ro'yxatdan o'tish, kirim/chiqim
tarixi, oylik hisobot, monitoring paneli va shtrix-kod orqali mahsulot qayerdan
kelganini aniqlash. **Backend** va **frontend** alohida papkalarda.

## Loyiha tuzilishi

```
sklad-app/
├── backend/          # Node.js + Express API server (ma'lumotlar shu yerda saqlanadi)
│   ├── server.js
│   ├── db.js         # fayl asosidagi (JSON) baza — hech qanday MySQL/Postgres o'rnatish shart emas
│   ├── stockUtils.js
│   ├── routes/
│   └── data/db.json  # avtomatik yaratiladi, barcha ma'lumotlar shu yerda
└── frontend/         # Sof HTML/CSS/JS (build kerak emas, to'g'ridan-to'g'ri ochiladi)
    ├── index.html
    ├── css/style.css
    └── js/
```

## Ishga tushirish

1. Kompyuteringizda **Node.js** (v18 yoki undan yuqori) o'rnatilgan bo'lishi kerak.
2. Terminalda:
   ```bash
   cd backend
   npm install
   npm start
   ```
3. Brauzerda oching: **http://localhost:3000**
   (Backend serveri frontendni ham shu portdan xizmat qiladi, alohida server kerak emas.)

Agar frontendni butunlay alohida serverdan ochmoqchi bo'lsangiz (masalan boshqa portda),
`frontend/js/api.js` faylidagi `API_BASE` qiymatini backend manziliga o'zgartiring
(masalan `"http://localhost:3000/api"`), so'ng `frontend/index.html` faylini istalgan
statik server orqali oching.

## Asosiy imkoniyatlar

- **Ro'yxatdan o'tish / kirish** — har bir foydalanuvchi/korxona uchun alohida hisob.
- **Mahsulotlar** — nomi, kategoriyasi, 1 karobkadagi dona soni, minimal qoldiq va h.k.
- **Kirim qilish** — masalan "10 ta karobka keldi". Har bir kirim (partiya) uchun
  avtomatik yoki qo'lda shtrix-kod belgilanadi, va **qayerdan kelgani** (yetkazib
  beruvchi/zavod) saqlanadi.
- **Karobkani ajratish** — 10 ta karobkadan bittasini donalarga ajratish mumkin
  (masalan 1 karobka = 10 dona bo'lsa, ajratilgach 10 ta alohida dona bo'lib qoladi,
  lekin qaysi partiyadan/qayerdan kelgani tarixi saqlanib qoladi).
- **Chiqim qilish** — ombordan mahsulot chiqarilganda, tizim avtomatik ravishda eng
  eski partiyadan (FIFO) yechadi va qaysi partiyadan olinganini ko'rsatadi.
- **Shtrix-kod skanerlash** — kodni kiritish orqali (yoki fizik skaner bilan, chunki
  skaner oddiy klaviaturadek ishlaydi) mahsulot qaysi partiyadan, qayerdan kelgani,
  necha dona qolgani darhol ko'rinadi.
- **Monitoring** — joriy oy kirim/chiqim statistikasi, kam qolgan mahsulotlar
  ro'yxati, so'nggi harakatlar tasmasi.
- **Oylik hisobot** — har oy, har mahsulot bo'yicha jami kirim/chiqim va farqi.

## Ma'lumotlar qanday saqlanadi

Barcha ma'lumotlar `backend/data/db.json` faylida saqlanadi. Bu fayl avtomatik
yaratiladi va yangilanadi — alohida baza (MySQL, PostgreSQL) o'rnatish shart emas.
Agar kelajakda haqiqiy baza (masalan PostgreSQL)ga o'tish kerak bo'lsa, faqat
`backend/db.js` faylini almashtirish yetarli — qolgan barcha kod o'zgarmaydi.

## Xavfsizlik eslatmasi

Bu loyiha ta'lim/boshlang'ich foydalanish uchun mo'ljallangan oddiy tizim.
Ishlab chiqarishga (production) qo'yishdan oldin:
- `backend/middleware/auth.js` faylidagi `JWT_SECRET` qiymatini muhit o'zgaruvchisi
  (`JWT_SECRET`) orqali maxfiy va murakkab qilib bering.
- HTTPS orqali joylashtiring.
- Muntazam zaxira (backup) oling — `data/db.json` faylini davriy nusxalab turing.
