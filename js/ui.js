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
if (userAccount) {
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
// PERBAIKAN: closeModal harus bisa menutup modal yang dibuat dinamis
function closeModal(modalId) {
// Cari modal dengan ID
const modal = document.getElementById(modalId);
if (modal) {
    // Hapus class active jika ada
    modal.classList.remove('active');
    // Hapus elemen modal dari DOM (karena dibuat dinamis)
    setTimeout(() => {
        if (modal.parentElement) {
            modal.parentElement.removeChild(modal);
        }
    }, 300);
}
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
// ===== MODAL FUNCTIONS =====
// PERBAIKAN: Hanya satu definisi fungsi di sini
function openWithdrawModal(depositId, amount, isLocked, feePercent, dailyROIWei) {
console.log('[openWithdrawModal] Called with:', { depositId, amount, isLocked, feePercent, dailyROIWei });

const modalContainer = document.getElementById('modalContainer');
if (!modalContainer) {
    console.error('modalContainer not found!');
    return;
}

// Konversi dailyROI dari wei ke USDT amount
let dailyROIDisplay;
try {
    const dailyROIUSDT = parseFloat(web3.utils.fromWei(dailyROIWei.toString(), 'ether'));
    dailyROIDisplay = dailyROIUSDT.toFixed(2) + ' USDT';
    console.log('[Withdraw Modal] dailyROIWei:', dailyROIWei, '-> USDT:', dailyROIUSDT);
} catch (e) {
    dailyROIDisplay = '0.00 USDT';
    console.error('[Withdraw Modal] Error converting dailyROI:', e);
}

const modalHtml = `
    <div class="modal-overlay active" id="withdrawModal">
        <div class="modal">
            <div class="modal__header">
                <h3 class="modal__title">Withdraw Deposit #${depositId}</h3>
                <button class="modal__close" onclick="closeModal('withdrawModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div id="withdrawContent">
                <div class="alert alert--${isLocked ? 'warning' : 'info'}" style="margin-bottom: 1rem;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>${isLocked ? 'Early withdrawal will incur a 30% fee!' : 'No withdrawal fee - Lock period complete!'}</span>
                </div>
                <p style="color: var(--text-secondary); margin-bottom: 1rem; font-size: 0.9375rem;">
                   You are about to withdraw deposit #${depositId}. 
                   ${isLocked ? 'Since your 100-day lock period is not complete, 30% of your deposit will be deducted as an early withdrawal fee.' : 'Your lock period is complete. You can withdraw without fees.'}
                </p>
                <div class="tx-breakdown" style="margin-bottom: 1.5rem;">
                    <div class="tx-row">
                        <span class="tx-label">Deposit Amount:</span>
                        <span id="withdrawAmount">${amount.toFixed(2)} USDT</span>
                    </div>
                    <div class="tx-row">
                        <span class="tx-label">Daily ROI Rate:</span>
                        <span id="withdrawDailyROI">${dailyROIDisplay}</span>
                    </div>
                    <div class="tx-row">
                        <span class="tx-label">Withdrawal Fee:</span>
                        <span id="withdrawFee" style="color: var(--red);">${(amount * feePercent / 100).toFixed(2)} USDT (${feePercent}%)</span>
                    </div>
                    <div class="tx-row">
                        <span class="tx-label">You Receive (Capital):</span>
                        <span id="withdrawReceive" style="color: var(--gold);">${(amount * (100 - feePercent) / 100).toFixed(2)} USDT</span>
                    </div>
                    <div class="tx-row">
                        <span class="tx-label">Pending ROI to Claim:</span>
                        <span id="withdrawROI" style="color: var(--green-accent);">Will be claimed separately</span>
                    </div>
                </div>
                <div style="display: flex; gap: 0.75rem;">
                    <button class="btn btn--secondary" style="flex: 1;" onclick="closeModal('withdrawModal')">Cancel</button>
                    <button class="btn btn--danger" style="flex: 1;" onclick="confirmWithdraw(${depositId})">
                        <i class="fas fa-sign-out-alt"></i> Confirm Withdraw
                    </button>
                </div>
            </div>
        </div>
    </div>
`;

modalContainer.innerHTML = modalHtml;
console.log('[openWithdrawModal] Modal created and displayed');
}

function openClaimROIModal(depositId, pendingROI) {
console.log('[openClaimROIModal] Called with:', { depositId, pendingROI });

const modalContainer = document.getElementById('modalContainer');
if (!modalContainer) {
    console.error('modalContainer not found!');
    return;
}

const modalHtml = `
    <div class="modal-overlay active" id="claimROIModal">
        <div class="modal">
            <div class="modal__header">
                <h3 class="modal__title">Claim ROI - Deposit #${depositId}</h3>
                <button class="modal__close" onclick="closeModal('claimROIModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div>
                <div class="alert alert--info" style="margin-bottom: 1rem;">
                    <i class="fas fa-info-circle"></i>
                    <span>You are about to claim your pending ROI</span>
                </div>
                <div class="tx-breakdown" style="margin-bottom: 1.5rem;">
                    <div class="tx-row">
                        <span class="tx-label">Pending ROI:</span>
                        <span style="color: var(--gold); font-weight: 600;">${pendingROI.toFixed(2)} USDT</span>
                    </div>
                </div>
                <div style="display: flex; gap: 0.75rem;">
                    <button class="btn btn--secondary" style="flex: 1;" onclick="closeModal('claimROIModal')">Cancel</button>
                    <button class="btn btn--gold" style="flex: 1;" onclick="confirmClaimROI(${depositId})">
                        <i class="fas fa-hand-holding-usd"></i> Confirm Claim
                    </button>
                </div>
            </div>
        </div>
    </div>
`;

modalContainer.innerHTML = modalHtml;
console.log('[openClaimROIModal] Modal created and displayed');
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
