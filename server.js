const express = require("express");
const cors = require("cors");
const path = require("path");

const { authMiddleware } = require("./middleware/auth");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const batchRoutes = require("./routes/batches");
const movementRoutes = require("./routes/movements");
const reportRoutes = require("./routes/reports");
const dashboardRoutes = require("./routes/dashboard");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Ochiq (login talab qilinmaydigan) yo'nalishlar
app.use("/api/auth", authRoutes);

// Qolgan barcha /api yo'nalishlari uchun tizimga kirgan bo'lish shart
app.use("/api/products", authMiddleware, productRoutes);
app.use("/api/batches", authMiddleware, batchRoutes);
app.use("/api/movements", authMiddleware, movementRoutes);
app.use("/api/reports", authMiddleware, reportRoutes);
app.use("/api/dashboard", authMiddleware, dashboardRoutes);

// Frontend statik fayllarini ham shu serverdan xizmat qilish (ixtiyoriy, qulaylik uchun)
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Sklad backend server ${PORT}-portda ishga tushdi`);
  console.log(`Brauzerda oching: http://localhost:${PORT}`);
});
