// app.js — SkladPro tizimi frontend mantiqi (vanilla JS, build tool talab qilinmaydi)

let PRODUCTS_CACHE = [];

const PAGE_TITLES = {
  dashboard: "Monitoring",
  products: "Mahsulotlar",
  kirim: "Kirim qilish",
  chiqim: "Chiqim qilish",
  scan: "Shtrix-kod skaner",
  reports: "Oylik hisobot",
};

function showToast(message, type = "info") {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.className = "toast " + type;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add("hidden"), 3500);
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* ======================= AUTH ======================= */

function initAuthTabs() {
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".auth-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const isLogin = tab.dataset.tab === "login";
      document.getElementById("login-form").classList.toggle("hidden", !isLogin);
      document.getElementById("register-form").classList.toggle("hidden", isLogin);
    });
  });

  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = document.getElementById("login-error");
    errEl.textContent = "";
    try {
      const username = document.getElementById("login-username").value.trim();
      const password = document.getElementById("login-password").value;
      const data = await api.login({ username, password });
      setToken(data.token);
      setUser(data.user);
      enterApp();
    } catch (err) {
      errEl.textContent = err.message;
    }
  });

  document.getElementById("register-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = document.getElementById("register-error");
    errEl.textContent = "";
    try {
      const payload = {
        full_name: document.getElementById("reg-fullname").value.trim(),
        company_name: document.getElementById("reg-company").value.trim(),
        username: document.getElementById("reg-username").value.trim(),
        password: document.getElementById("reg-password").value,
      };
      const data = await api.register(payload);
      setToken(data.token);
      setUser(data.user);
      enterApp();
    } catch (err) {
      errEl.textContent = err.message;
    }
  });
}

function logout() {
  clearToken();
  document.getElementById("app-screen").classList.add("hidden");
  document.getElementById("auth-screen").classList.remove("hidden");
}

function enterApp() {
  const user = getUser();
  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("app-screen").classList.remove("hidden");
  document.getElementById("user-name").textContent = user.full_name || user.username;
  document.getElementById("user-company").textContent = user.company_name || "Sklad";
  document.getElementById("user-avatar").textContent = (user.full_name || user.username).slice(0, 2).toUpperCase();
  document.getElementById("topbar-date").textContent = new Date().toLocaleDateString("uz-UZ", { day: "2-digit", month: "long", year: "numeric" });
  navigateTo("dashboard");
}

/* ======================= NAVIGATION ======================= */

function initNav() {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => navigateTo(btn.dataset.page));
  });
  document.getElementById("logout-btn").addEventListener("click", logout);
  const mobileLogout = document.getElementById("logout-btn-mobile");
  if (mobileLogout) mobileLogout.addEventListener("click", logout);
}

function navigateTo(page) {
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.page === page));
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.getElementById("page-" + page).classList.add("active");
  document.getElementById("page-title").textContent = PAGE_TITLES[page];

  if (page === "dashboard") loadDashboard();
  if (page === "products") loadProducts();
  if (page === "kirim") loadKirimPage();
  if (page === "chiqim") loadChiqimPage();
  if (page === "reports") loadReports();
}

/* ======================= DASHBOARD ======================= */

async function loadDashboard() {
  try {
    const d = await api.getDashboard();
    document.getElementById("stat-products").textContent = d.total_products;
    document.getElementById("stat-batches").textContent = d.total_batches;
    document.getElementById("stat-kirim").textContent = d.month_kirim;
    document.getElementById("stat-chiqim").textContent = d.month_chiqim;

    const lowEl = document.getElementById("low-stock-list");
    if (d.low_stock.length === 0) {
      lowEl.innerHTML = `<div class="empty-msg">Kam qolgan mahsulot yo'q — hammasi yetarli.</div>`;
    } else {
      lowEl.innerHTML = d.low_stock
        .map(
          (p) => `<div class="list-row">
            <div>
              <div class="list-row-main">${escapeHtml(p.name)}</div>
              <div class="list-row-sub">Min: ${p.min_stock} ${escapeHtml(p.unit_name)}</div>
            </div>
            <span class="badge badge-low">${p.stock.total_units} qoldi</span>
          </div>`
        )
        .join("");
    }

    const recEl = document.getElementById("recent-moves-list");
    if (d.recent_movements.length === 0) {
      recEl.innerHTML = `<div class="empty-msg">Hali harakatlar yo'q.</div>`;
    } else {
      recEl.innerHTML = d.recent_movements
        .map((m) => {
          const badgeClass = m.type === "kirim" ? "badge-in" : m.type === "chiqim" ? "badge-out" : "badge-split";
          const label = m.type === "kirim" ? "Kirim" : m.type === "chiqim" ? "Chiqim" : "Ajratish";
          return `<div class="list-row">
            <div>
              <div class="list-row-main">${escapeHtml(m.product_name)}</div>
              <div class="list-row-sub">${fmtDate(m.created_at)}${m.source ? " · " + escapeHtml(m.source) : ""}</div>
            </div>
            <span class="badge ${badgeClass}">${label}</span>
          </div>`;
        })
        .join("");
    }
  } catch (err) {
    showToast(err.message, "error");
  }
}

/* ======================= PRODUCTS ======================= */

async function loadProducts() {
  try {
    const products = await api.getProducts();
    PRODUCTS_CACHE = products;
    const tbody = document.getElementById("products-tbody");
    if (products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-msg">Hali mahsulot qo'shilmagan.</td></tr>`;
      return;
    }
    tbody.innerHTML = products
      .map(
        (p) => `<tr>
          <td>${escapeHtml(p.name)}</td>
          <td>${escapeHtml(p.category)}</td>
          <td class="mono">${p.items_per_box} ${escapeHtml(p.unit_name)}</td>
          <td class="mono">${p.stock.total_units}</td>
          <td class="mono">${p.stock.total_boxes}</td>
          <td class="mono">${p.min_stock}</td>
          <td><button class="btn btn-small btn-danger" onclick="deleteProduct(${p.id})">O'chirish</button></td>
        </tr>`
      )
      .join("");
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function deleteProduct(id) {
  if (!confirm("Mahsulotni o'chirishga ishonchingiz komilmi?")) return;
  try {
    await api.deleteProduct(id);
    showToast("Mahsulot o'chirildi", "success");
    loadProducts();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function initProductForm() {
  document.getElementById("product-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: document.getElementById("p-name").value.trim(),
        category: document.getElementById("p-category").value.trim() || "Umumiy",
        unit_name: document.getElementById("p-unit").value.trim() || "dona",
        items_per_box: Number(document.getElementById("p-items-per-box").value) || 1,
        price: Number(document.getElementById("p-price").value) || 0,
        min_stock: Number(document.getElementById("p-min-stock").value) || 0,
        barcode: document.getElementById("p-barcode").value.trim() || null,
      };
      await api.createProduct(payload);
      showToast("Mahsulot qo'shildi", "success");
      document.getElementById("product-form").reset();
      document.getElementById("p-items-per-box").value = 1;
      document.getElementById("p-unit").value = "dona";
      loadProducts();
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

/* ======================= KIRIM ======================= */

function fillProductSelect(selectEl, products) {
  selectEl.innerHTML =
    `<option value="">— Mahsulotni tanlang —</option>` +
    products.map((p) => `<option value="${p.id}" data-items-per-box="${p.items_per_box}">${escapeHtml(p.name)} (${p.stock.total_units} ${escapeHtml(p.unit_name)} bor)</option>`).join("");
}

async function loadKirimPage() {
  try {
    const products = await api.getProducts();
    PRODUCTS_CACHE = products;
    fillProductSelect(document.getElementById("k-product"), products);
    await loadBatchesTable();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function loadBatchesTable() {
  try {
    const batches = await api.getBatches();
    const tbody = document.getElementById("batches-tbody");
    if (batches.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-msg">Hali kirim qilinmagan.</td></tr>`;
      return;
    }
    tbody.innerHTML = batches
      .map(
        (b) => `<tr>
          <td>${fmtDate(b.received_date)}</td>
          <td>${escapeHtml(b.product_name)}</td>
          <td>${escapeHtml(b.source)}</td>
          <td class="mono">${escapeHtml(b.barcode)}</td>
          <td class="mono">${b.remaining_boxes}</td>
          <td class="mono">${b.remaining_units}</td>
          <td>
            ${
              b.remaining_boxes > 0
                ? `<button class="btn btn-small" onclick="splitBatchPrompt(${b.id}, ${b.remaining_boxes})">Ajratish</button>`
                : ""
            }
          </td>
        </tr>`
      )
      .join("");
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function splitBatchPrompt(batchId, maxBoxes) {
  const val = prompt(`Nechta karobkani donalarga ajratmoqchisiz? (Mavjud: ${maxBoxes} ta)`, "1");
  if (val === null) return;
  const n = Number(val);
  if (!n || n <= 0) {
    showToast("Noto'g'ri miqdor kiritildi", "error");
    return;
  }
  try {
    const res = await api.splitBatch(batchId, n);
    showToast(`${n} ta karobka donalarga ajratildi`, "success");
    loadBatchesTable();
    loadProducts();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function initKirimForm() {
  const unitTypeSelect = document.getElementById("k-unit-type");
  unitTypeSelect.addEventListener("change", () => {
    const isBox = unitTypeSelect.value === "karobka";
    document.getElementById("k-boxes").style.display = isBox ? "block" : "none";
    document.getElementById("k-items-per-box").style.display = isBox ? "block" : "none";
    document.getElementById("k-units").style.display = isBox ? "none" : "block";
  });

  document.getElementById("k-product").addEventListener("change", (e) => {
    const opt = e.target.selectedOptions[0];
    if (opt && opt.dataset.itemsPerBox) {
      document.getElementById("k-items-per-box").value = opt.dataset.itemsPerBox;
    }
  });

  document.getElementById("kirim-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = document.getElementById("kirim-error");
    const resultEl = document.getElementById("kirim-result");
    errEl.textContent = "";
    resultEl.classList.add("hidden");

    try {
      const unitType = unitTypeSelect.value;
      const payload = {
        product_id: Number(document.getElementById("k-product").value),
        source: document.getElementById("k-source").value.trim(),
        unit_type: unitType,
        boxes_count: Number(document.getElementById("k-boxes").value) || 0,
        units_count: Number(document.getElementById("k-units").value) || 0,
        items_per_box: Number(document.getElementById("k-items-per-box").value) || undefined,
        barcode: document.getElementById("k-barcode").value.trim(),
        note: document.getElementById("k-note").value.trim(),
      };
      if (!payload.product_id) {
        errEl.textContent = "Mahsulotni tanlang";
        return;
      }
      const res = await api.createBatch(payload);
      resultEl.classList.remove("hidden");
      resultEl.innerHTML = `Kirim muvaffaqiyatli qo'shildi. Shtrix-kod: <span class="mono" style="color:var(--accent)">${res.batch.barcode}</span> — bu kodni karobkaga yopishtiring.`;
      showToast("Kirim qilindi", "success");
      document.getElementById("kirim-form").reset();
      document.getElementById("k-items-per-box").value = "";
      loadBatchesTable();
      loadKirimPage();
    } catch (err) {
      errEl.textContent = err.message;
    }
  });
}

/* ======================= CHIQIM ======================= */

async function loadChiqimPage() {
  try {
    const products = await api.getProducts();
    PRODUCTS_CACHE = products;
    fillProductSelect(document.getElementById("c-product"), products);
    await loadChiqimTable();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function loadChiqimTable() {
  try {
    const movements = await api.getMovements({ type: "chiqim" });
    const tbody = document.getElementById("chiqim-tbody");
    if (movements.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-msg">Hali chiqim qilinmagan.</td></tr>`;
      return;
    }
    tbody.innerHTML = movements
      .map(
        (m) => `<tr>
          <td>${fmtDate(m.created_at)}</td>
          <td>${escapeHtml(m.product_name)}</td>
          <td class="mono">${m.qty_boxes ? m.qty_boxes + " karobka " : ""}${m.qty_units ? m.qty_units + " dona" : ""}</td>
          <td>${escapeHtml(m.source || "—")}</td>
          <td>${escapeHtml(m.note || "—")}</td>
        </tr>`
      )
      .join("");
  } catch (err) {
    showToast(err.message, "error");
  }
}

function initChiqimForm() {
  document.getElementById("chiqim-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = document.getElementById("chiqim-error");
    const resultEl = document.getElementById("chiqim-result");
    errEl.textContent = "";
    resultEl.classList.add("hidden");
    try {
      const payload = {
        product_id: Number(document.getElementById("c-product").value),
        boxes: Number(document.getElementById("c-boxes").value) || 0,
        units: Number(document.getElementById("c-units").value) || 0,
        destination: document.getElementById("c-destination").value.trim(),
        note: document.getElementById("c-note").value.trim(),
      };
      if (!payload.product_id) {
        errEl.textContent = "Mahsulotni tanlang";
        return;
      }
      const res = await api.createChiqim(payload);
      resultEl.classList.remove("hidden");
      const originLines = res.origin
        .map((o) => `${o.units_taken} dona — <span class="mono" style="color:var(--accent)">${o.barcode || "—"}</span> (${escapeHtml(o.source || "?")})`)
        .join("<br/>");
      resultEl.innerHTML = `Chiqim amalga oshirildi. Qaysi partiyalardan olindi:<br/>${originLines}`;
      showToast("Chiqim qilindi", "success");
      document.getElementById("chiqim-form").reset();
      loadChiqimTable();
      loadChiqimPage();
    } catch (err) {
      errEl.textContent = err.message;
    }
  });
}

/* ======================= SCAN ======================= */

function renderScanResult(data) {
  const el = document.getElementById("scan-result");
  if (data.type === "batch") {
    const b = data.batch;
    const p = data.product;
    el.innerHTML = `
      <div class="scan-card">
        <div class="scan-card-title">${escapeHtml(p.name)}</div>
        <div class="scan-card-barcode">${escapeHtml(b.barcode)}</div>
        <div class="scan-grid">
          <div class="scan-field"><div class="scan-field-label">Qayerdan kelgan</div><div class="scan-field-value">${escapeHtml(b.source)}</div></div>
          <div class="scan-field"><div class="scan-field-label">Kirim sanasi</div><div class="scan-field-value">${fmtDate(b.received_date)}</div></div>
          <div class="scan-field"><div class="scan-field-label">Qolgan karobka</div><div class="scan-field-value">${b.remaining_boxes}</div></div>
          <div class="scan-field"><div class="scan-field-label">Qolgan dona</div><div class="scan-field-value">${b.remaining_units}</div></div>
          <div class="scan-field"><div class="scan-field-label">1 karobkada</div><div class="scan-field-value">${b.items_per_box} dona</div></div>
          <div class="scan-field"><div class="scan-field-label">Izoh</div><div class="scan-field-value">${escapeHtml(b.note || "—")}</div></div>
        </div>
      </div>`;
  } else if (data.type === "product") {
    const p = data.product;
    const rows = data.batches
      .map((b) => `<tr><td>${fmtDate(b.received_date)}</td><td>${escapeHtml(b.source)}</td><td class="mono">${b.barcode}</td><td class="mono">${b.remaining_boxes}</td><td class="mono">${b.remaining_units}</td></tr>`)
      .join("");
    el.innerHTML = `
      <div class="scan-card">
        <div class="scan-card-title">${escapeHtml(p.name)}</div>
        <div class="scan-card-barcode">Mahsulotning umumiy shtrix-kodi: ${escapeHtml(p.barcode)}</div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Sana</th><th>Qayerdan</th><th>Partiya kodi</th><th>Karobka</th><th>Dona</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="5" class="empty-msg">Partiyalar yo'q</td></tr>`}</tbody>
          </table>
        </div>
      </div>`;
  }
}

function initScanForm() {
  document.getElementById("scan-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = document.getElementById("scan-input").value.trim();
    const el = document.getElementById("scan-result");
    if (!code) return;
    try {
      const data = await api.scanBarcode(code);
      renderScanResult(data);
    } catch (err) {
      el.innerHTML = `<div class="scan-card"><div class="empty-msg">${escapeHtml(err.message)}</div></div>`;
    }
  });
}

/* ======================= REPORTS ======================= */

async function loadReports() {
  try {
    const report = await api.getMonthlyReport();
    const container = document.getElementById("reports-container");
    if (report.length === 0) {
      container.innerHTML = `<div class="empty-msg">Hali ma'lumot yo'q.</div>`;
      return;
    }
    container.innerHTML = report
      .map((r) => {
        const rows = r.products
          .map(
            (p) => `<tr>
              <td>${escapeHtml(p.product_name)}</td>
              <td class="mono" style="color:var(--green)">+${p.kirim} ${escapeHtml(p.unit_name)}</td>
              <td class="mono" style="color:var(--red)">-${p.chiqim} ${escapeHtml(p.unit_name)}</td>
              <td class="mono">${p.kirim - p.chiqim}</td>
            </tr>`
          )
          .join("");
        return `<div class="report-month">
          <div class="report-month-title">${r.month}</div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Mahsulot</th><th>Kirim</th><th>Chiqim</th><th>Net o'zgarish</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>`;
      })
      .join("");
  } catch (err) {
    showToast(err.message, "error");
  }
}

/* ======================= UTIL ======================= */

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ======================= INIT ======================= */

document.addEventListener("DOMContentLoaded", () => {
  initAuthTabs();
  initNav();
  initProductForm();
  initKirimForm();
  initChiqimForm();
  initScanForm();

  if (getToken() && getUser()) {
    enterApp();
  }
});
