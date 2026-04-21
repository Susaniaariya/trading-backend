const { model } = require("mongoose");
const { ordersSchema } = require("../schemas/OrdersSchema");
const OrdersModel = new model("order", ordersSchema);
module.exports = { OrdersModel };
