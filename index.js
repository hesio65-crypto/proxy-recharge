const express = require("express")
const Gerencianet = require("gn-api-sdk-node")
const crypto = require("crypto")
const axios = require("axios")

const app = express()
app.use(express.json())

// EFI
const options = {
  sandbox: false,
  client_id: "Client_Id_c14fdae342370b1c9f86efa3284aa3bc2f592d19",
  client_secret: "Client_Secret_aeb560538e5e6a1b177ca40be82db0786706f53d",
  certificate: "./producao-854589-rechargehz3.p12"
}

const gn = new Gerencianet(options)

// DATAIMPULSE
const DI_LOGIN = "thayslima270319@gmail.com"
const DI_PASSWORD = "fVyIYoCRbCVd4OKPsPAHjB8gzK76MAbF"

// PLANOS
const planos = {
  1: 10,
  3: 22,
  5: 34,
  7: 38,
  10: 51,
  20: 97
}

// MEMÓRIA TEMPORÁRIA
const pagamentos = {}

// GERAR TXID
function gerarTxid() {
  return crypto.randomBytes(16).toString("hex")
}

// GERAR PIX
app.post("/criar-pix", async (req,res)=>{

  const {subuser_id,gigas} = req.body

  if(!planos[gigas]){
    return res.json({erro:"plano inválido"})
  }

  const valor = planos[gigas].toFixed(2)
  const txid = gerarTxid()

  const params = {txid}

  const body = {
    calendario:{expiracao:3600},
    valor:{original:valor},
    chave:"9f3141e7-865a-4411-bbcd-b1a7c30fd7c3",
    solicitacaoPagador:"Recarga Proxy"
  }

  try{

    const charge = await gn.pixCreateCharge(params,body)

    const qr = await gn.pixGenerateQRCode({
      id:charge.loc.id
    })

    // salvar pagamento
    pagamentos[txid] = {
      subuser_id,
      gigas,
      status:"aguardando"
    }

    res.json({
      txid,
      pix:charge.pixCopiaECola,
      qrcode:qr.imagemQrcode
    })

  }catch(err){

    console.log(err)
    res.json(err)

  }

})

// WEBHOOK EFI
app.post("/webhook", async (req,res)=>{

  try{

    const pix = req.body?.pix

    if(!pix){
      return res.sendStatus(200)
    }

    for(const pagamento of pix){

      const txid = pagamento.txid

      if(!pagamentos[txid]){
        continue
      }

      if(pagamentos[txid].status === "pago"){
        continue
      }

      const {subuser_id,gigas} = pagamentos[txid]

      console.log("PIX pago:",txid)

      // gerar token DataImpulse
      const auth = await axios.post(
        "https://api.dataimpulse.com/reseller/user/token/get",
        {
          login:DI_LOGIN,
          password:DI_PASSWORD
        }
      )

      const token = auth.data.token

      // recarregar proxy
      const recharge = await axios.post(
        "https://api.dataimpulse.com/reseller/sub-user/balance/add",
        {
          subuser_id:subuser_id,
          traffic:gigas
        },
        {
          headers:{
            Authorization:`Bearer ${token}`
          }
        }
      )

      console.log("Proxy recarregada:",recharge.data)

      pagamentos[txid].status = "pago"

    }

    res.sendStatus(200)

  }catch(err){

    console.log(err)
    res.sendStatus(500)

  }

})

const PORT = process.env.PORT || 3000

app.listen(PORT, ()=>{
  console.log("Servidor rodando")
})
})
