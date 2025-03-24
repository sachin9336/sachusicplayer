import jwt from "jsonwebtoken";

export const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(403).json({ message: "No token provided" });
  }

  const tokenParts = authHeader.split(" ");
  if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
    return res.status(401).json({ message: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(tokenParts[1], process.env.JWT_SECRET);

    if (!decoded || typeof decoded.isAdmin === "undefined") {
      return res.status(403).json({ message: "Unauthorized: Admin access required" });
    }

    if (!decoded.isAdmin) {
      return res.status(403).json({ message: "Unauthorized: Admin privileges needed" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error("JWT Verification Error:", error.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
