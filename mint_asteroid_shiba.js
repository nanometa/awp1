const { ethers } = require('ethers');

// Configuration
const PRIVATE_KEYS = [
    '0x569ffe895327f8f9a14e23e427c9a7f82ee4e26be8fd34a0ee488d0e6ba1d17a',
];
const RPC_URL = 'https://ethereum.publicnode.com'; // You can change this to your preferred RPC
const TICK = 'Asteroid Shiba';
const AMT = '1000';
const MINTS_PER_WALLET = 7;

// IERC-20 mint data format
function createMintData(tick, amt) {
    const data = {
        p: 'ierc-20',
        op: 'mint',
        tick: tick,
        amt: amt,
        nonce: Date.now().toString()
    };
    return JSON.stringify(data);
}

async function mintFromWallet(wallet, provider, walletIndex) {
    const address = wallet.address;
    console.log(`\n=== Wallet ${walletIndex + 1}: ${address} ===`);
    
    const balance = await provider.getBalance(address);
    console.log('ETH Balance:', ethers.formatEther(balance), 'ETH');
    
    if (balance === 0n) {
        console.error('ERROR: No ETH balance. Skipping.');
        return 0;
    }
    
    const feeData = await provider.getFeeData();
    let successCount = 0;
    
    for (let i = 0; i < MINTS_PER_WALLET; i++) {
        try {
            console.log(`\n--- Mint ${i + 1}/${MINTS_PER_WALLET} ---`);
            
            const mintData = createMintData(TICK, AMT);
            console.log('Mint data:', mintData);
            
            const dataHex = '0x' + Buffer.from(mintData).toString('hex');
            
            const tx = {
                to: address,
                value: 0,
                data: dataHex,
                gasLimit: 100000n,
                maxFeePerGas: feeData.maxFeePerGas,
                maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || 1000000000n
            };
            
            try {
                const estimatedGas = await provider.estimateGas(tx);
                tx.gasLimit = estimatedGas + 5000n;
            } catch (e) {
                // Use default
                console.log('Gas estimation failed, using default gas limit.');
            }
            
            console.log('Sending...');
            const transaction = await wallet.sendTransaction(tx);
            console.log('Tx Hash:', transaction.hash);
            
            const receipt = await transaction.wait();
            
            if (receipt.status === 1) {
                console.log('SUCCESS - Block:', receipt.blockNumber);
                successCount++;
            } else {
                console.log('FAILED');
            }
            
            // Small delay to avoid nonce issues if sending multiple txs quickly (though wait() handles it)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error('Mint error:', error.message);
        }
    }
    
    return successCount;
}

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    console.log('========================================');
    console.log('ASTEROID SHIBA - Multi-Wallet Minter');
    console.log(`Minting ${MINTS_PER_WALLET} times from each of ${PRIVATE_KEYS.length} wallets`);
    console.log('========================================');
    
    let totalSuccess = 0;
    
    for (let i = 0; i < PRIVATE_KEYS.length; i++) {
        try {
            const wallet = new ethers.Wallet(PRIVATE_KEYS[i], provider);
            const success = await mintFromWallet(wallet, provider, i);
            totalSuccess += success;
        } catch (err) {
            console.error(`Failed to initialize wallet ${i + 1}:`, err.message);
        }
    }
    
    console.log('\n========================================');
    console.log(`TOTAL SUCCESSFUL MINTS: ${totalSuccess}/${MINTS_PER_WALLET * PRIVATE_KEYS.length}`);
    console.log('========================================');
}

main().catch(console.error);
