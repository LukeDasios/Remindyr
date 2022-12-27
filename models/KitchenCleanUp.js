const mongoose = require("mongoose");

const KitchenCleanUpSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  completed: {
    type: Boolean,
    required: true,
  },
  next: {
    type: String,
    required: true,
  },
  counter: {
    type: Number,
    required: true,
  },
});

const KitchenCleanUp = mongoose.model("KitchenCleanUp", KitchenCleanUpSchema);
module.exports = KitchenCleanUp;
