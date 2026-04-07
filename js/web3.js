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

// Expose variables ke window
window.web3 = null;
window.contract = null;
window.usdtContract = null;
window.usdcContract = null;
window.userAccount = null;
window.userRank = 0;

// Initialize Web3 with HTTP provider for read-only
async function initWeb3() {
    try {
        web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.BSC_RPC));
        window.web3 = web3;
        
        // Initialize contracts
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
            window.userAccount = userAccount;
            
            // IMPORTANT: Re-initialize web3 with the provider (not HTTP) for transactions
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
        
        // Re-initialize contract with provider
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

// ===== LOAD TVL FROM PANCAKE V3 POOL =====
async function loadVenusTVL() {
    try {
        if (!window.usdtContract || !window.usdcContract) {
            console.log('Contracts not ready for TVL');
            return;
        }
        
        // Get USDT and USDC balance from the pool (real TVL)
        const [usdtBalance, usdcBalance] = await Promise.all([
            window.usdtContract.methods.balanceOf(CONFIG.PANCAKE_POOL_ADDRESS).call(),
            window.usdcContract.methods.balanceOf(CONFIG.PANCAKE_POOL_ADDRESS).call()
        ]);
        
        // Convert from wei (18 decimals)
        const usdtAmount = parseFloat(window.web3.utils.fromWei(usdtBalance, 'ether'));
        const usdcAmount = parseFloat(window.web3.utils.fromWei(usdcBalance, 'ether'));
        
        // Total TVL in USD (1 USDT = $1, 1 USDC = $1)
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

// ===== MODAL FUNCTIONS (ditambahkan di sini) =====
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    // Buat overlay
    let overlay = document.getElementById('modalOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modalOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.95);
            backdrop-filter: blur(8px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        `;
        document.body.appendChild(overlay);
    }
    
    // Clone modal ke overlay
    overlay.innerHTML = '';
    const modalClone = modal.cloneNode(true);
    modalClone.style.display = 'block';
    modalClone.style.position = 'relative';
    modalClone.style.maxWidth = '480px';
    modalClone.style.width = '90%';
    modalClone.style.backgroundColor = '#0f0f0f';
    modalClone.style.border = '1px solid rgba(64, 145, 108, 0.3)';
    modalClone.style.borderRadius = '22px';
    overlay.appendChild(modalClone);
    
    // Tampilkan overlay
    overlay.style.opacity = '1';
    overlay.style.visibility = 'visible';
    document.body.style.overflow = 'hidden';
    
    // Klik di luar modal untuk menutup
    overlay.onclick = function(e) {
        if (e.target === overlay) {
            hideModal();
        }
    };
    
    // Close button
    const closeBtn = modalClone.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.onclick = hideModal;
    }
    
    // Cancel button
    const cancelBtn = modalClone.querySelector('.btn--secondary');
    if (cancelBtn && cancelBtn.textContent.includes('Cancel')) {
        cancelBtn.onclick = hideModal;
    }
    
    // Tombol ESC
    document.addEventListener('keydown', escHandler);
}

function hideModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.visibility = 'hidden';
        document.body.style.overflow = '';
        setTimeout(() => {
            overlay.innerHTML = '';
        }, 300);
    }
    document.removeEventListener('keydown', escHandler);
}

function escHandler(e) {
    if (e.key === 'Escape') {
        hideModal();
    }
}

// Expose functions ke window
window.initWeb3 = initWeb3;
window.connectWallet = connectWallet;
window.handleWalletDisconnect = handleWalletDisconnect;
window.handleAccountsChanged = handleAccountsChanged;
window.loadVenusTVL = loadVenusTVL;
window.showModal = showModal;
window.hideModal = hideModal;
