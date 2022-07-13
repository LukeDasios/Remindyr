require("dotenv").config()
const app = require("express")()
const bodyParser = require("body-parser")

const PORT = process.env.PORT || 3000
const ACCOUNT_SID = process.env.ACCOUNT_SID
const AUTH_TOKEN = process.env.AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER

const client = require("twilio")(ACCOUNT_SID, AUTH_TOKEN)
const MessagingResponse = require("twilio").twiml.MessagingResponse

let garbageWeek = false
const theBoys = ["Luke", "Duncan", "Sam", "Jp"]
const numbers = ["+16479385063", "+14168261333", "+14168447692", "+14166169331"]
let iter = 3
let towel = 1

// [Chore-Assignee, Code]
let outstandingTowelChore = []

// [Chore-Assignee, Code]
let outstandingGarbageChore = []

// [Lender, Borrower, Code, Amount, Reason, Days]
let outstandingDebt = []

function whoIsNext(num) {
  return num === 3 ? "Luke" : theBoys[num + 1]
}

function validDebtCollectorUsage(msg) {
  msg = msg.trim().slice(7)
  if (msg[0] !== " ") return false
  msg = msg.slice(1)

  let nums = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
  let i = 0
  let tot = 0
  let names = []
  let amount = ""
  let temp = ""
  let count = 0

  if (msg[0] !== "0" && nums.includes(msg[0])) {
    while (i < msg.length) {
      let char = msg[i]

      if (char === " ") {
        msg = msg.slice(i + 1)
        i = msg.length
      } else if (nums.includes(char)) {
        amount += char
      } else if (char === "." && count === 0) {
        amount += char
        count++
      } else {
        return false
      }
      i++
    }
  } else {
    return false
  }

  if (msg.slice(0, 4) !== "from") return false
  msg = msg.slice(4)
  if (msg.slice(0, 1) !== " ") return false
  msg = msg.slice(1)

  let last = msg.indexOf("for")

  i = 0
  while (i !== last) {
    let char = msg[i]

    if (char === ",") {
      names.push(temp)
      temp = ""
    } else if (char === " ") {
    } else {
      temp += char
    }
    i++
  }

  names.push(temp)

  if (!names.every((name) => theBoys.includes(name))) return false

  amount = parseFloat(parseFloat(amount).toFixed(2) / names.length)

  msg = msg.slice(last)
  if (msg.slice(0, 3) !== "for") return false
  msg = msg.slice(3)
  if (msg[0] !== " ") return false
  msg = msg.slice(1)

  return {
    amount,
    names,
    reason: msg,
  }
}

function generateGarbageChoreCode() {
  let code = "G"

  for (let i = 0; i < 4; i++) {
    code += Math.floor(Math.random() * 10).toString()
  }

  return code
}

function generateTowelChoreCode() {
  let code = "T"

  for (let i = 0; i < 4; i++) {
    code += Math.floor(Math.random() * 10).toString()
  }

  return code
}

function generateDebtCollectionCode() {
  let code = "D"

  for (let i = 0; i < 4; i++) {
    code += Math.floor(Math.random() * 10).toString()
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

  if (day === 2 && outstandingGarbageChore.length === 2) {
    // Garbage Day
    client.messages.create({
      body: garbageWeek
        ? `Hi ${theBoys[iter]}! Have you finished the garbage chore yet? the Recycling, Compost, and Garbage need to be taken to the curb by tonight. Text me the code ${outstandingGarbageChore[1]} when the job is done. Cheers.`
        : `Hi ${theBoys[iter]}! Have you finished the garbage chore yet? the Recycling and Compost need to be taken to the curb by tonight. Text me the code ${outstandingGarbageChore[1]} when the job is done. Cheers.`,
      to: numbers[iter],
      from: TWILIO_PHONE_NUMBER,
    })
  } else if (day === 4 && outstandingTowelChore.length === 2) {
    // Towel Day
    client.messages.create({
      body: `Hi ${theBoys[towel]}! Have you finished the towel chore yet? They need to be washed, dryed, folded, and put back in their respective drawer upstairs. Text me the code ${outstandingTowelChore[1]} when the job is done. Cheers.`,
      to: numbers[towel],
      from: TWILIO_PHONE_NUMBER,
    })
  } else {
    // Don't send any messages
  }

  res.send("Sent an hourly important chore reminder!")
})

app.get("/once_per_day", (req, res) => {
  // Message everyone with an outstanding debt
  for (let i = 0; i < outstandingDebt.length; i++) {
    // [Lender, Borrower, Code, Amount, Reason, Days]
    let temp = outstandingDebt[i]

    let lender = temp[0]
    let borrower = temp[1]
    let code = temp[2]
    let amount = temp[3]
    let reason = temp[4]
    let days = temp[5]

    client.messages.create({
      body: `Hi ${borrower}! Please E-transfer ${lender} $${amount} for ${reason} and text me code ${code} when you do. This debt has been outstanding for ${days} day(s)`,
      to: numbers[theBoys.indexOf(borrower)],
      from: TWILIO_PHONE_NUMBER,
    })

    // Days that the outstanding debt has been pending += 1
    temp[5]++
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
  let originalMsg = req.body.Body.trim()
  let msg = originalMsg.toLowerCase()
  let senderNumber = req.body.From
  let sender = theBoys[numbers.indexOf(senderNumber)]
  const twiml = new MessagingResponse()

  if (msg.includes("commands")) {
    twiml.message(`
    Commands:\n\ncommands -> what I do\n\norigin -> why I exist\n\nDC -> collect $ from your roomates`)
  } else if (msg.includes("origin")) {
    twiml.message(`
    \nYou lead an extremely busy life. You've got exams to ace, deadlines to meet, and a limited memory ;). Why bother remembering the small stuff when you've bigger things to worry about? That's where I, Twilly 🤖, can help out. Delegate the small stuff to me so you can focus on what really matters ❤️
    `)
  } else if (msg.includes("dc")) {
    twiml.message(`
      The debt-collector service is used to collect money from your roomates without having to chase them down. I do that by reminding the borrower(s) every day of their oustanding debt until they e-transfer you.\n\nExample usage:\n\n#1: You bought Sam pizza\ncollect 5 from Sam for pizza\n\n#2: You bought Justin and Duncan pizza\ncollect 10 from Justin, Duncan for pizza
    `)
  } else if (msg.includes("collect")) {
    let obj = validDebtCollectorUsage(originalMsg)
    if (obj) {
      amount = obj.amount
      names = obj.names
      reason = obj.reason

      let code = generateDebtCollectionCode()

      // Text all the borrowers
      for (let i = 0; i < names.length; i++) {
        let name = names[i]

        client.messages.create({
          body: `E-transfer ${sender} $${amount} for the ${reason} and text me ${code} once you have.`,
          to: numbers[theBoys.indexOf(name)],
          from: TWILIO_PHONE_NUMBER,
        })

        // [Lender, Borrower, Code, Amount, Reason, Days]
        outstandingDebt.push([sender, name, code, amount, reason, 1])
      }

      let namesListed = ""
      if (names.length === 1) {
        namesListed += names[0]
      } else {
        for (let i = 0; i < names.length; i++) {
          let name = names[i]

          if (i === names.length - 1) {
            namesListed += `and ${name}`
          } else {
            namesListed += `${name}, `
          }
        }
      }

      amount *= names.length

      // Send a confirmation text to the lender
      twiml.message(`
        Succesfully deployed your debt-collector on ${namesListed} for ${reason} totalling $${amount}! I'll let you once I've collected this for you.
      `)
    } else {
      twiml.message(`
        Text me "DC" to learn about how to properly use the debt collector service
      `)
    }
  } else if (msg.length === 5) {
    msg = msg.toUpperCase()
    if (msg[0] === "T") {
      // The person is trying to confirm the completion of the towel chore
      let temp = outstandingTowelChore[1] === msg ? msg : ""

      if (temp === msg) {
        twiml.message(
          `Hi ${sender}! I've confirmed that you've completed the towel chore. Thank you!`
        )
        towel = towel === 3 ? 0 : towel + 1
        outstandingTowelChore.pop()
        outstandingTowelChore.pop()
      } else {
        twiml.message(
          `Sorry, I don't understand. Are you sure that's a valid code?`
        )
      }
    } else if (msg[0] === "G") {
      // The person is trying to confirm the completion of the garbage chore
      let temp = outstandingGarbageChore[1] === msg ? msg : ""

      if (temp === msg) {
        twiml.message(
          `Hi ${sender}! I've confirmed that you've completed the garbage chore. Thank you!`
        )
        garbageWeek = !garbageWeek
        outstandingGarbageChore.pop()
        outstandingGarbageChore.pop()
      } else {
        twiml.message(
          `Sorry, I don't understand. Are you sure that's a valid code?`
        )
      }
    } else if (msg[0] === "D") {
      // The person is trying to confirm the repayment of some debt
      let debt = []

      let j = 0
      while (j < outstandingDebt.length) {
        // [Lender, Borrower, Code, Amount, Reason, Days]
        let temp = outstandingDebt[j]

        if (temp[2] === msg) {
          debt = [...temp]
          outstandingDebt.splice(j, 1)
          j = outstandingDebt.length
        } else {
          j++
        }
      }

      // [Lender, Borrower, Code, Amount, Reason, Days]
      if (debt.length > 0) {
        let lender = debt[0]
        let borrower = debt[1]
        let code = debt[2]
        let amount = debt[3]
        let reason = debt[4]
        let days = debt[5]

        twiml.message(
          `Hi ${borrower}! Thanks for confirming the E-transfer of $${amount} to ${lender} for ${reason}!`
        )

        // Text the lender telling them that the debt has been repaid
        client.messages.create({
          body: `Hi ${lender}! I have just received confirmation that your debt-collector has succesfully collected on the $${amount} that ${sender} owed you for ${reason}!`,
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
  } else {
    twiml.message(
      `Sorry, I don't understand. Text me "commands" to learn about how I can assist you.`
    )
  }

  res.writeHead(200, { "Content-Type": "text/xml" })
  res.end(twiml.toString())
})
