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
const TowelModel = require("./models/Towel")
const DebtModel = require("./models/Debt")

const theBoys = ["Luke", "Duncan", "Sam", "Jp"]
const numbers = ["+16479385063", "+14168261333", "+14168447692", "+14166169331"]

function whoIsNext(name) {
  let index = theBoys.indexOf(name)
  return index === 3 ? "Luke" : theBoys[index + 1]
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

// TODO

// app.get("/see-state", (req, res) => {
//   let state = {
//     garbageWeek,
//     iter,
//     towel,
//     outstandingDebt,
//     outstandingGarbageChore,
//     outstandingTowelChore,
//   }

//   res.send(state)
// })

app.get("/once_per_hour", (req, res) => {
  // Check to see if there are any outstanding important chores
  // Message the person with the outstanding important chore

  let date = new Date()
  let day = date.getDay()

  if (day === 2) {
    // Garbage Day
    GarbageModel.find({}, async (err, garbages) => {
      if (err) {
        console.log(err)
        return
      }

      let garbageChore = garbages[0]
      let name = garbageChore.name
      let code = garbageChore.code
      let garbageWeek = garbageChore.garbageWeek
      let completed = garbageChore.completed
      let phoneNumber = numbers[theBoys.indexOf(name)]

      if (completed) {
        // Don't send any message
      } else {
        client.messages.create({
          body: garbageWeek
            ? `Hi ${name}! Have you finished the garbage chore yet? the Recycling, Compost, and Garbage need to be taken to the curb by tonight. Text me the code ${code} when the job is done. Cheers.`
            : `Hi ${name}! Have you finished the garbage chore yet? the Recycling and Compost need to be taken to the curb by tonight. Text me the code ${code} when the job is done. Cheers.`,
          to: phoneNumber,
          from: TWILIO_PHONE_NUMBER,
        })
      }
    })
  } else if (day === 4) {
    // Towel Day
    TowelModel.find({}, async (err, towels) => {
      if (err) {
        console.log(err)
        return
      }

      let towelChore = towels[0]

      let name = towelChore.name
      let code = towelChore.code
      let completd = towelChore.completed
      let phoneNumebr = numbers[theBoys.indexOf(name)]

      if (completed) {
        // Don't send any message
      } else {
        client.messages.create({
          body: `Hi ${name}! Have you finished the towel chore yet? They need to be washed, dryed, folded, and put back in their respective drawer upstairs. Text me the code ${code} when the job is done. Cheers.`,
          to: phoneNumber,
          from: TWILIO_PHONE_NUMBER,
        })
      }
    })
  } else {
    // Don't send any messages
  }

  res.send("Sent an hourly important chore reminder!")
})

app.get("/once_per_day", (req, res) => {
  DebtModel.find({}, async (err, debts) => {
    if (err) {
      console.log(err)
      return
    }

    for (let i = 0; i < debts.length; i++) {
      let debt = debts[i]

      client.messages.create({
        body: `Daily reminder that you owe ${debt.lender} $${debt.amount} for ${debt.reason}. Text me code ${debt.code} when you've repaid this. This debt has been outstanding for ${debt.days} day(s)`,
        to: numbers[theBoys.indexOf(borrower)],
        from: TWILIO_PHONE_NUMBER,
      })
    }

    let garbageChore = garbages[0]
    let id = garbageChore.id
    await GarbageModel.findByIdAndRemove(id).exec()
    console.log("deleted")
  })

  res.send("Sent today's debt-collection reminders!")
})

app.get("/once_per_selected_days", (req, res) => {
  let date = new Date()
  let day = date.getDay()

  if (day === 2) {
    // Garbage day
    GarbageModel.find({}, async (err, garbages) => {
      if (err) {
        console.log(err)
        return
      }

      let garbageChore = garbages[0]

      let name = garbageChore.name
      let code = garbageChore.code
      let garbageWeek = garbageChore.garbageWeek

      client.messages.create({
        body: garbageWeek
          ? `Good Evening ${name}! In case you haven't already done so already, the Recycling, Compost, and Garbage need to be taken to the curb by tonight. Text me the code ${code} when the job is done. Cheers.`
          : `Good Evening ${name}! In case you haven't already done so already, the Recycling and Compost need to be taken to the curb by tonight. Text me the code ${code} when the job is done. Cheers.`,
        to: numbers[theBoys.indexOf(name)],
        from: TWILIO_PHONE_NUMBER,
      })
    })
  } else if (day === 4) {
    // Towel day
    TowelModel.find({}, async (err, towels) => {
      if (err) {
        console.log(err)
        return
      }

      let towelChore = towels[0]

      let name = towelChore.name
      let code = towelChore.code

      client.messages.create({
        body: `Good Afternoon ${name}! It's your turn on towel duty! They need to be washed, dryed, folded, and put back in their respective drawer upstairs. Text me the code ${code} when the job is done. Cheers.`,
        to: numbers[theBoys.indexOf(name)],
        from: TWILIO_PHONE_NUMBER,
      })
    })
  } else if (day === 6) {
    //Saturday
    GarbageModel.find({}, async (err, garbages) => {
      if (err) {
        console.log(err)
        return
      }

      let garbageChore = garbages[0]

      let id = garbageChore.id
      let name = garbageChore.name
      let garbageWeek = garbageChore.garbageWeek
      let completed = garbageChore.completed
      let next = garbageChore.next

      if (completed) {
        await GarbageModel.findByIdAndRemove(id).exec()

        client.messages.create({
          body: `Good Afternoon ${name}! Please Empty the Recycling, Green bin, and Garbage one last time so that ${next} may start their week with a clean slate. After that, you are free!`,
          to: numbers[theBoys.indexOf(next)],
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

        res.send(
          `Told ${name} to empty out the garbage once last time, they are no longer on garbage duty after today`
        )
      } else {
        res.send(
          `The person who was on garbage duty last week did not do it and so they are on garbage duty again this week`
        )
      }
    })
  } else {
    //Sunday
    GarbageModel.find({}, async (err, garbages) => {
      if (err) {
        console.log(err)
        return
      }

      let garbageChore = garbages[0]
      let next = garbageChore.next

      client.messages.create({
        body: `Good Afternoon ${next}! Heads up, You're on garbage duty this week.`,
        to: numbers[theBoys.indexOf(next)],
        from: TWILIO_PHONE_NUMBER,
      })
    })
  }

  res.send(`Told ${next} that they are on garbage this week`)
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

app.post("/sms", async (req, res) => {
  // console.log(req.body)
  let originalMsg = req.body.Body.trim()
  let msg = originalMsg.toLowerCase()
  let senderNumber = req.body.From
  let sender = theBoys[numbers.indexOf(senderNumber)]
  const twiml = new MessagingResponse()

  if (msg.includes("commands")) {
    twiml.message(`
    Commands:\n\nCommands -> what I do\n\nOrigin -> why I exist\n\nDC -> collect $ from your roomates\n\nOutstanding -> see outstanding debts\n\nSchedule -> see who's doing what chore this week`)
  } else if (msg.includes("origin")) {
    twiml.message(`
    \nYou lead an extremely busy life. You've got exams to ace, deadlines to meet, and a limited memory ;). Why bother remembering the small stuff when you've bigger things to worry about? That's where I, Twilly 🤖, can help out. Delegate the small stuff to me so you can focus on what really matters ❤️
    `)
  } else if (msg.includes("schedule")) {
    let garbagePerson
    let towelPerson

    GarbageModel.find({}, (err, garbages) => {
      if (err) {
        res.send(err)
      }

      garbagePerson = garbages[0].name
    })

    TowelModel.find({}, (err, towels) => {
      if (err) {
        res.send(err)
      }

      towelPerson = towels[0].name
    })

    let schedule = `Garbage: ${garbagePerson}\nTowels: ${towelPerson}`

    twiml.message(schedule)
  } else if (msg.includes("outstanding")) {
    DebtModel.find({}, (err, debts) => {
      if (err) {
        res.send(err)
      }

      let currentDebts = "Outstanding Debts:\n\n"

      for (let i = 0; i < debts.length; i++) {
        let debt = debts[i]
        currentDebts += `${debt.borrower} owes ${debt.lender} $${debt.amount} for ${debt.reason}\nDays Outstanding: ${debt.days}\n\n`
      }

      twiml.message(currentDebts)
    })
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
        let borrower = names[i]

        client.messages.create({
          body: `E-transfer ${sender} $${amount} for the ${reason} and text me ${code} once you have.`,
          to: numbers[theBoys.indexOf(borrower)],
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

      TowelModel.find({}, async (err, towels) => {
        if (err) {
          res.send(err)
        }

        let towelChore = towels[0]
        let id = towelChore.id
        let code = towelChore.code

        if (code === originalMsg) {
          try {
            await TowelModel.findById(id, (err, updatedTowelChore) => {
              updatedTowelChore.code = generateTowelChoreCode()
              updatedTowelChore.completed = true
              updatedTowelChore.save()
            })
          } catch (err) {
            console.log(err)
          }

          twiml.message(
            `Hi ${sender}! I've confirmed that you've completed the towel chore. Thank you!`
          )
        } else {
          twiml.message(
            `Sorry, I don't understand. Are you sure that's a valid code?`
          )
        }
      })
    } else if (msg[0] === "G") {
      GarbageModel.find({}, async (err, garbages) => {
        if (err) {
          res.send(err)
        }

        let garbageChore = garbages[0]
        let id = garbageChore.id
        let code = garbageChore.code

        if (code === originalMsg) {
          try {
            await GarbageModel.findById(id, (err, updatedGarbageChore) => {
              updatedGarbageChore.code = generateGarbageChoreCode()
              updatedGarbageChore.completed = true
              updatedGarbageChore.save()
            })
          } catch (err) {
            console.log(err)
          }

          twiml.message(
            `Hi ${sender}! I've confirmed that you've completed the garbage chore. Thank you!`
          )
        } else {
          twiml.message(
            `Sorry, I don't understand. Are you sure that's a valid code?`
          )
        }
      })
    } else if (msg[0] === "D") {
      DebtModel.find({}, async (err, debts) => {
        if (err) {
          res.send(err)
        }

        let debt

        for (let i = 0; i < debts.length; i++) {
          if (debts[i].code === originalMsg) debt = debts[i]
        }

        let id = debt.id

        if (id !== undefined) {
          let reason = debt.reason
          let amount = debt.amount
          let lender = debt.lender

          await DebtModel.findByIdAndRemove(id).exec()
          twiml.message(
            `Hi ${sender}! I've confirmed that you've e-transferred ${lender} $${amount} for ${reason}. Thank you!`
          )

          client.messages.create({
            body: `Hi ${lender}! I have just received confirmation that your debt-collector has succesfully collected on the $${amount} that ${sender} owed you for ${reason}!`,
            to: numbers[theBoys.indexOf(lender)],
            from: TWILIO_PHONE_NUMBER,
          })
        } else {
          twiml.message(
            `Sorry, I don't understand. Are you sure that's a valid code?`
          )
        }
      })
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
