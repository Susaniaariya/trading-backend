require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Models
const { HoldingsModel } = require("./model/HoldingsModel");
const { PositionsModel } = require("./model/PositionsModel");
const { OrdersModel } = require("./model/OrdersModel");
const { MarketModel } = require("./model/MarketModel");
const User = require("./model/UserModel");

// Middleware & Controllers
const { userVerification } = require("./Middlewares/AuthMiddleware");

const PORT = process.env.PORT || 3002;
const uri = process.env.MONGO_URL;
const SECRET_KEY = "MY_SECRET_KEY";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(bodyParser.json());

// --- Authentication Routes ---
app.post("/signup", async (req, res) => {
  try {
    const { email, password, username } = req.body;
    const user = await User.create({ email, password, username });
    const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: "1d" });
    res.status(201).json({
      message: "Welcome aboard!",
      success: true,
      token,
      username: user.username,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ message: "This email is already registered.", success: false });
    }
    res
      .status(500)
      .json({ message: "An unexpected error occurred", success: false });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ message: "User not found", success: false });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.json({ message: "Wrong password", success: false });
    const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: "1d" });
    res.json({ message: "Logged in!", success: true, token });
  } catch (err) {
    res.json({ message: "Login failed", success: false });
  }
});

// --- User Profile Route ---
app.get("/me", userVerification, (req, res) => {
  try {
    if (!req.user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.json({
      username: req.user.username,
      email: req.user.email,
      virtualBalance: req.user.virtualBalance || 0, // ✅ trading wallet
      points: req.user.points || 0, // ✅ quiz points
      completedLessons: req.user.completedLessons || [],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// --- Trading & Portfolio Routes ---
app.get("/allHoldings", userVerification, async (req, res) => {
  let allHoldings = await HoldingsModel.find({ userId: req.user._id });
  res.json(allHoldings);
});

// Change this in your backend/index.js
app.get("/allPositions", userVerification, async (req, res) => {
  try {
    const allPositions = await PositionsModel.find({}); // Empty {} finds everything
    res.json(allPositions);
  } catch (error) {
    res.status(500).json({ error: "Data fetch failed" });
  }
});

app.get("/allOrders", userVerification, async (req, res) => {
  const allOrders = await OrdersModel.find({ userId: req.user._id });
  res.json(allOrders);
});

app.post("/newOrder", userVerification, async (req, res) => {
  try {
    const { name, qty, mode } = req.body;
    const userId = req.user._id;
    const quantity = Number(qty);

    const marketStock = await MarketModel.findOne({ name });
    const user = await User.findById(userId);

    if (!marketStock)
      return res.status(404).json({ message: "Stock not found" });

    const officialPrice = marketStock.price;
    const totalTransactionValue = officialPrice * quantity;

    // --- BUY LOGIC ---
    if (mode === "BUY") {
      if (user.virtualBalance < totalTransactionValue) {
        return res.status(400).json({ message: "Insufficient funds to buy!" });
      }

      user.virtualBalance -= totalTransactionValue;
      await user.save();

      // 1. Update Holdings
      let holding = await HoldingsModel.findOne({ userId, name });
      if (holding) {
        const newTotalQty = holding.qty + quantity;
        holding.avg =
          (holding.avg * holding.qty + totalTransactionValue) / newTotalQty;
        holding.qty = newTotalQty;
        await holding.save();
      } else {
        await HoldingsModel.create({
          userId,
          name,
          qty: quantity,
          avg: officialPrice,
          price: officialPrice,
          net: "+0.00%",
          day: "+0.00%",
        });
      }

      // 2. Update Positions (THIS WAS MISSING)
      let position = await PositionsModel.findOne({ userId, name });
      if (position) {
        position.qty += quantity;
        await position.save();
      } else {
        await PositionsModel.create({
          userId,
          name,
          qty: quantity,
          avg: officialPrice,
          price: officialPrice,
          product: "CNC",
          day: "+0.00%",
          isLoss: false,
        });
      }
    }

    // --- SELL LOGIC ---
    else if (mode === "SELL") {
      let holding = await HoldingsModel.findOne({ userId, name });
      let position = await PositionsModel.findOne({ userId, name });

      if (!holding || holding.qty < quantity) {
        return res
          .status(400)
          .json({ message: "You don't own enough shares to sell!" });
      }

      user.virtualBalance += totalTransactionValue;
      await user.save();

      // Update Holdings
      holding.qty -= quantity;
      if (holding.qty === 0) {
        await HoldingsModel.deleteOne({ userId, name });
      } else {
        await holding.save();
      }

      // Update Positions (THIS WAS MISSING)
      if (position) {
        position.qty -= quantity;
        if (position.qty <= 0) {
          await PositionsModel.deleteOne({ userId, name });
        } else {
          await position.save();
        }
      }
    }

    // 3. Create Order Record
    await OrdersModel.create({
      userId,
      name,
      qty: quantity,
      price: officialPrice,
      mode,
    });

    res.status(201).json({
      message: `${mode} successful! Price: ₹${officialPrice.toFixed(2)}`,
      newBalance: user.virtualBalance,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Transaction failed. Try again." });
  }
});

// --- Quiz Routes ---
app.post("/quiz/answer", userVerification, async (req, res) => {
  try {
    const { difficulty, correct } = req.body;
    if (!correct)
      return res.json({ message: "Wrong answer, no points awarded" });

    const pointsMap = { easy: 50, medium: 150, hard: 300 };
    const pointsEarned = pointsMap[difficulty] || 50;

    const user = await User.findById(req.user._id);
    user.points += pointsEarned; // ✅ quiz points only
    await user.save();

    res.json({ message: `+${pointsEarned} points!`, newPoints: user.points });
  } catch (err) {
    res.status(500).json({ message: "Failed to award points" });
  }
});

app.post("/quiz/complete-lesson", userVerification, async (req, res) => {
  try {
    const { lessonId } = req.body;
    const user = await User.findById(req.user._id);

    if (user.completedLessons.includes(lessonId)) {
      return res.json({
        message: "Lesson already completed",
        newPoints: user.points,
      });
    }

    user.completedLessons.push(lessonId);
    user.points += 500; // ✅ quiz points only
    await user.save();

    res.json({
      message: "Lesson complete! +500 points!",
      newPoints: user.points,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to award lesson bonus" });
  }
});

// --- Live Market Logic ---
app.get("/allMarketPrices", async (req, res) => {
  const prices = await MarketModel.find();
  res.json(prices);
});

const seedMarket = async () => {
  const stockList = [
    { name: "GLOSSIER", price: 120, basePrice: 120 },
    { name: "RARE", price: 95, basePrice: 95 },
    { name: "RHODE", price: 60, basePrice: 60 },
    { name: "ELF", price: 35, basePrice: 35 },
    { name: "FENTY", price: 180, basePrice: 180 },
    { name: "NARS", price: 75, basePrice: 75 },
    { name: "HUDA", price: 40, basePrice: 40 },
    { name: "TATCHA", price: 110, basePrice: 110 },
    { name: "CHARLOTTE", price: 55, basePrice: 55 },
  ];

  for (let stock of stockList) {
    await MarketModel.findOneAndUpdate(
      { name: stock.name },
      { $set: { price: stock.price, basePrice: stock.basePrice } },
      { upsert: true },
    );
  }
};
seedMarket();

setInterval(async () => {
  try {
    const marketStocks = await MarketModel.find();
    for (let stock of marketStocks) {
      const rand = Math.random();
      let changePercent;

      if (rand < 0.6) {
        changePercent = Math.random() * 1.0 - 0.5;
      } else if (rand < 0.85) {
        changePercent = Math.random() * 3.0 - 1.5;
      } else if (rand < 0.97) {
        changePercent = Math.random() * 6.0 - 3.0;
      } else {
        changePercent = Math.random() * 12.0 - 6.0;
      }

      // Mean reversion - pulls price back toward basePrice
      const basePrice = stock.basePrice || stock.price;
      const drift = (basePrice - stock.price) / basePrice;
      changePercent += drift * 10;

      const newPrice = Math.max(
        1,
        Number((stock.price * (1 + changePercent / 100)).toFixed(2)),
      );

      await MarketModel.updateOne(
        { _id: stock._id },
        { $set: { price: newPrice } },
      );
      await HoldingsModel.updateMany(
        { name: stock.name },
        { $set: { price: newPrice } },
      );
    }
  } catch (err) {
    console.error("Sync Error:", err);
  }
}, 2000);

// Prevent crashes from MongoDB timeouts
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err.message);
});

// --- Database Connection ---
mongoose
  .connect(uri)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("MongoDB connection error:", err));
