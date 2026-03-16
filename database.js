const sqlite3 = require("sqlite3").verbose()

const db = new sqlite3.Database("./vendas.db")

db.serialize(()=>{

  db.run(`
    CREATE TABLE IF NOT EXISTS vendas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      txid TEXT,
      subuser_id TEXT,
      gigas INTEGER,
      valor REAL,
      status TEXT,
      data DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

})

module.exports = db