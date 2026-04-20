/**
 * register-agents.js — Register all wallets on AWP protocol via gasless relay
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const http = require("https");

const WALLET_FILE = path.join(__dirname, "wallets.json");
const RELAY_ENDPOINT = "https://api.awp.sh/api/relay/register";
const RPC_API = "https://api.awp.sh/v2"; // For fetching nonces
const CHAIN_ID = 8453; // Base Mainnet

// EIP-712 Domain for AWPRegistry
const DOMAIN = {
  name: "AWPRegistry",
  version: "1",
  chainId: CHAIN_ID,
  verifyingContract: "0x0000F34Ed3594F54faABbCb2Ec45738DDD1c001A",
};

// EIP-712 Types for SetRecipient (which Register uses)
const TYPES = {
  SetRecipient: [
    { name: "user", type: "address" },
    { name: "recipient", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

async function getNonce(address) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      jsonrpc: "2.0",
      method: "nonce.get",
      params: { address, chainId: CHAIN_ID },
      id: 1,
    });

    const req = http.request(RPC_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      timeout: 15000, // 15 second timeout
    }, (res) => {
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          if (json.error) {
            reject(new Error(json.error.message || JSON.stringify(json.error)));
          } else {
            let result = json.result;
            if (result && typeof result === "object" && result.nonce !== undefined) {
              result = result.nonce;
            }
            // Handle hex (0x...) or numeric result
            if (typeof result === "string" && result.startsWith("0x")) {
              resolve(BigInt(result));
            } else {
              resolve(BigInt(result || 0));
            }
          }
        } catch (e) { reject(e); }
      });
    });
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("nonce request timed out after 15s"));
    });
    req.on("error", (e) => reject(new Error(`nonce request error: ${e.message}`)));
    req.write(data);
    req.end();
  });
}


async function submitRelay(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request(RELAY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }, (res) => {
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  if (!fs.existsSync(WALLET_FILE)) {
    console.error("❌ wallets.json not found. Run generate-wallets.js first.");
    process.exit(1);
  }

  let wallets = JSON.parse(fs.readFileSync(WALLET_FILE, "utf-8"));
  console.log(`🚀 Starting registration for ${wallets.length} wallets on Chain ${CHAIN_ID}...\n`);

  for (let i = 0; i < wallets.length; i++) {
    const walletData = wallets[i];
    if (walletData.registered) {
      console.log(`⏩ Wallet #${walletData.id} (${walletData.address}) already registered.`);
      continue;
    }

    const wallet = new ethers.Wallet(walletData.privateKey);
    console.log(`📝 Registering Wallet #${walletData.id} (${wallet.address})...`);

    let success = false;
    let retries = 0;
    while (!success && retries < 10) {
      try {
        const nonce = await getNonce(wallet.address);
        const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour

        // Register is essentially setRecipient(self)
        const message = {
          user: wallet.address,
          recipient: wallet.address,
          nonce: nonce.toString(),
          deadline: deadline,
        };

        const signature = await wallet.signTypedData(DOMAIN, TYPES, message);

        const payload = {
          chainId: CHAIN_ID,
          user: wallet.address,
          deadline: deadline,
          signature: signature,
        };

        const res = await submitRelay(payload);

        if (res.status === 200) {
          console.log(`   ✅ Success! Tx Hash: ${res.data.txHash}`);
          walletData.registered = true;
          // Save after each success to prevent data loss on crash
          fs.writeFileSync(WALLET_FILE, JSON.stringify(wallets, null, 2));
          success = true;
        } else {
          console.error(`   ❌ Failed: ${JSON.stringify(res.data)}`);
          if (JSON.stringify(res.data).includes("rate limit") || res.status === 429) {
            throw new Error("rate limit exceeded");
          }
          break;
        }
      } catch (e) {
        const isRetryable = e.message && (
          e.message.includes("rate limit") ||
          e.message.includes("429") ||
          e.message.includes("timed out") ||
          e.message.includes("ECONNRESET") ||
          e.message.includes("ETIMEDOUT")
        );
        if (isRetryable && retries < 10) {
          retries++;
          const waitTime = 10000 * retries;
          console.log(`   ⏳ Retryable error (${e.message}). Retry ${retries}/10 in ${waitTime/1000}s...`);
          await new Promise(r => setTimeout(r, waitTime));
        } else {
          console.error(`   ❌ Error: ${e.message}`);
          break;
        }
      }
    }

    // Larger delay to avoid rate limits
    await new Promise(r => setTimeout(r, 5000));
  }

  console.log("\n✨ All registration attempts completed.");
}

main().catch(console.error);
