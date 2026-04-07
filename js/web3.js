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

window.web3 = null;
window.contract = null;
window.usdtContract = null;
window.usdcContract = null;
window.userAccount = null;
window.userRank = 0;

async function initWeb3() {
    try {
        web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.BSC_RPC));
        window.web3 = web3;
        
        contract = new web3.eth.Contract(CONTRACT_ABI, CONFIG.CONTRACT_ADDRESS);
        usdtContract = new web3.eth.Contract(USDT_ABI, CONFIG.USDT_ADDRESS);
        usdcContract = new web3.eth.Contract(USDT_ABI, CONFIG.USDC_ADDRESS);
        pancakePoolContract = new web3.eth.Contract(PANCAKE_V3_POOL_ABI, CONFIG.PANCAKE_POOL_ADDRESS);
        
        window.contract = contract;
        window.usdtContract = usdtContract;
        window.usdcContract = usdcContract;
        
        return true;
    } catch (error) {
        console.error('Web3 init error:', error);
        return false;
    }
}

async function connectWallet() {
    if (!window.ethereum) {
        showNotification('Please install MetaMask!', 'error');
        return;
    }
    
    try {
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
                } else throw switchError;
            }
        }
        
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
            userAccount = accounts[0];
            window.userAccount = userAccount;
            
            web3 = new Web3(window.ethereum);
            window.web3 = web3;
            
            contract = new web3.eth.Contract(CONTRACT_ABI, CONFIG.CONTRACT_ADDRESS);
            usdtContract = new web3.eth.Contract(USDT_ABI, CONFIG.USDT_ADDRESS);
            usdcContract = new web3.eth.Contract(USDT_ABI, CONFIG.USDC_ADDRESS);
            pancakePoolContract = new web3.eth.Contract(PANCAKE_V3_POOL_ABI, CONFIG.PANCAKE_POOL_ADDRESS);
            
            window.contract = contract;
            window.usdtContract = usdtContract;
            window.usdcContract = usdcContract;
            
            localStorage.setItem('walletConnected', 'true');
            updateWalletUI();
            
            showNotification('Wallet connected!', 'success');
            await loadUserData();
            
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
    window.userAccount = null;
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
        window.userAccount = userAccount;
        
        if (window.ethereum) {
            web3 = new Web3(window.ethereum);
            window.web3 = web3;
            
            contract = new web3.eth.Contract(CONTRACT_ABI, CONFIG.CONTRACT_ADDRESS);
            usdtContract = new web3.eth.Contract(USDT_ABI, CONFIG.USDT_ADDRESS);
            usdcContract = new web3.eth.Contract(USDT_ABI, CONFIG.USDC_ADDRESS);
            pancakePoolContract = new web3.eth.Contract(PANCAKE_V3_POOL_ABI, CONFIG.PANCAKE_POOL_ADDRESS);
            
            window.contract = contract;
            window.usdtContract = usdtContract;
            window.usdcContract = usdcContract;
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

async function loadVenusTVL() {
    try {
        if (!window.usdtContract || !window.usdcContract) return;
        
        const [usdtBalance, usdcBalance] = await Promise.all([
            window.usdtContract.methods.balanceOf(CONFIG.PANCAKE_POOL_ADDRESS).call(),
            window.usdcContract.methods.balanceOf(CONFIG.PANCAKE_POOL_ADDRESS).call()
        ]);
        
        const usdtAmount = parseFloat(window.web3.utils.fromWei(usdtBalance, 'ether'));
        const usdcAmount = parseFloat(window.web3.utils.fromWei(usdcBalance, 'ether'));
        const totalTVL = usdtAmount + usdcAmount;
        
        const tvlFormatted = '$' + formatNumber(totalTVL, true);
        const statTVL = document.getElementById('statTVL');
        if (statTVL) statTVL.innerHTML = tvlFormatted;
    } catch (error) {
        console.error('TVL error:', error);
        const statTVL = document.getElementById('statTVL');
        if (statTVL) statTVL.innerHTML = 'Error loading TVL';
    }
}

window.initWeb3 = initWeb3;
window.connectWallet = connectWallet;
window.handleWalletDisconnect = handleWalletDisconnect;
window.handleAccountsChanged = handleAccountsChanged;
window.loadVenusTVL = loadVenusTVL;
