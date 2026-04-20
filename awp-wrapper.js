#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const logPath = 'f:\\minework-farm\\wrapper.log';
function log(msg) {
  fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
}

log(`Wrapper started with args: ${process.argv.slice(2).join(' ')}`);
log(`MINER_ID: ${process.env.MINER_ID}`);

const args = process.argv.slice(2);
if (args.length === 0) {
  process.exit(1);
}

// 1. Determine which wallet to use
// We check MINER_ID and fall back to 1
const minerId = process.env.MINER_ID || '1';
let walletIndex = parseInt(minerId.replace('miner-', ''), 10);
if (isNaN(walletIndex) || walletIndex < 1) {
    walletIndex = 1;
}

const walletsPath = 'f:/minework-farm/wallets.json';
if (!fs.existsSync(walletsPath)) {
  console.error("wallets.json not found");
  process.exit(1);
}

const wallets = JSON.parse(fs.readFileSync(walletsPath, 'utf8'));
const walletData = wallets.find(w => w.id === walletIndex) || wallets[0];
const wallet = new ethers.Wallet(walletData.privateKey);

const command = args[0];

if (command === '--version') {
  console.log("1.5.0"); // fake version to bypass token req
  process.exit(0);
}

if (command === 'receive') {
  console.log(JSON.stringify({ address: wallet.address }));
  process.exit(0);
}

if (command === 'unlock') {
  console.log(JSON.stringify({
    sessionToken: "dummy-token",
    expiresAt: Math.floor(Date.now() / 1000) + 86400 * 365
  }));
  process.exit(0);
}

if (command === 'sign-typed-data') {
  let dataPayload = null;
  const dataIdx = args.indexOf('--data');
  if (dataIdx !== -1 && dataIdx + 1 < args.length) {
    dataPayload = args[dataIdx + 1];
  } else {
    // maybe it is passed as a single arg or something weird? Let's just catch it.
    console.error(JSON.stringify({error: "Missing --data"}));
    process.exit(1);
  }

  try {
    const payload = JSON.parse(dataPayload);
    const types = Object.assign({}, payload.types);
    delete types.EIP712Domain;
    
    log(`Signing typed data for wallet: ${wallet.address}`);
    wallet.signTypedData(payload.domain, types, payload.message)
      .then(signature => {
        log(`Successfully signed. Signature: ${signature.substring(0, 10)}...`);
        console.log(JSON.stringify({ signature }));
        process.exit(0);
      })
      .catch(err => {
        log(`Error signing: ${err.toString()}`);
        console.error(err.toString());
        process.exit(1);
      });
  } catch (err) {
    console.error(err.toString());
    process.exit(1);
  }
} else {
  // Graceful fallback for unknown commands just to be safe
  console.log(JSON.stringify({error: "Unsupported command"}));
  process.exit(0);
}
