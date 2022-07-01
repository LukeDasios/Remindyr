require("dotenv").config()
const express = require("express")
const app = express()
const PORT = process.env.PORT || 3000
const ACCOUNT_SID = process.env.ACCOUNT_SID
const AUTH_TOKEN = process.env.AUTH_TOKEN

const client = require("twilio")(ACCOUNT_SID, AUTH_TOKEN)

let garbageWeek = true
const theBoys = ["Luke", "Duncan", "Sam", "Jp"]
const numbers = ["+16479385063", "+14168261333", "+14168447692", "+14166169331"]
let iter = 1
let towel = 3

// Borrower: [Lender, Amount]
let oustandingDebts = new Map() // Maps names to how much is owed and to who

function whoIsNext(num) {
  num === 3 ? "Luke" : theBoys[num + 1]
}

function validateNames(names) {
  return names.every((name) => theBoys.includes(name))
}

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
  let names = obj.persons
    .split("")
    .filter((el) => el !== " ")
    .join("")
    .split(",")
  let amount = parseFloat(obj.amount)

  if (validateNames(names)) {
    // Send a confirmation text to the lender saying that the collector has been deployed
    client.messages.create({
      body: `
      Commands:

      help -> see all commands
      debt-collector -> see how to use the debt-collector service
      `,
      from: TWILIO_PHONE_NUMBER,
      to: numbers[iter], // Whoever requested this info, get from req.body
    })

    // Send an initial text to the borrow saying that they owe the lender $
  } else {
  }

  res.send({
    names,
    amount,
  })
})

app.get("/chore-pinger", (req, res) => {})

// Testing the endpoint
app.get("/receiver", (req, res) => {
  console.log(res.body)
  res.send("Thanks!")
})
