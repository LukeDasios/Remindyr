require("dotenv").config()
const express = require("express")
const app = express()
const PORT = process.env.PORT || 3000
const ACCOUNT_SID = process.env.ACCOUNT_SID
const AUTH_TOKEN = process.env.AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER

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

function generateCode() {
  let code = ""

  for (let i = 0; i < 3; i++) {
    code += (Math.random() * 10).toString()
  }

  return code
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

app.get("/debt-collector/:from/:persons/:amount", (req, res) => {
  let obj = req.params
  let names = obj.persons
    .split("")
    .filter((el) => el !== " ")
    .join("")
    .split(",")
  let amount = parseFloat(obj.amount)
  let sender = obj.sender

  if (validateNames(names)) {
    // Send a confirmation text to the lender saying that their debt collector has been deployed
    let borrowers = ""
    for (let i = 0; i < names.length; i++) {
      let str = ""
      if (i !== names.length - 1) {
        str = `${names[i]}, `
      } else {
        str = `and ${names[i]}`
      }
      borrowers += str
    }

    client.messages.create({
      body: `Hi ${sender}! I'm Vecna, your personal debt collector. I'll remind ${borrowers} every day until you get your ${amount} back.`,
      from: TWILIO_PHONE_NUMBER,
      to: sender,
    })

    // Send an initial text to the borrower(s) saying that they owe the lender $
    amount = (amount / names.length).toFixed(2)
    code = generateCode()

    for (let i = 0; i < names.length; i++) {
      client.messages.create({
        body: `Hi ${names[i]}! My name is Vecna, I'm a debt collector working for ${sender}. It has come to my attention that you owe my client $${amount}. Respond with ${code} when you've paid your debts and I'll leave your soul alone.`,
        from: TWILIO_PHONE_NUMBER,
        to: numbers[theBoys.indexOf(names[i])],
      })
    }
  } else {
    // Send a text to the chore-collector requester to say that the message has failed
    client.messages.create({
      body: `Your debt collector has not been deployed. Text me "debt-collector" to learn how to properly use this service.`,
      from: TWILIO_PHONE_NUMBER,
      to: sender,
    })
  }
})

app.get("/chore-pinger", (req, res) => {})

// Testing the endpoint
app.get("/receiver", (req, res) => {
  console.log(res.body)
  res.send("Thanks!")
})
