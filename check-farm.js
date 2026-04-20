const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WALLETS_PATH = path.join(__dirname, 'wallets.json');
const MINE_SKILL_DIR = path.join(__dirname, 'mine-skill');
const AWP_WRAPPER_CMD = path.join(__dirname, 'awp-wrapper.cmd');
const DATA_DIR = path.join(__dirname, 'data');

const wallets = JSON.parse(fs.readFileSync(WALLETS_PATH, 'utf8'));
const activeWallets = wallets.filter(w => fs.existsSync(path.join(DATA_DIR, `miner-${w.id}`)));

console.log(`Checking status for ${activeWallets.length} active wallets...`);

for (const wallet of activeWallets) {
  const minerId = `miner-${wallet.id}`;
  const outputRoot = path.join(DATA_DIR, minerId);
  const sessionPath = path.join(outputRoot, '_worker_state', 'session.json');

  let stats = { mining_state: 'stopped' };
  if (fs.existsSync(sessionPath)) {
      try {
          stats = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
      } catch(e) {}
  }

  const totals = stats.session_totals || {};
  const processed = totals.processed_items || 0;
  const submitted = totals.submitted_items || 0;
  const state = stats.mining_state || 'stopped';
  const epoch = stats.epoch_id || '?';
  const currentBatch = stats.current_batch || {};
  
  console.log(`\nMiner: ${minerId} (${wallet.address})`);
  console.log(`  State: ${state}`);
  console.log(`  Epoch: ${epoch}`);
  console.log(`  Processed: ${processed}`);
  console.log(`  Submitted: ${submitted}`);
  
  if (Object.keys(currentBatch).length > 0) {
      console.log(`  Current Phase: ${currentBatch.state} (${currentBatch.total_items} items)`);
      if (currentBatch.summary && currentBatch.summary.messages) {
          console.log(`  Status Details: ${currentBatch.summary.messages.join('; ')}`);
      }
      if (currentBatch.summary && currentBatch.summary.errors && currentBatch.summary.errors.length > 0) {
          console.log(`  Errors:`);
          currentBatch.summary.errors.forEach(err => console.log(`    - ${err}`));
      }
  }

  // Also read the process ID properly if the process is alive (Windows specific check could be complicated, so basic output suffices)
}
