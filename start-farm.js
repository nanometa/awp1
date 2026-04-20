const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const WALLETS_PATH = path.join(__dirname, 'wallets.json');
const MINE_SKILL_DIR = path.join(__dirname, 'mine-skill');
const AWP_WRAPPER_CMD = path.join(__dirname, 'awp-wrapper.cmd');
const DATA_DIR = path.join(__dirname, 'data');
const DATASET = "ds_wikipedia";

async function main() {
  if (!fs.existsSync(WALLETS_PATH)) {
    console.error("wallets.json not found");
    process.exit(1);
  }

  const wallets = JSON.parse(fs.readFileSync(WALLETS_PATH, 'utf8'));

  // Run exactly the registered ones
  const activeWallets = wallets.filter(w => w.registered);

  console.log(`🚀 Starting farm for ${activeWallets.length} registered wallets...\n`);

  for (const wallet of activeWallets) {
    const minerId = `miner-${wallet.id}`;
    const outputRoot = path.join(DATA_DIR, minerId);
    
    if (!fs.existsSync(outputRoot)) {
      fs.mkdirSync(outputRoot, { recursive: true });
    }

    const pythonPath = path.join(MINE_SKILL_DIR, '.venv', 'Scripts', 'python.exe');
    const env = Object.assign({}, process.env, {
      "AWP_WALLET_BIN": AWP_WRAPPER_CMD,
      "MINER_ID": minerId,
      "CRAWLER_OUTPUT_ROOT": outputRoot,
      "PYTHONIOENCODING": "utf-8"
    });

    process.stdout.write(`📝 Launching ${minerId} (${wallet.address})... `);

    // We run agent-start <dataset> directly
    const p = spawn(pythonPath, ["scripts/run_tool.py", "agent-start", DATASET], {
      cwd: MINE_SKILL_DIR,
      env: env,
      stdio: 'ignore', // Let it run fully in background
      detached: true
    });
    
    p.unref();

    console.log(`✅ PID ${p.pid}`);
    
    // Delay between launches to avoid API spam
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log("\n✨ All requested miners launched.");
}

main().catch(console.error);
