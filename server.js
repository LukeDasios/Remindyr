require("dotenv").config()
const app = require("express")()
const bodyParser = require("body-parser")

const PORT = process.env.PORT || 3000
const ACCOUNT_SID = process.env.ACCOUNT_SID
const AUTH_TOKEN = process.env.AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER

const client = require("twilio")(ACCOUNT_SID, AUTH_TOKEN)
const MessagingResponse = require("twilio").twiml.MessagingResponse

let garbageWeek = true
const theBoys = ["Luke", "Duncan", "Sam", "Jp"]
const numbers = ["+16479385063", "+14168261333", "+14168447692", "+14166169331"]
let iter = 2
let towel = 0

// [Chore-Assignee, Code]
let outstandingTowelChore = []

// [Chore-Assignee, Code]
let outstandingGarbageChore = []

// [Lender, Borrower, Code, Amount]
let outstandingDebt = []

function whoIsNext(num) {
  return num === 3 ? "Luke" : theBoys[num + 1]
}

function validDebtCollectorUsage(msg) {
  msg = msg.trim().slice(15)

  let i = 0
  let names = []
  let amount = ""
  let temp = ""
  let flag = true

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
    code += Math.floor((Math.random() * 10)).toString()
  }

  return code
}

function generateTowelChoreCode() {
  let code = "T"

  for (let i = 0; i < 3; i++) {
    code += Math.floor((Math.random() * 10)).toString()
  }

  return code
}

function generateDebtCollectionCode() {
  let code = "C"

  for (let i = 0; i < 3; i++) {
    code += Math.floor((Math.random() * 10)).toString()
  }

  return code
}

app.use(bodyParser.urlencoded({ extended: false }))
app.listen(PORT)

app.get("/", (req, res) => {
  res.send("Go to /see-state to see the state of this application")
})

app.get("/see-state", (req, res) => {
  let state = {
    garbageWeek,
    iter,
    towel,
    outstandingDebt,
    outstandingGarbageChore,
    outstandingTowelChore,
  }

  res.send(state)
})

app.get("/once_per_hour", (req, res) => {
  // Check to see if there are any outstanding important chores
  // Message the person with the outstanding important chore

  let date = new Date()
  let day = date.getDay()

  if (day === 2) {
    // Garbage Day
    client.messages.create({
      body: garbageWeek
        ? `Hi ${theBoys[iter]}! Have you finished the garbage chore yet? the Recycling, Compost, and Garbage need to be taken to the curb by tonight. Text me the code ${outstandingGarbageChore[1]} when the job is done. Cheers.`
        : `Hi ${theBoys[iter]}! Have you finished the garbage chore yet? the Recycling and Compost need to be taken to the curb by tonight. Text me the code ${outstandingGarbageChore[1]} when the job is done. Cheers.`,
      to: numbers[iter],
      from: TWILIO_PHONE_NUMBER,
    })
  } else {
    // Towel Day
    client.messages.create({
      body: `Hi ${theBoys[towel]}! Have you finished the towel chore yet? They need to be washed, dryed, folded, and put back in their respective drawer upstairs. Text me the code ${outstandingTowelChore[1]} when the job is done. Cheers.`,
      to: numbers[towel],
      from: TWILIO_PHONE_NUMBER,
    })
  }

  res.send("Sent an hourly important chore reminder!")
})

app.get("/once_per_day", (req, res) => {
  // Message everyone with an outstanding debt
  for (let i = 0; i < outstandingDebt.length; i++) {
    let temp = outstandingDebt[i]
    client.messages.create({
      body: `Hi ${temp[1]}! I'm a debt-collector. It has come to my attention that you owe my client ${temp[0]} an amount totalling $${temp[3]}. Please E-transfer him when you get a chance and reply with code ${temp[2]} when you have.`,
      to: numbers[theBoys.indexOf(temp[1])],
      from: TWILIO_PHONE_NUMBER,
    })
  }

  res.send("Sent today's debt-collection reminders!")
})

app.get("/once_per_selected_days", (req, res) => {
  let date = new Date()
  let day = date.getDay()

  if (day === 2) {
    // Garbage day
    let garbageCode = generateGarbageChoreCode()

    client.messages.create({
      body: garbageWeek
        ? `Good Evening ${theBoys[iter]}! In case you haven't already done so already, the Recycling, Compost, and Garbage need to be taken to the curb by tonight. Text me the code ${garbageCode} when the job is done. Cheers.`
        : `Good Evening ${theBoys[iter]}! In case you haven't already done so already, the Recycling and Compost need to be taken to the curb by tonight. Text me the code ${garbageCode} when the job is done. Cheers.`,
      to: numbers[iter],
      from: TWILIO_PHONE_NUMBER,
    })

    outstandingGarbageChore.push(theBoys[iter], garbageCode)
  } else if (day === 4) {
    // Towel day
    let towelCode = generateTowelChoreCode()

    client.messages.create({
      body: `Good Afternoon ${theBoys[towel]}! It's your turn on towel duty! They need to be washed, dryed, folded, and put back in their respective drawer upstairs. Text me the code ${towelCode} when the job is done. Cheers.`,
      to: numbers[towel],
      from: TWILIO_PHONE_NUMBER,
    })

    outstandingTowelChore.push(theBoys[towel], towelCode)

  } else if (day === 6) {
    //Saturday
    client.messages.create({
      body: `Good Afternoon ${
        theBoys[iter]
      }! Please Empty the Recycling, Green bin, and Garbage one last time so that ${whoIsNext(
        iter
      )} may start their week with a clean slate. After that, you are free!`,
      to: numbers[iter],
      from: TWILIO_PHONE_NUMBER,
    })
    iter = iter == 3 ? 0 : iter + 1
  } else {
    //Sunday
    client.messages.create({
      body: `Good Afternoon ${theBoys[iter]}! Heads up, You're on garbage duty this week.`,
      to: numbers[iter],
      from: TWILIO_PHONE_NUMBER,
    })
  }

  res.send("Sent today's important chore reminders!")
})

app.get("/once_per_month", (req, res) => {
  // Rent reminder
  for (let i = 0; i < theBoys.length; i++) {
    client.messages.create({
      body: `Hello ${theBoys[i]}! Heads up, $625 in rent is due today.`,
      to: numbers[i],
      from: TWILIO_PHONE_NUMBER,
    })
  }

  res.send("Sent today's rent reminders!")
})

app.post("/sms", (req, res) => {
  // console.log(req.body)
  let msg = req.body.Body.trim().toLowerCase()
  let senderNumber = req.body.From
  let sender = theBoys[numbers.indexOf(senderNumber)]
  const twiml = new MessagingResponse()

  if (msg.includes("commands")) {
    twiml.message(`
    Commands:\ncommands -> learn about all the ways I'm here to help\norigin -> learn about why I exist\ndebt-collector -> learn about how to hire a debt-collector`)
  } else if (msg.includes("origin")) {
    twiml.message(`
    You lead an extremely busy life. You've got exams to ace, deadlines to meet, and a limited memory ;). Why bother remembering the small stuff when you've bigger things to worry about? That's where I, Twilly 🤖, can help out. Delegate the small stuff to me so you can focus on what really matters ❤️
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
      let str = ""
      if (names.length === 1) {
        str = names[0]
      } else {
        for (let i = 0; i < names.length; i++) {
          if (i !== names.length - 1) {
            str += `${names[i]}, `
          } else {
            str += `and ${names[i]}`
          }
        }
      }

      // Sends a confirmation message to the lender
      twiml.message(
        `Hi ${sender}! I've hired and deployed your very own personal debt-collector to collect the $${amount} you are owed from ${str}. I will notify you when the job is done!`
      )

      let code = generateDebtCollectionCode()

      for (let i = 0; i < names.length; i++) {
        //Sends an initial message to each borrower
        client.messages.create({
          body: `Hi ${names[i]}! I'm a debt-collector. It has come to my attention that you owe my client ${sender} an amount totalling $${amount}. Please E-transfer him when you get a chance and reply with code ${code} when you have.`,
          to: numbers[theBoys.indexOf(names[i])],
          from: TWILIO_PHONE_NUMBER,
        })

        outstandingDebt.push([sender, names[i], code, amount])
      }
    } else {
      twiml.message(
        `Sorry, I don't understand. Text me "debt-collector" to learn about how to properly use the debt collector service.`
      )
    }
  } else if (msg.length === 4) {
    if (msg[0] === "T") {
      // The person is trying to confirm the completion of the towel chore
      let temp = outstandingTowelChore[1] === msg ? outstandingTowelChore[1] : ""

      if (temp === msg) {
        twiml.message(
          `Hi ${sender}! I've confirmed that you've completed the towel chore. Thank you!`
        )
        towel = towel === 3 ? 0 : towel + 1
        outstandingTowelChore.pop()
      } else {
        twiml.message(
          `Sorry, I don't understand. Are you sure that's a valid code?`
        )
      }
    } else if (msg[0] === "G") {
      // The person is trying to confirm the completion of the garbage chore

      let temp = outstandingGarbageChore[1] === msg ? outstandingGarbageChore[1] : ""

      if (temp === msg) {
        twiml.message(
          `Hi ${sender}! I've confirmed that you've completed the garbage chore. Thank you!`
        )
        garbageWeek = !garbageWeek
        outStandingGarbageChore.pop()
      } else {
        twiml.message(
          `Sorry, I don't understand. Are you sure that's a valid code?`
        )
      }
    } else {
      // The person is trying to confirm the repayment of some debt
      let temp = []

      let j = 0
      while (j < outstandingDebt) {
        let x = outstandingDebt[j]

        if (x[2] === msg) {
          temp = x
          outstandingDebt.splice(j, 1)
          j = outstandingDebt.length
        } else {
          j++
        }
      }

      // [lender, borrower, code, amount]
      if (temp.length > 0) {
        let lender, amount

        lender = temp[0]
        amount = temp[3]

        if (msg === temp[2]) {
          twiml.message(
            `Hi ${sender}! I have just received confirmation that you paid the debt-collector $${amount} on behalf of his client, ${lender}. Thank you!`
          )

          // Text the lender telling them that the debt has been repaid
          client.messages.create({
            body: `Hi ${lender}! I have just received confirmation that your debt-collector has succesfully collected on the $${amount} that ${sender} owed you!`,
            to: numbers[theBoys.indexOf(lender)],
            from: TWILIO_PHONE_NUMBER,
          })
        } else {
          twiml.message(
            `Sorry I don't understand. Are you sure that's a valid code?`
          )
        }
      } else {
        twiml.message(
          `Sorry I don't understand. Are you sure that's a valid code?`
        )
      }
    }
  } else {
    twiml.message(
      `Sorry, I don't understand. Text me "commands" to learn about how I can assist you.`
    )
  }

  res.writeHead(200, { "Content-Type": "text/xml" })
  res.end(twiml.toString())
})
