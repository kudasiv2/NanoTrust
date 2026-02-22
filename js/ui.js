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
    if (userAccount) loadUserData();
    if (sectionName === 'home') loadVenusTVL();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

function toggleMobileMenu() {
    document.getElementById('mobileMenu').classList.toggle('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function copyRefLink() {
    const link = document.getElementById('refLink');
    link.select();
    document.execCommand('copy');
    showNotification('Referral link copied!', 'success');
}

function toggleFaq(element) {
    const item = element.parentElement;
    document.querySelectorAll('.faq-item').forEach(faq => faq.classList.remove('active'));
    if (!item.classList.contains('active')) item.classList.add('active');
}

// ===== MODAL FUNCTIONS =====
function openWithdrawModal() {
    if (!userAccount || !userData) return;
    
    const activeDeposit = userData.summary[0];
    const feeResult = userData.fee || { percent: 0, amount: '0' };
    const feePercent = feeResult.percent || 0;
    const feeAmount = feeResult.amount || '0';
    
    const activeNum = parseFloat(web3.utils.fromWei(activeDeposit.toString(), 'ether'));
    if (activeNum < 0.01) {
        showNotification('No active deposit to withdraw', 'error');
        return;
    }
    
    const feeNum = parseFloat(web3.utils.fromWei(feeAmount.toString(), 'ether'));
    const receiveNum = activeNum - feeNum;
    
    document.getElementById('withdrawAmount').textContent = activeNum.toFixed(2) + ' USDT';
    document.getElementById('withdrawFee').textContent = `${feeNum.toFixed(2)} USDT (${parseInt(feePercent)}%)`;
    document.getElementById('withdrawReceive').textContent = receiveNum.toFixed(2) + ' USDT';
    
    if (parseInt(feePercent) === 0) {
        document.getElementById('withdrawWarningText').textContent = 'No withdrawal fee!';
        document.getElementById('withdrawWarningText').parentElement.className = 'alert alert--info';
        document.getElementById('withdrawFeeExplanation').textContent = 'Lock period complete. You can withdraw without fees.';
    } else {
        document.getElementById('withdrawWarningText').textContent = 'Early withdrawal 50% fee!';
        document.getElementById('withdrawWarningText').parentElement.className = 'alert alert--warning';
        document.getElementById('withdrawFeeExplanation').textContent = '50% early withdrawal fee applies.';
    }
    
    document.getElementById('withdrawModal').classList.add('active');
}

// ===== EVENT LISTENERS =====
function setupUIEventListeners() {
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    document.getElementById('connectWalletBtn').addEventListener('click', connectWallet);
    
    // Investment calculator
    document.getElementById('investAmount')?.addEventListener('input', calculateInvestment);
    
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', () => window.location.reload());
        window.ethereum.on('disconnect', () => handleWalletDisconnect());
    }
    
    // Close menus when clicking outside
    document.addEventListener('click', function(event) {
        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');
        
        if (sidebar.classList.contains('active')) {
            if (!sidebar.contains(event.target) && !sidebarToggle.contains(event.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
    
    document.addEventListener('click', function(event) {
        const mobileMenu = document.getElementById('mobileMenu');
        const sidebarToggle = document.getElementById('sidebarToggle');
        
        if (mobileMenu.classList.contains('active')) {
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
            sidebar.classList.add('active');
        } else {
            sidebar.classList.remove('active');
        }
        
        mobileMenu.classList.remove('active');
    });
}
