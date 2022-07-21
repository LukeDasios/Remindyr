const mongoose = require("mongoose")

const TowelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  code: {
    type: Number,
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
})

const Towel = mongoose.model("Towel", TowelSchema)
module.exports = Towel
