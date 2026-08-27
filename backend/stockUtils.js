// stockUtils.js
// Mahsulot qoldig'ini hisoblash va FIFO usulida chiqim yozish uchun yordamchi funksiyalar.

// Bitta mahsulotning umumiy joriy qoldig'ini (dona hisobida) hisoblaydi.
// Qoldiq = barcha partiyalardagi (qolgan_karobka * karobkadagi_dona) + qolgan_dona
function computeProductStock(data, productId) {
  const batches = data.batches.filter((b) => b.product_id == productId);
  let totalUnits = 0;
  let totalBoxes = 0;
  batches.forEach((b) => {
    totalUnits += b.remaining_units + b.remaining_boxes * b.items_per_box;
    totalBoxes += b.remaining_boxes;
  });
  return {
    total_units: totalUnits, // umumiy dona hisobida
    total_boxes: totalBoxes, // to'liq (ajratilmagan) karobkalar soni
  };
}

// Berilgan mahsulot uchun eng eski partiyalardan (FIFO) kerakli miqdorni (dona hisobida) yechib oladi.
// Qaysi partiyalardan qancha olinganini array qilib qaytaradi: [{batch_id, units_taken}]
function consumeFIFO(data, productId, unitsNeeded) {
  const batches = data.batches
    .filter((b) => b.product_id == productId && (b.remaining_units + b.remaining_boxes * b.items_per_box) > 0)
    .sort((a, b) => new Date(a.received_date) - new Date(b.received_date));

  let remaining = unitsNeeded;
  const consumed = [];

  for (const batch of batches) {
    if (remaining <= 0) break;

    // Avval bo'sh (ajratilgan) donalardan, keyin to'liq karobkalarni "ochib" foydalanamiz
    let availableInBatch = batch.remaining_units + batch.remaining_boxes * batch.items_per_box;
    if (availableInBatch <= 0) continue;

    const take = Math.min(remaining, availableInBatch);
    let takeLeft = take;

    // Avval loose (ajratilgan) donalardan yechamiz
    const fromLoose = Math.min(takeLeft, batch.remaining_units);
    batch.remaining_units -= fromLoose;
    takeLeft -= fromLoose;

    // Qolganini karobkalardan yechamiz (kerak bo'lsa karobkani "ochib" qisman ishlatamiz)
    if (takeLeft > 0) {
      const boxesNeeded = Math.ceil(takeLeft / batch.items_per_box);
      const boxesUsed = Math.min(boxesNeeded, batch.remaining_boxes);
      const unitsFromBoxes = boxesUsed * batch.items_per_box;
      batch.remaining_boxes -= boxesUsed;

      const leftoverFromOpenedBoxes = unitsFromBoxes - takeLeft;
      if (leftoverFromOpenedBoxes > 0) {
        // Ochilgan karobkadan ortib qolgan donalar loose units sifatida qaytariladi
        batch.remaining_units += leftoverFromOpenedBoxes;
      }
      takeLeft = 0;
    }

    consumed.push({ batch_id: batch.id, units_taken: take });
    remaining -= take;
  }

  return { consumed, shortfall: remaining }; // shortfall > 0 bo'lsa, yetarli mahsulot yo'q
}

module.exports = { computeProductStock, consumeFIFO };
