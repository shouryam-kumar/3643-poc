import React, { useState, useEffect } from 'react';
import { useOkto } from '@okto_web3/react-sdk';
import { evmRawTransaction, getAccount } from '@okto_web3/react-sdk';
import bigInt from 'big-integer';
import './styles.css';

// Add BigInt polyfill
if (typeof BigInt === 'undefined') {
  global.BigInt = require('big-integer');
}

export default function RawTransaction() {
  const oktoClient = useOkto();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [accountDetails, setAccountDetails] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [formData, setFormData] = useState({
    to: '',
    value: '',
    data: '',
    caip2Id: 'eip155:1' // Default to Ethereum mainnet
  });

  // Check login status and fetch account details when component mounts or network changes
  useEffect(() => {
    const checkLoginAndFetchAccount = async () => {
      const loggedIn = oktoClient.isLoggedIn();
      console.log('Login status:', loggedIn);
      setIsLoggedIn(loggedIn);
      
      if (!loggedIn) {
        setError('Please log in to Okto first');
        return;
      }

      setLoading(true);
      setError('');
      try {
        console.log('Fetching account details for network:', formData.caip2Id);
        console.log('Okto client state:', {
          isLoggedIn: oktoClient.isLoggedIn(),
          userSWA: oktoClient.userSWA,
          clientSWA: oktoClient.clientSWA
        });

        const account = await getAccount(oktoClient);
        console.log('Account response:', account);
        
        if (account && account.address) {
          setUserAddress(account.address);
          setAccountDetails(account);
          setSuccess('Account details fetched successfully!');
          console.log('Set user address to:', account.address);
        } else {
          console.error('No address found in account response');
          setError('Unable to get account details. Please make sure you are logged in and try again.');
        }
      } catch (err) {
        console.error('Error getting account details:', err);
        setError('Error getting account details: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    checkLoginAndFetchAccount();
  }, [oktoClient, formData.caip2Id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setError('Please log in to Okto first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    if (!userAddress) {
      setError('Please wait for account details to load.');
      setLoading(false);
      return;
    }

    try {
      // Convert value to BigInt properly
      let value;
      try {
        value = bigInt(formData.value || '0');
      } catch (err) {
        throw new Error('Invalid value amount. Please enter a valid number.');
      }

      const rawTxParams = {
        caip2Id: formData.caip2Id,
        from: userAddress,
        transaction: {
          to: formData.to,
          data: formData.data || '0x',
          value: value
        }
      };

      console.log('Sending raw transaction with params:', rawTxParams);
      const jobId = await evmRawTransaction(oktoClient, rawTxParams);
      setSuccess(`Transaction initiated! Job ID: ${jobId}`);
      setFormData({
        to: '',
        value: '',
        data: '',
        caip2Id: 'eip155:1'
      });
    } catch (err) {
      console.error('Transaction error:', err);
      setError(err.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="card-dark p-xl mb-xl">
        <h2 className="text-xl font-bold text-white mb-lg flex items-center">
          <span className="mr-md">📝</span> Raw Transaction
        </h2>
        <div className="status-message error">
          Please log in to Okto first to use this feature.
        </div>
      </div>
    );
  }

  return (
    <div className="card-dark p-xl mb-xl">
      <h2 className="text-xl font-bold text-white mb-lg flex items-center">
        <span className="mr-md">📝</span> Raw Transaction
      </h2>

      {accountDetails && (
        <div className="p-4 bg-gray-800 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">Account Details</h3>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-400">Network:</p>
              <p className="text-white font-mono text-sm">{formData.caip2Id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Address:</p>
              <p className="text-white font-mono text-sm break-all">{userAddress}</p>
            </div>
            {accountDetails.balance && (
              <div>
                <p className="text-sm text-gray-400">Balance:</p>
                <p className="text-white font-mono text-sm">{accountDetails.balance}</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-group">
          <label className="form-label">Network (CAIP-2 ID)</label>
          <select
            name="caip2Id"
            value={formData.caip2Id}
            onChange={handleInputChange}
            className="form-select"
          >
            <option value="eip155:1">Ethereum Mainnet</option>
            <option value="eip155:137">Polygon</option>
            <option value="eip155:56">BSC</option>
            <option value="eip155:42161">Arbitrum</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">To Address</label>
          <input
            type="text"
            name="to"
            value={formData.to}
            onChange={handleInputChange}
            placeholder="0x..."
            className="form-input"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Value (in wei)</label>
          <input
            type="text"
            name="value"
            value={formData.value}
            onChange={handleInputChange}
            placeholder="Enter value in wei"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Transaction Data (hex)</label>
          <textarea
            name="data"
            value={formData.data}
            onChange={handleInputChange}
            placeholder="0x..."
            className="form-textarea"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !userAddress}
          className="btn btn-primary w-full"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <span className="loading-spinner mr-2"></span>
              Processing...
            </span>
          ) : (
            'Send Transaction'
          )}
        </button>
      </form>

      {error && (
        <div className="status-message error">
          {error}
        </div>
      )}

      {success && (
        <div className="status-message success">
          {success}
        </div>
      )}
    </div>
  );
} 