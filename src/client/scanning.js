/* eslint no-await-in-loop: "off" */

const store = (conf, txRequest) => {
  const log = conf.logger

  if (conf.cache.has(txRequest.address)) {
    log.cache(`Cache already contains ${txRequest.address}`)
    return
  }
  log.info(`Storing found txRequest at address ${txRequest.address}`)
  conf.cache.set(txRequest.address, txRequest.windowStart)
}

const scan = async (conf, left, right) => {
  const log = conf.logger
  const { eac } = conf

  const requestTracker = conf.tracker
  const requestFactory = conf.factory

  requestTracker.setFactory(requestFactory.address)

  let nextRequestAddress = await requestTracker.nextFromLeft(left)

  if (nextRequestAddress === eac.Constants.NULL_ADDRESS) {
    log.info("No new requests.")
    return
  } else if (!eac.Util.checkValidAddress(nextRequestAddress)) {
    throw new Error(`Received invalid response from Request Tracker | Response: ${nextRequestAddress}`)
  }

  while (nextRequestAddress !== eac.Constants.NULL_ADDRESS && conf.scanning) {
    log.debug(`Found request - ${nextRequestAddress}`)

    // Verify that the request is known to the factory we are validating with.
    if (!await requestFactory.isKnownRequest(nextRequestAddress)) {
      log.error(`Encountered unknown transaction request: ${
        requestFactory.address
      } | query: ">=" | value ${left} | address: ${nextRequestAddress}`)
      throw new Error(`Encountered unknown address! Please check that you are using the correct contracts JSON file.`)
    }

    const trackerWindowStart = await requestTracker.windowStartFor(nextRequestAddress)

    const txRequest = await eac.transactionRequest(nextRequestAddress)
    await txRequest.fillData()

    if (!txRequest.windowStart.equals(trackerWindowStart)) {
      // The data between the txRequest we have and from the requestTracker do not match.
      log.error(`Data mismatch between txRequest and requestTracker. Double check contract addresses.`)
    } else if (txRequest.windowStart.lessThanOrEqualTo(right)) {
      // This request is within bounds, store it.
      store(conf, txRequest)
    } else {
      console.log
      log.debug(`Scan exit condition hit! Next window start exceeds right bound. WindowStart: ${
        txRequest.windowStart
      } | right: ${right}`)
      break
    }
    nextRequestAddress = await requestTracker.nextRequest(txRequest.address)

    // Hearbeat
    if (nextRequestAddress === eac.Constants.NULL_ADDRESS) {
      log.info("No new requests.")
    }
  }
}

const scanBlockchain = async (conf) => {
  const log = conf.logger
  const { eac } = conf

  const leftBlock = (await eac.Util.getBlockNumber()) - conf.scanSpread
  const rightBlock = leftBlock + (conf.scanSpread * 2)

  const leftTimestamp = await eac.Util.getTimestampForBlock(leftBlock)
  const avgBlockTime = Math.floor((await eac.Util.getTimestamp()) - (leftTimestamp / conf.scanSpread))
  const rightTimestamp = Math.floor(leftTimestamp + (avgBlockTime * conf.scanSpread * 2))

  log.debug(`Scanning bounds from 
[debug] blocks: ${leftBlock} to ${rightBlock}
[debug] timestamps: ${leftTimestamp} tp ${rightTimestamp}`)

  scan(conf, leftBlock, rightBlock)
  scan(conf, leftTimestamp, rightTimestamp)
}


const { routeTxRequest } = require("./routing.js")

const scanCache = async (conf) => {
  const { eac } = conf

  if (conf.cache.len() === 0) return // nothing stored in cache

  const allTxRequests = conf.cache
    .stored()
    .map(address => eac.transactionRequest(address))

  Promise.all(allTxRequests).then((txRequests) => {
    txRequests.forEach((txRequest) => {
      txRequest.refreshData().then(() => routeTxRequest(conf, txRequest))
    })
  })
}

module.exports = {
  scanBlockchain,
  scanCache,
}
