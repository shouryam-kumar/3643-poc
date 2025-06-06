import React, { useState, useEffect } from 'react';
import { useOkto } from '@okto_web3/react-sdk';
import { tokenTransfer, evmRawTransaction } from '@okto_web3/react-sdk/userop';
import { getChains, getTokens, getPortfolio } from '@okto_web3/react-sdk';
import bigInt from 'big-integer';
import './styles.css';

// Add BigInt polyfill
if (typeof BigInt === 'undefined') {
  global.BigInt = require('big-integer');
}

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

  // Data fetching
  useEffect(() => {
    const fetchChains = async () => {
      try {
        const chainsData = await getChains(oktoClient);
        setChains(chainsData);
      } catch (error) {
        console.error('Error fetching chains:', error);
        setError(`Failed to fetch chains: ${error.message}`);
      }
    };
    fetchChains();
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
        const filteredTokens = response
          .filter(token => token.caipId === selectedChain)
          .map(token => ({
            address: token.address,
            symbol: token.symbol,
            name: token.shortName || token.name,
            decimals: token.decimals,
            caipId: token.caipId,
          }));

        setTokens(filteredTokens);
      } catch (error) {
        console.error('Error fetching tokens:', error);
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
        setPortfolio(data);
      } catch (error) {
        console.error('Error fetching portfolio:', error);
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
  };

  // Token selection handler
  const handleTokenSelect = (symbol) => {
    console.log('Selected symbol:', symbol);
    console.log('Available tokens:', tokens);
    const token = tokens.find(t => t.symbol === symbol);
    console.log('Found token:', token);
    setSelectedToken(token || '');
  };

  // Add validateFormData function
  const validateFormData = () => {
    console.log('Validating form data:');
    console.log('Selected token:', selectedToken);
    console.log('Available tokens:', tokens);
    
    // If selectedToken is already a token object, use it directly
    const token = typeof selectedToken === 'object' ? selectedToken : tokens.find((t) => t.symbol === selectedToken);
    
    console.log('Token found:', token);
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

    console.log('Scaled amount string:', scaledAmountString);
    const amountInSmallestUnit = bigInt(scaledAmountString);
    console.log('Amount in smallest unit:', amountInSmallestUnit.toString());

    // For native token transfers, we need to use an empty string
    const tokenAddress = token.address || '';

    const transferParams = {
      amount: amountInSmallestUnit,
      recipient: recipient,
      token: tokenAddress,
      caip2Id: selectedChain,
    };

    console.log('Transfer parameters being sent to SDK:', transferParams);
    return transferParams;
  };

  // Update handleTransferToken to use evmRawTransaction for native token transfers
  const handleTransferToken = async () => {
    setLoading(true);
    setError(null);

    try {
      const transferParams = validateFormData();
      console.log("Transfer parameters being sent to SDK:", transferParams);

      // If it's a native token transfer (empty token address), use evmRawTransaction
      if (!transferParams.token) {
        const rawTxParams = {
          caip2Id: transferParams.caip2Id,
          transaction: {
            to: transferParams.recipient,
            value: transferParams.amount,
            data: '0x'
          }
        };
        console.log("Using raw transaction for native token:", rawTxParams);
        const jobId = await evmRawTransaction(oktoClient, rawTxParams);
        setJobId(jobId);
        showModal('jobId');
        console.log('Transfer jobId:', jobId);
      } else {
        // For ERC20 tokens, use tokenTransfer
        const userOp = await tokenTransfer(oktoClient, transferParams);
        const signedOp = await oktoClient.signUserOp(userOp);
        const jobId = await oktoClient.executeUserOp(signedOp);
        setJobId(jobId);
        showModal('jobId');
        console.log('Transfer jobId:', jobId);
      }
    } catch (error) {
      console.error('Error in token transfer:', error);
      setError(`Error in token transfer: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Update handleTokenTransferUserOp function
  const handleTokenTransferUserOp = async () => {
    setLoading(true);
    setError(null);

    try {
      const transferParams = validateFormData();
      console.log("Transfer parameters being sent to SDK:", transferParams);
      const userOp = await tokenTransfer(oktoClient, transferParams);
      setUserOp(userOp);
      showModal('unsignedOp');
      console.log('UserOp:', userOp);
    } catch (error) {
      console.error('Error in token transfer:', error);
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
      console.log('Signed UserOp', signedOp);
    } catch (error) {
      console.error('Error in signing the userop:', error);
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
      console.log('Job Id', jobId);
    } catch (error) {
      console.error('Error in executing the userop:', error);
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
            Amount (in smallest unit)
          </label>
          <input
            type="text"
            className="form-input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount in smallest unit (e.g., wei)"
            disabled={loading}
          />
          <small className="text-gray-400">
            {selectedToken &&
              tokens.find(t => t.symbol === selectedToken)?.decimals &&
              `This token has ${tokens.find(t => t.symbol === selectedToken)?.decimals} decimals`}
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
            disabled={loading || !selectedChain || !selectedToken || !amount || !recipient}
          >
            {loading ? "Processing..." : "Transfer Token (Direct)"}
          </button>
          <button
            className="btn btn-secondary w-full"
            onClick={handleTokenTransferUserOp}
            disabled={loading || !selectedChain || !selectedToken || !amount || !recipient}
          >
            {loading ? "Processing..." : "Create Token Transfer UserOp"}
          </button>
        </div>
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
            <p className="font-mono break-all">{jobId}</p>
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