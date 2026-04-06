// ===== UI UTILITIES =====
function formatUSDT(wei, symbol = true) {
    if (!wei || wei === '0') return symbol ? '0.00 USDT' : '0.00';
    const val = parseFloat(web3.utils.fromWei(wei.toString(), 'ether'));
    return symbol ? val.toFixed(2) + ' USDT' : val.toFixed(2);
}

function formatNumber(num, compact = false) {
    if (compact) {
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    }
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notif = document.createElement('div');
    const icons = { success: 'check-circle', error: 'exclamation-circle', warning: 'exclamation-triangle', info: 'info-circle' };
    
    notif.className = `notification ${type}`;
    notif.innerHTML = `<i class="fas fa-${icons[type]}"></i><span>${message}</span>`;
    container.appendChild(notif);
    
    setTimeout(() => {
        notif.style.opacity = '0';
        setTimeout(() => notif.remove(), 300);
    }, 5000);
}

function showSection(sectionName) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionName)?.classList.add('active');
    
    document.querySelectorAll('.nav__link, .sidebar__link, .mobile-menu__link').forEach(link => {
        link.classList.remove('active');
        const onclick = link.getAttribute('onclick');
        if (onclick && onclick.includes(`'${sectionName}'`)) link.classList.add('active');
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.userAccount) {
        window.loadUserData();
        if (sectionName === 'deposits') window.loadDeposits();
    }
    if (sectionName === 'home') window.loadVenusTVL();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

function toggleMobileMenu() {
    document.getElementById('mobileMenu').classList.toggle('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function copyRefLink() {
    const link = document.getElementById('refLink');
    if (link) {
        link.select();
        document.execCommand('copy');
        showNotification('Referral link copied!', 'success');
    }
}

function toggleFaq(element) {
    const item = element.parentElement;
    const isActive = item.classList.contains('active');
    document.querySelectorAll('.faq-item').forEach(faq => faq.classList.remove('active'));
    if (!isActive) item.classList.add('active');
}

// Helper function for gas estimation with 20% buffer
async function estimateGasWithBuffer(method, from, value = '0') {
    try {
        const gasEstimate = await method.estimateGas({ from, value });
        const gasWithBuffer = Math.ceil(Number(gasEstimate) * 1.2);
        const gasLimit = Math.min(gasWithBuffer, 3000000);
        console.log(`Gas estimate: ${gasEstimate}, with buffer: ${gasLimit}`);
        return gasLimit;
    } catch (error) {
        console.error('Gas estimation failed:', error);
        return 500000;
    }
}

// ===== EVENT LISTENERS =====
function setupUIEventListeners() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
        connectBtn.addEventListener('click', window.connectWallet);
    }
    
    // Investment calculator
    const investAmount = document.getElementById('investAmount');
    if (investAmount) {
        investAmount.addEventListener('input', window.calculateInvestment);
    }
    
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', window.handleAccountsChanged);
        window.ethereum.on('chainChanged', () => window.location.reload());
        window.ethereum.on('disconnect', () => window.handleWalletDisconnect());
    }
    
    // Close menus when clicking outside
    document.addEventListener('click', function(event) {
        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');
        
        if (sidebar?.classList.contains('active')) {
            if (!sidebar.contains(event.target) && !sidebarToggle.contains(event.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
    
    document.addEventListener('click', function(event) {
        const mobileMenu = document.getElementById('mobileMenu');
        const sidebarToggle = document.getElementById('sidebarToggle');
        
        if (mobileMenu?.classList.contains('active')) {
            if (!mobileMenu.contains(event.target) && !sidebarToggle.contains(event.target)) {
                mobileMenu.classList.remove('active');
            }
        }
    });
    
    // Close sidebar when selecting menu on mobile
    document.querySelectorAll('.sidebar__link').forEach(link => {
        link.addEventListener('click', function() {
            const sidebar = document.getElementById('sidebar');
            if (window.innerWidth < 1280) {
                sidebar.classList.remove('active');
            }
        });
    });
    
    // Close mobile menu when selecting menu
    document.querySelectorAll('.mobile-menu__link').forEach(link => {
        link.addEventListener('click', function() {
            const mobileMenu = document.getElementById('mobileMenu');
            mobileMenu.classList.remove('active');
        });
    });
    
    // Handle resize
    window.addEventListener('resize', function() {
        const sidebar = document.getElementById('sidebar');
        const mobileMenu = document.getElementById('mobileMenu');
        
        if (window.innerWidth >= 1280) {
            sidebar?.classList.add('active');
        } else {
            sidebar?.classList.remove('active');
        }
        
        mobileMenu?.classList.remove('active');
    });
}
