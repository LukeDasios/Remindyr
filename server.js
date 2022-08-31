require("dotenv").config()

const express = require("express")
const app = express()
const bodyParser = require("body-parser")
const mongoose = require("mongoose")

const PORT = process.env.PORT || 3000
const ACCOUNT_SID = process.env.ACCOUNT_SID
const AUTH_TOKEN = process.env.AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER
const MONGODB_URI = process.env.MONGODB_URI

const client = require("twilio")(ACCOUNT_SID, AUTH_TOKEN)
const MessagingResponse = require("twilio").twiml.MessagingResponse

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

const GarbageModel = require("./models/Garbage")
const GarbageReturnModel = require("./models/GarbageReturn")
const TowelModel = require("./models/Towel")
const DebtModel = require("./models/Debt")

const debtIndividuals = ["Luke", "Duncan", "Sam", "Jp", "Justin"]
const debtNumbers = [
  "+16479385063",
  "+14168261333",
  "+14168447692",
  "+14166169331",
  "+16475247204",
]

const choreIndividuals = ["Luke", "Justin"]
const choreNumbers = ["+16479385063", "+16475247204"]

const RENT_AMOUNT = 675

function whoIsNext(name) {
  let index = choreIndividuals.indexOf(name)
  return index === choreIndividuals.length - 1
    ? choreIndividuals[0]
    : choreIndividuals[index + 1]
}

function validDebtCollectorUsage(msg) {
  msg = msg.trim().slice(7)
  if (msg[0] !== " ") return false
  msg = msg.slice(1)

  let nums = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
  let i = 0
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

  if (!names.every((name) => debtIndividuals.includes(name))) return false

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

function generateGarbageReturnChoreCode() {
  let code = "R"

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
  res.send("Up and running!")
})

app.get("/start", (req, res) => {
  for (let i = 0; i < debtIndividuals.length; i++) {
    client.messages.create({
      body: `Hey guys, this is the new Twilly #. I was able to buy a Waterloo one this time around. Be sure to save this as a contact!\n\n-Luke`,
      to: debtNumbers[i],
      from: TWILIO_PHONE_NUMBER,
    })
  }

  res.send("Send the intial messages to everyone!")
})

app.get("/once_per_hour", async (req, res) => {
  // Check to see if there are any outstanding important chores
  // Message the person with the outstanding important chore

  let date = new Date()
  let day = date.getDay()

  if (day === 2) {
    // Garbage Day
    let garbageChore = await GarbageModel.findOne({})

    console.log(garbageChore)

    let name = garbageChore.name
    let code = garbageChore.code
    let garbageWeek = garbageChore.garbageWeek
    let completed = garbageChore.completed
    let phoneNumber = choreNumbers[choreIndividuals.indexOf(name)]

    if (!completed) {
      client.messages.create({
        body: garbageWeek
          ? `Hi ${name}! The Recycling, Compost, and Garbage need to be taken to the curb by tonight. Text me "${code}" when the job is done.`
          : `Hi ${name}! The Recycling and Compost need to be taken to the curb by tonight. Text me "${code}" when the job is done.`,
        to: phoneNumber,
        from: TWILIO_PHONE_NUMBER,
      })
    }
  } else if (day === 3) {
    // Garbage Return Day
    let garbageReturnChore = await GarbageReturnModel.findOne({})

    console.log(garbageReturnChore)

    let name = garbageReturnChore.name
    let code = garbageReturnChore.code
    let completed = garbageReturnChore.completed
    let phoneNumber = debtNumbers[debtIndividuals.indexOf(name)]

    if (!completed) {
      client.messages.create({
        body: `Hi ${name}! Everything needs to be brought back to the house from the curb. Text me "${code}" when the job is done.`,
        to: phoneNumber,
        from: TWILIO_PHONE_NUMBER,
      })
    }
  } else if (day === 4) {
    // Towel Day
    let towelChore = await TowelModel.findOne({})

    console.log(towelChore)

    let name = towelChore.name
    let code = towelChore.code
    let completed = towelChore.completed
    let phoneNumber = choreNumbers[choreIndividuals.indexOf(name)]

    if (!completed) {
      client.messages.create({
        body: `Hi ${name}! The towels need to be washed, dryed, folded, and put back. Text me "${code}" when the job is done.`,
        to: phoneNumber,
        from: TWILIO_PHONE_NUMBER,
      })
    }
  }
  res.send("Sent an hourly important chore reminder!")
})

app.get("/once_per_day", async (req, res) => {
  let debts = await DebtModel.find({})

  for (let i = 0; i < debts.length; i++) {
    let debt = debts[i]

    const filter = { code: debt.code }
    const update = { days: debt.days + 1 }

    await DebtModel.findOneAndUpdate(filter, update, {
      new: true,
    })

    client.messages.create({
      body: `Hi ${debt.borrower}! You owe ${debt.lender} $${debt.amount} for ${
        debt.reason
      }. Text me "${debt.code}" when you've repaid this. Outstanding for ${
        debt.days + 1
      } day(s)`,
      to: debtNumbers[debtIndividuals.indexOf(debt.borrower)],
      from: TWILIO_PHONE_NUMBER,
    })
  }

  res.send("Sent today's debt-collection reminders!")
})

app.get("/once_per_selected_days", async (req, res) => {
  let date = new Date()
  let day = date.getDay()

  if (day === 2) {
    // Garbage day
    let garbageChore = await GarbageModel.findOne({})

    let name = garbageChore.name
    let code = garbageChore.code
    let garbageWeek = garbageChore.garbageWeek

    client.messages.create({
      body: garbageWeek
        ? `Hi ${name}! The Recycling, Compost, and Garbage need to be taken to the curb. Text me "${code}" when the job is done.`
        : `Hi ${name}! The Recycling and Compost need to be taken to the curb. Text me "${code}" when the job is done.`,
      to: choreNumbers[choreIndividuals.indexOf(name)],
      from: TWILIO_PHONE_NUMBER,
    })
  } else if (day === 3) {
    // Bring garbage back to curb day
    let garbageReturn = await GarbageReturnModel.findOne({})

    let name = garbageReturn.name
    let code = garbageReturn.code
    let garbageWeek = garbageReturn.garbageWeek

    client.messages.create({
      body: `Hi ${name}! Everything needs to be brought back to the house from the curb. Text me "${code}" when the job is done.`,
      to: choreNumbers[choreIndividuals.indexOf(name)],
      from: TWILIO_PHONE_NUMBER,
    })
  } else if (day === 4) {
    // Towel day
    let towelChore = await TowelModel.findOne({})

    let name = towelChore.name
    let code = towelChore.code

    client.messages.create({
      body: `Hi ${name}, It's your turn on towel duty! They need to be washed, dryed, folded, and put back. Text me "${code}" when the job is done.`,
      to: choreNumbers[choreIndividuals.indexOf(name)],
      from: TWILIO_PHONE_NUMBER,
    })
  } else if (day === 6) {
    //Saturday
    let garbageChore = await GarbageModel.findOne({})

    console.log(garbageChore)

    let id = garbageChore.id
    let name = garbageChore.name
    let garbageWeek = garbageChore.garbageWeek
    let completed = garbageChore.completed
    let next = garbageChore.next

    if (completed) {
      await GarbageModel.findByIdAndRemove(id).exec()

      client.messages.create({
        body: `Hi ${name}! Empty the Recycling, Green bin, and Garbage one last time so that ${next} may start his week with a clean slate. After that, you are free!`,
        to: choreNumbers[choreIndividuals.indexOf(next)],
        from: TWILIO_PHONE_NUMBER,
      })

      const garbage_chore = new GarbageModel({
        name: next,
        code: generateGarbageChoreCode(),
        garbageWeek: !garbageWeek,
        completed: false,
        next: whoIsNext(next),
      })

      try {
        await garbage_chore.save()
      } catch (err) {
        console.log(
          `Creation of new garbage chore failed with error of: ${err}`
        )
      }
    }

    let garbageReturnChore = await GarbageReturnModel.findOne({})

    console.log(garbageReturnChore)

    id = garbageReturnChore.id
    name = garbageReturnChore.name
    garbageWeek = garbageReturnChore.garbageWeek
    completed = garbageReturnChore.completed
    next = garbageReturnChore.next

    if (completed) {
      await GarbageReturnModel.findByIdAndRemove(id).exec()

      const garbage_return_chore = new GarbageReturnModel({
        name: next,
        code: generateGarbageReturnChoreCode(),
        garbageWeek: !garbageWeek,
        completed: false,
        next: whoIsNext(next),
      })

      try {
        await garbage_return_chore.save()
        console.log(garbage_return_chore)
      } catch (err) {
        console.log(
          `Creation of new garbage_return_chore chore failed with error of: ${err}`
        )
      }
    }

    let towelChore = await TowelModel.findOne({})

    console.log(towelChore)

    id = towelChore.id
    name = towelChore.name
    completed = towelChore.completed
    next = towelChore.next

    if (completed) {
      await TowelModel.findByIdAndRemove(id).exec()

      const towel_chore = new TowelModel({
        name: next,
        code: generateTowelChoreCode(),
        completed: false,
        next: whoIsNext(next),
      })

      try {
        await towel_chore.save()
      } catch (err) {
        console.log(`Creation of new towel chore failed with error of: ${err}`)
      }
    }

    res.send(`Updated the garbage, garbageReturn, and towel documents.`)
  } else {
    //Sunday
    let garbageChore = await GarbageModel.findOne({})

    let name = garbageChore.name

    client.messages.create({
      body: `Good Afternoon ${name}! Heads up, you're on garbage duty this week.`,
      to: choreNumbers[choreIndividuals.indexOf(name)],
      from: TWILIO_PHONE_NUMBER,
    })

    res.send(`Told ${name} that they are on garbage this week`)
  }
})

app.get("/once_per_month", async (req, res) => {
  // Rent reminder
  for (let i = 0; i < debtIndividuals.length; i++) {
    client.messages.create({
      body: `Hello ${debtIndividuals[i]}! Heads up, $${RENT_AMOUNT} in rent is due today.`,
      to: debtNumbers[i],
      from: TWILIO_PHONE_NUMBER,
    })
  }

  // WiFi reminder
  for (let i = 0; i < debtIndividuals.length; i++) {
    if (debtIndividuals[i] !== "Duncan") {
      // Create a new debt
      let code = generateDebtCollectionCode()

      const debt = new DebtModel({
        lender: "Duncan",
        borrower: debtIndividuals[i],
        code: code,
        amount: 25,
        reason: "Wifi",
        days: 0,
      })

      try {
        await debt.save()

        //Message lender (Duncan)
        client.messages.create({
          body: `Succesfully deployed your debt-collector on ${debtIndividuals[i]} for WiFi totalling $25!`,
          to: debtNumbers[debtIndividuals.indexOf("Duncan")],
          from: TWILIO_PHONE_NUMBER,
        })

        // Message borrowers
        client.messages.create({
          body: `E-transfer Duncan $25 for the WiFi and text me "${code}" once you have.`,
          to: debtNumbers[debtIndividuals[i]],
          from: TWILIO_PHONE_NUMBER,
        })

        console.log(debt)
        console.log("Succesfully created the new wifi debt!")
      } catch (err) {
        console.log(`Creation of new debt failed with error of: ${err}`)
      }
    }
  }

  res.send("Sent today's rent reminders!")
})

app.post("/sms", async (req, res) => {
  let originalMsg = req.body.Body.trim()
  let msg = originalMsg.toLowerCase()
  let senderNumber = req.body.From
  let sender = debtIndividuals[debtNumbers.indexOf(senderNumber)]
  const twiml = new MessagingResponse()

  if (msg.includes("commands")) {
    twiml.message(`
    Commands:\n\nCommands -> what I do\n\nOrigin -> why I exist\n\nDC -> collect $ from your roomates\n\nOutstanding -> see outstanding debts\n\nSchedule -> see who's doing what chore this week`)
  } else if (msg.includes("origin")) {
    twiml.message(`
    \nYou lead an extremely busy life. You've got exams to ace, deadlines to meet, and a limited memory ;). Why bother remembering the small stuff when you've bigger things to worry about? That's where I, Twilly 🤖, help out. Delegate the small stuff to me so you can focus on the things that really matter ❤️
    `)
  } else if (msg.includes("schedule")) {
    let garbageChore = await GarbageModel.findOne({})
    let garbageReturnChore = await GarbageReturnModel.findOne({})
    let towelChore = await TowelModel.findOne({})

    let schedule = `Garbage: ${garbageChore.name}\nGarbage Return: ${garbageReturnChore.name}\nTowels: ${towelChore.name}`

    twiml.message(schedule)
  } else if (msg.includes("outstanding")) {
    let debts = await DebtModel.find({})

    let currentDebts = "Outstanding Debts:\n\n"

    for (let i = 0; i < debts.length; i++) {
      let debt = debts[i]
      currentDebts += `${debt.borrower} owes ${debt.lender} $${debt.amount} for ${debt.reason}\nDays Outstanding: ${debt.days}\n\n`
    }

    twiml.message(currentDebts)
  } else if (msg.includes("dc")) {
    twiml.message(`
      The debt-collector service is used to collect money from your roomates without having to chase them down. I do that by reminding the borrower(s) every day of their oustanding debt until they e-transfer you.\n\nExample usage:\n\n#1: You bought Sam pizza\ncollect 5 from Sam for pizza\n\n#2: You bought Justin and Duncan pizza (each owe you 5)\ncollect 10 from Justin, Duncan for pizza
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
        let borrower = names[i]

        client.messages.create({
          body: `E-transfer ${sender} $${amount} for the ${reason} and text me "${code}" once you have.`,
          to: debtNumbers[debtIndividuals.indexOf(borrower)],
          from: TWILIO_PHONE_NUMBER,
        })

        // Persist the outstanding debt in the DB
        // [Lender, Borrower, Code, Amount, Reason, Days]
        const debt = new DebtModel({
          lender: sender,
          borrower: borrower,
          code: code,
          amount: amount,
          reason: reason,
          days: 0,
        })

        try {
          await debt.save()
          console.log("Succesfully created a new debt!")
          console.log(debt)
        } catch (err) {
          console.log(`Creation of new debt failed with error of: ${err}`)
        }
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
        Succesfully deployed your debt-collector on ${namesListed} for ${reason} totalling $${amount}!
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
      let towelChore = await TowelModel.findOne({})
      let code = towelChore.code

      if (code === originalMsg) {
        const filter = { name: towelChore.name }
        const update = { completed: true }

        await TowelModel.findOneAndUpdate(filter, update, {
          new: true,
        })

        twiml.message(
          `Hi ${sender}! I've confirmed that you've completed the towel chore. Thank you!`
        )
      } else {
        twiml.message(
          `Sorry, I don't understand. Are you sure that's a valid code?`
        )
      }
    } else if (msg[0] === "G") {
      let garbageChore = await GarbageModel.findOne({})
      let code = garbageChore.code

      if (code === originalMsg) {
        const filter = { name: garbageChore.name }
        const update = { completed: true }

        await GarbageModel.findOneAndUpdate(filter, update, {
          new: true,
        })

        twiml.message(
          `Hi ${sender}! I've confirmed that you've completed the garbage chore. Thank you!`
        )
      } else {
        twiml.message(
          `Sorry, I don't understand. Are you sure that's a valid code?`
        )
      }
    } else if (msg[0] === "R") {
      let garbageReturnChore = await GarbageReturnModel.findOne({})
      let code = garbageReturnChore.code

      if (code === originalMsg) {
        const filter = { name: garbageReturnChore.name }
        const update = { completed: true }

        await GarbageReturnModel.findOneAndUpdate(filter, update, {
          new: true,
        })

        twiml.message(
          `Hi ${sender}! I've confirmed that you've completed the garbage return chore. Thank you!`
        )
      } else {
        twiml.message(
          `Sorry, I don't understand. Are you sure that's a valid code?`
        )
      }
    } else if (msg[0] === "D") {
      let debts = await DebtModel.find({})

      let debt

      for (let i = 0; i < debts.length; i++) {
        if (debts[i].code === originalMsg) debt = debts[i]
      }

      let id = debt.id

      if (id !== undefined) {
        let reason = debt.reason
        let amount = debt.amount
        let lender = debt.lender
        let days = debt.days

        await DebtModel.findByIdAndRemove(id).exec()
        twiml.message(
          `Hi ${sender}! I've confirmed that you've repaid ${lender} $${amount} for ${reason}. Thank you!`
        )

        client.messages.create({
          body: `Hi ${lender}! ${sender} has repaid you the $${amount} he owed you for ${reason}! Took ${days} day(s).`,
          to: debtNumbers[debtIndividuals.indexOf(lender)],
          from: TWILIO_PHONE_NUMBER,
        })
      } else {
        twiml.message(
          `Sorry, I don't understand. Are you sure that's a valid code?`
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
