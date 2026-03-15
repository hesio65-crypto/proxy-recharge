const express = require("express")
const Gerencianet = require("gn-api-sdk-node")

const app = express()
app.use(express.json())

const options = {
  sandbox: false,
  client_id: "Client_Id_c14fdae342370b1c9f86efa3284aa3bc2f592d19",
  client_secret: "Client_Secret_aeb560538e5e6a1b177ca40be82db0786706f53d",
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
