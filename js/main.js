// ===== LOAD DEPOSITS =====
async function loadDeposits() {
    if (!userAccount || !contract) {
        console.error('Wallet not connected or contract not initialized');
        return;
    }
    
    try {
        console.log('Loading deposits for:', userAccount);
        
        // Check if method exists
        if (!contract.methods.getUserDepositIds) {
            throw new Error('getUserDepositIds method not found in contract');
        }
        
        const depositIds = await contract.methods.getUserDepositIds(userAccount).call();
        console.log('Deposit IDs:', depositIds);
        
        const depositsList = document.getElementById('depositsList');
        const noDepositsMsg = document.getElementById('noDepositsMessage');
        
        if (!depositsList) {
            console.error('depositsList element not found');
            return;
        }
        
        // Clear list tapi pertahankan noDepositsMessage
        depositsList.innerHTML = '';
        depositsList.appendChild(noDepositsMsg);
        
        if (!depositIds || depositIds.length === 0) {
            noDepositsMsg.style.display = 'block';
            return;
        }
        
        noDepositsMsg.style.display = 'none';
        
        for (const depositId of depositIds) {
            try {
                const summary = await contract.methods.getDepositSummary(userAccount, depositId).call();
                console.log(`Deposit ${depositId} raw summary:`, summary);
                
                const id = parseInt(summary[0]);
                const amount = parseFloat(web3.utils.fromWei(summary[1].toString(), 'ether'));
                const depositTime = parseInt(summary[2]);
                const lastClaimTime = parseInt(summary[3]);
                const pendingROI = parseFloat(web3.utils.fromWei(summary[4].toString(), 'ether'));
                const lockEnd = parseInt(summary[5]);
                const daysLeft = parseInt(summary[6]);
                
                // PERBAIKAN: Konversi dailyROI dengan benar
                let dailyROIValue = summary[7];
                
                // Konversi BigNumber ke string jika perlu
                if (dailyROIValue && typeof dailyROIValue === 'object' && dailyROIValue.toString) {
                    dailyROIValue = dailyROIValue.toString();
                }
                
                console.log(`Deposit ${depositId} - Raw dailyROI:`, dailyROIValue, 'Type:', typeof dailyROIValue);
                
                // Parse ke integer
                let dailyROINum = parseInt(dailyROIValue);
                
                // PERBAIKAN: Cek jika nilai terlalu besar (lebih dari 10000 yang berarti 100%)
                // Jika > 1000000, kemungkinan ini adalah basis points yang salah format atau dalam wei
                let dailyROIPercent;
                if (dailyROINum > 1000000) {
                    // Jika sangat besar, mungkin dalam wei (untuk 1.2% = 0.012 dalam wei)
                    // Konversi dari wei ke ether, lali ke persen
                    const inEther = parseFloat(web3.utils.fromWei(dailyROIValue, 'ether'));
                    dailyROIPercent = (inEther * 100).toFixed(2);
                    console.log(`Converted from wei: ${inEther} ether = ${dailyROIPercent}%`);
                } else {
                    // Basis points normal: 120 = 1.2%, 130 = 1.3%, dst
                    // 10000 basis points = 100%
                    dailyROIPercent = (dailyROINum / 100).toFixed(2);
                }
                
                console.log(`Deposit ${depositId} - Final dailyROI: ${dailyROIPercent}%`);
                
                const isActive = summary[8];
                
                if (!isActive) continue;
                
                const isLocked = daysLeft > 0;
                
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
                        <button class="btn btn--danger btn-sm" onclick="openWithdrawModal(${id}, ${amount}, ${isLocked}, ${isLocked ? 30 : 0}, ${dailyROINum})">
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
        
        // Tampilkan pesan error di UI
        const depositsList = document.getElementById('depositsList');
        if (depositsList) {
            depositsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state__icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <p>Error loading deposits</p>
                    <p style="font-size: 0.875rem; color: var(--text-muted);">${error.message}</p>
                    <button class="btn btn--primary" onclick="loadDeposits()" style="margin-top: 1rem;">
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
    
    // Boost dalam persen (0.1%, 0.2%, 0.3%, 0.5%, 1.0%)
    const boostPercents = [0, 0.1, 0.2, 0.3, 0.5, 1.0];
    const currentBoost = boostPercents[rank] || 0;
    
    // PERBAIKAN: Tampilkan full amount sebagai Net Deposit (bukan dikurangi fee)
    const net = amount;
    
    // ROI dihitung dari FULL AMOUNT (bukan net)
    const baseRate = 0.012; // 1.2%
    const dailyROI = amount * baseRate; // 1.2% dari full amount
    
    // With Rank Boost
    let boostedDaily = 0;
    let boostText = 'Not active';
    
    if (currentBoost > 0) {
        const totalRate = baseRate + (currentBoost / 100);
        boostedDaily = amount * totalRate;
        boostText = boostedDaily.toFixed(4) + ' USDT';
    }
    
    // 100 Days Projection
    const projection100 = boostedDaily > 0 ? boostedDaily * 100 : dailyROI * 100;
    
    // Update UI
    document.getElementById('calcNet').textContent = net.toFixed(2) + ' USDT';
    document.getElementById('calcDaily').textContent = dailyROI.toFixed(4) + ' USDT';
    document.getElementById('calcDailyBoosted').textContent = boostText;
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
    
    // Validasi referrer
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
    if (!userAccount) return;
    
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
