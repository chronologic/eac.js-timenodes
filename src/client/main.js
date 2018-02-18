const AlarmClient = require("./alarmClient")
const Config = require("./config")
const Repl = require("./repl")
const Scanner = require("./scanning")
const StatsDB = require("./statsdb")

const startScanning = (ms, conf) => {
  const log = conf.logger

  log.info(`Scanning request tracker at ${conf.tracker.address}`)
  log.info(`Validating results with factory at ${conf.factory.address}`)
  log.info(`Scanning every ${ms / 1000} seconds.`)

  setInterval((_) => {
    if (conf.scanning) {
      Scanner.scanBlockchain(conf).catch(err => log.error(err))
    }
  }, ms)

  setInterval((_) => {
    if (conf.scanning) {
      Scanner.scanCache(conf).catch(err => log.error(err))
    }
  }, ms + 1000)
}

/**
 * The main driver function that begins the client operation.
 * @param {Web3} web3 An instantiated web3 object.
 * @param {EAC} eac An instantiated eac object.
 * @param {String} provider The supplied provider host for the web3 instance. (Ex. 'http://localhost:8545)
 * @param {Number} scanSpread The spread +- of the current block number to scan.
 * @param {Number} ms Milliseconds between each conduction of a blockchain scan.
 * @param {String} logfile The file that the logging utility will log to, or 'console' for logging to console.
 * @param {Number} logLevel The level of logging allowed.
 * @param {String} chain The name of the chain, accepted values are 'ropsten', 'rinkeby' and 'kovan'.
 * @param {String} walletFile Path to the encrypted wallet file.
 * @param {String} pw Password to decrypt wallet.
 * @param {Boolean} autoStart Enables automatic scanning.
 */
const main = async (
  web3,
  eac,
  provider,
  scanSpread,
  ms,
  logfile,
  logLevel,
  walletFile,
  pw,
  autostart,
  logger,
  repl = true,
  browserDB
) => {
  // Assigns chain to the name of the network ID
  const chain = await eac.Util.getChainName()

  // Loads the contracts
  const requestFactory = await eac.requestFactory()
  const requestTracker = await eac.requestTracker()

  if (logfile === "default") {
    logfile = `${require("os").homedir()}/.eac.log`
  }

  // Loads conf
  let conf = await Config.create(
    scanSpread, // conf.scanSpread
    logfile, // conf.logger.logfile
    logLevel, // conf.logger.logLevel
    requestFactory, // conf.factory
    requestTracker, // conf.tracker
    web3, // conf.web3
    eac, // conf.eac
    provider, // conf.provider
    walletFile, // conf.wallet
    pw, // wallet password
    autostart,
    logger,
    repl
  )

  const log = conf.logger

  if (logfile === 'console') {
    log.info("Logging to console")
  }

  conf.client = "parity"
  conf.chain = chain

  // Creates StatsDB
  conf.statsdb = new StatsDB(conf.web3, browserDB)

  // Determines wallet support
  // Determines wallet support
  if (conf.wallet) {
    log.info('Wallet support: Enabled')
    log.info('\nExecuting from accounts:')

    conf.wallet.getAccounts().forEach(async account => {
        log.info(`${account} | Balance: ${web3.fromWei(await eac.Util.getBalance(account))}`)
    })

    conf.statsdb.initialize(conf.wallet.getAccounts())
  } else { 
    log.info('Wallet support: Disabled')

    // Loads the default account.
    const account = web3.eth.accounts[0]
    /* eslint-disable */
    web3.eth.defaultAccount = account
    /* eslin-enable */
    if (!eac.Util.checkValidAddress(web3.eth.defaultAccount)) {
      throw new Error("Wallet is disabled but you do not have a local account unlocked.")
    }

    log.info(`\nExecuting from account: ${account} | Balance: ${web3.fromWei(await eac.Util.getBalance(account))}`)
    conf.statsdb.initialize([account])
  }

  // Begin
  startScanning(ms, conf)

  if (repl) {
    // Waits a bit before starting the repl so that the accounts have time to print.
    setTimeout(() => Repl.start(conf, ms), 1200)
  }

  return new AlarmClient({ config: conf });
}

module.exports = main
