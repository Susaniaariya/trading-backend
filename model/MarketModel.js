const mongoose = require("mongoose");

const MarketSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
});

const MarketModel = mongoose.model("market", MarketSchema);
module.exports = { MarketModel };
