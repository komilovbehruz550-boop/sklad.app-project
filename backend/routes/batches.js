const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { load, save, nextId } = require("../db");

const router = express.Router();

function generateBarcode() {
  // Oddiy 12 xonali raqamli shtrix-kod generatsiya qilamiz
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
}

// Barcha partiyalar (kirimlar tarixi)
router.get("/", (req, res) => {
  const data = load();
  let batches = data.batches;
  if (req.query.product_id) {
    batches = batches.filter((b) => b.product_id == req.query.product_id);
  }
  const withNames = batches
    .map((b) => {
      const product = data.products.find((p) => p.id === b.product_id);
      return { ...b, product_name: product ? product.name : "?" };
    })
    .sort((a, b) => new Date(b.received_date) - new Date(a.received_date));
  res.json(withNames);
});

// Shtrix-kod bo'yicha qidirish (skanerlash) - mahsulot QAYERDAN kelganini ko'rsatadi
router.get("/scan/:barcode", (req, res) => {
  const data = load();
  const batch = data.batches.find((b) => b.barcode === req.params.barcode);
  if (!batch) {
    // Balki bu mahsulotning o'zining barcode'i (umumiy shtrix-kod)
    const product = data.products.find((p) => p.barcode === req.params.barcode);
    if (product) {
      const relatedBatches = data.batches
        .filter((b) => b.product_id === product.id)
        .sort((a, b) => new Date(b.received_date) - new Date(a.received_date));
      return res.json({
        type: "product",
        product,
        batches: relatedBatches,
      });
    }
    return res.status(404).json({ error: "Bu shtrix-kod bo'yicha hech narsa topilmadi" });
  }
  const product = data.products.find((p) => p.id === batch.product_id);
  res.json({ type: "batch", batch, product });
});

// Yangi kirim (partiya) qo'shish - masalan "10 ta karobka keldi"
router.post("/", (req, res) => {
  const { product_id, source, boxes_count, items_per_box, barcode, note, unit_type } = req.body;

  if (!product_id) return res.status(400).json({ error: "Mahsulot tanlanmagan" });
  if (!source) return res.status(400).json({ error: "Yetkazib beruvchi / qayerniki ekanligi majburiy" });

  const data = load();
  const product = data.products.find((p) => p.id == product_id);
  if (!product) return res.status(404).json({ error: "Mahsulot topilmadi" });

  const finalItemsPerBox = Number(items_per_box) || product.items_per_box || 1;
  let boxesCount = 0;
  let unitsCount = 0;

  if (unit_type === "dona") {
    // To'g'ridan-to'g'ri dona holida kirim (karobkasiz)
    unitsCount = Number(req.body.units_count) || 0;
  } else {
    boxesCount = Number(boxes_count) || 0;
  }

  if (boxesCount <= 0 && unitsCount <= 0) {
    return res.status(400).json({ error: "Miqdor noto'g'ri kiritilgan" });
  }

  let finalBarcode = barcode && barcode.trim() ? barcode.trim() : generateBarcode();
  const dupBarcode = data.batches.find((b) => b.barcode === finalBarcode);
  if (dupBarcode) {
    return res.status(409).json({ error: "Bu shtrix-kod boshqa partiyada allaqachon mavjud" });
  }

  const batch = {
    id: nextId(data, "batches"),
    uuid: uuidv4(),
    product_id: product.id,
    barcode: finalBarcode,
    source, // qayerniki - yetkazib beruvchi / ishlab chiqaruvchi
    items_per_box: finalItemsPerBox,
    initial_boxes: boxesCount,
    initial_units: unitsCount,
    remaining_boxes: boxesCount,
    remaining_units: unitsCount,
    received_date: new Date().toISOString(),
    note: note || "",
  };
  data.batches.push(batch);

  const baseUnits = boxesCount * finalItemsPerBox + unitsCount;
  const movement = {
    id: nextId(data, "movements"),
    type: "kirim",
    product_id: product.id,
    batch_id: batch.id,
    qty_boxes: boxesCount,
    qty_units: unitsCount,
    base_units: baseUnits,
    source,
    note: note || "",
    created_at: new Date().toISOString(),
  };
  data.movements.push(movement);

  save(data);
  res.status(201).json({ batch, movement });
});

// Karobkani "ajratish" - masalan 10 tadan bittasini karobkadan ajratib, dona qilib qo'yish
router.post("/:id/split", (req, res) => {
  const { boxes_to_split } = req.body;
  const n = Number(boxes_to_split);
  if (!n || n <= 0) return res.status(400).json({ error: "Ajratiladigan karobkalar sonini kiriting" });

  const data = load();
  const batch = data.batches.find((b) => b.id == req.params.id);
  if (!batch) return res.status(404).json({ error: "Partiya topilmadi" });

  if (batch.remaining_boxes < n) {
    return res.status(400).json({ error: `Faqat ${batch.remaining_boxes} ta to'liq karobka mavjud` });
  }

  batch.remaining_boxes -= n;
  batch.remaining_units += n * batch.items_per_box;

  const movement = {
    id: nextId(data, "movements"),
    type: "ajratish",
    product_id: batch.product_id,
    batch_id: batch.id,
    qty_boxes: -n,
    qty_units: n * batch.items_per_box,
    base_units: 0, // umumiy qoldiqqa ta'sir qilmaydi, faqat ichki qayta taqsimlash
    source: batch.source,
    note: `${n} ta karobka donalarga ajratildi (${batch.items_per_box} dona/karobka)`,
    created_at: new Date().toISOString(),
  };
  data.movements.push(movement);

  save(data);
  res.json({ batch, movement });
});

module.exports = router;
