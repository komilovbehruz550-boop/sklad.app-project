const express = require("express");
const { load } = require("../db");
const { computeProductStock } = require("../stockUtils");

const router = express.Router();

router.get("/", (req, res) => {
  const data = load();
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);

  const products = data.products.map((p) => {
    const stock = computeProductStock(data, p.id);
    return { ...p, stock };
  });

  const lowStock = products.filter((p) => p.stock.total_units <= (p.min_stock || 0));

  const monthMovements = data.movements.filter((m) => m.created_at.startsWith(currentMonth));
  const monthKirim = monthMovements
    .filter((m) => m.type === "kirim")
    .reduce((sum, m) => sum + m.base_units, 0);
  const monthChiqim = monthMovements
    .filter((m) => m.type === "chiqim")
    .reduce((sum, m) => sum + m.base_units, 0);

  const recentMovements = [...data.movements]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 15)
    .map((m) => {
      const product = data.products.find((p) => p.id === m.product_id);
      return { ...m, product_name: product ? product.name : "?" };
    });

  res.json({
    total_products: data.products.length,
    total_batches: data.batches.length,
    current_month: currentMonth,
    month_kirim: monthKirim,
    month_chiqim: monthChiqim,
    low_stock: lowStock,
    recent_movements: recentMovements,
  });
});

module.exports = router;
