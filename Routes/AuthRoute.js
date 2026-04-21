const { Signup, Login } = require("../Controllers/AuthController");
const { awardPoints } = require("../Controllers/UserController"); // Import the new controller
const { userVerification } = require("../Middlewares/AuthMiddleware");
const router = require("express").Router();

router.post("/signup", Signup);
router.post("/login", Login);

// Protected route: User must be verified to get points
router.post("/award-points", userVerification, awardPoints);

// Dashboard check
router.post("/", userVerification, (req, res) => {
  res.json({ status: true, user: req.user.username, points: req.user.points });
});
// In your routes file
const { getMe } = require("../Controllers/UserController");

router.get("/me", userVerification, getMe);
module.exports = router;
