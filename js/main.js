// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async function() {
    const initialized = await initWeb3();
    if (initialized) {
        await loadVenusTVL();
        setupUIEventListeners();
        
        // Check for referral in URL
        const urlParams = new URLSearchParams(window.location.search);
        const ref = urlParams.get('ref');
        const refInput = document.getElementById('referrerAddress');
        const refHint = document.getElementById('refHint');
        
        if (ref && ref.match(/^0x[a-fA-F0-9]{40}$/)) {
            refInput.value = ref;
            refInput.readOnly = true;
            refInput.style.opacity = '0.7';
            refInput.style.cursor = 'not-allowed';
            refHint.innerHTML = 'Referrer from link detected (locked)';
            refHint.style.color = 'var(--green-accent)';
        } else {
            refInput.value = '';
            refInput.readOnly = false;
            refInput.style.opacity = '1';
            refInput.style.cursor = 'text';
            refHint.innerHTML = 'Not detected - leave empty if no referrer';
            refHint.style.color = 'var(--text-muted)';
        }
        
        // Auto-connect if previously connected
        if (localStorage.getItem('walletConnected') === 'true' && window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    await connectWallet();
                }
            } catch (e) {
                console.log('Auto-connect failed');
            }
        }
        
        calculateInvestment();
    }
});

// ===== LOAD USER DATA =====
async function loadUserData() {
    if (!userAccount || !contract) return;
    
    try {
        // Check if user exists in contract
        let userDetails;
        try {
            userDetails = await contract.methods.users(userAccount).call();
        } catch (e) {
            console.log('User not found');
            userDetails = null;
        }
        
        // If user doesn't exist
        if (!userDetails || !userDetails[10]) { // exists is index 10
            resetUserUI();
            
            // Get USDT balance
            try {
                const balance = await usdtContract.methods.balanceOf(userAccount).call();
                document.getElementById('usdtBalance').textContent = formatUSDT(balance, false);
            } catch (e) {}
            
            // Check remaining slots
            try {
                const remainingSlots = await contract.methods.getRemainingDepositSlots(userAccount).call();
                document.getElementById('remainingSlotsHint').innerHTML = `Remaining deposit slots: ${remainingSlots} / 50`;
            } catch(e) {}
            
            // Load deposits even if user doesn't exist (they might have deposits but not registered properly)
            await loadDeposits();
            
            return;
        }
        
        // User exists - get data
        const summary = await contract.methods.getUserSummary(userAccount).call();
        const network = await contract.methods.getUserNetwork(userAccount).call();
        const qualified = await contract.methods.getQualifiedStatus(userAccount).call();
        
        // Save data
        userData = { summary, network, qualified, userDetails };
        
        // Update rank
        if (summary && summary[3] !== undefined) {
            userRank = parseInt(summary[3]);
        }
        
        // Update UI
        updateDashboard(summary, network, userDetails);
        updateInvestPage(summary);
        updateReferralPage(network, qualified, userDetails);
        updateLeadershipPage(summary, network);
        
        // Get USDT balance
        try {
            const balance = await usdtContract.methods.balanceOf(userAccount).call();
            document.getElementById('usdtBalance').textContent = formatUSDT(balance, false);
        } catch (e) {}
        
        // Check remaining slots
        try {
            const remainingSlots = await contract.methods.getRemainingDepositSlots(userAccount).call();
            document.getElementById('remainingSlotsHint').innerHTML = `Remaining deposit slots: ${remainingSlots} / 50`;
            if (remainingSlots == 0) {
                document.getElementById('remainingSlotsHint').style.color = 'var(--red)';
            }
        } catch(e) {}
        
        // Load deposits
        await loadDeposits();
        
    } catch (error) {
        console.error('Load user data error:', error);
        showNotification('Error loading data', 'warning');
        // Still try to load deposits
        await loadDeposits();
    }
}

function resetUserUI() {
    document.getElementById('dashAddress').textContent = `${userAccount.slice(0, 4)}...${userAccount.slice(-4)}`;
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
    
    document.getElementById('btnClaimRef').disabled = true;
    
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
    
    const totalEarnedNum = parseFloat(web3.utils.fromWei(userDetails[5].toString(), 'ether')); // referralEarnings
    
    // Address
    document.getElementById('dashAddress').textContent = `${userAccount.slice(0, 4)}...${userAccount.slice(-4)}`;
    
    // Rank
    const rankNames = ['No Rank', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
    const rankClasses = ['', 'bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const rankIcons = ['fas fa-ban', 'fas fa-medal', 'fas fa-medal', 'fas fa-crown', 'fas fa-gem', 'fas fa-star'];
    const rankElement = document.getElementById('dashRank');
    rankElement.innerHTML = `<i class="${rankIcons[rank]}"></i> ${rankNames[rank]}`;
    rankElement.className = `rank-badge ${rankClasses[rank] || ''}`;
    
    // Convert values
    const totalActiveNum = parseFloat(web3.utils.fromWei(totalActiveAmount.toString(), 'ether'));
    const pendingROINum = parseFloat(web3.utils.fromWei(totalPendingROI.toString(), 'ether'));
    const pendingBonusesNum = parseFloat(web3.utils.fromWei(pendingBonuses.toString(), 'ether'));
    const volumeNum = parseFloat(web3.utils.fromWei(volume.toString(), 'ether'));
    
    // Update UI
    document.getElementById('dashTotalActive').textContent = totalActiveNum.toFixed(2) + ' USDT';
    document.getElementById('dashDepositCount').textContent = activeDepositCount;
    document.getElementById('dashPendingROI').textContent = pendingROINum.toFixed(2) + ' USDT';
    document.getElementById('dashPendingRef').textContent = pendingBonusesNum.toFixed(2) + ' USDT';
    
    document.getElementById('dashDirects').textContent = directs;
    document.getElementById('dashQualified').textContent = qualified;
    document.getElementById('dashTeamVolume').textContent = volumeNum.toFixed(2) + ' USDT';
    document.getElementById('dashTotalEarned').textContent = totalEarnedNum.toFixed(2) + ' USDT';
    
    document.getElementById('btnClaimRef').disabled = pendingBonusesNum < 0.1;
}

function updateInvestPage(summary) {
    if (!summary) return;
    const rank = parseInt(summary[3] || 0);
    const boosts = [0, 10, 20, 30, 50, 100];
    window.userRankBoost = boosts[rank] || 0;
    calculateInvestment();
}

function updateReferralPage(network, qualified, userDetails) {
    if (!network || !qualified || !userDetails) return;
    
    const directs = network[0] || 0;
    const qual = network[1] || 0;
    const volume = network[2] || '0';
    
    const volumeNum = parseFloat(web3.utils.fromWei(volume.toString(), 'ether'));
    const totalEarnedNum = parseFloat(web3.utils.fromWei(userDetails[5].toString(), 'ether')); // referralEarnings
    
    document.getElementById('refDirects').textContent = directs;
    document.getElementById('refQualified').textContent = qual;
    document.getElementById('refVolume').textContent = volumeNum.toFixed(2) + ' USDT';
    document.getElementById('refTotalEarned').textContent = totalEarnedNum.toFixed(2) + ' USDT';
    
    const baseUrl = window.location.origin + window.location.pathname;
    document.getElementById('refLink').value = `${baseUrl}?ref=${userAccount}`;
    
    // Qualified status from contract (array of 5 booleans)
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
    const teamVolume = parseFloat(web3.utils.fromWei(network[2].toString(), 'ether'));
    
    const rankRequirements = [5000, 15000, 30000, 50000, 100000];
    
    for (let i = 0; i < 5; i++) {
        const req = rankRequirements[i];
        const progress = Math.min(100, (teamVolume / req) * 100);
        
        document.getElementById(`rankProgress${i+1}`).textContent = Math.round(progress) + '%';
        document.getElementById(`rankBar${i+1}`).style.width = progress + '%';
        
        const card = document.getElementById(`rankCard${i+1}`);
        if (rank === i + 1) {
            card.style.boxShadow = '0 0 30px rgba(64, 145, 108, 0.5)';
            card.style.borderColor = 'var(--green-accent)';
        } else {
            card.style.boxShadow = '';
            card.style.borderColor = '';
        }
    }
}

// ===== LOAD DEPOSITS =====
async function loadDeposits() {
    if (!userAccount || !contract) return;
    
    try {
        const depositIds = await contract.methods.getUserDepositIds(userAccount).call();
        const depositsList = document.getElementById('depositsList');
        const noDepositsMsg = document.getElementById('noDepositsMessage');
        
        if (!depositIds || depositIds.length === 0) {
            if (noDepositsMsg) noDepositsMsg.style.display = 'block';
            if (depositsList) depositsList.innerHTML = '';
            return;
        }
        
        if (noDepositsMsg) noDepositsMsg.style.display = 'none';
        if (depositsList) depositsList.innerHTML = '';
        
        for (const depositId of depositIds) {
            try {
                const summary = await contract.methods.getDepositSummary(userAccount, depositId).call();
                
                if (!summary || !summary[8]) continue; // Skip if not active
                
                const id = parseInt(summary[0]);
                const amount = parseFloat(web3.utils.fromWei(summary[1].toString(), 'ether'));
                const depositTime = parseInt(summary[2]);
                const lastClaimTime = parseInt(summary[3]);
                const pendingROI = parseFloat(web3.utils.fromWei(summary[4].toString(), 'ether'));
                const lockEnd = parseInt(summary[5]);
                const daysLeft = parseInt(summary[6]);
                const dailyROI = parseInt(summary[7]);
                const isActive = summary[8];
                
                if (!isActive) continue;
                
                const isLocked = daysLeft > 0;
                const dailyROIPercent = (dailyROI / 100).toFixed(2);
                
                const depositCard = `
                    <div class="deposit-card">
                        <div class="deposit-card__header">
                            <div>
                                <span class="deposit-id">#${id}</span>
                                <span class="deposit-status ${isLocked ? 'locked' : 'unlocked'}">
                                    ${isLocked ? `🔒 Locked (${daysLeft} days left)` : '🔓 Unlocked'}
                                </span>
                            </div>
                            <div class="deposit-amount" style="font-size: 1.125rem; font-weight: 600;">
                                ${amount.toFixed(2)} USDT
                            </div>
                        </div>
                        
                        <div class="deposit-stats">
                            <div class="deposit-stat">
                                <div class="deposit-stat__value">${dailyROIPercent}%</div>
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
                            <div class="progress-bar-fill" style="width: ${((100 - daysLeft) / 100 * 100)}%"></div>
                        </div>
                        
                        <div class="deposit-actions">
                            <button class="btn btn--success btn-sm" onclick="openClaimROIModal(${id}, ${pendingROI})" ${pendingROI < 0.1 ? 'disabled' : ''}>
                                <i class="fas fa-hand-holding-usd"></i> Claim ROI
                            </button>
                            <button class="btn btn--danger btn-sm" onclick="openWithdrawModal(${id}, ${amount}, ${isLocked}, ${isLocked ? 30 : 0}, ${dailyROI})">
                                <i class="fas fa-sign-out-alt"></i> Withdraw Capital
                            </button>
                        </div>
                    </div>
                `;
                
                depositsList.innerHTML += depositCard;
            } catch (depositError) {
                console.error(`Error loading deposit ${depositId}:`, depositError);
                continue;
            }
        }
        
        if (depositsList.innerHTML === '') {
            if (noDepositsMsg) noDepositsMsg.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Load deposits error:', error);
        showNotification('Error loading deposits: ' + (error.message || 'Unknown error'), 'warning');
        const noDepositsMsg = document.getElementById('noDepositsMessage');
        if (noDepositsMsg) noDepositsMsg.style.display = 'block';
    }
}

// ===== INVESTMENT FUNCTIONS =====
function calculateInvestment() {
    const amount = parseFloat(document.getElementById('investAmount').value) || 0;
    const boost = window.userRankBoost || 0;
    
    // Daily ROI calculated from FULL amount (not after fee)
    const baseDailyRate = 0.012; // 1.2%
    const boostedDailyRate = baseDailyRate * (1 + boost / 1000);
    
    const baseDaily = amount * baseDailyRate;
    const boostedDaily = amount * boostedDailyRate;
    const projection100 = amount * (baseDailyRate * 100);
    
    // Fee calculation (for info only)
    const fee = amount * 0.10;
    const net = amount - fee;
    
    document.getElementById('calcNet').textContent = net.toFixed(2) + ' USDT';
    document.getElementById('calcDaily').textContent = baseDaily.toFixed(4) + ' USDT';
    
    const boostedElement = document.getElementById('calcDailyBoosted');
    if (boost > 0) {
        boostedElement.textContent = boostedDaily.toFixed(4) + ' USDT';
        boostedElement.style.color = 'var(--gold)';
    } else {
        boostedElement.textContent = 'Not active';
        boostedElement.style.color = 'var(--text-muted)';
    }
    
    document.getElementById('calc100Days').textContent = projection100.toFixed(2) + ' USDT';
}

async function submitInvestment() {
    if (!userAccount) {
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
    } else if (!web3.utils.isAddress(referrer)) {
        showNotification('Invalid referrer address', 'error');
        return;
    }
    
    const btn = document.getElementById('btnInvest');
    btn.classList.add('loading');
    btn.innerHTML = '<span class="spinner"></span> Processing';
    
    try {
        const amountWei = web3.utils.toWei(amount, 'ether');
        
        const txWeb3 = new Web3(window.ethereum);
        const txContract = new txWeb3.eth.Contract(CONTRACT_ABI, CONFIG.CONTRACT_ADDRESS);
        const txUsdtContract = new txWeb3.eth.Contract(USDT_ABI, CONFIG.USDT_ADDRESS);
        
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        const fromAccount = accounts[0];
        
        // Check USDT balance
        const balance = await txUsdtContract.methods.balanceOf(fromAccount).call();
        if (BigInt(balance) < BigInt(amountWei)) {
            throw new Error('Insufficient USDT balance');
        }
        
        // Approve USDT
        showNotification('Approving USDT...', 'info');
        const allowance = await txUsdtContract.methods.allowance(fromAccount, CONFIG.CONTRACT_ADDRESS).call();
        if (BigInt(allowance) < BigInt(amountWei)) {
            const approveMethod = txUsdtContract.methods.approve(CONFIG.CONTRACT_ADDRESS, amountWei);
            const approveGas = await estimateGasWithBuffer(approveMethod, fromAccount);
            const approveTx = await approveMethod.send({ from: fromAccount, gas: approveGas });
            if (!approveTx.status) throw new Error('Approval failed');
            showNotification('USDT approved successfully', 'success');
        }
        
        // Confirm Deposit
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
    if (!userAccount) return;
    
    closeModal('claimROIModal');
    
    const btn = document.querySelector(`.deposit-actions button:first-child`);
    if (btn) {
        btn.classList.add('loading');
        btn.innerHTML = '<span class="spinner"></span>';
    }
    
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
    } finally {
        if (btn) {
            btn.classList.remove('loading');
            btn.innerHTML = '<i class="fas fa-hand-holding-usd"></i> Claim ROI';
        }
    }
}

async function confirmWithdraw(depositId) {
    if (!userAccount) return;
    
    closeModal('withdrawModal');
    
    const btn = document.querySelector(`.deposit-actions button:last-child`);
    if (btn) {
        btn.classList.add('loading');
        btn.innerHTML = '<span class="spinner"></span>';
    }
    
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
    } finally {
        if (btn) {
            btn.classList.remove('loading');
            btn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Withdraw Capital';
        }
    }
}

async function claimReferral() {
    if (!userAccount) return;
    
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
