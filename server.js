require("dotenv").config()
const app = require("express")()
const bodyParser = require("body-parser")
const e = require("express")

const PORT = process.env.PORT || 3000
const ACCOUNT_SID = process.env.ACCOUNT_SID
const AUTH_TOKEN = process.env.AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER

const client = require("twilio")(ACCOUNT_SID, AUTH_TOKEN)
const MessagingResponse = require("twilio").twiml.MessagingResponse

let garbageWeek = false
const theBoys = ["Luke", "Duncan", "Sam", "Jp"]
const numbers = ["+16479385063", "+14168261333", "+14168447692", "+14166169331"]
let iter = 2
let towel = 0

// Chore-Assignee -> verification code
let oustandingTowelChore = new Map() // Maps names to the verification code

// Chore-Assignee -> verification code
let outStandingGarbageChore = new Map() // Maps names to the verification code

// Borrower -> [Lender, Code, Amount]
let oustandingDebts = new Map() // Maps names to who is owed, the verification code, and the amount
for (let i = 0; i < theBoys.length; i++) {
  let name = theBoys[i]
  oustandingDebts.set(name, [])
  oustandingChores.set(name, [])
}

function whoIsNext(num) {
  num === 3 ? "Luke" : theBoys[num + 1]
}

function validateNames(names) {
  return names.every((name) => theBoys.includes(name))
}

function validDebtCollectorUsage(msg) {
  msg = msg.trim().slice(15)

  let i = 0
  let names = []
  let amount = ""
  let temp = ""

  while (i < msg.length) {
    let char = msg[i]
    if (char === "|") {
      names.push(temp)
      for (let j = i + 2; j < msg.length; j++) {
        amount += msg[j]
      }
      i = msg.length
    } else if (char === ",") {
      names.push(temp)
      temp = ""
    } else {
      if (char !== " ") temp += char
    }
    i++
  }

  amount = parseFloat((parseFloat(amount) / names.length).toFixed(2))

  let flag = true
  for (i = 0; i < names.length; i++) {
    if (!theBoys.includes(names[i])) flag = false
  }

  if (amount < 0) flag = false

  if (flag) {
    return {
      bool: true,
      names: [...names],
      amount: amount,
    }
  } else {
    return {
      bool: false,
      names: null,
      amount: null,
    }
  }
}

function generateGarbageChoreCode() {
  let code = "G"

  for (let i = 0; i < 3; i++) {
    code += (Math.random() * 10).toString()
  }

  return code
}

function generateTowelChoreCode() {
  let code = "T"

  for (let i = 0; i < 3; i++) {
    code += (Math.random() * 10).toString()
  }

  return code
}

function generateDebtCollectionCode() {
  let code = "C"

  for (let i = 0; i < 3; i++) {
    code += (Math.random() * 10).toString()
  }

  return code
}

app.use(bodyParser.urlencoded({ extended: false }))

app.listen(PORT, () => {
  console.log(`Server listening on port ${3000}...`)
})

app.get("/", (req, res) => {
  res.send("Hello there!")
})

app.get("/once_per_hour", (req, res) => {
  res.send("Testing!")
  // Check to see if there are any outstanding important chores
  // Message the person with the outstanding important chore
})

app.get("/once_per_day", (req, res) => {
  res.send("Testing!")
  // Check to see if there are any outstanding debts
  // Message everyone with an outstanding debt
})

app.get("/once_per_selected_days", (req, res) => {
  let date = Date.now()
  let day = date.getDay()

  if (day === 6) {
    //Saturday
    client.messages.create({
      body: `Good Afternoon ${
        theBoys[iter]
      }! Empty the Recycling, Green bin, and Garbage one last time so that ${whoIsNext(
        iter
      )} may start their week with a clean slate. After that, you are free!`,
      from: TWILIO_PHONE_NUMBER,
      to: numbers[iter],
    })
    iter = iter == 3 ? 0 : iter + 1
  } else {
    //Sunday
    client.messages.create({
      body: `Good Evening ${theBoys[iter]}! Heads up, You're on garbage duty this week.`,
      from: TWILIO_PHONE_NUMBER,
      to: numbers[iter],
    })
  }
})

app.get("/once_per_month", (req, res) => {
  // Rent reminder
  for (let i = 0; i < theBoys.length; i++) {
    client.messages.create({
      body: `Good Evening ${theBoys[i]}! Heads up, rent is due today to Suthy.`,
      from: TWILIO_PHONE_NUMBER,
      to: numbers[i],
    })
  }
})

// Cron-job that runs once a day, and messages everyone who has an outstanding debt
app.get("/debt-collector", (req, res) => {})

// app.get("/debt-collector/:from/:persons/:amount", (req, res) => {
//   let obj = req.params
//   let names = obj.persons
//     .split("")
//     .filter((el) => el !== " ")
//     .join("")
//     .split(",")
//   let amount = parseFloat(obj.amount)
//   let sender = obj.sender

//   if (validateNames(names)) {
//     // Send a confirmation text to the lender saying that their debt collector has been deployed
//     let borrowers = ""
//     for (let i = 0; i < names.length; i++) {
//       let str = ""
//       if (i !== names.length - 1) {
//         str = `${names[i]}, `
//       } else {
//         str = `and ${names[i]}`
//       }
//       borrowers += str
//     }

//     client.messages.create({
//       body: `Hi ${sender}! I'm Vecna, your personal debt collector. I'll remind ${borrowers} every day until you get your $${amount} back.`,
//       from: TWILIO_PHONE_NUMBER,
//       to: sender,
//     })

//     // Send an initial text to the borrower(s) saying that they owe the lender $
//     amount = (amount / names.length).toFixed(2)
//     code = generateDebtCollectionCode()

//     for (let i = 0; i < names.length; i++) {
//       client.messages.create({
//         body: `Hi ${names[i]}! My name is Vecna, I'm a debt collector working for ${sender}. It has come to my attention that you owe my client $${amount}. Respond with ${code} when you've paid your debts and I'll leave your soul alone.`,
//         from: TWILIO_PHONE_NUMBER,
//         to: numbers[theBoys.indexOf(names[i])],
//       })
//     }
//   } else {
//     // Send a text to the debt-collector requester to say that the message has failed
//     client.messages.create({
//       body: `Your debt collector has not been deployed :(. Text me "debt-collector" to learn how to properly use this service.`,
//       from: TWILIO_PHONE_NUMBER,
//       to: sender,
//     })
//   }
// })

// Testing the endpoint
app.post("/receiver", (req, res) => {
  console.log(req.body)
})

app.get("/see-state", (req, res) => {
  let state = {}

  res.send(state)
})

app.post("/sms", (req, res) => {
  console.log(req.body)
  let msg = req.body.Body.trim().toLowerCase()
  let senderNumber = req.body.From
  let sender = theBoys[numbers.indexOf(senderNumber)]
  const twiml = new MessagingResponse()

  if (msg.includes("commands")) {
    twiml.message(`
    Commands:

    commands -> learn about all the ways I'm here to help you
    origin -> learn about why I exist
    debt-collector -> see how to use the debt-collector service
    `)
  } else if (msg.includes("origin")) {
    twiml.message(`
    You lead an extremely busy life. You've got exams to ace, deadlines to meet, and a limited memory. Why would you sweat trying to remember the small stuff when you've bigger things on the horizon. That's where I come in to help. I take care of keeping track of the small stuff so you can focus on what really matters ❤️
    `)
  } else if (msg.includes("debt-collector")) {
    let obj = validDebtCollectorUsage(msg)
    let bool = obj.bool
    let names = obj.names
    let amount = obj.amount

    if (msg.length === 14) {
      twiml.message(`
      The debt-collector service is used to collect money from your roomates without having to chase them down. I do that for you by hiring your very own personal debt-collector who will remind the borrower(s) once a day of their debt until you get your $ back.\nSyntax:\n\n<NAMES(S)> | <AMOUNT>\n\nUsage:\n\nUse Case #1: You want to collect $ from an individual\nExample #1: Sam owes you $5\nTo hire a personal debt-collector to collect your $5 from Sam, you would text me:\n\ndebt-collector Sam 5\n\nUse Case #2: You want to collect money from a number of individuals, and have them split the amount\nExample #2 Justin and Duncan owe you $10 ($5 each)\nTo hire a personal debt-collector to collect your $10 from Justin and Duncan, you would text me:\n\ndebt-collector Justin, Duncan | 10
    `)
    } else if (bool) {
      // Sends a confirmation message to the collector
      twiml.message(
        `Hi ${sender}! I've hired and deployed your very own personal debt-collector to collect the $${amount} you are owed. I will notify you when I am told the job is done!`
      )

      let code = generateDebtCollectionCode()

      for (let i = 0; i < names.length; i++) {
        //Sends an initial message to each borrower
        client.messages.create({
          body: `Hi ${names[i]}! I'm a debt-collector. It has come to my attention that you owe my client ${sender} an amount totalling $${amount}. Please ET him when you get a chance and reply with code ${code} when you have.`,
          to: numbers[theBoys.indexOf(names[i])],
          from: TWILIO_PHONE_NUMBER,
        })

        // Creates and stores a valid debt-collector job for each borrower
        oustandingDebts.set(
          names[i],
          oustandingDebts
            .get(names[i])
            .push([theBoys[numbers.indexOf(sender)]], amount, code)
        )
      }
    } else {
      twiml.message(
        `Sorry, I don't understand. Text me "debt-collector" to learn about how to properly use the debt collector service.`
      )
    }
  } else if (msg.length === 5 && msg[0] === "C") {
    if (msg[0] === "T") {
      // The person is trying to confirm the completion of the towel chore
      let temp = outstandingTowelChore.get(sender)
      if (temp === msg) {
        twiml.message(
          `Hi ${sender}! I've confirmed that you've completed the towel chore. Thank you!`
        )
        outStandingTowelChore.set(sender)
      } else {
        twiml.message(
          `Sorry, I don't understand. Text me "debt-collector" to learn about how to properly use the debt collector service.`
        )
      }
    } else if (msg[0] === "G") {
      // The person is trying to confirm the completion of the garbage chore
      let temp = outstandingGarbageChore.get(sender)
      if (temp === msg) {
        twiml.message(
          `Sorry, I don't understand. Text me "debt-collector" to learn about how to properly use the debt collector service.`
        )
      } else {
        twiml.message(
          `Sorry, I don't understand. Text me "debt-collector" to learn about how to properly use the debt collector service.`
        )
      }
    } else {
      // The person is trying to confirm the repayment of some debt
      let arr = oustandingDebts.get(sender)
    }

    if (arr.includes(msg)) {
      // Send a text back saying that they have succesfully confirmed the completion of their chore
      twiml.message(`Hi ${sender}! Thanks for doing the towels!`)
    }
  } else {
    twiml.message(
      `Sorry, I don't understand. Text me "commands" to learn about how I can assist you.`
    )
  }

  res.writeHead(200, { "Content-Type": "text/xml" })
  res.end(twiml.toString())
})
