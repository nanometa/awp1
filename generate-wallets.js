/**
 * generate-wallets.js — Generate N fresh Ethereum wallets for mining
 * 
 * Wallets are stored in wallets.json (encrypted at rest is optional).
 * NEVER expose private keys — this file should be kept secure.
 * 
 * Usage: node generate-wallets.js [count]
 * Default: 30 wallets
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const WALLET_FILE = path.join(__dirname, "wallets.json");
const DEFAULT_COUNT = 30;

async function main() {
  const count = parseInt(process.argv[2]) || DEFAULT_COUNT;
  
  // Check if wallets already exist
  if (fs.existsSync(WALLET_FILE)) {
    const existing = JSON.parse(fs.readFileSync(WALLET_FILE, "utf-8"));
    console.log(`⚠️  wallets.json already exists with ${existing.length} wallets.`);
    console.log(`   Delete wallets.json first if you want to regenerate.`);
    process.exit(1);
  }

  console.log(`🔑 Generating ${count} fresh wallets...\n`);

  const wallets = [];
  for (let i = 0; i < count; i++) {
    const w = ethers.Wallet.createRandom();
    wallets.push({
      id: i + 1,
      address: w.address,
      privateKey: w.privateKey,
      registered: false,
      bound: false,
      miningActive: false,
    });
    console.log(`  Wallet #${(i + 1).toString().padStart(2, "0")}: ${w.address}`);
  }

  fs.writeFileSync(WALLET_FILE, JSON.stringify(wallets, null, 2));
  console.log(`\n✅ ${count} wallets saved to wallets.json`);
  console.log(`\n⚠️  IMPORTANT: Keep wallets.json SECRET. Do not share or commit it.`);
  console.log(`\nNext step: node register-agents.js`);
}

main().catch(console.error);
