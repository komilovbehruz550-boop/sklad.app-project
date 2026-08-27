const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "sklad-maxfiy-kalit-2026";

function authMiddleware(req, res, next) {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Tizimga kirish talab qilinadi (token topilmadi)" });
  }
  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Token yaroqsiz yoki muddati tugagan" });
  }
}

module.exports = { authMiddleware, JWT_SECRET };
