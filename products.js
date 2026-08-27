const express = require("express");
const { load, save, nextId } = require("../db");
const { computeProductStock } = require("../stockUtils");

const router = express.Router();

// Barcha mahsulotlar ro'yxati (joriy qoldiq bilan)
router.get("/", (req, res) => {
  const data = load();
  const products = data.products.map((p) => {
    const stock = computeProductStock(data, p.id);
    return { ...p, stock };
  });
  res.json(products);
});

// Bitta mahsulot
router.get("/:id", (req, res) => {
  const data = load();
  const product = data.products.find((p) => p.id == req.params.id);
  if (!product) return res.status(404).json({ error: "Mahsulot topilmadi" });
  const stock = computeProductStock(data, product.id);
  const batches = data.batches.filter((b) => b.product_id == product.id);
  res.json({ ...product, stock, batches });
});

// Yangi mahsulot qo'shish
router.post("/", (req, res) => {
  const { name, category, unit_name, items_per_box, default_supplier, price, min_stock, barcode } = req.body;
  if (!name) return res.status(400).json({ error: "Mahsulot nomi majburiy" });

  const data = load();

  if (barcode) {
    const dup = data.products.find((p) => p.barcode === barcode);
    if (dup) return res.status(409).json({ error: "Bu shtrix-kod boshqa mahsulotda mavjud" });
  }

  const product = {
    id: nextId(data, "products"),
    name,
    barcode: barcode || null,
    category: category || "Umumiy",
    unit_name: unit_name || "dona",
    items_per_box: Number(items_per_box) || 1,
    default_supplier: default_supplier || "",
    price: Number(price) || 0,
    min_stock: Number(min_stock) || 0,
    created_at: new Date().toISOString(),
  };
  data.products.push(product);
  save(data);
  res.status(201).json(product);
});

// Mahsulotni tahrirlash
router.put("/:id", (req, res) => {
  const data = load();
  const product = data.products.find((p) => p.id == req.params.id);
  if (!product) return res.status(404).json({ error: "Mahsulot topilmadi" });

  const fields = ["name", "category", "unit_name", "items_per_box", "default_supplier", "price", "min_stock", "barcode"];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) product[f] = req.body[f];
  });
  save(data);
  res.json(product);
});

// Mahsulotni o'chirish
router.delete("/:id", (req, res) => {
  const data = load();
  const idx = data.products.findIndex((p) => p.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Mahsulot topilmadi" });

  const hasBatches = data.batches.some((b) => b.product_id == req.params.id);
  if (hasBatches) {
    return res.status(400).json({ error: "Bu mahsulot bo'yicha kirim tarixi mavjud, o'chirib bo'lmaydi" });
  }
  data.products.splice(idx, 1);
  save(data);
  res.json({ success: true });
});

module.exports = router;
