const mongoose = require("mongoose")

const GarbageReturnSchema = new mongoose.Schema({
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

const GarbageReturn = mongoose.model("GarbageReturn", GarbageReturnSchema)
module.exports = GarbageReturn