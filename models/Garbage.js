const mongoose = require("mongoose")

const GarbageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  garbageWeek: {
    type: Boolean,
    required: false,
  },
  completed: {
    type: Boolean,
    required: true,
  },
  next: {
    type: String,
    required: true,
  },
})

const Garbage = mongoose.model("Garbage", GarbageSchema)
module.exports = Garbage
