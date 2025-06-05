// src/Homepage.js - ERC-3643 Token Operations with Okto Wallet
import {
    getAccount,
    getPortfolio,
    getTokens,
    useOkto,
    tokenTransfer,
    evmRawTransaction,
    getNftCollections,
    getChains,
  } from "@okto_web3/react-sdk";
  import { googleLogout } from "@react-oauth/google";
  import { useState, useEffect } from "react";
  import { useNavigate } from "react-router-dom";
  import { ethers } from "ethers";
  
  // ERC-3643 Token ABI for transfer function
  const ERC3643_ABI = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)",
  ];
  
  export default function Homepage() {
    const oktoClient = useOkto();
    const navigate = useNavigate();
    const [results, setResults] = useState({});
    const [loading, setLoading] = useState({});
    const [transferAmount, setTransferAmount] = useState('');
    const [recipientAddress, setRecipientAddress] = useState('');
    const [tokenAddress, setTokenAddress] = useState('');
    const [tokenDetails, setTokenDetails] = useState(null);
    const [error, setError] = useState(null);
    const [accountInfo, setAccountInfo] = useState(null);
    const [specificAddress, setSpecificAddress] = useState('0x9a8464290456f85843451b2Ed13D580188D008fB');
  
    const isLoggedIn = oktoClient.isLoggedIn();
    const userSWA = oktoClient.userSWA;
    const clientSWA = oktoClient.clientSWA;
  
    // Initialize Okto client
    useEffect(() => {
      const initializeOkto = async () => {
        try {
          if (oktoClient && oktoClient.axiosInstance) {
            // Set up request interceptor for paymaster
            const interceptor = oktoClient.axiosInstance.interceptors.request.use(
              (config) => {
                if (config.data && config.data.session) {
                  config.data.paymaster = "0x74324fA6Fa67b833dfdea4C1b3A9898574d076e3";
                }
                return config;
              },
              (error) => {
                return Promise.reject(error);
              }
            );

            return () => {
              if (interceptor) {
                oktoClient.axiosInstance.interceptors.request.eject(interceptor);
              }
            };
          }
        } catch (error) {
          console.error('Error initializing Okto:', error);
          setError('Failed to initialize Okto client');
        }
      };

      initializeOkto();
    }, [oktoClient]);
  
    // Handles user logout process
    async function handleLogout() {
      try {
        console.log('🔄 Logging out...');
        
        // Perform Google OAuth logout and remove stored token
        googleLogout();
        oktoClient.sessionClear();
        localStorage.removeItem("googleIdToken");
        localStorage.removeItem("okto_session");
        
        console.log('✅ Logout successful');
        navigate("/");
        return { result: "logout success" };
      } catch (error) {
        console.error("❌ Logout failed:", error);
        return { result: "logout failed" };
      }
    }
  
    // Generic function to handle API calls with loading states
    const handleApiCall = async (apiFunction, functionName) => {
      setLoading(prev => ({ ...prev, [functionName]: true }));
      setError(null);
      try {
        const result = await apiFunction(oktoClient);
        setResults(prev => ({ ...prev, [functionName]: result }));
        console.log(`${functionName} result:`, result);
        return { result };
      } catch (error) {
        console.error(`${functionName} error:`, error);
        const errorResult = { error: error.message };
        setResults(prev => ({ ...prev, [functionName]: errorResult }));
        setError(error.message);
        return errorResult;
      } finally {
        setLoading(prev => ({ ...prev, [functionName]: false }));
      }
    };
  
    // Handle token transfer
    const handleTokenTransfer = async () => {
      if (!transferAmount || !recipientAddress || !tokenAddress) {
        setError('Please enter amount, recipient address, and token address');
        return;
      }
  
      setLoading(prev => ({ ...prev, transfer: true }));
      setError(null);
      try {
        // Create contract instance
        const provider = new ethers.JsonRpcProvider(process.env.REACT_APP_RPC_URL);
        const contract = new ethers.Contract(tokenAddress, ERC3643_ABI, provider);
        
        // Get token decimals
        const decimals = await contract.decimals();
        
        // Convert amount to wei
        const amount = ethers.parseUnits(transferAmount, decimals);
        
        // Execute token transfer through Okto
        const tx = await tokenTransfer(oktoClient, {
          tokenAddress,
          to: recipientAddress,
          amount: amount.toString(),
        });
  
        console.log('Transfer transaction:', tx);
        setError(null);
        alert('Transfer initiated! Transaction hash: ' + tx.hash);
        
        // Refresh portfolio after transfer
        await handleApiCall(getPortfolio, 'portfolio');
        
      } catch (error) {
        console.error('Transfer error:', error);
        setError('Transfer failed: ' + error.message);
      } finally {
        setLoading(prev => ({ ...prev, transfer: false }));
      }
    };
  
    // Handle raw transaction
    const handleRawTransaction = async () => {
      if (!transferAmount || !recipientAddress || !tokenAddress) {
        setError('Please enter amount, recipient address, and token address');
        return;
      }
  
      setLoading(prev => ({ ...prev, rawTx: true }));
      setError(null);
      try {
        // Create contract instance
        const provider = new ethers.JsonRpcProvider(process.env.REACT_APP_RPC_URL);
        const contract = new ethers.Contract(tokenAddress, ERC3643_ABI, provider);
        
        // Get token decimals
        const decimals = await contract.decimals();
        
        // Convert amount to wei
        const amount = ethers.parseUnits(transferAmount, decimals);
        
        // Create transfer transaction
        const transferData = contract.interface.encodeFunctionData("transfer", [
          recipientAddress,
          amount
        ]);
  
        // Execute raw transaction through Okto
        const tx = await evmRawTransaction(oktoClient, {
          to: tokenAddress,
          data: transferData,
          value: "0x0", // No ETH being sent
        });
  
        console.log('Raw transaction:', tx);
        setError(null);
        alert('Transaction initiated! Transaction hash: ' + tx.hash);
        
        // Refresh portfolio after transfer
        await handleApiCall(getPortfolio, 'portfolio');
        
      } catch (error) {
        console.error('Raw transaction error:', error);
        setError('Transaction failed: ' + error.message);
      } finally {
        setLoading(prev => ({ ...prev, rawTx: false }));
      }
    };
  
    // Check token details
    const checkTokenDetails = async () => {
      if (!tokenAddress) {
        setError('Please enter token address');
        return;
      }

      setLoading(prev => ({ ...prev, tokenCheck: true }));
      setError(null);
      try {
        // Get all tokens
        const tokens = await getTokens(oktoClient);
        console.log('All tokens:', tokens);

        // Get portfolio
        const portfolio = await getPortfolio(oktoClient);
        console.log('Portfolio:', portfolio);

        // Get NFT collections
        const nftCollections = await getNftCollections(oktoClient);
        console.log('NFT Collections:', nftCollections);

        // Get chains
        const chains = await getChains(oktoClient);
        console.log('Available chains:', chains);

        setTokenDetails({
          tokens,
          portfolio,
          nftCollections,
          chains
        });
        setError(null);
      } catch (error) {
        console.error('Error checking token details:', error);
        setError('Error checking token details: ' + error.message);
      } finally {
        setLoading(prev => ({ ...prev, tokenCheck: false }));
      }
    };
  
    // Add function to get account info
    const handleGetAccount = async () => {
      setLoading(prev => ({ ...prev, account: true }));
      setError(null);
      try {
        const account = await getAccount(oktoClient);
        console.log('Account info:', account);
        setAccountInfo(account);
      } catch (error) {
        console.error('Error getting account:', error);
        setError('Failed to get account info: ' + error.message);
      } finally {
        setLoading(prev => ({ ...prev, account: false }));
      }
    };
  
    // Add function to check specific address portfolio
    const checkSpecificAddressPortfolio = async () => {
      setLoading(prev => ({ ...prev, specificPortfolio: true }));
      setError(null);
      try {
        // Get portfolio for specific address
        const portfolio = await getPortfolio(oktoClient, {
          address: specificAddress
        });
        console.log('Portfolio for address:', specificAddress, portfolio);
        setResults(prev => ({ ...prev, specificPortfolio: portfolio }));
      } catch (error) {
        console.error('Error getting portfolio:', error);
        setError('Failed to get portfolio: ' + error.message);
      } finally {
        setLoading(prev => ({ ...prev, specificPortfolio: false }));
      }
    };
  
    return (
      <main className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-10">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-600">{error}</p>
            </div>
          )}
  
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              🚀 ERC-3643 Token Operations
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Manage your ERC-3643 tokens with Okto's embedded wallet
            </p>
          </div>
  
          {/* Account Information */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-violet-100">
            <h2 className="text-2xl font-bold text-violet-900 mb-6">👤 Account Information</h2>
            <div className="space-y-4">
              <button
                onClick={handleGetAccount}
                disabled={loading.account}
                className="w-full p-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading.account ? 'Loading...' : 'Get Account Info'}
              </button>

              {accountInfo && (
                <div className="mt-6 p-6 bg-gray-50 rounded-xl">
                  <h3 className="font-semibold text-violet-900 mb-4">Account Details:</h3>
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                    {JSON.stringify(accountInfo, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
  
          {/* Wallet Status */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-violet-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-violet-900 mb-2">👤 Wallet Status</h2>
                <div className="space-y-2">
                  <p className="text-gray-600">
                    <span className="font-semibold">Status:</span>{" "}
                    <span className={`px-2 py-1 rounded-full text-sm ${isLoggedIn ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {isLoggedIn ? 'Connected' : 'Disconnected'}
                    </span>
                  </p>
                  {isLoggedIn && (
                    <p className="text-gray-600">
                      <span className="font-semibold">Wallet Address:</span>{" "}
                      <span className="font-mono text-sm">{userSWA}</span>
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleLogout()}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
  
          {/* Portfolio Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-violet-100">
            <h2 className="text-2xl font-bold text-violet-900 mb-6">💰 Portfolio</h2>
            <div className="space-y-4">
              <button
                onClick={() => handleApiCall(getPortfolio, 'portfolio')}
                className="w-full p-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading.portfolio}
              >
                {loading.portfolio ? 'Loading...' : 'Refresh Portfolio'}
              </button>
              
              {results.portfolio && (
                <div className="mt-6 p-6 bg-gray-50 rounded-xl">
                  <h3 className="font-semibold text-violet-900 mb-4">Token Balances:</h3>
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                    {JSON.stringify(results.portfolio, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
  
          {/* Token Transfer Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-violet-100">
            <h2 className="text-2xl font-bold text-violet-900 mb-6">🔄 Token Transfer</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Token Contract Address
                </label>
                <input
                  type="text"
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="0x..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="0x..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="0.0"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={handleTokenTransfer}
                  disabled={loading.transfer}
                  className="p-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading.transfer ? 'Processing...' : 'Transfer Tokens'}
                </button>
                
                <button
                  onClick={handleRawTransaction}
                  disabled={loading.rawTx}
                  className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading.rawTx ? 'Processing...' : 'Execute Raw Transaction'}
                </button>
              </div>
            </div>
          </div>
  
          {/* Token Details Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-violet-100">
            <h2 className="text-2xl font-bold text-violet-900 mb-6">🔍 Token Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Token Contract Address
                </label>
                <input
                  type="text"
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="0x..."
                />
              </div>

              <button
                onClick={checkTokenDetails}
                disabled={loading.tokenCheck}
                className="w-full p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading.tokenCheck ? 'Checking...' : 'Check Token Details'}
              </button>

              {tokenDetails && (
                <div className="mt-6 space-y-6">
                  <div className="p-6 bg-gray-50 rounded-xl">
                    <h3 className="font-semibold text-violet-900 mb-4">Available Chains:</h3>
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                      {JSON.stringify(tokenDetails.chains, null, 2)}
                    </pre>
                  </div>

                  <div className="p-6 bg-gray-50 rounded-xl">
                    <h3 className="font-semibold text-violet-900 mb-4">All Tokens:</h3>
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                      {JSON.stringify(tokenDetails.tokens, null, 2)}
                    </pre>
                  </div>

                  <div className="p-6 bg-gray-50 rounded-xl">
                    <h3 className="font-semibold text-violet-900 mb-4">Portfolio:</h3>
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                      {JSON.stringify(tokenDetails.portfolio, null, 2)}
                    </pre>
                  </div>

                  <div className="p-6 bg-gray-50 rounded-xl">
                    <h3 className="font-semibold text-violet-900 mb-4">NFT Collections:</h3>
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                      {JSON.stringify(tokenDetails.nftCollections, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
  
          {/* Specific Address Portfolio */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-violet-100">
            <h2 className="text-2xl font-bold text-violet-900 mb-6">💰 Specific Address Portfolio</h2>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Address to Check</h3>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                    {specificAddress}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(specificAddress);
                      alert('Address copied to clipboard!');
                    }}
                    className="text-violet-600 hover:text-violet-700"
                  >
                    📋
                  </button>
                </div>
              </div>

              <button
                onClick={checkSpecificAddressPortfolio}
                disabled={loading.specificPortfolio}
                className="w-full p-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading.specificPortfolio ? 'Loading...' : 'Check Portfolio'}
              </button>

              {results.specificPortfolio && (
                <div className="mt-6 p-6 bg-gray-50 rounded-xl">
                  <h3 className="font-semibold text-violet-900 mb-4">Portfolio Details:</h3>
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                    {JSON.stringify(results.specificPortfolio, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
  
          {/* Development Info */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-6">🔧 Development Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-blue-400 mb-4">Environment:</h3>
                <div className="space-y-2">
                  <p className="flex items-center gap-2">
                    <span className="text-gray-400">Mode:</span>
                    <span className="px-2 py-1 bg-gray-700 rounded-full text-sm">
                      {process.env.REACT_APP_OKTO_ENVIRONMENT || 'sandbox'}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-gray-400">SDK:</span>
                    <span className="px-2 py-1 bg-gray-700 rounded-full text-sm">
                      @okto_web3/react-sdk
                    </span>
                  </p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-green-400 mb-4">Features:</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>ERC-3643 Token Integration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Okto Embedded Wallet</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Token Transfer</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Raw Transaction Support</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }