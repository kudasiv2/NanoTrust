// ===== WEB3 INITIALIZATION =====
let web3;
let contract;
let usdtContract;
let usdcContract;
let pancakePoolContract;
let userAccount = null;
let userData = null;
let userRank = 0;
let autoRefreshInterval;

// Initialize Web3 with HTTP provider for read-only
async function initWeb3() {
    try {
        web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.BSC_RPC));
        
        // Initialize contracts
        contract = new web3.eth.Contract(CONTRACT_ABI, CONFIG.CONTRACT_ADDRESS);
        usdtContract = new web3.eth.Contract(USDT_ABI, CONFIG.USDT_ADDRESS);
        usdcContract = new web3.eth.Contract(USDT_ABI, CONFIG.USDC_ADDRESS);
        pancakePoolContract = new web3.eth.Contract(PANCAKE_V3_POOL_ABI, CONFIG.PANCAKE_POOL_ADDRESS);
        
        return true;
    } catch (error) {
        console.error('Web3 init error:', error);
        return false;
    }
}

// Connect wallet
async function connectWallet() {
    if (!window.ethereum) {
        showNotification('Please install MetaMask!', 'error');
        return;
    }
    
    try {
        // Switch to BSC
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== CONFIG.BSC_CHAIN_ID) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: CONFIG.BSC_CHAIN_ID }]
                });
            } catch (switchError) {
                if (switchError.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: CONFIG.BSC_CHAIN_ID,
                            chainName: 'Binance Smart Chain',
                            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                            rpcUrls: ['https://bsc-dataseed.binance.org/'],
                            blockExplorerUrls: ['https://bscscan.com/']
                        }]
                    });
                } else {
                    throw switchError;
                }
            }
        }
        
        // Get accounts - WAIT for user approval
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        if (accounts.length > 0) {
            userAccount = accounts[0];
            
            // IMPORTANT: Re-initialize web3 with the provider (not HTTP) for transactions
            web3 = new Web3(window.ethereum);
            contract = new web3.eth.Contract(CONTRACT_ABI, CONFIG.CONTRACT_ADDRESS);
            usdtContract = new web3.eth.Contract(USDT_ABI, CONFIG.USDT_ADDRESS);
            usdcContract = new web3.eth.Contract(USDT_ABI, CONFIG.USDC_ADDRESS);
            pancakePoolContract = new web3.eth.Contract(PANCAKE_V3_POOL_ABI, CONFIG.PANCAKE_POOL_ADDRESS);
            
            localStorage.setItem('walletConnected', 'true');
            updateWalletUI();
            
            showNotification('Wallet connected!', 'success');
            await loadUserData();
            
            // Auto-refresh every 30 seconds
            if (autoRefreshInterval) clearInterval(autoRefreshInterval);
            autoRefreshInterval = setInterval(() => {
                if (userAccount) loadUserData();
            }, 30000);
        }
        
    } catch (error) {
        console.error('Connection error:', error);
        showNotification('Connection failed: ' + (error.message || 'Unknown error'), 'error');
    }
}

function handleWalletDisconnect() {
    userAccount = null;
    userData = null;
    localStorage.removeItem('walletConnected');
    updateWalletUI();
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        handleWalletDisconnect();
    } else if (accounts[0] !== userAccount) {
        userAccount = accounts[0];
        // Re-initialize contract with provider
        if (window.ethereum) {
            web3 = new Web3(window.ethereum);
            contract = new web3.eth.Contract(CONTRACT_ABI, CONFIG.CONTRACT_ADDRESS);
            usdtContract = new web3.eth.Contract(USDT_ABI, CONFIG.USDT_ADDRESS);
            usdcContract = new web3.eth.Contract(USDT_ABI, CONFIG.USDC_ADDRESS);
            pancakePoolContract = new web3.eth.Contract(PANCAKE_V3_POOL_ABI, CONFIG.PANCAKE_POOL_ADDRESS);
        }
        updateWalletUI();
        loadUserData();
    }
}

function updateWalletUI() {
    const btn = document.getElementById('connectWalletBtn');
    
    if (userAccount) {
        const shortAddress = `${userAccount.slice(0, 4)}...${userAccount.slice(-4)}`;
        btn.innerHTML = `<i class="fas fa-wallet"></i><span>${shortAddress}</span>`;
        btn.classList.add('connected');
        
        document.querySelectorAll('[id$="WalletAlert"]').forEach(el => el.style.display = 'none');
        document.getElementById('dashboardContent').style.display = 'block';
        document.getElementById('investContent').style.display = 'block';
        document.getElementById('depositsContent').style.display = 'block';
        document.getElementById('referralContent').style.display = 'block';
    } else {
        btn.innerHTML = `<i class="fas fa-wallet"></i><span>Connect Wallet</span>`;
        btn.classList.remove('connected');
        
        document.querySelectorAll('[id$="WalletAlert"]').forEach(el => el.style.display = 'flex');
        document.getElementById('dashboardContent').style.display = 'none';
        document.getElementById('investContent').style.display = 'none';
        document.getElementById('depositsContent').style.display = 'none';
        document.getElementById('referralContent').style.display = 'none';
    }
}

// ===== LOAD TVL FROM PANCAKE V3 POOL =====
async function loadVenusTVL() {
    try {
        // Get USDT and USDC balance from the pool (real TVL)
        const [usdtBalance, usdcBalance] = await Promise.all([
            usdtContract.methods.balanceOf(CONFIG.PANCAKE_POOL_ADDRESS).call(),
            usdcContract.methods.balanceOf(CONFIG.PANCAKE_POOL_ADDRESS).call()
        ]);
        
        // Convert from wei (18 decimals)
        const usdtAmount = parseFloat(web3.utils.fromWei(usdtBalance, 'ether'));
        const usdcAmount = parseFloat(web3.utils.fromWei(usdcBalance, 'ether'));
        
        // Total TVL in USD (1 USDT = $1, 1 USDC = $1)
        const totalTVL = usdtAmount + usdcAmount;
        
        const tvlFormatted = '$' + formatNumber(totalTVL, true);
        document.getElementById('statTVL').innerHTML = tvlFormatted;
        
    } catch (error) {
        console.error('TVL error:', error);
        document.getElementById('statTVL').innerHTML = 'Error loading TVL';
    }
}
