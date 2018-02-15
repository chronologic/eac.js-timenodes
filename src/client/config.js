const { Cache } = require("./cache.js")
const LightWallet = require("./lightWallet.js")
const MyEtherWallet = require("./myEtherWallet.js")
const { Logger } = require("./logger.js")

class Config {
  constructor(
    scanSpread,
    logfile,
    logLevel,
    factory,
    tracker,
    web3,
    eac,
    provider,
    walletFile,
    password,
    autostart,
    logger
  ) {
    this.scanSpread = scanSpread

    if (logger) {
      this.logger = logger
    } else {
      this.logger = new Logger(logfile, logLevel)
    }

    this.cache = new Cache(this.logger)
    this.factory = factory
    this.tracker = tracker
    this.web3 = web3
    this.eac = eac
    this.provider = provider
    this.scanning = autostart
  }

  static async create(
    scanSpread,
    logfile,
    logLevel,
    factory,
    tracker,
    web3,
    eac,
    provider,
    walletFile,
    password,
    autostart,
    logger
  ) {
    let conf = new Config(
      scanSpread,
      logfile,
      logLevel,
      factory,
      tracker,
      web3,
      eac,
      provider,
      walletFile,
      password,
      autostart,
      logger
    )
    if (walletFile) {
      await conf.instantiateWallet(walletFile, password)
      return conf
    } else {
      conf.wallet = false
      return conf
    }
  }

  async instantiateWallet(file, password) {
    if (file === "none") {
      return false
    }
    
    let wallet = null;
    if (typeof file === "string" || typeof file === Object) {
      wallet = new MyEtherWallet(this.web3, file, password)
    } else {
      wallet = new LightWallet(this.web3)
      await wallet.decryptAndLoad(file, password)
    }
    this.wallet = wallet
  }
}

module.exports = Config
