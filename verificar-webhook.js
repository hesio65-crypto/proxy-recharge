const Gerencianet = require("gn-api-sdk-node")

const options = {
  sandbox: false,
  client_id: "Client_Id_c14fdae342370b1c9f86efa3284aa3bc2f592d19",
  client_secret: "Client_Secret_aeb560538e5e6a1b177ca40be82db0786706f53d",
  certificate: "./producao-854589-rechargehz3.p12"
}

const gn = new Gerencianet(options)

async function verificar() {

  const params = {
    chave: "9f3141e7-865a-4411-bbcd-b1a7c30fd7c3"
  }

  const response = await gn.pixDetailWebhook(params)

  console.log(response)

}

verificar()