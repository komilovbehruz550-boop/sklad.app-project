const express = require("express");
const { load } = require("../db");

const router = express.Router();

// Oylik hisobot: har bir mahsulot bo'yicha har oy qancha kirim/chiqim bo'lgani
router.get("/monthly", (req, res) => {
  const data = load();
  const productFilter = req.query.product_id;

  const movements = data.movements.filter((m) => m.type === "kirim" || m.type === "chiqim");

  // Guruhlash: { "2026-08": { productId: { kirim, chiqim } } }
  const grouped = {};

  movements.forEach((m) => {
    if (productFilter && m.product_id != productFilter) return;
    const month = m.created_at.slice(0, 7); // YYYY-MM
    if (!grouped[month]) grouped[month] = {};
    if (!grouped[month][m.product_id]) {
      grouped[month][m.product_id] = { kirim: 0, chiqim: 0 };
    }
    grouped[month][m.product_id][m.type] += m.base_units;
  });

  const result = Object.keys(grouped)
    .sort()
    .reverse()
    .map((month) => {
      const products = Object.keys(grouped[month]).map((pid) => {
        const product = data.products.find((p) => p.id == pid);
        return {
          product_id: Number(pid),
          product_name: product ? product.name : "?",
          unit_name: product ? product.unit_name : "dona",
          kirim: grouped[month][pid].kirim,
          chiqim: grouped[month][pid].chiqim,
        };
      });
      return { month, products };
    });

  res.json(result);
});

module.exports = router;
