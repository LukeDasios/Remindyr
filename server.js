require("dotenv").config()
const express = require("express")
const app = express()
const PORT = process.env.PORT || 3000
const ACCOUNT_SID = process.env.ACCOUNT_SID
const AUTH_TOKEN = process.env.AUTH_TOKEN

const client = require("twilio")(ACCOUNT_SID, AUTH_TOKEN)

app.listen(PORT, () => {
  console.log(`Server listening on port ${3000}...`)
})

app.get("/", (req, res) => {
  res.send("Hello there!")
})

// Upon receiving a "help" message from a user, respond with what Chore-Bot can do
app.get("/help", (req, res) => {
  client.messages.create({
    body: `
    Commands:

    help -> see all commands
    debt-collector -> see how to use the debt-collector service
    `,
    from: TWILIO_PHONE_NUMBER,
    to: numbers[iter], // Whoever requested this info, get from req.body
  })
})

// Cron-job that runs once a day, and messages everyone who has an outstanding debt
app.get("/debt-collector", (req, res) => {})

app.get("/debt-collector/:persons/:amount", (req, res) => {
  let obj = req.params
  let names = obj.persons.split("").filter((el) => el !== " ").join("").split(",")
  let amount = parseFloat(obj.amount)

  if (names.length === 1) {

  } else if (names.length > 1 && names.length < 5) {

  } else {

  }

  res.send({
    names,
    amount,
  })
})

function validateNames(names) {
  
}

app.get("/chore-pinger", (req, res) => {})

// Testing the endpoint
app.get("/receiver", (req, res) => {
  console.log(res.body)
  res.send("Thanks!")
})
