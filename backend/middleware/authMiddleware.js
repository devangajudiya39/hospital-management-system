const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "hospital-secret-key";

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Access Denied: No Token Provided" });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ message: "Invalid Token" });
  }
};

const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || (!allowedRoles.includes(req.user.role) && req.user.role !== "admin")) {
      return res.status(403).json({ message: "Access Denied: You don't have permission" });
    }
    next();
  };
};

module.exports = { authenticate, authorizeRole, JWT_SECRET };
