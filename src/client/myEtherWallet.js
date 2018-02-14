const ethereumJsWallet = require('ethereumjs-wallet')

class MyEtherWallet {
  constructor(web3, json, password) {
    this.web3 = web3
    this.wallet = ethereumJsWallet.fromV3(json, password, true)
    this.address = this.wallet.getAddressString()
  }

  getAccounts() {
    return [this.address]
  }
}

module.exports = MyEtherWallet
