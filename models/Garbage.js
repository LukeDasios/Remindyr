const mongoose = require("mongoose")

const GarbageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  code: {
    type: Number,
    required: true,
  },
  garbageWeek: {
    type: Boolean,
    required: false,
  },
})

const Garbage = mongoose.model("Garbage", GarbageSchema)
module.exports = Garbage
