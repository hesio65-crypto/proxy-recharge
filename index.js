const express = require("express")
const Gerencianet = require("gn-api-sdk-node")
const crypto = require("crypto")

const app = express()
app.use(express.json())

const options = {
  sandbox: false,
  client_id: "Client_Id_c14fdae342370b1c9f86efa3284aa3bc2f592d19",
  client_secret: "Client_Secret_aeb560538e5e6a1b177ca40be82db0786706f53d",
  certificate: "./producao-854589-rechargehz3.p12"
}

const gn = new Gerencianet(options)

const planos = {
  1: 10,
  3: 22,
  5: 34,
  7: 38,
  10: 51,
  20: 97
}

function gerarTxid() {
  return crypto.randomBytes(16).toString("hex").substring(0, 32)
}

app.post("/criar-pix", async (req, res) => {

  const { subuser_id, gigas } = req.body

  if (!planos[gigas]) {
    return res.json({ erro: "Plano inválido" })
  }

  const valor = planos[gigas].toFixed(2)

  const txid = gerarTxid()

  const params = { txid }

  const body = {
    calendario: { expiracao: 3600 },
    valor: { original: valor },
    chave: "9f3141e7-865a-4411-bbcd-b1a7c30fd7c3",
    solicitacaoPagador: "Recarga Proxy"
  }

  try {

    const charge = await gn.pixCreateCharge(params, body)

    const qr = await gn.pixGenerateQRCode({
      id: charge.loc.id
    })

    res.json({
      txid: txid,
      pix: charge.pixCopiaECola,
      qrcode: qr.imagemQrcode
    })

  } catch (error) {

    console.log(error)
    res.json(error)

  }

app.post("/webhook", async (req, res) => {

  console.log("Pagamento recebido:", req.body)

  res.sendStatus(200)

})

app.listen(3000, () => {
  console.log("API rodando na porta 3000")
})
