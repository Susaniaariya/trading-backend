const User = require("../model/UserModel");
const jwt = require("jsonwebtoken");

module.exports.userVerification = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res
      .status(401)
      .json({ status: false, message: "No token provided" });
  }

  // Extract the actual token from the request header
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!token) {
    return res
      .status(401)
      .json({ status: false, message: "Token format invalid" });
  }

  jwt.verify(token, "MY_SECRET_KEY", async (err, data) => {
    if (err) {
      return res.status(401).json({ status: false, message: "Invalid token" });
    }

    const foundUser = await User.findById(data.id);

    if (foundUser) {
      req.user = foundUser;
      next();
    } else {
      return res.status(404).json({ status: false, message: "User not found" });
    }
  });
};
