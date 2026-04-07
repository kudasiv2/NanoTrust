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
        loadUserData();
        if (sectionName === 'deposits') loadDeposits();
    }
    if (sectionName === 'home') loadVenusTVL();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

function toggleMobileMenu() {
    document.getElementById('mobileMenu').classList.toggle('active');
}

function copyRefLink() {
    const link = document.getElementById('refLink');
    link.select();
    document.execCommand('copy');
    showNotification('Referral link copied!', 'success');
}

function toggleFaq(element) {
    const item = element.parentElement;
    const isActive = item.classList.contains('active');
    document.querySelectorAll('.faq-item').forEach(faq => faq.classList.remove('active'));
    if (!isActive) item.classList.add('active');
}

async function estimateGasWithBuffer(method, from, value = '0') {
    try {
        const gasEstimate = await method.estimateGas({ from, value });
        const gasWithBuffer = Math.ceil(Number(gasEstimate) * 1.2);
        return Math.min(gasWithBuffer, 3000000);
    } catch (error) {
        return 500000;
    }
}

function setupUIEventListeners() {
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    document.getElementById('connectWalletBtn').addEventListener('click', connectWallet);
    document.getElementById('investAmount')?.addEventListener('input', calculateInvestment);
    
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', () => window.location.reload());
        window.ethereum.on('disconnect', handleWalletDisconnect);
    }
    
    document.addEventListener('click', function(event) {
        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebar?.classList.contains('active') && !sidebar.contains(event.target) && !sidebarToggle.contains(event.target)) {
            sidebar.classList.remove('active');
        }
        
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu?.classList.contains('active') && !mobileMenu.contains(event.target) && !sidebarToggle.contains(event.target)) {
            mobileMenu.classList.remove('active');
        }
    });
    
    document.querySelectorAll('.sidebar__link').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 1280) document.getElementById('sidebar').classList.remove('active');
        });
    });
    
    document.querySelectorAll('.mobile-menu__link').forEach(link => {
        link.addEventListener('click', () => document.getElementById('mobileMenu').classList.remove('active'));
    });
    
    window.addEventListener('resize', () => {
        const sidebar = document.getElementById('sidebar');
        const mobileMenu = document.getElementById('mobileMenu');
        if (window.innerWidth >= 1280) sidebar?.classList.add('active');
        else sidebar?.classList.remove('active');
        mobileMenu?.classList.remove('active');
    });
}

window.formatUSDT = formatUSDT;
window.formatNumber = formatNumber;
window.showNotification = showNotification;
window.showSection = showSection;
window.toggleSidebar = toggleSidebar;
window.toggleMobileMenu = toggleMobileMenu;
window.copyRefLink = copyRefLink;
window.toggleFaq = toggleFaq;
window.estimateGasWithBuffer = estimateGasWithBuffer;
window.setupUIEventListeners = setupUIEventListeners;
