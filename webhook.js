const express = require("express")
const app = express()

app.use(express.json())

app.post("/webhook", (req, res) => {

  console.log("Webhook recebido:")
  console.log(req.body)

  res.status(200).send("ok")

})

app.listen(3001, () => {
  console.log("Webhook rodando")
})