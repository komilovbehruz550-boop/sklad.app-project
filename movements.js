const express = require("express");
const { load, save, nextId } = require("../db");
const { consumeFIFO } = require("../stockUtils");

const router = express.Router();

// Barcha harakatlar tarixi (filter: oy, mahsulot, tur)
router.get("/", (req, res) => {
  const data = load();
  let movements = [...data.movements];

  if (req.query.product_id) {
    movements = movements.filter((m) => m.product_id == req.query.product_id);
  }
  if (req.query.type) {
    movements = movements.filter((m) => m.type === req.query.type);
  }
  if (req.query.month) {
    // format: YYYY-MM
    movements = movements.filter((m) => m.created_at.startsWith(req.query.month));
  }

  movements = movements
    .map((m) => {
      const product = data.products.find((p) => p.id === m.product_id);
      return { ...m, product_name: product ? product.name : "?" };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json(movements);
});

// Chiqim qilish - mahsulot ombordan chiqarilganda (FIFO - eng eski partiyadan boshlab)
router.post("/chiqim", (req, res) => {
  const { product_id, boxes, units, note, destination } = req.body;
  const data = load();

  const product = data.products.find((p) => p.id == product_id);
  if (!product) return res.status(404).json({ error: "Mahsulot topilmadi" });

  const boxesQty = Number(boxes) || 0;
  const unitsQty = Number(units) || 0;
  if (boxesQty <= 0 && unitsQty <= 0) {
    return res.status(400).json({ error: "Chiqim miqdorini kiriting" });
  }

  // Karobka + donani umumiy dona hisobiga o'tkazamiz (har partiyada items_per_box har xil bo'lishi mumkin,
  // shuning uchun mahsulotning asosiy items_per_box qiymatidan foydalanamiz taxminiy hisob uchun,
  // FIFO funksiyasi haqiqiy partiyalar bo'yicha aniq yechadi)
  const approxUnitsNeeded = boxesQty * (product.items_per_box || 1) + unitsQty;

  const { consumed, shortfall } = consumeFIFO(data, product_id, approxUnitsNeeded);

  if (shortfall > 0) {
    return res.status(400).json({
      error: `Omborda yetarli mahsulot yo'q. Yetishmayapti: ${shortfall} dona`,
    });
  }

  const movement = {
    id: nextId(data, "movements"),
    type: "chiqim",
    product_id: product.id,
    batch_id: null,
    qty_boxes: boxesQty,
    qty_units: unitsQty,
    base_units: approxUnitsNeeded,
    source: destination || "",
    note: note || "",
    created_at: new Date().toISOString(),
  };
  data.movements.push(movement);

  consumed.forEach((c) => {
    data.movementBatches.push({
      id: nextId(data, "movementBatches"),
      movement_id: movement.id,
      batch_id: c.batch_id,
      units_taken: c.units_taken,
    });
  });

  save(data);

  // Qaysi partiyalardan (demak, "qayerniki" ekanidan) olinganini ham qaytaramiz
  const originInfo = consumed.map((c) => {
    const batch = data.batches.find((b) => b.id === c.batch_id);
    return {
      batch_id: c.batch_id,
      barcode: batch ? batch.barcode : null,
      source: batch ? batch.source : null,
      units_taken: c.units_taken,
    };
  });

  res.status(201).json({ movement, origin: originInfo });
});

module.exports = router;
