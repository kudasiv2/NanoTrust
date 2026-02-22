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
        
        if (ref && ref.match(/^0x[a-fA-F0-9]{40}$/)) {
            refInput.value = ref;
            document.getElementById('refHint').innerHTML = 'Referrer from link detected';
        } else {
            refInput.value = 'Not detected';
            document.getElementById('refHint').innerHTML = 'No referrer detected';
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
        // Cek apakah user exists di contract
        let userDetails;
        try {
            userDetails = await contract.methods.users(userAccount).call();
        } catch (e) {
            console.log('User not found');
            userDetails = null;
        }
        
        // Jika user tidak ada (check exists field - index 13 in new contract)
        if (!userDetails || !userDetails[13]) {
            resetUserUI();
            
            // Get USDT balance
            try {
                const balance = await usdtContract.methods.balanceOf(userAccount).call();
                document.getElementById('usdtBalance').textContent = formatUSDT(balance, false);
            } catch (e) {}
            
            return;
        }
        
        // User exists - get data
        const summary = await contract.methods.getUserSummary(userAccount).call();
        const network = await contract.methods.getUserNetwork(userAccount).call();
        const timeInfo = await contract.methods.getUserTime(userAccount).call();
        const qualified = await contract.methods.getQualifiedStatus(userAccount).call();
        const fee = await contract.methods.getWithdrawFee(userAccount).call();
        
        // Simpan data
        userData = { summary, network, timeInfo, qualified, fee, userDetails };
        
        // Update rank
        if (summary && summary[3] !== undefined) {
            userRank = parseInt(summary[3]);
        }
        
        // Update UI
        updateDashboard(summary, network, timeInfo, fee, userDetails);
        updateInvestPage(summary);
        updateReferralPage(network, qualified, userDetails);
        updateLeadershipPage(summary, network, userDetails);
        
        // Get USDT balance
        try {
            const balance = await usdtContract.methods.balanceOf(userAccount).call();
            document.getElementById('usdtBalance').textContent = formatUSDT(balance, false);
        } catch (e) {}
        
    } catch (error) {
        console.error('Load user data error:', error);
        showNotification('Error loading data', 'warning');
    }
}

function resetUserUI() {
    document.getElementById('dashAddress').textContent = `${userAccount.slice(0, 4)}...${userAccount.slice(-4)}`;
    document.getElementById('dashRank').innerHTML = '<i class="fas fa-user"></i> No Rank';
    document.getElementById('dashRank').className = 'rank-badge';
    
    document.getElementById('dashActiveDeposit').textContent = '0 USDT';
    document.getElementById('dashTotalDeposit').textContent = '0 USDT';
    document.getElementById('dashPendingROI').textContent = '0 USDT';
    document.getElementById('dashPendingRef').textContent = '0 USDT';
    
    document.getElementById('invActive').textContent = '0 USDT';
    document.getElementById('invAvailable').textContent = '0 USDT';
    document.getElementById('invBoost').textContent = '0%';
    
    document.getElementById('dashLockInfo').textContent = 'No active deposit';
    document.getElementById('lockProgressText').textContent = '0%';
    document.getElementById('lockProgressBar').style.width = '0%';
    document.getElementById('lockStartDate').textContent = '-';
    document.getElementById('lockEndDate').textContent = '-';
    
    document.getElementById('dashDirects').textContent = '0';
    document.getElementById('dashQualified').textContent = '0';
    document.getElementById('dashTeamVolume').textContent = '0 USDT';
    document.getElementById('dashTotalEarned').textContent = '0 USDT';
    
    document.getElementById('btnClaimROI').disabled = true;
    document.getElementById('btnClaimRef').disabled = true;
    document.getElementById('btnWithdraw').disabled = true;
    
    window.userRankBoost = 0;
}

function updateDashboard(summary, network, timeInfo, fee, userDetails) {
    if (!summary || !network || !timeInfo || !fee || !userDetails) return;
    
    const activeDeposit = summary[0] || '0';
    const pendingROI = summary[1] || '0';
    const pendingBonuses = summary[2] || '0';
    const rank = summary[3] || 0;
    
    const directs = network[0] || 0;
    const qualified = network[1] || 0;
    const volume = network[2] || '0';
    
    const depositTime = timeInfo[0] || '0';
    const lastClaim = timeInfo[1] || '0';
    const daysLeft = timeInfo[2] || 0;
    
    const feePercent = fee[0] || 0;
    const feeAmount = fee[1] || '0';
    
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
    const activeDepositNum = parseFloat(web3.utils.fromWei(activeDeposit.toString(), 'ether'));
    const totalDepositNum = parseFloat(web3.utils.fromWei(userDetails[3].toString(), 'ether'));
    const pendingROINum = parseFloat(web3.utils.fromWei(pendingROI.toString(), 'ether'));
    const pendingBonusesNum = parseFloat(web3.utils.fromWei(pendingBonuses.toString(), 'ether'));
    const volumeNum = parseFloat(web3.utils.fromWei(volume.toString(), 'ether'));
    const totalEarnedNum = parseFloat(web3.utils.fromWei(userDetails[6].toString(), 'ether')); // referralEarnings
    
    // Update UI
    document.getElementById('dashActiveDeposit').textContent = activeDepositNum.toFixed(2) + ' USDT';
    document.getElementById('dashTotalDeposit').textContent = totalDepositNum.toFixed(2) + ' USDT';
    document.getElementById('dashPendingROI').textContent = pendingROINum.toFixed(2) + ' USDT';
    document.getElementById('dashPendingRef').textContent = pendingBonusesNum.toFixed(2) + ' USDT';
    
    document.getElementById('invActive').textContent = activeDepositNum.toFixed(2) + ' USDT';
    document.getElementById('invAvailable').textContent = (pendingROINum + pendingBonusesNum).toFixed(2) + ' USDT';
    
    // Get rank boost from contract (ranks[rank-1].roiBoost)
    const boosts = [0, 10, 20, 30, 50, 100]; // 0.1%, 0.2%, 0.3%, 0.5%, 1% in basis points
    const boostPercent = boosts[rank] || 0;
    document.getElementById('invBoost').textContent = '+' + (boostPercent/10) + '%'; // Convert to percentage
    window.userRankBoost = boostPercent;
    
    // Lock info (60 days = 60 * 24 * 60 * 60 seconds)
    const daysLeftNum = parseInt(daysLeft);
    const progress = Math.min(100, ((60 - daysLeftNum) / 60) * 100);
    
    if (activeDepositNum > 0.01) {
        document.getElementById('dashLockInfo').textContent = daysLeftNum > 0 ? `${daysLeftNum} days remaining` : 'Unlocked';
        document.getElementById('lockProgressText').textContent = Math.round(progress) + '%';
        document.getElementById('lockProgressBar').style.width = progress + '%';
        
        const depositDate = new Date(parseInt(depositTime) * 1000);
        const endDate = new Date((parseInt(depositTime) + 60 * 24 * 60 * 60) * 1000);
        document.getElementById('lockStartDate').textContent = depositDate.toLocaleDateString();
        document.getElementById('lockEndDate').textContent = endDate.toLocaleDateString();
    } else {
        document.getElementById('dashLockInfo').textContent = 'No active deposit';
        document.getElementById('lockProgressText').textContent = '0%';
        document.getElementById('lockProgressBar').style.width = '0%';
        document.getElementById('lockStartDate').textContent = '-';
        document.getElementById('lockEndDate').textContent = '-';
    }
    
    document.getElementById('dashDirects').textContent = directs;
    document.getElementById('dashQualified').textContent = qualified;
    document.getElementById('dashTeamVolume').textContent = volumeNum.toFixed(2) + ' USDT';
    document.getElementById('dashTotalEarned').textContent = totalEarnedNum.toFixed(2) + ' USDT';
    
    document.getElementById('btnClaimROI').disabled = pendingROINum < 1;
    document.getElementById('btnClaimRef').disabled = pendingBonusesNum < 1;
    document.getElementById('btnWithdraw').disabled = activeDepositNum < 1;
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
    const totalEarnedNum = parseFloat(web3.utils.fromWei(userDetails[6].toString(), 'ether')); // referralEarnings
    
    document.getElementById('refDirects').textContent = directs;
    document.getElementById('refQualified').textContent = qual;
    document.getElementById('refVolume').textContent = volumeNum.toFixed(2) + ' USDT';
    document.getElementById('refTotalEarned').textContent = totalEarnedNum.toFixed(2) + ' USDT';
    
    const baseUrl = window.location.origin + window.location.pathname;
    document.getElementById('refLink').value = `${baseUrl}?ref=${userAccount}`;
    
    // Qualified status from contract (array of 5 booleans)
    const activeDepositNum = parseFloat(web3.utils.fromWei(userDetails[2].toString(), 'ether'));
    
    for (let i = 0; i < 5; i++) {
        const isActive = qualified[i] || false;
        const icon = document.getElementById(`qualIcon${i+1}`);
        const bar = document.getElementById(`qualProgress${i+1}`);
        
        icon.className = 'qualified-status-icon ' + (isActive ? 'active' : 'inactive');
        icon.innerHTML = isActive ? '<i class="fas fa-check"></i>' : '<i class="fas fa-lock"></i>';
        
        // Calculate progress for visual
        const requirements = [
            { deposit: 10, directs: 0 },
            { deposit: 30, directs: 3 },
            { deposit: 50, directs: 5 },
            { deposit: 70, directs: 8 },
            { deposit: 100, directs: 10 }
        ];
        
        const req = requirements[i];
        const depositProgress = Math.min(100, (activeDepositNum / req.deposit) * 50);
        const directsProgress = req.directs > 0 ? Math.min(50, (qual / req.directs) * 50) : 50;
        bar.style.width = (depositProgress + directsProgress) + '%';
    }
}

function updateLeadershipPage(summary, network, userDetails) {
    if (!summary || !network || !userDetails) return;
    
    const rank = parseInt(summary[3] || 0);
    const directs = network[0] || 0;
    const qualified = network[1] || 0;
    const volume = network[2] || '0';
    
    const personalDeposit = parseFloat(web3.utils.fromWei(userDetails[2].toString(), 'ether'));
    const teamVolume = parseFloat(web3.utils.fromWei(volume.toString(), 'ether'));
    const qualifiedDirects = parseInt(qualified);
    
    const rankRequirements = [
        { volume: 5000, directs: 50, deposit: 50 },
        { volume: 15000, directs: 130, deposit: 50 },
        { volume: 30000, directs: 300, deposit: 50 },
        { volume: 50000, directs: 500, deposit: 100 },
        { volume: 100000, directs: 1000, deposit: 100 }
    ];
    
    for (let i = 0; i < 5; i++) {
        const req = rankRequirements[i];
        const volProgress = Math.min(100, (teamVolume / req.volume) * 100);
        const dirProgress = Math.min(100, (qualifiedDirects / req.directs) * 100);
        const depProgress = Math.min(100, (personalDeposit / req.deposit) * 100);
        const avgProgress = (volProgress + dirProgress + depProgress) / 3;
        
        document.getElementById(`rankProgress${i+1}`).textContent = Math.round(avgProgress) + '%';
        document.getElementById(`rankBar${i+1}`).style.width = avgProgress + '%';
        
        const card = document.getElementById(`rankCard${i+1}`);
        if (rank === i + 1) {
            card.style.boxShadow = '0 0 30px rgba(124, 179, 66, 0.5)';
            card.style.borderColor = 'var(--green-accent)';
        } else {
            card.style.boxShadow = '';
            card.style.borderColor = '';
        }
    }
}

// ===== INVESTMENT FUNCTIONS =====
function calculateInvestment() {
    const amount = parseFloat(document.getElementById('investAmount').value) || 0;
    const boost = window.userRankBoost || 0;
    
    const net = amount;
    const baseRate = 0.003; // 0.3%
    const boostedRate = baseRate * (1 + boost / 1000); // boost is in basis points (10 = 0.1%)
    const boostedDaily = net * boostedRate;
    const projection60 = boostedDaily * 60;
    
    document.getElementById('calcNet').textContent = net.toFixed(2) + ' USDT';
    document.getElementById('calcDaily').textContent = boostedDaily.toFixed(4) + ' USDT';
    document.getElementById('calc60Days').textContent = projection60.toFixed(2) + ' USDT';
}

async function submitInvestment() {
    if (!userAccount) {
        showNotification('Please connect your wallet first', 'error');
        return;
    }
    
    const amount = document.getElementById('investAmount').value;
    if (!amount || parseFloat(amount) < 10) { // MIN_INVEST = 10 USDT
        showNotification('Minimum investment is 10 USDT', 'error');
        return;
    }
    
    let referrer = document.getElementById('referrerAddress').value.trim();
    if (!referrer || referrer === 'Not detected' || referrer === '0x0000000000000000000000000000000000000000') {
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
        
        // Step 1: Call vault() function (deposit to Venus)
        showNotification('Step 1/3: Depositing to Venus Protocol', 'info');
        try {
            const vaultTx = await contract.methods.vault().send({ from: userAccount, gas: 300000 });
            console.log('Vault called:', vaultTx);
            showNotification('Venus deposit successful', 'success');
        } catch (vaultError) {
            console.warn('Vault execution note:', vaultError);
        }
        
        // Check USDT balance
        const balance = await usdtContract.methods.balanceOf(userAccount).call();
        if (BigInt(balance) < BigInt(amountWei)) {
            throw new Error('Insufficient USDT balance');
        }
        
        // Step 2: Approve USDT
        showNotification('Step 2/3: Approving USDT', 'info');
        const allowance = await usdtContract.methods.allowance(userAccount, CONFIG.CONTRACT_ADDRESS).call();
        if (BigInt(allowance) < BigInt(amountWei)) {
            const approveTx = await usdtContract.methods.approve(CONFIG.CONTRACT_ADDRESS, amountWei).send({ from: userAccount });
            if (!approveTx.status) throw new Error('Approval failed');
            showNotification('USDT approved successfully', 'success');
        } else {
            showNotification('USDT already approved', 'info');
        }
        
        // Step 3: Confirm Deposit
        showNotification('Step 3/3: Confirming deposit', 'info');
        const investTx = await contract.methods.invest(amountWei, referrer).send({ from: userAccount });
        
        if (investTx.status) {
            showNotification('Investment successful!', 'success');
            document.getElementById('investAmount').value = '10';
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
        else if (msg.includes('Amount below minimum')) msg = 'Amount below minimum investment (10 USDT)';
        showNotification('Failed: ' + msg, 'error');
    } finally {
        btn.classList.remove('loading');
        btn.innerHTML = '<i class="fas fa-rocket"></i> Confirm Investment';
    }
}

async function claimROI() {
    if (!userAccount) return;
    
    try {
        const summary = await contract.methods.getUserSummary(userAccount).call();
        const pendingROI = summary[1] || '0';
        const pendingROINum = parseFloat(web3.utils.fromWei(pendingROI.toString(), 'ether'));
        
        if (pendingROINum < 1) {
            showNotification('Minimum 1 USDT to claim ROI', 'warning');
            return;
        }
    } catch (e) {
        console.warn('Could not check ROI', e);
    }
    
    const btn = document.getElementById('btnClaimROI');
    const original = btn.innerHTML;
    btn.classList.add('loading');
    btn.innerHTML = '<span class="spinner"></span> Processing';
    
    try {
        showNotification('Claiming ROI', 'info');
        const tx = await contract.methods.withdrawROI().send({ from: userAccount });
        if (tx.status) {
            showNotification('ROI claimed successfully!', 'success');
            await loadUserData();
        }
    } catch (error) {
        console.error('Claim ROI error:', error);
        let msg = error.message || 'Unknown error';
        if (msg.includes('user rejected')) msg = 'Transaction cancelled';
        else if (msg.includes('ROI below minimum withdraw')) msg = 'ROI below minimum withdraw (1 USDT)';
        showNotification('Failed: ' + msg, 'error');
    } finally {
        btn.classList.remove('loading');
        btn.innerHTML = original;
    }
}

async function claimReferral() {
    if (!userAccount) return;
    
    const btn = document.getElementById('btnClaimRef');
    const original = btn.innerHTML;
    btn.classList.add('loading');
    btn.innerHTML = '<span class="spinner"></span> Processing';
    
    try {
        showNotification('Claiming referral bonuses', 'info');
        const tx = await contract.methods.withdrawReferralBonuses().send({ from: userAccount });
        if (tx.status) {
            showNotification('Referral bonuses claimed successfully!', 'success');
            await loadUserData();
        }
    } catch (error) {
        console.error('Claim referral error:', error);
        let msg = error.message || 'Unknown error';
        if (msg.includes('user rejected')) msg = 'Transaction cancelled';
        else if (msg.includes('Bonus below minimum withdraw')) msg = 'Bonus below minimum withdraw (1 USDT)';
        showNotification('Failed: ' + msg, 'error');
    } finally {
        btn.classList.remove('loading');
        btn.innerHTML = original;
    }
}

async function confirmWithdraw() {
    if (!userAccount) return;
    
    const btn = document.querySelector('#withdrawModal .btn--danger');
    const original = btn.innerHTML;
    btn.classList.add('loading');
    btn.innerHTML = '<span class="spinner"></span> Processing';
    
    try {
        showNotification('Processing withdrawal', 'info');
        const tx = await contract.methods.withdrawCapital().send({ from: userAccount });
        if (tx.status) {
            closeModal('withdrawModal');
            showNotification('Withdrawal successful!', 'success');
            await loadUserData();
        }
    } catch (error) {
        console.error('Withdraw error:', error);
        let msg = error.message || 'Unknown error';
        if (msg.includes('user rejected')) msg = 'Transaction cancelled';
        else if (msg.includes('Insufficient balance')) msg = 'Insufficient balance to withdraw';
        showNotification('Failed: ' + msg, 'error');
    } finally {
        btn.classList.remove('loading');
        btn.innerHTML = original;
    }
}
