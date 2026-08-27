// db.js
// Oddiy fayl asosidagi (JSON) ma'lumotlar bazasi.
// Kichik/o'rta hajmdagi sklad tizimi uchun yetarli, hech qanday
// tashqi baza (MySQL/Postgres) o'rnatishni talab qilmaydi.

const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "data", "db.json");

function defaultData() {
  return {
    users: [],
    products: [],
    batches: [], // kirim qilingan partiyalar (karobkalar)
    movements: [], // kirim/chiqim/ajratish tarixi
    movementBatches: [], // qaysi chiqim qaysi partiyadan olinganini bog'lovchi jadval
    seq: {
      users: 1,
      products: 1,
      batches: 1,
      movements: 1,
      movementBatches: 1,
    },
  };
}

function load() {
  if (!fs.existsSync(DATA_FILE)) {
    save(defaultData());
  }
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("DB fayli buzilgan, yangisi yaratilmoqda...", e);
    const d = defaultData();
    save(d);
    return d;
  }
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function nextId(data, table) {
  const id = data.seq[table]++;
  return id;
}

// Har bir yozish operatsiyasidan so'ng darhol diskka saqlanadi (kichik tizim uchun yetarli)
module.exports = {
  load,
  save,
  nextId,
};
