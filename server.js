require("dotenv").config()
const express = require("express")
const app = express()
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server listening on port ${3000}...`)
})

app.get("/", (req, res) => {
  res.send("Hello there!")
})

app.post("/receiver", (req, res) => {
  console.log(res.body)
})
