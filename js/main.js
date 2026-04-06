// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async function() {
    const initialized = await window.initWeb3();
    if (initialized) {
        await window.loadVenusTVL();
        setupUIEventListeners();
        
        const urlParams = new URLSearchParams(window.location.search);
        const ref = urlParams.get('ref');
        const refInput = document.getElementById('referrerAddress');
        const refDisplay = document.getElementById('refDisplay');
        
        if (ref && ref.match(/^0x[a-fA-F0-9]{40}$/)) {
            if(refInput) refInput.value = ref;
            if(refDisplay) {
                refDisplay.textContent = ref.substring(0, 6) + '...' + ref.substring(38);
                refDisplay.classList.add('has-referrer');
            }
        } else {
            if(refInput) refInput.value = '0x0000000000000000000000000000000000000000';
            if(refDisplay) {
                refDisplay.textContent = 'Not detected';
                refDisplay.classList.remove('has-referrer');
            }
        }
        
        if (localStorage.getItem('walletConnected') === 'true' && window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    await window.connectWallet();
                    const activeSection = document.querySelector('.section.active');
                    if (activeSection && activeSection.id === 'deposits') {
                        await window.loadDeposits();
                    }
                }
            } catch (e) {
                console.log('Auto-connect failed');
            }
        }
        
        window.calculateInvestment();
    }
});

// Expose functions ke window
window.loadUserData = loadUserData;
window.loadDeposits = loadDeposits;
window.calculateInvestment = calculateInvestment;
window.submitInvestment = submitInvestment;
window.confirmClaimROI = confirmClaimROI;
window.confirmWithdraw = confirmWithdraw;
window.claimReferral = claimReferral;
window.openWithdrawModal = openWithdrawModal;
window.openClaimROIModal = openClaimROIModal;

// ===== LOAD USER DATA =====
async function loadUserData() {
    if (!window.userAccount || !window.contract) return;
    
    try {
        let userDetails;
        try {
            userDetails = await window.contract.methods.users(window.userAccount).call();
        } catch (e) {
            console.log('User not found');
            userDetails = null;
        }
        
        if (!userDetails || !userDetails[10]) {
            resetUserUI();
            
            try {
                const balance = await window.usdtContract.methods.balanceOf(window.userAccount).call();
                document.getElementById('usdtBalance').textContent = formatUSDT(balance, false);
            } catch (e) {}
            
            try {
                const remainingSlots = await window.contract.methods.getRemainingDepositSlots(window.userAccount).call();
                document.getElementById('remainingSlotsHint').innerHTML = `Remaining deposit slots: ${remainingSlots} / 50`;
            } catch(e) {}
            
            return;
        }
        
        const summary = await window.contract.methods.getUserSummary(window.userAccount).call();
        const network = await window.contract.methods.getUserNetwork(window.userAccount).call();
        const qualified = await window.contract.methods.getQualifiedStatus(window.userAccount).call();
        
        window.userData = { summary, network, qualified, userDetails };
        
        if (summary && summary[3] !== undefined) {
            window.userRank = parseInt(summary[3]);
        }
        
        updateDashboard(summary, network, userDetails);
        updateInvestPage(summary);
        updateReferralPage(network, qualified, userDetails);
        updateLeadershipPage(summary, network);
        
        try {
            const balance = await window.usdtContract.methods.balanceOf(window.userAccount).call();
            document.getElementById('usdtBalance').textContent = formatUSDT(balance, false);
        } catch (e) {}
        
        try {
            const remainingSlots = await window.contract.methods.getRemainingDepositSlots(window.userAccount).call();
            document.getElementById('remainingSlotsHint').innerHTML = `Remaining deposit slots: ${remainingSlots} / 50`;
            if (remainingSlots == 0) {
                document.getElementById('remainingSlotsHint').style.color = 'var(--red)';
            }
        } catch(e) {}
        
        // Cek apakah section deposits aktif, jika ya load deposits
        const activeSection = document.querySelector('.section.active');
        if (activeSection && activeSection.id === 'deposits') {
            await loadDeposits();
        }
        
    } catch (error) {
        console.error('Load user data error:', error);
        showNotification('Error loading data', 'warning');
    }
}

function resetUserUI() {
    document.getElementById('dashAddress').textContent = `${window.userAccount.slice(0, 4)}...${window.userAccount.slice(-4)}`;
    document.getElementById('dashRank').innerHTML = '<i class="fas fa-ban"></i> No Rank';
    document.getElementById('dashRank').className = 'rank-badge';
    
    document.getElementById('dashTotalActive').textContent = '0 USDT';
    document.getElementById('dashDepositCount').textContent = '0';
    document.getElementById('dashPendingROI').textContent = '0 USDT';
    document.getElementById('dashPendingRef').textContent = '0 USDT';
    
    document.getElementById('dashDirects').textContent = '0';
    document.getElementById('dashQualified').textContent = '0';
    document.getElementById('dashTeamVolume').textContent = '0 USDT';
    document.getElementById('dashTotalEarned').textContent = '0 USDT';
    
    const btnClaim = document.getElementById('btnClaimRef');
    if (btnClaim) btnClaim.disabled = true;
    
    window.userRankBoost = 0;
}

function updateDashboard(summary, network, userDetails) {
    if (!summary || !network || !userDetails) return;
    
    const totalActiveAmount = summary[0] || '0';
    const totalPendingROI = summary[1] || '0';
    const pendingBonuses = summary[2] || '0';
    const rank = summary[3] || 0;
    const activeDepositCount = summary[4] || 0;
    
    const directs = network[0] || 0;
    const qualified = network[1] || 0;
    const volume = network[2] || '0';
    
    const totalEarnedNum = parseFloat(window.web3.utils.fromWei(userDetails[5].toString(), 'ether'));
    
    document.getElementById('dashAddress').textContent = `${window.userAccount.slice(0, 4)}...${window.userAccount.slice(-4)}`;
    
    const rankNames = ['No Rank', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
    const rankClasses = ['', 'bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const rankIcons = ['fas fa-ban', 'fas fa-medal', 'fas fa-medal', 'fas fa-crown', 'fas fa-gem', 'fas fa-star'];
    const rankElement = document.getElementById('dashRank');
    rankElement.innerHTML = `<i class="${rankIcons[rank]}"></i> ${rankNames[rank]}`;
    rankElement.className = `rank-badge ${rankClasses[rank] || ''}`;
    
    const totalActiveNum = parseFloat(window.web3.utils.fromWei(totalActiveAmount.toString(), 'ether'));
    const pendingROINum = parseFloat(window.web3.utils.fromWei(totalPendingROI.toString(), 'ether'));
    const pendingBonusesNum = parseFloat(window.web3.utils.fromWei(pendingBonuses.toString(), 'ether'));
    const volumeNum = parseFloat(window.web3.utils.fromWei(volume.toString(), 'ether'));
    
    document.getElementById('dashTotalActive').textContent = totalActiveNum.toFixed(2) + ' USDT';
    document.getElementById('dashDepositCount').textContent = activeDepositCount;
    document.getElementById('dashPendingROI').textContent = pendingROINum.toFixed(2) + ' USDT';
    document.getElementById('dashPendingRef').textContent = pendingBonusesNum.toFixed(2) + ' USDT';
    
    document.getElementById('dashDirects').textContent = directs;
    document.getElementById('dashQualified').textContent = qualified;
    document.getElementById('dashTeamVolume').textContent = volumeNum.toFixed(2) + ' USDT';
    document.getElementById('dashTotalEarned').textContent = totalEarnedNum.toFixed(2) + ' USDT';
    
    const btnClaim = document.getElementById('btnClaimRef');
    if (btnClaim) btnClaim.disabled = pendingBonusesNum < 0.1;
}

function updateInvestPage(summary) {
    if (!summary) return;
    const rank = parseInt(summary[3] || 0);
    window.userRank = rank;
    calculateInvestment();
}

function updateReferralPage(network, qualified, userDetails) {
    if (!network || !qualified || !userDetails) return;
    
    const directs = network[0] || 0;
    const qual = network[1] || 0;
    const volume = network[2] || '0';
    
    const volumeNum = parseFloat(window.web3.utils.fromWei(volume.toString(), 'ether'));
    const totalEarnedNum = parseFloat(window.web3.utils.fromWei(userDetails[5].toString(), 'ether'));
    
    document.getElementById('refDirects').textContent = directs;
    document.getElementById('refQualified').textContent = qual;
    document.getElementById('refVolume').textContent = volumeNum.toFixed(2) + ' USDT';
    document.getElementById('refTotalEarned').textContent = totalEarnedNum.toFixed(2) + ' USDT';
    
    const baseUrl = window.location.origin + window.location.pathname;
    document.getElementById('refLink').value = `${baseUrl}?ref=${window.userAccount}`;
    
    for (let i = 0; i < 5; i++) {
        const isActive = qualified[i] || false;
        const icon = document.getElementById(`qualIcon${i+1}`);
        const bar = document.getElementById(`qualProgress${i+1}`);
        
        if (icon) {
            icon.className = 'qualified-status-icon ' + (isActive ? 'active' : 'inactive');
            icon.innerHTML = isActive ? '<i class="fas fa-check"></i>' : '<i class="fas fa-lock"></i>';
        }
        
        if (bar && i > 0) {
            const requirements = [0, 3, 5, 8, 10];
            const progress = Math.min(100, (qual / requirements[i]) * 100);
            bar.style.width = progress + '%';
        }
    }
}

function updateLeadershipPage(summary, network) {
    if (!summary || !network) return;
    
    const rank = parseInt(summary[3] || 0);
    const teamVolume = parseFloat(window.web3.utils.fromWei(network[2].toString(), 'ether'));
    
    const rankRequirements = [5000, 15000, 30000, 50000, 100000];
    
    for (let i = 0; i < 5; i++) {
        const req = rankRequirements[i];
        const progress = Math.min(100, (teamVolume / req) * 100);
        
        const progressEl = document.getElementById(`rankProgress${i+1}`);
        const barEl = document.getElementById(`rankBar${i+1}`);
        const cardEl = document.getElementById(`rankCard${i+1}`);
        
        if (progressEl) progressEl.textContent = Math.round(progress) + '%';
        if (barEl) barEl.style.width = progress + '%';
        
        if (cardEl) {
            if (rank === i + 1) {
                cardEl.style.boxShadow = '0 0 30px rgba(64, 145, 108, 0.5)';
                cardEl.style.borderColor = 'var(--green-accent)';
            } else {
                cardEl.style.boxShadow = '';
                cardEl.style.borderColor = '';
            }
        }
    }
}

// ===== MODAL FUNCTIONS =====
function openWithdrawModal(depositId, amount, isLocked, feePercent, dailyROIWei) {
    console.log('[openWithdrawModal] Called with:', { depositId, amount, isLocked, feePercent, dailyROIWei });
    
    window.currentWithdrawDepositId = depositId;
    window.currentWithdrawAmount = amount;
    
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = text;
        } else {
            console.warn(`[openWithdrawModal] Element with id '${id}' not found`);
        }
    };
    
    setText('withdrawDepositId', depositId);
    setText('withdrawAmount', amount.toFixed(2) + ' USDT');
    
    let dailyROIUSDT = 0;
    try {
        if (dailyROIWei && dailyROIWei !== 'undefined') {
            dailyROIUSDT = parseFloat(window.web3.utils.fromWei(dailyROIWei.toString(), 'ether'));
        }
        console.log('[Withdraw Modal] dailyROIWei:', dailyROIWei, '-> USDT:', dailyROIUSDT);
    } catch (e) {
        console.error('[Withdraw Modal] Error converting dailyROI:', e);
    }
    
    setText('withdrawDailyROI', dailyROIUSDT.toFixed(2) + ' USDT');
    
    const feePercentValue = isLocked ? 30 : 0;
    const feeAmount = (amount * feePercentValue / 100);
    const receiveAmount = amount - feeAmount;
    
    setText('withdrawFee', feeAmount.toFixed(2) + ' USDT (' + feePercentValue + '%)');
    setText('withdrawReceive', receiveAmount.toFixed(2) + ' USDT');
    
    const warningEl = document.getElementById('withdrawWarning');
    if (warningEl) {
        warningEl.style.display = isLocked ? 'flex' : 'none';
    }
    
    const modal = document.getElementById('withdrawModal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        console.error('[openWithdrawModal] Modal element not found');
        showNotification('Error: Withdraw modal not found', 'error');
    }
}

function openClaimROIModal(depositId, pendingROI) {
    console.log('[openClaimROIModal] Called with:', { depositId, pendingROI });
    
    window.currentClaimDepositId = depositId;
    
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };
    
    setText('claimROIDepositId', depositId);
    setText('claimROIAmount', pendingROI.toFixed(2) + ' USDT');
    
    const modal = document.getElementById('claimROIModal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        console.error('[openClaimROIModal] Modal element not found');
        showNotification('Error: Claim ROI modal not found', 'error');
    }
}

// ===== LOAD DEPOSITS =====
async function loadDeposits() {
    if (!window.userAccount || !window.contract) {
        console.error('Wallet not connected or contract not initialized');
        return;
    }
    
    try {
        console.log('Loading deposits for:', window.userAccount);
        
        const depositIds = await window.contract.methods.getUserDepositIds(window.userAccount).call();
        console.log('Deposit IDs:', depositIds);
        
        const depositsList = document.getElementById('depositsList');
        const noDepositsMsg = document.getElementById('noDepositsMessage');
        
        if (!depositsList) {
            console.error('depositsList element not found');
            return;
        }
        
        depositsList.innerHTML = '';
        if (noDepositsMsg) depositsList.appendChild(noDepositsMsg);
        
        if (!depositIds || depositIds.length === 0) {
            if (noDepositsMsg) noDepositsMsg.style.display = 'block';
            return;
        }
        
        if (noDepositsMsg) noDepositsMsg.style.display = 'none';
        
        for (const depositId of depositIds) {
            try {
                const summary = await window.contract.methods.getDepositSummary(window.userAccount, depositId).call();
                console.log(`Deposit ${depositId} summary:`, summary);
                
                const id = parseInt(summary[0]);
                const amount = parseFloat(window.web3.utils.fromWei(summary[1].toString(), 'ether'));
                const depositTime = parseInt(summary[2]);
                const pendingROI = parseFloat(window.web3.utils.fromWei(summary[4].toString(), 'ether'));
                const lockEnd = parseInt(summary[5]);
                const daysLeft = parseInt(summary[6]);
                
                let rawDailyROI = summary[7];
                let dailyROIString = rawDailyROI ? rawDailyROI.toString() : '0';
                let dailyROIUSDT = 0;
                
                try {
                    dailyROIUSDT = parseFloat(window.web3.utils.fromWei(dailyROIString, 'ether'));
                } catch (e) {
                    dailyROIUSDT = parseFloat(dailyROIString) / 1e18;
                }
                
                const dailyROIDisplay = dailyROIUSDT.toFixed(2) + ' USDT';
                const isActive = summary[8];
                
                if (!isActive) continue;
                
                const isLocked = daysLeft > 0;
                const feePercent = isLocked ? 30 : 0;
                const dailyROIWei = dailyROIString;
                
                const depositCard = document.createElement('div');
                depositCard.className = 'deposit-card';
                depositCard.innerHTML = `
                    <div class="deposit-card__header">
                        <div>
                            <span class="deposit-id">#${id}</span>
                            <span class="deposit-status ${isLocked ? 'locked' : 'unlocked'}">
                                ${isLocked ? '🔒 Locked (' + daysLeft + ' days left)' : '🔓 Unlocked'}
                            </span>
                        </div>
                        <div class="deposit-amount" style="font-size: 1.125rem; font-weight: 600;">
                            ${amount.toFixed(2)} USDT
                        </div>
                    </div>
                    
                    <div class="deposit-stats">
                        <div class="deposit-stat">
                            <div class="deposit-stat__value">${dailyROIDisplay}</div>
                            <div class="deposit-stat__label">Daily ROI Rate</div>
                        </div>
                        <div class="deposit-stat">
                            <div class="deposit-stat__value">${pendingROI.toFixed(2)} USDT</div>
                            <div class="deposit-stat__label">Pending ROI</div>
                        </div>
                        <div class="deposit-stat">
                            <div class="deposit-stat__value">${new Date(depositTime * 1000).toLocaleDateString()}</div>
                            <div class="deposit-stat__label">Start Date</div>
                        </div>
                        <div class="deposit-stat">
                            <div class="deposit-stat__value">${new Date(lockEnd * 1000).toLocaleDateString()}</div>
                            <div class="deposit-stat__label">Unlock Date</div>
                        </div>
                    </div>
                    
                    <div class="progress-bar" style="margin: 0.5rem 0;">
                        <div class="progress-bar-fill" style="width: ${Math.min(100, ((100 - daysLeft) / 100 * 100))}%"></div>
                    </div>
                    
                    <div class="deposit-actions">
                        <button class="btn btn--success btn-sm" onclick="window.openClaimROIModal(${id}, ${pendingROI})" ${pendingROI < 0.1 ? 'disabled' : ''}>
                            <i class="fas fa-hand-holding-usd"></i> Claim ROI
                        </button>
                        <button class="btn btn--danger btn-sm" onclick="window.openWithdrawModal(${id}, ${amount}, ${isLocked}, ${feePercent}, '${dailyROIWei}')">
                            <i class="fas fa-sign-out-alt"></i> Withdraw Capital
                        </button>
                    </div>
                `;
                
                depositsList.appendChild(depositCard);
            } catch (err) {
                console.error(`Error loading deposit ${depositId}:`, err);
            }
        }
        
    } catch (error) {
        console.error('Load deposits error:', error);
        showNotification('Error loading deposits: ' + error.message, 'error');
        
        const depositsList = document.getElementById('depositsList');
        if (depositsList) {
            depositsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state__icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <p>Error loading deposits</p>
                    <p style="font-size: 0.875rem; color: var(--text-muted);">${error.message}</p>
                    <button class="btn btn--primary" onclick="window.loadDeposits()" style="margin-top: 1rem;">
                        <i class="fas fa-sync"></i> Retry
                    </button>
                </div>
            `;
        }
    }
}

// ===== INVESTMENT FUNCTIONS =====
function calculateInvestment() {
    const amount = parseFloat(document.getElementById('investAmount').value) || 0;
    const rank = window.userRank || 0;
    
    const boostPercents = [0, 0.1, 0.2, 0.3, 0.5, 1.0];
    const currentBoost = boostPercents[rank] || 0;
    
    const net = amount;
    const baseRate = 0.012;
    const dailyROI = amount * baseRate;
    
    let boostedDaily = 0;
    let boostText = 'Not active';
    
    if (currentBoost > 0) {
        const totalRate = baseRate + (currentBoost / 100);
        boostedDaily = amount * totalRate;
        boostText = boostedDaily.toFixed(4) + ' USDT';
    }
    
    const projection100 = boostedDaily > 0 ? boostedDaily * 100 : dailyROI * 100;
    
    const calcNet = document.getElementById('calcNet');
    const calcDaily = document.getElementById('calcDaily');
    const calcDailyBoosted = document.getElementById('calcDailyBoosted');
    const calc100Days = document.getElementById('calc100Days');
    
    if (calcNet) calcNet.textContent = net.toFixed(2) + ' USDT';
    if (calcDaily) calcDaily.textContent = dailyROI.toFixed(4) + ' USDT';
    if (calcDailyBoosted) calcDailyBoosted.textContent = boostText;
    if (calc100Days) calc100Days.textContent = projection100.toFixed(2) + ' USDT';
}

async function submitInvestment() {
    if (!window.userAccount) {
        showNotification('Please connect your wallet first', 'error');
        return;
    }
    
    const amount = document.getElementById('investAmount').value;
    if (!amount || parseFloat(amount) < 5) {
        showNotification('Minimum investment is 5 USDT', 'error');
        return;
    }
    
    let referrer = document.getElementById('referrerAddress').value.trim();
    
    if (!referrer || referrer === '') {
        referrer = '0x0000000000000000000000000000000000000000';
    } else if (!window.web3.utils.isAddress(referrer)) {
        showNotification('Invalid referrer address', 'error');
        return;
    }
    
    const btn = document.getElementById('btnInvest');
    btn.classList.add('loading');
    btn.innerHTML = '<span class="spinner"></span> Processing';
    
    try {
        const amountWei = window.web3.utils.toWei(amount, 'ether');
        
        const txWeb3 = new Web3(window.ethereum);
        const txContract = new txWeb3.eth.Contract(CONTRACT_ABI, CONFIG.CONTRACT_ADDRESS);
        const txUsdtContract = new txWeb3.eth.Contract(USDT_ABI, CONFIG.USDT_ADDRESS);
        
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        const fromAccount = accounts[0];
        
        const balance = await txUsdtContract.methods.balanceOf(fromAccount).call();
        if (BigInt(balance) < BigInt(amountWei)) {
            throw new Error('Insufficient USDT balance');
        }
        
        showNotification('Approving USDT...', 'info');
        const allowance = await txUsdtContract.methods.allowance(fromAccount, CONFIG.CONTRACT_ADDRESS).call();
        if (BigInt(allowance) < BigInt(amountWei)) {
            const approveMethod = txUsdtContract.methods.approve(CONFIG.CONTRACT_ADDRESS, amountWei);
            const approveGas = await estimateGasWithBuffer(approveMethod, fromAccount);
            const approveTx = await approveMethod.send({ from: fromAccount, gas: approveGas });
            if (!approveTx.status) throw new Error('Approval failed');
            showNotification('USDT approved successfully', 'success');
        }
        
        showNotification('Confirming deposit...', 'info');
        const investMethod = txContract.methods.invest(amountWei, referrer);
        const investGas = await estimateGasWithBuffer(investMethod, fromAccount);
        const investTx = await investMethod.send({ from: fromAccount, gas: investGas });
        
        if (investTx.status) {
            showNotification('Investment successful!', 'success');
            document.getElementById('investAmount').value = '100';
            calculateInvestment();
            await loadUserData();
            showSection('dashboard');
        }
        
    } catch (error) {
        console.error('Investment error:', error);
        let msg = error.message || 'Unknown error';
        if (msg.includes('user rejected')) msg = 'Transaction cancelled by user';
        else if (msg.includes('insufficient funds')) msg = 'Insufficient BNB for gas';
        else if (msg.includes('Insufficient USDT')) msg = 'Insufficient USDT balance';
        else if (msg.includes('Amount below minimum')) msg = 'Amount below minimum investment (5 USDT)';
        else if (msg.includes('Max positions reached')) msg = 'Maximum 50 deposits reached';
        showNotification('Failed: ' + msg, 'error');
    } finally {
        btn.classList.remove('loading');
        btn.innerHTML = '<i class="fas fa-rocket"></i> Confirm Investment';
    }
}

async function confirmClaimROI(depositId) {
    if (!window.userAccount) return;
    
    closeModal('claimROIModal');
    
    try {
        const txWeb3 = new Web3(window.ethereum);
        const txContract = new txWeb3.eth.Contract(CONTRACT_ABI, CONFIG.CONTRACT_ADDRESS);
        
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        const fromAccount = accounts[0];
        
        showNotification('Claiming ROI...', 'info');
        const roiMethod = txContract.methods.withdrawROI(depositId);
        const roiGas = await estimateGasWithBuffer(roiMethod, fromAccount);
        const tx = await roiMethod.send({ from: fromAccount, gas: roiGas });
        
        if (tx.status) {
            showNotification('ROI claimed successfully!', 'success');
            await loadUserData();
            await loadDeposits();
        }
    } catch (error) {
        console.error('Claim ROI error:', error);
        let msg = error.message || 'Unknown error';
        if (msg.includes('user rejected')) msg = 'Transaction cancelled';
        else if (msg.includes('ROI below minimum')) msg = 'ROI below minimum withdraw (0.1 USDT)';
        showNotification('Failed: ' + msg, 'error');
    }
}

async function confirmWithdraw(depositId) {
    if (!window.userAccount) return;
    
    closeModal('withdrawModal');
    
    try {
        const txWeb3 = new Web3(window.ethereum);
        const txContract = new txWeb3.eth.Contract(CONTRACT_ABI, CONFIG.CONTRACT_ADDRESS);
        
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        const fromAccount = accounts[0];
        
        showNotification('Processing withdrawal...', 'info');
        const withdrawMethod = txContract.methods.withdrawCapital(depositId);
        const withdrawGas = await estimateGasWithBuffer(withdrawMethod, fromAccount);
        const tx = await withdrawMethod.send({ from: fromAccount, gas: withdrawGas });
        
        if (tx.status) {
            showNotification('Withdrawal successful!', 'success');
            await loadUserData();
            await loadDeposits();
        }
    } catch (error) {
        console.error('Withdraw error:', error);
        let msg = error.message || 'Unknown error';
        if (msg.includes('user rejected')) msg = 'Transaction cancelled';
        else if (msg.includes('Insufficient balance')) msg = 'Insufficient balance to withdraw';
        showNotification('Failed: ' + msg, 'error');
    }
}

async function claimReferral() {
    if (!window.userAccount) return;
    
    const btn = document.getElementById('btnClaimRef');
    const original = btn.innerHTML;
    btn.classList.add('loading');
    btn.innerHTML = '<span class="spinner"></span> Processing';
    
    try {
        const txWeb3 = new Web3(window.ethereum);
        const txContract = new txWeb3.eth.Contract(CONTRACT_ABI, CONFIG.CONTRACT_ADDRESS);
        
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        const fromAccount = accounts[0];
        
        showNotification('Claiming referral bonuses...', 'info');
        const referralMethod = txContract.methods.withdrawReferralBonuses();
        const referralGas = await estimateGasWithBuffer(referralMethod, fromAccount);
        const tx = await referralMethod.send({ from: fromAccount, gas: referralGas });
        
        if (tx.status) {
            showNotification('Referral bonuses claimed successfully!', 'success');
            await loadUserData();
        }
    } catch (error) {
        console.error('Claim referral error:', error);
        let msg = error.message || 'Unknown error';
        if (msg.includes('user rejected')) msg = 'Transaction cancelled';
        else if (msg.includes('Bonus below minimum')) msg = 'Bonus below minimum withdraw (0.1 USDT)';
        showNotification('Failed: ' + msg, 'error');
    } finally {
        btn.classList.remove('loading');
        btn.innerHTML = original;
    }
}
