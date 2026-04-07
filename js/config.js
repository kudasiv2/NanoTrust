// ===== KONFIGURASI CENTURYWEALTH V2 =====
const CONFIG = {
    CONTRACT_ADDRESS: '0x875934C4963Ee0F0ad996b90fF74F93232Bff797',
    USDT_ADDRESS: '0x55d398326f99059fF775485246999027B3197955', // BSC USDT
    USDC_ADDRESS: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // BSC USDC
    PANCAKE_V3_NPM: '0x46A15B0b27311cedF172AB29E4f4766fbE7F4364', // PancakeSwap V3 NPM
    PANCAKE_POOL_ADDRESS: '0x92b7807bF19b7DDdf89b706143896d05228f3121', // USDT/USDC Pool
    BSC_RPC: 'https://bsc-dataseed.binance.org/',
    BSC_CHAIN_ID: '0x38', // 56 in hex
};

// ===== PANCAKESWAP V3 POOL ABI MINIMAL (untuk TVL) =====
const PANCAKE_V3_POOL_ABI = [
    {
        "inputs": [],
        "name": "liquidity",
        "outputs": [{"internalType": "uint128", "name": "", "type": "uint128"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "slot0",
        "outputs": [
            {"internalType": "uint160", "name": "sqrtPriceX96", "type": "uint160"},
            {"internalType": "int24", "name": "tick", "type": "int24"},
            {"internalType": "uint16", "name": "observationIndex", "type": "uint16"},
            {"internalType": "uint16", "name": "observationCardinality", "type": "uint16"},
            {"internalType": "uint16", "name": "observationCardinalityNext", "type": "uint16"},
            {"internalType": "uint32", "name": "feeProtocol", "type": "uint32"},
            {"internalType": "bool", "name": "unlocked", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

// ===== PANCAKESWAP V3 NPM ABI MINIMAL =====
const PANCAKE_V3_ABI = [
    {
        "constant": true,
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "positions",
        "outputs": [
            {"internalType": "uint96", "name": "nonce", "type": "uint96"},
            {"internalType": "address", "name": "operator", "type": "address"},
            {"internalType": "address", "name": "token0", "type": "address"},
            {"internalType": "address", "name": "token1", "type": "address"},
            {"internalType": "uint24", "name": "fee", "type": "uint24"},
            {"internalType": "int24", "name": "tickLower", "type": "int24"},
            {"internalType": "int24", "name": "tickUpper", "type": "int24"},
            {"internalType": "uint128", "name": "liquidity", "type": "uint128"},
            {"internalType": "uint256", "name": "feeGrowthInside0LastX128", "type": "uint256"},
            {"internalType": "uint256", "name": "feeGrowthInside1LastX128", "type": "uint256"},
            {"internalType": "uint128", "name": "tokensOwed0", "type": "uint128"},
            {"internalType": "uint128", "name": "tokensOwed1", "type": "uint128"}
        ],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "liquidity",
        "outputs": [{"internalType": "uint128", "name": "", "type": "uint128"}],
        "type": "function"
    }
];

// ===== ABI CENTURYWEALTH V2 =====
const CONTRACT_ABI = [
    {"inputs":[{"internalType":"address","name":"_usdt","type":"address"},{"internalType":"address","name":"_usdc","type":"address"},{"internalType":"address","name":"_pancakeSwapV3PositionManager","type":"address"},{"internalType":"address","name":"_manageWallet","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
    {"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},
    {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},
    {"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},
    {"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"SafeERC20FailedOperation","type":"error"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":true,"internalType":"address","name":"referrer","type":"address"},{"indexed":false,"internalType":"uint256","name":"depositId","type":"uint256"}],"name":"Deposited","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"newRank","type":"uint256"}],"name":"RankUpgraded","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"address","name":"downline","type":"address"},{"indexed":false,"internalType":"uint256","name":"level","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"ReferralPaid","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"VaultDeposited","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"fee","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"claimedROI","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"depositId","type":"uint256"}],"name":"WithdrawnCapital","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"depositId","type":"uint256"}],"name":"WithdrawnROI","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"WithdrawnReferralBonuses","type":"event"},
    {"inputs":[],"name":"BASE_DAILY_ROI","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"DIRECT_QUALIFIED_MIN","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"FEE_EARLY_WITHDRAW","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"FEE_MANAGE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"LOCK_PERIOD","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"MAX_DEPOSITS_PER_USER","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"MIN_INVEST","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"MIN_WITHDRAW","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"POSITION_ID","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"canAddMoreDeposits","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"getContractStats","outputs":[{"internalType":"uint256","name":"invested","type":"uint256"},{"internalType":"uint256","name":"usersCount","type":"uint256"},{"internalType":"uint256","name":"poolAge","type":"uint256"},{"internalType":"uint256","name":"balance","type":"uint256"},{"internalType":"uint256","name":"referralPaid","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_depositId","type":"uint256"}],"name":"getDepositPendingROI","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_depositId","type":"uint256"}],"name":"getDepositStoredRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_depositId","type":"uint256"}],"name":"getDepositSummary","outputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"depositTime","type":"uint256"},{"internalType":"uint256","name":"lastClaimTime","type":"uint256"},{"internalType":"uint256","name":"pendingROI","type":"uint256"},{"internalType":"uint256","name":"lockEnd","type":"uint256"},{"internalType":"uint256","name":"daysLeft","type":"uint256"},{"internalType":"uint256","name":"dailyROI","type":"uint256"},{"internalType":"bool","name":"isActive","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_index","type":"uint256"}],"name":"getDownlineInfo","outputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getDownlineLength","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getQualifiedStatus","outputs":[{"internalType":"bool[5]","name":"","type":"bool[5]"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_rank","type":"uint256"}],"name":"getRankInfo","outputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"uint256","name":"volume","type":"uint256"},{"internalType":"uint256","name":"boost","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getRemainingDepositSlots","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getUserDepositCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getUserDepositIds","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getUserNetwork","outputs":[{"internalType":"uint256","name":"directs","type":"uint256"},{"internalType":"uint256","name":"qualified","type":"uint256"},{"internalType":"uint256","name":"volume","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getUserSummary","outputs":[{"internalType":"uint256","name":"totalActiveAmount","type":"uint256"},{"internalType":"uint256","name":"totalPendingROI","type":"uint256"},{"internalType":"uint256","name":"pendingBonuses","type":"uint256"},{"internalType":"uint256","name":"rank","type":"uint256"},{"internalType":"uint256","name":"activeDepositCount","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getUserTotalPendingROI","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_depositId","type":"uint256"}],"name":"getWithdrawFee","outputs":[{"internalType":"uint256","name":"percent","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"address","name":"_referrer","type":"address"}],"name":"invest","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"manageWallet","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"pancakeSwapV3PoolCreated","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"pancakeSwapV3PositionManager","outputs":[{"internalType":"contract IPancakeSwapV3NonfungiblePositionManager","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"ranks","outputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"uint256","name":"requiredTeamVolume","type":"uint256"},{"internalType":"uint256","name":"roiBoost","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"totalInvested","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"totalReferralBonusesPaid","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"totalUsers","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"usdc","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"usdt","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userDepositCounter","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"userIdToAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"users","outputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"referrer","type":"address"},{"internalType":"uint256","name":"activeDepositCount","type":"uint256"},{"internalType":"uint256","name":"totalActiveAmount","type":"uint256"},{"internalType":"uint256","name":"pendingReferralBonuses","type":"uint256"},{"internalType":"uint256","name":"referralEarnings","type":"uint256"},{"internalType":"uint256","name":"rank","type":"uint256"},{"internalType":"uint256","name":"directCount","type":"uint256"},{"internalType":"uint256","name":"qualifiedDirects","type":"uint256"},{"internalType":"uint256","name":"teamVolume","type":"uint256"},{"internalType":"bool","name":"exists","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"depositId","type":"uint256"}],"name":"withdrawCapital","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"depositId","type":"uint256"}],"name":"withdrawROI","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"withdrawReferralBonuses","outputs":[],"stateMutability":"nonpayable","type":"function"}
];

// ===== USDT / USDC ERC20 ABI MINIMAL =====
const USDT_ABI = [
    {"constant":true,"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"type":"function"},
    {"constant":true,"inputs":[{"internalType":"address","name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"balance","type":"uint256"}],"type":"function"},
    {"constant":false,"inputs":[{"internalType":"address","name":"_spender","type":"address"},{"internalType":"uint256","name":"_value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"type":"function"},
    {"constant":true,"inputs":[{"internalType":"address","name":"_owner","type":"address"},{"internalType":"address","name":"_spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"type":"function"}
];
