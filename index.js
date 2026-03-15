const express = require("express")
const axios = require("axios")
const Gerencianet = require("gn-api-sdk-node")
const crypto = require("crypto")

const app = express()
app.use(express.json())

// CONFIG EFI
const options = {
  sandbox: false,
  client_id: process.env.EFI_CLIENT_ID || "Client_Id_c14fdae342370b1c9f86efa3284aa3bc2f592d19",
  client_secret: process.env.EFI_CLIENT_SECRET || "Client_Secret_aeb560538e5e6a1b177ca40be82db0786706f53d",
  certificate: path.join(__dirname, "producao-854589-rechargehz3.p12")
}

const gn = new Gerencianet(options)

// salvar pagamentos
let pagamentos = {}

function gerarTxid() {
  return crypto.randomBytes(16).toString("hex")
}

function valorPorGiga(gigas) {
  const tabela = {
    1: 10,
    3: 22,
    5: 34,
    7: 38,
    10: 51,
    20: 97
  }
  return tabela[gigas]
}

// CRIAR PIX
app.post("/criar-pix", async (req, res) => {

  try {

    const { subuser_id, gigas } = req.body

    if (!subuser_id || !gigas) {
      return res.status(400).json({ erro: "dados inválidos" })
    }

    const valor = valorPorGiga(gigas)
    const txid = gerarTxid()

    const body = {
      calendario: { expiracao: 3600 },
      valor: { original: valor.toFixed(2) },
      chave: process.env.PIX_KEY || "SUA_CHAVE_PIX",
      solicitacaoPagador: `Recarga ${gigas}GB`
    }

    const params = { txid }

    const charge = await gn.pixCreateCharge(params, body)

    const qr = await gn.pixGenerateQRCode({
      id: charge.loc.id
    })

    pagamentos[txid] = {
      subuser_id,
      gigas,
      status: "pendente"
    }

    res.json({
      txid,
      pix: qr.qrcode,
      qrcode: qr.imagemQrcode
    })

  } catch (err) {

    console.log("ERRO PIX:", err)
    res.status(500).json(err)

  }

})

// WEBHOOK EFI
app.post("/webhook", async (req, res) => {

  try {

    const pix = req.body.pix

    if (!pix) return res.sendStatus(200)

    for (const pagamento of pix) {

      const txid = pagamento.txid
      const pedido = pagamentos[txid]

      if (!pedido) continue
      if (pedido.status === "pago") continue

      await axios.post(
        "https://api.dataimpulse.com/reseller/sub-user/balance/add",
        {
          subuser_id: pedido.subuser_id,
          traffic: pedido.gigas
        }
      )

      pedido.status = "pago"

      console.log("proxy recarregada:", pedido)

    }

    res.sendStatus(200)

  } catch (err) {

    console.log("ERRO WEBHOOK:", err)
    res.sendStatus(500)

  }

})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log("Servidor rodando")
})
