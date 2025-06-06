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
      
      setOrderHistory(history);

      // If we have a specific jobId, find it in the history
      if (jobId && jobId.trim()) {
        const foundJob = findJobInHistory(history, jobId);
        if (foundJob) {
          setSpecificJob(foundJob);
          console.log('🎯 Found specific job:', foundJob);
        } else {
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

  // Function to find a specific job in the history
  const findJobInHistory = (history, searchJobId) => {
    if (!history || !history.data) return null;
    
    // Handle different response formats
    let orders = [];
    if (Array.isArray(history.data)) {
      orders = history.data;
    } else if (history.data.orders) {
      orders = history.data.orders;
    } else if (history.data.history) {
      orders = history.data.history;
    }

    return orders.find(order => 
      order.jobId === searchJobId || 
      order.id === searchJobId ||
      order.orderId === searchJobId
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
          
          <div className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Status */}
              <div className="bg-gray-700/50 rounded p-3">
                <p className="text-gray-400 text-sm">Status</p>
                <p className={`font-semibold ${getStatusColor(specificJob.status)}`}>
                  {specificJob.status || 'Unknown'}
                </p>
              </div>

              {/* Amount */}
              {specificJob.amount && (
                <div className="bg-gray-700/50 rounded p-3">
                  <p className="text-gray-400 text-sm">Amount</p>
                  <p className="font-semibold text-white">
                    {specificJob.amount} {specificJob.token || 'POL'}
                  </p>
                </div>
              )}

              {/* Network */}
              {specificJob.network && (
                <div className="bg-gray-700/50 rounded p-3">
                  <p className="text-gray-400 text-sm">Network</p>
                  <p className="text-white font-medium">
                    {specificJob.network}
                  </p>
                </div>
              )}

              {/* From Address */}
              {specificJob.fromAddress && (
                <div className="bg-gray-700/50 rounded p-3">
                  <p className="text-gray-400 text-sm">From</p>
                  <p className="font-mono text-white text-sm break-all">
                    {specificJob.fromAddress}
                  </p>
                </div>
              )}

              {/* To Address */}
              {specificJob.toAddress && (
                <div className="bg-gray-700/50 rounded p-3">
                  <p className="text-gray-400 text-sm">To</p>
                  <p className="font-mono text-white text-sm break-all">
                    {specificJob.toAddress}
                  </p>
                </div>
              )}

              {/* Transaction Hash */}
              {specificJob.transactionHash && (
                <div className="bg-gray-700/50 rounded p-3">
                  <p className="text-gray-400 text-sm">Transaction Hash</p>
                  <a
                    href={getTransactionLink(specificJob.transactionHash, specificJob.network)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-blue-400 text-sm break-all hover:underline"
                  >
                    {specificJob.transactionHash}
                  </a>
                </div>
              )}

              {/* Created At */}
              {specificJob.createdAt && (
                <div className="bg-gray-700/50 rounded p-3">
                  <p className="text-gray-400 text-sm">Created</p>
                  <p className="text-white text-sm">
                    {formatDate(specificJob.createdAt)}
                  </p>
                </div>
              )}

              {/* Updated At */}
              {specificJob.updatedAt && (
                <div className="bg-gray-700/50 rounded p-3">
                  <p className="text-gray-400 text-sm">Updated</p>
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
      {orderHistory && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-md">Recent Transaction History</h3>
          
          <div className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-4">
            {(() => {
              let orders = [];
              if (orderHistory.data) {
                if (Array.isArray(orderHistory.data)) {
                  orders = orderHistory.data;
                } else if (orderHistory.data.orders) {
                  orders = orderHistory.data.orders;
                } else if (orderHistory.data.history) {
                  orders = orderHistory.data.history;
                }
              }

              if (orders.length === 0) {
                return (
                  <p className="text-gray-400 text-center py-4">
                    No transaction history found
                  </p>
                );
              }

              return (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {orders.slice(0, 10).map((order, index) => (
                    <div key={index} className="bg-gray-700/30 rounded p-3 hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{getStatusIcon(order.status)}</span>
                          <span className={`font-medium ${getStatusColor(order.status)}`}>
                            {order.status || 'Unknown'}
                          </span>
                        </div>
                        <span className="text-gray-400 text-sm">
                          {formatDate(order.createdAt || order.timestamp)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        {order.jobId && (
                          <div>
                            <span className="text-gray-400">Job ID: </span>
                            <span className="font-mono text-white">{order.jobId}</span>
                          </div>
                        )}
                        {order.amount && (
                          <div>
                            <span className="text-gray-400">Amount: </span>
                            <span className="text-white">{order.amount} {order.token || 'POL'}</span>
                          </div>
                        )}
                        {order.network && (
                          <div>
                            <span className="text-gray-400">Network: </span>
                            <span className="text-white">{order.network}</span>
                          </div>
                        )}
                      </div>

                      {order.transactionHash && (
                        <div className="mt-2">
                          <a
                            href={getTransactionLink(order.transactionHash, order.network)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline text-sm"
                          >
                            🔗 View on Explorer
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Raw Response (for debugging) */}
            <details className="mt-4">
              <summary className="cursor-pointer text-blue-400 text-sm">
                View Raw API Response
              </summary>
              <div className="mt-2 bg-gray-900/50 p-3 rounded">
                <pre className="text-xs text-gray-300 overflow-auto max-h-40">
                  {JSON.stringify(orderHistory, null, 2)}
                </pre>
              </div>
            </details>
          </div>
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
          <a
            href="https://polygonscan.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline text-sm"
          >
            🔍 PolygonScan
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