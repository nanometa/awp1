const { spawn } = require('child_process');
const path = require('path');

const MINER_ID = 'miner-1';
const DATASETS = 'ds_wikipedia';
const RESTART_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const CWD = 'f:\\minework-farm\\mine-skill';
const PYTHON_PATH = path.join(CWD, '.venv', 'Scripts', 'python.exe');
const WRAPPER_PATH = 'f:\\minework-farm\\awp-wrapper.cmd';

let currentProcess = null;

function startMiner() {
    console.log(`[${new Date().toISOString()}] Starting Miner-1 focus: ${DATASETS}...`);
    
    // Kill existing before start
    const killer = spawn('taskkill', ['/F', '/IM', 'python.exe', '/T']);
    
    killer.on('close', () => {
        const env = Object.assign({}, process.env, {
            PYTHONUTF8: '1',
            PYTHONIOENCODING: 'utf-8',
            AWP_WALLET_BIN: WRAPPER_PATH,
            MINER_ID: MINER_ID,
            CRAWLER_OUTPUT_ROOT: `f:\\minework-farm\\data\\${MINER_ID}`
        });

        currentProcess = spawn(PYTHON_PATH, [
            path.join(CWD, 'scripts', 'run_tool.py'),
            'agent-start',
            DATASETS
        ], { env, cwd: CWD });

        currentProcess.stdout.on('data', (data) => {
            const line = data.toString().trim();
            if (line.includes('iteration') || line.includes('Submitted')) {
                console.log(`[Miner Log]: ${line}`);
            }
        });

        currentProcess.stderr.on('data', (data) => {
            // Log errors but keep running
            if (data.toString().includes('ERROR')) {
                console.log(`[Miner Error]: ${data}`);
            }
        });

        currentProcess.on('close', (code) => {
            console.log(`[${new Date().toISOString()}] Miner process exited with code ${code}.`);
        });
    });
}

// Initial start
startMiner();

// Set up 30-minute interval
setInterval(() => {
    console.log(`[${new Date().toISOString()}] 30-minute timer reached. Restarting miner for focus...`);
    if (currentProcess) {
        currentProcess.kill('SIGKILL');
    }
    startMiner();
}, RESTART_INTERVAL_MS);

console.log(`[${new Date().toISOString()}] Supervisor Active. Will restart Miner-1 every 30 minutes.`);
