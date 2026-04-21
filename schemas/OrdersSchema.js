const { Schema, Types } = require("mongoose"); // ✅ This was missing!

const ordersSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    name: String,
    qty: Number,
    price: Number,
    mode: String,
  },
  { timestamps: true },
); // ✅ This adds the createdAt/updatedAt fields

module.exports = { ordersSchema }; // ✅ Use this instead of 'export'
