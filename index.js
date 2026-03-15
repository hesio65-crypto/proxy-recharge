const express = require("express")
const Gerencianet = require("gn-api-sdk-node")

const app = express()
app.use(express.json())

const options = {
  sandbox: false,
  client_id: "SEU_CLIENT_ID",
  client_secret: "SEU_CLIENT_SECRET",
  certificate: "./producao-854589-rechargehz3.p12"
}

const gn = new Gerencianet(options)

app.post("/criar-pix", async (req, res) => {

  const body = {
    calendario: { expiracao: 3600 },
    valor: { original: "5.00" },
    chave: "SUA_CHAVE_PIX",
    solicitacaoPagador: "Teste PIX"
  }

  const params = {
    txid: Math.random().toString(36).substring(2, 30)
  }

  try {

    const charge = await gn.pixCreateCharge(params, body)

    const qr = await gn.pixGenerateQRCode({
      id: charge.loc.id
    })

    res.json({
      txid: charge.txid,
      pix: qr.qrcode,
      qrcode: qr.imagemQrcode
    })

  } catch (error) {
    console.log(error)
    res.status(500).json(error)
  }

})

app.get("/", (req,res)=>{
  res.send("Servidor funcionando")
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log("Servidor rodando")
})
