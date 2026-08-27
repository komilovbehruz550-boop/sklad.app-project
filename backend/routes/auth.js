const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { load, save, nextId } = require("../db");
const { JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

// Ro'yxatdan o'tish
router.post("/register", (req, res) => {
  const { username, password, full_name, company_name } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Login va parol majburiy" });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: "Parol kamida 4 ta belgidan iborat bo'lishi kerak" });
  }

  const data = load();
  const exists = data.users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
  if (exists) {
    return res.status(409).json({ error: "Bu login band, boshqasini tanlang" });
  }

  const password_hash = bcrypt.hashSync(password, 10);
  const user = {
    id: nextId(data, "users"),
    username,
    password_hash,
    full_name: full_name || username,
    company_name: company_name || "",
    created_at: new Date().toISOString(),
  };
  data.users.push(user);
  save(data);

  const token = jwt.sign(
    { id: user.id, username: user.username, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, full_name: user.full_name, company_name: user.company_name },
  });
});

// Tizimga kirish
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Login va parol majburiy" });
  }

  const data = load();
  const user = data.users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, full_name: user.full_name, company_name: user.company_name },
  });
});

// Joriy foydalanuvchi ma'lumoti
router.get("/me", require("../middleware/auth").authMiddleware, (req, res) => {
  const data = load();
  const user = data.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
  res.json({ id: user.id, username: user.username, full_name: user.full_name, company_name: user.company_name });
});

module.exports = router;
