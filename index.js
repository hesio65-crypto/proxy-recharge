const express = require("express")
const Gerencianet = require("gn-api-sdk-node")
const crypto = require("crypto")
const axios = require("axios")

const app = express()
app.use(express.json())

// EFI
const options = {
  sandbox:false,
  client_id:"Client_Id_c9775ea6d0d7c3666de6cbf6be902a4e80caa2a0",
  client_secret:"Client_Secret_3683b7706c12cfadfbfec0c4e5212b966e5f2c75",
  certificate:"./producao-854589-recargahz.p12"
}

const gn = new Gerencianet(options)

// DATAIMPULSE
const DI_LOGIN = "thayslima270319@gmail.com"
const DI_PASSWORD = "fVyIYoCRbCVd4OKPsPAHjB8gzK76MAbF"

// PLANOS
const planos = {
  1:10,
  3:22,
  5:34,
  7:38,
  10:51,
  20:97
}

// MEMÓRIA TEMP
const pagamentos = {}
const vendas = []

// GERAR TXID
function gerarTxid(){
  return crypto.randomBytes(16).toString("hex")
}

// RECARREGAR PROXY
async function recarregarProxy(subuser_id,gigas){

  console.log("Gerando token DataImpulse")

  const auth = await axios.post(
    "https://api.dataimpulse.com/reseller/user/token/get",
    {
      login:DI_LOGIN,
      password:DI_PASSWORD
    }
  )

  const token = auth.data.token

  console.log("Token obtido")

  const recharge = await axios.post(
    "https://api.dataimpulse.com/reseller/sub-user/balance/add",
    {
      subuser_id,
      traffic:gigas
    },
    {
      headers:{
        Authorization:`Bearer ${token}`
      }
    }
  )

  return recharge.data
}

// GERAR PIX
app.post("/criar-pix", async (req,res)=>{

  const {subuser_id,gigas} = req.body

  if(!planos[gigas]){
    return res.json({erro:"plano inválido"})
  }

  const valor = planos[gigas].toFixed(2)
  const txid = gerarTxid()

  // salvar venda
   vendas.push({
 txid,
 subuser_id,
 gigas,
 valor,
 status:"PENDENTE",
 data:new Date()
})
  try{

    const charge = await gn.pixCreateCharge(
      {txid},
      {
        calendario:{expiracao:3600},
        valor:{original:valor},
        chave:"9f3141e7-865a-4411-bbcd-b1a7c30fd7c3",
        solicitacaoPagador:"Recarga Proxy"
      }
    )

    const qr = await gn.pixGenerateQRCode({
      id:charge.loc.id
    })

    pagamentos[txid] = {
      subuser_id,
      gigas,
      status:"PENDENTE"
    }

    res.json({
      txid,
      pix: qr.qrcode,
      qrcode: qr.imagemQrcode
    })

  }catch(err){

    console.log(err)
    res.json(err)

  }

})

// WEBHOOK PIX (TESTE)
app.post("/webhook", async (req,res)=>{
  console.log("🔥 WEBHOOK CHEGOU");
  console.log(JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

  try{

    const pix = req.body.pix

    if(!pix){
      return res.sendStatus(200)
    }

    for(const pagamentoPix of pix){

      const txid = pagamentoPix.txid

      if(!pagamentos[txid]){
        continue
      }

      const pagamento = pagamentos[txid]

      if(pagamento.status !== "PENDENTE"){
        console.log("Webhook duplicado ignorado:",txid)
        continue
      }

      pagamento.status = "PROCESSANDO"

      const {subuser_id,gigas} = pagamento

      console.log("PIX pago:",txid)

      
       const venda = vendas.find(v => v.txid === txid)
if(venda){
 venda.status = "PAGO"
}

      console.log("SUBUSER:",subuser_id)
      console.log("GB:",gigas)

      try{

        const resultado = await recarregarProxy(subuser_id,gigas)

        console.log("Recarga feita:",resultado)

        pagamento.status = "CONCLUIDO"

      }catch(err){

        console.log("Erro recarga:",err.message)

        pagamento.status = "ERRO"

      }

    }

    res.sendStatus(200)

  }catch(err){

    console.log(err)
    res.sendStatus(500)

  }

})

// PAINEL DE VENDAS
app.get("/admin/vendas",(req,res)=>{
 res.json(vendas)
})

app.get("/ativar-webhook", async (req,res)=>{

  try{

    const response = await gn.pixConfigWebhook(
      { chave: "9f3141e7-865a-4411-bbcd-b1a7c30fd7c3" },
      { webhookUrl: "https://proxy-recharge-production.up.railway.app/webhook" }
    )

    console.log("WEBHOOK ATIVADO:",response)

    res.json(response)

  }catch(err){

    console.log(err)
    res.json(err)

  }

})

// INICIAR SERVIDOR
app.listen(3000,()=>{
 console.log("Servidor rodando")
})
