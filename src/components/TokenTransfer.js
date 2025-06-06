import React, { useState, useEffect } from 'react';
import { useOkto } from '@okto_web3/react-sdk';
import { tokenTransfer, evmRawTransaction } from '@okto_web3/react-sdk/userop';
import { getChains, getTokens, getPortfolio, getAccount } from '@okto_web3/react-sdk';
import bigInt from 'big-integer';
import './styles.css';

// Add BigInt polyfill
if (typeof BigInt === 'undefined') {
  global.BigInt = require('big-integer');
}

// Ensure we use native BigInt when available
const createBigInt = (value) => {
  // Use window.BigInt or global BigInt to avoid ESLint errors
  const NativeBigInt = (typeof window !== 'undefined' && window.BigInt) || 
                       (typeof global !== 'undefined' && global.BigInt);
  
  if (NativeBigInt && typeof NativeBigInt === 'function') {
    return NativeBigInt(value);
  } else {
    return bigInt(value);
  }
};

// Modal Component
const Modal = ({ isOpen, onClose, title, children }) =>
  !isOpen ? null : (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );

export default function TokenTransfer() {
  const oktoClient = useOkto();
  
  // Form state
  const [chains, setChains] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [accounts, setAccounts] = useState([]); // Add accounts state
  const [selectedChain, setSelectedChain] = useState('');
  const [selectedToken, setSelectedToken] = useState('');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [sponsorshipEnabled, setSponsorshipEnabled] = useState(false);

  // Transaction state
  const [jobId, setJobId] = useState(null);
  const [userOp, setUserOp] = useState(null);
  const [signedUserOp, setSignedUserOp] = useState(null);
  const [orderHistory, setOrderHistory] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingTokens, setLoadingTokens] = useState(false);

  // Modal states
  const [activeModal, setActiveModal] = useState(null);

  // Helper functions
  const showModal = (modal) => setActiveModal(modal);
  const closeAllModals = () => setActiveModal(null);

  const resetForm = () => {
    setSelectedToken('');
    setAmount('');
    setRecipient('');
    setUserOp(null);
    setSignedUserOp(null);
    setJobId(null);
    setOrderHistory(null);
    setError(null);
    closeAllModals();
  };

  // FIXED: More robust network-specific account address finder
  const getNetworkAccountAddress = (caip2Id) => {
    console.log('🔍 ROBUST SEARCH - Looking for account with caip2Id:', caip2Id);
    console.log('🔍 ROBUST SEARCH - Available accounts:', accounts);
    
    if (!accounts || accounts.length === 0) {
      console.warn('❌ No accounts available');
      return null;
    }
    
    // Try multiple search strategies
    
    // Strategy 1: Exact match
    let networkAccount = accounts.find(account => account.caipId === caip2Id);
    if (networkAccount) {
      console.log('✅ STRATEGY 1 (Exact) - Found account:', networkAccount);
      return networkAccount.address;
    }
    
    // Strategy 2: Try with different case
    networkAccount = accounts.find(account => 
      account.caipId && account.caipId.toLowerCase() === caip2Id.toLowerCase()
    );
    if (networkAccount) {
      console.log('✅ STRATEGY 2 (Case) - Found account:', networkAccount);
      return networkAccount.address;
    }
    
    // Strategy 3: Extract chain ID and try to match by chainId field
    const chainIdFromCaip = caip2Id.split(':')[1]; // Extract "137" from "eip155:137"
    networkAccount = accounts.find(account => 
      account.chainId === chainIdFromCaip || 
      (account.caipId && account.caipId.includes(chainIdFromCaip))
    );
    if (networkAccount) {
      console.log('✅ STRATEGY 3 (ChainID) - Found account:', networkAccount);
      return networkAccount.address;
    }
    
    // Strategy 4: Match by network name
    const chainObj = chains.find(chain => chain.caipId === caip2Id);
    if (chainObj) {
      networkAccount = accounts.find(account => 
        account.networkName === chainObj.networkName ||
        account.networkSymbol === chainObj.networkName
      );
      if (networkAccount) {
        console.log('✅ STRATEGY 4 (Network Name) - Found account:', networkAccount);
        return networkAccount.address;
      }
    }
    
    // Strategy 5: Log all possible matches for debugging
    console.log('🔍 DEBUGGING INFO:');
    console.log('Target caip2Id:', caip2Id);
    accounts.forEach((account, index) => {
      console.log(`Account ${index}:`, {
        caipId: account.caipId,
        chainId: account.chainId,
        networkName: account.networkName,
        networkSymbol: account.networkSymbol,
        address: account.address
      });
    });
    
    console.warn(`❌ No account found for network ${caip2Id} using any strategy`);
    return null;
  };

  // Data fetching
  useEffect(() => {
    const fetchChains = async () => {
      try {
        const chainsResponse = await getChains(oktoClient);
        console.log('📡 Chains response:', chainsResponse);
        
        // Handle different response formats
        let chainsData = [];
        if (chainsResponse?.data?.network) {
          chainsData = chainsResponse.data.network;
        } else if (chainsResponse?.network) {
          chainsData = chainsResponse.network;
        } else if (Array.isArray(chainsResponse)) {
          chainsData = chainsResponse;
        } else {
          console.warn('Unexpected chains response format:', chainsResponse);
        }
        
        console.log('🔗 Processed chains:', chainsData);
        setChains(chainsData);
      } catch (error) {
        console.error('❌ Error fetching chains:', error);
        setError(`Failed to fetch chains: ${error.message}`);
      }
    };
    fetchChains();
  }, [oktoClient]);

  // FIXED: Enhanced account fetching with better error handling
  useEffect(() => {
    const fetchAccounts = async () => {
      if (!oktoClient.isLoggedIn()) {
        console.log('⚠️ Not logged in, skipping account fetch');
        return;
      }
      
      try {
        console.log('📡 Fetching user accounts...');
        const accountsResponse = await getAccount(oktoClient);
        console.log('📡 Raw accounts response:', accountsResponse);
        
        // Handle different response formats more robustly
        let accountsList = [];
        if (accountsResponse?.data) {
          accountsList = Array.isArray(accountsResponse.data) ? accountsResponse.data : [accountsResponse.data];
        } else if (Array.isArray(accountsResponse)) {
          accountsList = accountsResponse;
        } else if (accountsResponse?.accounts) {
          accountsList = accountsResponse.accounts;
        } else if (accountsResponse?.result) {
          accountsList = Array.isArray(accountsResponse.result) ? accountsResponse.result : [accountsResponse.result];
        } else {
          console.warn('⚠️ Unexpected accounts response format:', accountsResponse);
          accountsList = [];
        }
        
        console.log('✅ Processed accounts list:', accountsList);
        setAccounts(accountsList);
        
        // Debug: Show what accounts we have
        if (accountsList.length > 0) {
          console.log('🔍 Available accounts breakdown:');
          accountsList.forEach((account, index) => {
            console.log(`Account ${index + 1}:`, {
              caipId: account.caipId,
              networkName: account.networkName,
              address: account.address,
              networkSymbol: account.networkSymbol
            });
          });
        }
        
      } catch (error) {
        console.error('❌ Error fetching accounts:', error);
        setError(`Failed to fetch accounts: ${error.message}`);
      }
    };
    
    fetchAccounts();
  }, [oktoClient]);

  useEffect(() => {
    const fetchTokens = async () => {
      if (!selectedChain) {
        setTokens([]);
        return;
      }

      setLoadingTokens(true);
      setError(null);

      try {
        const response = await getTokens(oktoClient);
        console.log('🪙 All tokens response:', response);
        
        // Handle different response formats
        let tokensData = [];
        if (response?.data?.tokens) {
          tokensData = response.data.tokens;
        } else if (response?.tokens) {
          tokensData = response.tokens;
        } else if (Array.isArray(response)) {
          tokensData = response;
        } else {
          console.warn('Unexpected tokens response format:', response);
          tokensData = [];
        }
        
        const filteredTokens = tokensData
          .filter(token => token.caipId === selectedChain)
          .map(token => ({
            address: token.address,
            symbol: token.symbol,
            name: token.shortName || token.name,
            decimals: token.decimals,
            caipId: token.caipId,
          }));

        console.log('🪙 Filtered tokens for network:', filteredTokens);
        setTokens(filteredTokens);
      } catch (error) {
        console.error('❌ Error fetching tokens:', error);
        setError(`Failed to fetch tokens: ${error.message}`);
      } finally {
        setLoadingTokens(false);
      }
    };

    fetchTokens();
  }, [selectedChain, oktoClient]);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const data = await getPortfolio(oktoClient);
        console.log('💰 Portfolio data:', data);
        setPortfolio(data);
      } catch (error) {
        console.error('❌ Error fetching portfolio:', error);
        setError(`Failed to fetch portfolio: ${error.message}`);
      }
    };

    fetchPortfolio();
  }, [oktoClient]);

  // Network change handler
  const handleNetworkChange = (e) => {
    const selectedCaipId = e.target.value;
    setSelectedChain(selectedCaipId);
    setSelectedToken('');
    
    const selectedChainObj = chains.find(chain => chain.caipId === selectedCaipId);
    setSponsorshipEnabled(selectedChainObj?.sponsorshipEnabled || false);
    
    // Log the network-specific account for this network
    const networkAddress = getNetworkAccountAddress(selectedCaipId);
    console.log(`🌐 Network address for ${selectedCaipId}:`, networkAddress);
  };

  // Token selection handler
  const handleTokenSelect = (symbol) => {
    console.log('🪙 Selected symbol:', symbol);
    console.log('🪙 Available tokens:', tokens);
    const token = tokens.find(t => t.symbol === symbol);
    console.log('🪙 Found token:', token);
    setSelectedToken(token || '');
  };

  // Enhanced validateFormData function with proper address handling
  const validateFormData = () => {
    console.log('=== 🔍 VALIDATION START ===');
    console.log('Selected chain:', selectedChain);
    console.log('Selected token:', selectedToken);
    console.log('Amount:', amount);
    console.log('Recipient:', recipient);
    console.log('Available accounts:', accounts);
    
    // Get network-specific account address
    const fromAddress = getNetworkAccountAddress(selectedChain);
    if (!fromAddress) {
      throw new Error(`No account found for network ${selectedChain}. Please ensure you have an account on this network.`);
    }
    
    console.log('✅ Using from address:', fromAddress);
    
    // If selectedToken is already a token object, use it directly
    const token = typeof selectedToken === 'object' ? selectedToken : tokens.find((t) => t.symbol === selectedToken);
    
    console.log('🪙 Token found:', token);
    if (!token) throw new Error("Please select a valid token");
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      throw new Error("Please enter a valid amount");
    if (!recipient || !recipient.startsWith("0x"))
      throw new Error("Please enter a valid recipient address");

    // Convert decimal amount to smallest unit
    const amountString = amount.toString();
    const decimalPointIndex = amountString.indexOf('.');
    let scaledAmountString;

    if (decimalPointIndex === -1) {
      // No decimal point, just append zeros for decimals
      scaledAmountString = amountString + '0'.repeat(token.decimals);
    } else {
      // Handle decimal part
      const integerPart = amountString.substring(0, decimalPointIndex);
      const decimalPart = amountString.substring(decimalPointIndex + 1);

      if (decimalPart.length > token.decimals) {
        throw new Error(`Amount has more decimal places (${decimalPart.length}) than the token supports (${token.decimals})`);
      }

      // Combine integer and decimal parts, padding decimal part if necessary
      scaledAmountString = integerPart + decimalPart.padEnd(token.decimals, '0');
    }

    console.log('💰 Scaled amount string:', scaledAmountString);
    
    // Convert to proper JavaScript BigInt
    const amountInSmallestUnit = createBigInt(scaledAmountString);
    console.log('💰 Amount in smallest unit (BigInt):', amountInSmallestUnit.toString());
    console.log('💰 Amount type:', typeof amountInSmallestUnit);

    // For native token transfers, we need to use an empty string
    const tokenAddress = token.address || '';

    const transferParams = {
      amount: amountInSmallestUnit,
      recipient: recipient,
      token: tokenAddress,
      caip2Id: selectedChain,
      from: fromAddress, // Add the network-specific from address
    };

    console.log('=== ✅ FINAL TRANSFER PARAMETERS ===');
    console.log('Transfer parameters being sent to SDK:', transferParams);
    console.log('=== 🔍 VALIDATION END ===');
    
    return transferParams;
  };

  // Updated handleTransferToken with correct Okto API format
  const handleTransferToken = async () => {
    setLoading(true);
    setError(null);

    try {
      const transferParams = validateFormData();
      console.log("=== 🚀 TRANSFER START ===");
      console.log("Transfer parameters being sent to SDK:", transferParams);

      // Use the official Okto tokenTransfer API format
      console.log("🪙 Using official tokenTransfer API");
      const oktoTransferParams = {
        amount: transferParams.amount, // Native JavaScript BigInt
        recipient: transferParams.recipient,
        token: transferParams.token, // Empty string for native tokens, contract address for ERC20
        caip2Id: transferParams.caip2Id
      };
      
      console.log("📝 Official Okto transfer parameters:");
      console.log("- amount:", oktoTransferParams.amount.toString(), "(type:", typeof oktoTransferParams.amount, ")");
      console.log("- recipient:", oktoTransferParams.recipient);
      console.log("- token:", oktoTransferParams.token || '(empty for native)');
      console.log("- caip2Id:", oktoTransferParams.caip2Id);
      
      // Check if sponsorship is enabled for fee payer
      const selectedChainObj = chains.find(chain => chain.caipId === selectedChain);
      const feePayerAddress = selectedChainObj?.sponsorshipEnabled ? transferParams.from : undefined;
      
      console.log("💰 Fee payer address:", feePayerAddress || "Not using sponsorship");
      
      // Execute the transfer using official API
      const result = await tokenTransfer(oktoClient, oktoTransferParams, feePayerAddress);
      
      console.log('✅ Transfer result:', result);
      console.log('✅ Result type:', typeof result);
      
      // Handle different response types
      if (typeof result === 'string') {
        // Direct job ID
        setJobId(result);
        showModal('jobId');
        console.log('✅ Transfer jobId:', result);
      } else if (result && typeof result === 'object') {
        // UserOperation object - need to sign and execute
        console.log('📝 Received UserOperation, need to sign and execute');
        setUserOp(result);
        
        try {
          const signedOp = await oktoClient.signUserOp(result);
          const jobId = await oktoClient.executeUserOp(signedOp);
          setJobId(jobId);
          showModal('jobId');
          console.log('✅ Final transfer jobId:', jobId);
        } catch (signError) {
          console.error('❌ Error signing/executing UserOp:', signError);
          setError(`Error completing transfer: ${signError.message}`);
        }
      } else {
        console.warn('⚠️ Unexpected result format:', result);
        setError('Transfer completed but received unexpected response format');
      }
      
      // Clear form on success
      setAmount('');
      setRecipient('');
      
    } catch (error) {
      console.error('=== ❌ TRANSFER ERROR ===');
      console.error('Error in token transfer:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      setError(`Error in token transfer: ${error.message}`);
    } finally {
      setLoading(false);
      console.log("=== 🚀 TRANSFER END ===");
    }
  };

  // Update handleTokenTransferUserOp to use official API format
  const handleTokenTransferUserOp = async () => {
    setLoading(true);
    setError(null);

    try {
      const transferParams = validateFormData();
      console.log("🔄 Creating UserOp with official API format:", transferParams);
      
      const oktoTransferParams = {
        amount: transferParams.amount, // BigInt amount
        recipient: transferParams.recipient,
        token: transferParams.token, // Empty string for native, contract address for ERC20
        caip2Id: transferParams.caip2Id
      };
      
      console.log("📝 Official Okto UserOp parameters:", oktoTransferParams);
      
      // For UserOp workflow, we don't use feePayerAddress in the initial call
      const userOp = await tokenTransfer(oktoClient, oktoTransferParams);
      setUserOp(userOp);
      showModal('unsignedOp');
      console.log('✅ UserOp:', userOp);
    } catch (error) {
      console.error('❌ Error in creating user operation:', error);
      setError(`Error in creating user operation: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUserOp = async () => {
    if (!userOp) {
      setError('No transaction to sign');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const signedOp = await oktoClient.signUserOp(userOp);
      setSignedUserOp(signedOp);
      showModal('signedOp');
      console.log('✅ Signed UserOp', signedOp);
    } catch (error) {
      console.error('❌ Error in signing the userop:', error);
      setError(`Error in signing transaction: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteUserOp = async () => {
    if (!signedUserOp) {
      setError('No signed transaction to execute');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const jobId = await oktoClient.executeUserOp(signedUserOp);
      setJobId(jobId);
      showModal('jobId');
      console.log('✅ Job Id', jobId);
    } catch (error) {
      console.error('❌ Error in executing the userop:', error);
      setError(`Error in executing transaction: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-dark p-xl mb-xl">
      <h2 className="text-xl font-bold text-white mb-lg flex items-center">
        <span className="mr-md">💸</span> Token Transfer
      </h2>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-100 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Enhanced Debug Info - Show current network account */}
      {selectedChain && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
          <h4 className="text-blue-400 font-semibold mb-2">🔍 Network Account Info</h4>
          <div className="text-sm text-gray-300 space-y-1">
            <p><strong>Selected Network:</strong> {selectedChain}</p>
            <p><strong>Account Address:</strong> 
              <span className={getNetworkAccountAddress(selectedChain) ? 'text-green-400' : 'text-red-400'}>
                {getNetworkAccountAddress(selectedChain) || 'Not found'}
              </span>
            </p>
            <p><strong>Available Accounts:</strong> {accounts.length}</p>
            {accounts.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-blue-400">View All Accounts</summary>
                <div className="mt-2 bg-gray-800/50 p-2 rounded text-xs max-h-40 overflow-y-auto">
                  {accounts.map((account, index) => (
                    <div key={index} className="mb-2 p-2 bg-gray-700/50 rounded">
                      <div><strong>CAIP ID:</strong> {account.caipId}</div>
                      <div><strong>Network:</strong> {account.networkName}</div>
                      <div><strong>Address:</strong> {account.address}</div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Network Selection */}
        <div className="form-group">
          <label className="form-label">
            Select Network
          </label>
          <select
            className="form-select"
            value={selectedChain}
            onChange={handleNetworkChange}
            disabled={loading}
          >
            <option value="" disabled>Select a network</option>
            {chains.map(chain => (
              <option key={chain.chainId} value={chain.caipId}>
                {chain.networkName} ({chain.caipId})
              </option>
            ))}
          </select>
        </div>

        {selectedChain && (
          <div className={`network-info ${sponsorshipEnabled ? 'success' : 'warning'}`}>
            {sponsorshipEnabled
              ? "Gas sponsorship is available ✅"
              : "⚠️ Sponsorship is not activated for this chain, the user must hold native tokens to proceed with the transfer."}
          </div>
        )}

        {/* Token Selection */}
        <div className="form-group">
          <label className="form-label">
            Select Token
          </label>
          <select
            className="form-select"
            value={typeof selectedToken === 'object' ? selectedToken.symbol : selectedToken}
            onChange={(e) => handleTokenSelect(e.target.value)}
            disabled={loading || loadingTokens || !selectedChain}
          >
            <option value="" disabled>
              {loadingTokens
                ? "Loading tokens..."
                : !selectedChain
                ? "Select a network first"
                : tokens.length === 0
                ? "No tokens available"
                : "Select a token"}
            </option>
            {tokens.map(token => (
              <option key={`${token.caipId}-${token.address}`} value={token.symbol}>
                {token.symbol} - {token.address || "native"}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Field */}
        <div className="form-group">
          <label className="form-label">
            Amount
          </label>
          <input
            type="text"
            className="form-input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="enter in token value, for ex 0.1 PL"
            disabled={loading}
          />
          <small className="text-gray-400">
            {selectedToken &&
              tokens.find(t => t.symbol === (typeof selectedToken === 'object' ? selectedToken.symbol : selectedToken))?.decimals &&
              `This token has ${tokens.find(t => t.symbol === (typeof selectedToken === 'object' ? selectedToken.symbol : selectedToken))?.decimals} decimals`}
          </small>
        </div>

        {/* Recipient Address */}
        <div className="form-group">
          <label className="form-label">
            Recipient Address
          </label>
          <input
            type="text"
            className="form-input"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            disabled={loading}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-2">
          <button
            className="btn btn-primary w-full"
            onClick={handleTransferToken}
            disabled={loading || !selectedChain || !selectedToken || !amount || !recipient || !getNetworkAccountAddress(selectedChain)}
          >
            {loading ? "Processing..." : "Transfer Token (Direct)"}
          </button>
          <button
            className="btn btn-secondary w-full"
            onClick={handleTokenTransferUserOp}
            disabled={loading || !selectedChain || !selectedToken || !amount || !recipient || !getNetworkAccountAddress(selectedChain)}
          >
            {loading ? "Processing..." : "Create Token Transfer UserOp"}
          </button>
        </div>

        {/* Validation Warning */}
        {selectedChain && !getNetworkAccountAddress(selectedChain) && (
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-yellow-400 font-semibold">⚠️ No Account Found</p>
            <p className="text-yellow-300 text-sm">
              No account found for the selected network. Please ensure you have an account on {selectedChain}.
            </p>
            <details className="mt-2">
              <summary className="cursor-pointer text-yellow-400 text-sm">Debug Info</summary>
              <div className="mt-2 text-xs text-yellow-200">
                <p>Searched for: {selectedChain}</p>
                <p>Available accounts: {accounts.length}</p>
                {accounts.map((acc, idx) => (
                  <p key={idx}>Account {idx + 1}: {acc.caipId} → {acc.address}</p>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal
        isOpen={activeModal === 'jobId'}
        onClose={() => showModal('orderHistory')}
        title="Transaction Submitted"
      >
        <div className="space-y-4 text-white">
          <p>Your transaction has been submitted successfully.</p>
          <div className="bg-gray-700 p-3 rounded">
            <p className="text-sm text-gray-300 mb-1">Job ID:</p>
            <p className="font-mono break-all text-green-400">{jobId}</p>
          </div>
          <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3">
            <p className="text-blue-400 text-sm">
              ✅ Transaction sent to blockchain! You can track this transaction using the Job ID above.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={activeModal === 'unsignedOp'}
        onClose={closeAllModals}
        title="Review Transaction"
      >
        <div className="space-y-4 text-white">
          <p>Please review your transaction details before signing.</p>
          <div className="bg-gray-700 p-3 rounded">
            <p className="text-sm text-gray-300 mb-1">Transaction Details:</p>
            <div className="bg-gray-900 p-2 rounded font-mono text-sm overflow-auto max-h-40">
              <pre>{JSON.stringify(userOp, null, 2)}</pre>
            </div>
          </div>
          <div className="flex justify-center pt-2">
            <button
              className="btn btn-primary w-full"
              onClick={handleSignUserOp}
              disabled={loading}
            >
              {loading ? "Signing..." : "Sign Transaction"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={activeModal === 'signedOp'}
        onClose={closeAllModals}
        title="Sign Completed"
      >
        <div className="space-y-4 text-white">
          <p>Your transaction has been signed successfully and is ready to be executed.</p>
          <div className="bg-gray-700 p-3 rounded">
            <p className="text-sm text-gray-300 mb-1">Signed Transaction:</p>
            <div className="bg-gray-900 p-2 rounded font-mono text-sm overflow-auto max-h-40">
              <pre>{JSON.stringify(signedUserOp, null, 2)}</pre>
            </div>
          </div>
          <div className="flex justify-center pt-2">
            <button
              className="btn btn-primary w-full"
              onClick={handleExecuteUserOp}
              disabled={loading}
            >
              {loading ? "Executing..." : "Execute Transaction"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}