import React, { useState, useEffect } from 'react';
import { useOkto } from '@okto_web3/react-sdk';
import { getOrdersHistory } from '@okto_web3/react-sdk';
import './styles.css';

export default function JobTracker() {
  const oktoClient = useOkto();
  const [jobId, setJobId] = useState('');
  const [orderHistory, setOrderHistory] = useState(null);
  const [specificJob, setSpecificJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Function to fetch all order history
  const fetchOrderHistory = async () => {
    setLoading(true);
    setError('');
    setOrderHistory(null);
    setSpecificJob(null);

    try {
      console.log('📊 Fetching order history...');
      
      const history = await getOrdersHistory(oktoClient);
      console.log('📊 Order history response:', history);
      console.log('📊 Response type:', typeof history);
      console.log('📊 Response keys:', history ? Object.keys(history) : 'null');
      
      // Force update the state even if it's the same data
      setOrderHistory(history);

      // If we have a specific jobId, find it in the history
      if (jobId && jobId.trim()) {
        const foundJob = findJobInHistory(history, jobId);
        if (foundJob) {
          setSpecificJob(foundJob);
          console.log('🎯 Found specific job:', foundJob);
        } else {
          console.log('❌ Job not found. Available jobs:', extractOrdersFromResponse(history));
          setError(`Job ID "${jobId}" not found in order history`);
        }
      }

    } catch (err) {
      console.error('❌ Error fetching order history:', err);
      setError(`Failed to fetch order history: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to extract orders from different response formats
  const extractOrdersFromResponse = (history) => {
    if (!history) {
      console.log('📊 No history data');
      return [];
    }

    // Log the exact structure we received
    console.log('📊 Extracting orders from:', history);

    let rawOrders = [];

    // Case 1: History is a direct array (Ideal case)
    if (Array.isArray(history)) {
      console.log('📊 History is direct array');
      rawOrders = history;
    } 
    // Case 2: History is an object (observed in logs with numeric keys)
    else if (typeof history === 'object' && history !== null) {
        console.log('📊 History is an object, iterating through properties...');
        // Iterate through object properties
        for (const key in history) {
            // Skip prototype properties and the manually added timestamp
            if (history.hasOwnProperty(key) && key !== '_timestamp') {
                 const value = history[key];
                 console.log(`📊 Checking property: ${key}`, value);
                 // Check if the value is an object and looks like a potential order
                 // Criteria: is an object, not null, and has at least one common identifier key (like intentId, id, or transactionHash)
                 if (typeof value === 'object' && value !== null && 
                    (value.intentId || value.id || value.orderId || value.job_id || value.transactionHash || (value.transactions && Array.isArray(value.transactions))) 
                ) {
                     // If the value itself is an array of transactions (like in some raw responses)
                    if (value.transactions && Array.isArray(value.transactions)) {
                         console.log(`📊 Found nested transactions array at property ${key}:`, value.transactions);
                         rawOrders.push(...value.transactions); // Add all transactions from the nested array
                    } else {
                         console.log(`📊 Found potential order object at property ${key}:`, value);
                         rawOrders.push(value); // Add the object if it looks like an order
                    }
                } else {
                     console.log(`📊 Skipping non-order-like property: ${key}`, value);
                     // Log why it was skipped
                     if (typeof value !== 'object' || value === null) {
                         console.log(`📊 - Reason: Not an object or is null`);
                     } else {
                         console.log(`📊 - Reason: Missing common identifiers (intentId, id, orderId, job_id, transactionHash, or transactions array)`);
                     }
                }
            }
        }
        console.log('📊 Found raw orders from object properties (before flattening/mapping):', rawOrders);
    }
    // Add more cases here if other unexpected formats are observed from the API

    // After extracting the raw order objects, map them to the desired consistent format for rendering.
    // This also handles mapping fields that might have different names in the raw data.
    // We also filter out any items that didn't successfully map to an order with a jobId.
    const formattedOrders = rawOrders.map(item => {
        // Perform basic validation that item is an object before mapping
        if (typeof item !== 'object' || item === null) {
             console.warn('📊 Skipping non-object item during formatting:', item);
             return null; // Skip non-object items
        }

        // Map fields, handling multiple potential keys
        // Prioritize the keys from the direct array format if possible
        const jobId = item.intentId || item.id || item.orderId || item.job_id; // Use order-specific IDs first
        console.log(`📊 Mapping item with potential jobId: ${jobId}`, item);
        const status = item.status;
        const network = item.networkName || item.network || item.chain || item.blockchain; // Use network names
        const caipId = item.caipId;
        // Handle amount from different possible locations
        const amount = item.details?.amount || item.amount || item.value || item.quantity;
        // Handle recipient address from different possible locations
        const toAddress = item.details?.recipientWalletAddress || item.toAddress || item.to || item.recipient;
        const tokenAddress = item.details?.tokenAddress || item.tokenAddress;

        // Handle transaction hash, checking for array format first
        let transactionHash = null;
        if (Array.isArray(item.transactionHash) && item.transactionHash.length > 0) {
            transactionHash = item.transactionHash[0];
        } else if (typeof item.transactionHash === 'string') {
            transactionHash = item.transactionHash;
        } else if (Array.isArray(item.txHash) && item.txHash.length > 0) {
             transactionHash = item.txHash[0];
        } else if (typeof item.txHash === 'string') {
             transactionHash = item.txHash;
        } else if (Array.isArray(item.hash) && item.hash.length > 0) {
             transactionHash = item.hash[0];
        } else if (typeof item.hash === 'string') {
             transactionHash = item.hash;
        }

        let downstreamTransactionHash = null;
         if (Array.isArray(item.downstreamTransactionHash) && item.downstreamTransactionHash.length > 0) {
            downstreamTransactionHash = item.downstreamTransactionHash[0];
        } else if (typeof item.downstreamTransactionHash === 'string') {
            downstreamTransactionHash = item.downstreamTransactionHash;
        }

        // Handle timestamp from different possible locations and formats
        let createdAt = null;
        if (item.blockTimestamp) {
             // blockTimestamp is in milliseconds since epoch
             createdAt = new Date(item.blockTimestamp).toISOString();
        } else if (item.createdAt) {
             createdAt = item.createdAt;
        } else if (item.created_at) {
             createdAt = item.created_at;
        } else if (item.timestamp) {
             // Assume timestamp is in seconds since epoch if it's a number, otherwise treat as string
             createdAt = typeof item.timestamp === 'number' ? new Date(item.timestamp * 1000).toISOString() : item.timestamp;
        }

        const type = item.intentType || item.type || item.operation || item.action;
        const reason = item.reason;

        // Ensure we have at least a jobId to consider it a valid order for display
        if (!jobId) { 
            console.warn('📊 Skipping item without recognizable jobId after mapping:', item);
            return null; // Skip items without a recognizable jobId
        }

        return {
            jobId: jobId, 
            status: status,
            network: network,
            caipId: caipId,
            amount: amount,
            toAddress: toAddress,
            tokenAddress: tokenAddress,
            transactionHash: transactionHash,
            downstreamTransactionHash: downstreamTransactionHash,
            createdAt: createdAt,
            type: type,
            reason: reason,
            // Include original item for debugging if needed
            _original: item
        };
    }).filter(order => order !== null); // Filter out any null entries created by the map (due to missing jobId or non-object items)

    console.log('📊 Final extracted and formatted orders:', formattedOrders);
    console.log('📊 Orders count:', formattedOrders.length);

    return formattedOrders;
  };

  // Function to find a specific job in the history
  const findJobInHistory = (history, searchJobId) => {
    const orders = extractOrdersFromResponse(history);
    
    return orders.find(order => 
      order.jobId === searchJobId || 
      order.id === searchJobId ||
      order.orderId === searchJobId ||
      order.job_id === searchJobId ||
      order.order_id === searchJobId
    );
  };

  // Function to check specific job status
  const checkSpecificJob = async () => {
    if (!jobId || !jobId.trim()) {
      setError('Please enter a valid Job ID');
      return;
    }

    await fetchOrderHistory();
  };

  // Auto-refresh if we're tracking a specific job that's still pending
  useEffect(() => {
    if (specificJob && ['PENDING', 'PROCESSING', 'IN_PROGRESS'].includes(specificJob.status?.toUpperCase())) {
      const interval = setInterval(() => {
        fetchOrderHistory();
      }, 10000); // Check every 10 seconds

      return () => clearInterval(interval);
    }
  }, [specificJob]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': case 'success': case 'confirmed': return 'text-green-400';
      case 'failed': case 'error': case 'rejected': return 'text-red-400';
      case 'pending': case 'processing': case 'in_progress': return 'text-yellow-400';
      default: return 'text-blue-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': case 'success': case 'confirmed': return '✅';
      case 'failed': case 'error': case 'rejected': return '❌';
      case 'pending': case 'processing': case 'in_progress': return '⏳';
      default: return '🔍';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getTransactionLink = (txHash, network) => {
    if (!txHash) return null;
    
    // Determine explorer based on network
    const explorers = {
      'polygon': 'https://polygonscan.com/tx/',
      'ethereum': 'https://etherscan.io/tx/',
      'base': 'https://basescan.org/tx/',
      'arbitrum': 'https://arbiscan.io/tx/',
    };
    
    const networkLower = network?.toLowerCase() || 'polygon';
    const explorerBase = explorers[networkLower] || explorers.polygon;
    
    return `${explorerBase}${txHash}`;
  };

  return (
    <div className="card-dark p-xl mb-xl">
      <h2 className="text-xl font-bold text-white mb-lg flex items-center">
        <span className="mr-md">📊</span> Transaction History & Tracker
      </h2>

      {/* Job ID Input and Actions */}
      <div className="mb-lg space-y-md">
        <div className="form-group">
          <label className="form-label">
            Track Specific Job ID (Optional)
          </label>
          <div className="flex gap-md">
            <input
              type="text"
              className="form-input flex-1"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              placeholder="Enter Job ID (e.g., 90a829bf-7170-40fd-a30c-8f4edcd9377a)"
              disabled={loading}
            />
            <button
              onClick={checkSpecificJob}
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <span className="loading-spinner mr-2"></span>
                  Searching...
                </span>
              ) : (
                'Find Job'
              )}
            </button>
          </div>
        </div>

        <div className="flex gap-md">
          <button
            onClick={fetchOrderHistory}
            className="btn btn-secondary"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <span className="loading-spinner mr-2"></span>
                Loading...
              </span>
            ) : (
              '📊 Get All History'
            )}
          </button>
          <button
            onClick={() => {
              console.log('🔍 Current orderHistory state:', orderHistory);
              if (orderHistory) {
                const orders = extractOrdersFromResponse(orderHistory);
                console.log('🔍 Extracted orders:', orders);
                alert(`Response received: ${orderHistory ? 'Yes' : 'No'}\nOrders found: ${orders.length}\nCheck console for details`);
              } else {
                alert('No order history loaded yet. Click "Get All History" first.');
              }
            }}
            className="btn btn-outline"
          >
            🔍 Debug Response
          </button>
          <button
            onClick={() => setJobId('90a829bf-7170-40fd-a30c-8f4edcd9377a')}
            className="btn btn-outline"
          >
            Use Latest Job ID
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-100 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Specific Job Status */}
      {specificJob && (
        <div className="mb-lg">
          <h3 className="text-lg font-semibold text-white mb-md flex items-center">
            {getStatusIcon(specificJob.status)}
            <span className="ml-2">Job Status: {jobId}</span>
          </h3>
          
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Status */}
              <div className="bg-gray-600 rounded p-3">
                <p className="text-gray-300 text-sm font-medium">Status</p>
                <p className={`font-semibold ${getStatusColor(specificJob.status)}`}>
                  {specificJob.status || 'Unknown'}
                </p>
              </div>

              {/* Amount */}
              {specificJob.amount && (
                <div className="bg-gray-600 rounded p-3">
                  <p className="text-gray-300 text-sm font-medium">Amount</p>
                  <p className="font-semibold text-white">
                    {specificJob.amount} {specificJob.token || 'POL'}
                  </p>
                </div>
              )}

              {/* Network */}
              {specificJob.network && (
                <div className="bg-gray-600 rounded p-3">
                  <p className="text-gray-300 text-sm font-medium">Network</p>
                  <p className="text-white font-medium">
                    {specificJob.network}
                  </p>
                </div>
              )}

              {/* From Address */}
              {specificJob.fromAddress && (
                <div className="bg-gray-600 rounded p-3">
                  <p className="text-gray-300 text-sm font-medium">From</p>
                  <p className="font-mono text-white text-sm break-all">
                    {specificJob.fromAddress}
                  </p>
                </div>
              )}

              {/* To Address */}
              {specificJob.toAddress && (
                <div className="bg-gray-600 rounded p-3">
                  <p className="text-gray-300 text-sm font-medium">To</p>
                  <p className="font-mono text-white text-sm break-all">
                    {specificJob.toAddress}
                  </p>
                </div>
              )}

              {/* Transaction Hash */}
              {specificJob.transactionHash && (
                <div className="bg-gray-600 rounded p-3">
                  <p className="text-gray-300 text-sm font-medium">Transaction Hash</p>
                  <span className="font-mono text-white text-sm break-all">
                    {specificJob.transactionHash}
                  </span>
                </div>
              )}

              {/* Created At */}
              {specificJob.createdAt && (
                <div className="bg-gray-600 rounded p-3">
                  <p className="text-gray-300 text-sm font-medium">Created</p>
                  <p className="text-white text-sm">
                    {formatDate(specificJob.createdAt)}
                  </p>
                </div>
              )}

              {/* Updated At */}
              {specificJob.updatedAt && (
                <div className="bg-gray-600 rounded p-3">
                  <p className="text-gray-300 text-sm font-medium">Updated</p>
                  <p className="text-white text-sm">
                    {formatDate(specificJob.updatedAt)}
                  </p>
                </div>
              )}
            </div>

            {/* Auto-refresh indicator */}
            {['PENDING', 'PROCESSING', 'IN_PROGRESS'].includes(specificJob.status?.toUpperCase()) && (
              <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3 mt-4">
                <p className="text-blue-400 text-sm flex items-center">
                  <span className="loading-spinner mr-2"></span>
                  Auto-refreshing every 10 seconds until transaction completes...
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Order History */}
      {orderHistory ? (
        <div>
          <h3 className="text-lg font-semibold text-white mb-md">Recent Transaction History</h3>
          
          <div className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-4">
            {(() => {
              console.log('🎨 UI Render Check - orderHistory state:', orderHistory);
              const orders = extractOrdersFromResponse(orderHistory);
              console.log('🎨 UI Rendering - orders:', orders);
              console.log('🎨 UI Rendering - orders length:', orders.length);
              console.log('🎨 UI Rendering - orderHistory exists:', !!orderHistory);

              // Force show something if we have orderHistory but no orders
              if (!orders || orders.length === 0) {
                return (
                  <div className="text-center py-8">
                    <p className="text-yellow-400 mb-4">⚠️ No transactions extracted from response</p>
                    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-4 text-left">
                      <p className="text-yellow-400 text-sm mb-2">
                        <strong>Debug Info:</strong>
                      </p>
                      <p className="text-yellow-300 text-sm">
                        • API Response: {orderHistory ? '✅ Received' : '❌ Missing'}
                      </p>
                      <p className="text-yellow-300 text-sm">
                        • Response Type: {typeof orderHistory}
                      </p>
                      <p className="text-yellow-300 text-sm">
                        • Response Keys: {orderHistory ? Object.keys(orderHistory).join(', ') : 'None'}
                      </p>
                      <p className="text-yellow-300 text-sm">
                        • Orders Extracted: {orders ? orders.length : 0}
                      </p>
                      
                      {orderHistory && (
                        <div className="mt-3">
                          <details>
                            <summary className="cursor-pointer text-yellow-400 text-sm mb-2">
                              🔍 Show Full API Response
                            </summary>
                            <div className="bg-gray-900/50 p-3 rounded mt-2">
                              <pre className="text-xs text-gray-300 overflow-auto max-h-40">
                                {JSON.stringify(orderHistory, null, 2)}
                              </pre>
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // We have orders - show them
              return (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  <div className="mb-4 text-sm text-green-400 bg-green-900/20 border border-green-500/30 rounded p-2">
                    ✅ Found {orders.length} transaction(s)
                  </div>
                  
                  {orders.slice(0, 10).map((order, index) => {
                    console.log(`🎨 Rendering order ${index}:`, order);
                    
                    return (
                      <div key={`order-${index}-${order.jobId || order.id || Date.now()}`} className="bg-gray-700/30 rounded p-3 hover:bg-gray-700/50 transition-colors border border-gray-600/30">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{getStatusIcon(order.status)}</span>
                            <span className={`font-medium ${getStatusColor(order.status)}`}>
                              {order.status || 'Unknown'}
                            </span>
                          </div>
                          <span className="text-gray-400 text-sm">
                            {formatDate(order.createdAt || order.created_at || order.timestamp)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          {/* Job ID */}
                          {(order.jobId || order.id || order.orderId || order.job_id) && (
                            <div className="bg-gray-700 rounded p-2">
                              <span className="text-gray-300 text-sm font-medium">Job ID: </span>
                              <span className="font-mono text-white text-xs break-all">
                                {order.jobId || order.id || order.orderId || order.job_id}
                              </span>
                            </div>
                          )}
                          
                          {/* Amount */}
                          {(order.amount || order.value || order.quantity) && (
                            <div className="bg-gray-700 rounded p-2">
                              <span className="text-gray-300 text-sm font-medium">Amount: </span>
                              <span className="text-white">
                                {order.amount || order.value || order.quantity} {order.token || order.symbol || order.currency || 'POL'}
                              </span>
                            </div>
                          )}
                          
                          {/* Network */}
                          {(order.network || order.chain || order.blockchain) && (
                            <div className="bg-gray-700 rounded p-2">
                              <span className="text-gray-300 text-sm font-medium">Network: </span>
                              <span className="text-white">
                                {order.network || order.chain || order.blockchain}
                              </span>
                            </div>
                          )}
                          
                          {/* Type */}
                          {(order.type || order.operation || order.action) && (
                            <div className="bg-gray-700 rounded p-2">
                              <span className="text-gray-300 text-sm font-medium">Type: </span>
                              <span className="text-white">
                                {order.type || order.operation || order.action}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Addresses */}
                        {(order.fromAddress || order.from || order.sender) && (
                          <div className="mt-2 bg-gray-700 rounded p-2">
                            <span className="text-gray-300 text-sm font-medium">From: </span>
                            <span className="font-mono text-white text-xs break-all">
                              {order.fromAddress || order.from || order.sender}
                            </span>
                          </div>
                        )}
                        
                        {(order.toAddress || order.to || order.recipient) && (
                          <div className="mt-1 bg-gray-700 rounded p-2">
                            <span className="text-gray-300 text-sm font-medium">To: </span>
                            <span className="font-mono text-white text-xs break-all">
                              {order.toAddress || order.to || order.recipient}
                            </span>
                          </div>
                        )}

                        {/* Transaction Hash */}
                        {(order.transactionHash || order.txHash || order.hash) && (
                          <div className="mt-2 bg-gray-700 rounded p-2">
                            <span className="text-gray-300 text-sm font-medium">Hash: </span>
                            <span className="font-mono text-white text-xs break-all">
                              {order.transactionHash || order.txHash || order.hash}
                            </span>
                          </div>
                        )}
                        
                        {/* Show all available data for debugging */}
                        <details className="mt-2">
                          <summary className="cursor-pointer text-gray-400 text-xs">
                            🔍 Debug: Show all order data
                          </summary>
                          <pre className="text-xs text-gray-300 mt-1 p-2 bg-gray-900/50 rounded overflow-auto max-h-20">
                            {JSON.stringify(order, null, 2)}
                          </pre>
                        </details>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Debug: Always show raw response */}
            <details className="mt-4">
              <summary className="cursor-pointer text-blue-400 text-sm">
                🔧 Debug: View Raw API Response ({orderHistory ? 'Data Available' : 'No Data'})
              </summary>
              <div className="mt-2 bg-gray-900/50 p-3 rounded">
                <pre className="text-xs text-gray-300 overflow-auto max-h-40">
                  {JSON.stringify(orderHistory, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">Click "Get All History" to load transaction history</p>
        </div>
      )}

      {/* Quick Links */}
      <div className="mt-lg pt-lg border-t border-gray-600/50">
        <h4 className="text-white font-semibold mb-md">Quick Links</h4>
        <div className="flex flex-wrap gap-md">
          <a
            href="https://dashboard.okto.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline text-sm"
          >
            🌐 Okto Dashboard
          </a>
          <button
            onClick={() => {
              setOrderHistory(null);
              setSpecificJob(null);
              setError('');
              setJobId('');
            }}
            className="btn btn-outline text-sm"
          >
            🗑️ Clear Results
          </button>
        </div>
      </div>
    </div>
  );
}