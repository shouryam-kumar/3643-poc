// src/components/ERC3643ComplianceChecker.js
import React, { useState } from 'react';
import { ethers } from 'ethers';

// ERC-3643 Identity Registry ABI (simplified)
const IDENTITY_REGISTRY_ABI = [
  "function isVerified(address user) external view returns (bool)",
  "function getIdentity(address user) external view returns (address)",
  "function isCountryAllowed(uint16 country) external view returns (bool)"
];

// ERC-3643 Token ABI (simplified)
const ERC3643_TOKEN_ABI = [
  "function canTransfer(address from, address to, uint256 amount) external view returns (bool)",
  "function identityRegistry() external view returns (address)",
  "function compliance() external view returns (address)"
];

function ERC3643ComplianceChecker({ tokenAddress, fromAddress, toAddress, amount }) {
  const [complianceResult, setComplianceResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const checkCompliance = async () => {
    if (!tokenAddress || !fromAddress || !toAddress || !amount) {
      setError('Please provide all required parameters');
      return;
    }

    setLoading(true);
    setError('');
    setComplianceResult(null);

    try {
      // For demo purposes, we'll use a public RPC endpoint
      // In production, you'd use your own RPC or the Okto provider
      const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
      
      // Create contract instances
      const tokenContract = new ethers.Contract(tokenAddress, ERC3643_TOKEN_ABI, provider);
      
      // Check if transfer is allowed by the token contract
      const canTransfer = await tokenContract.canTransfer(fromAddress, toAddress, ethers.parseEther(amount));
      
      // Get identity registry address
      const identityRegistryAddress = await tokenContract.identityRegistry();
      const identityRegistry = new ethers.Contract(identityRegistryAddress, IDENTITY_REGISTRY_ABI, provider);
      
      // Check if both addresses are verified
      const isFromVerified = await identityRegistry.isVerified(fromAddress);
      const isToVerified = await identityRegistry.isVerified(toAddress);
      
      // Get identity contracts for both addresses
      const fromIdentity = await identityRegistry.getIdentity(fromAddress);
      const toIdentity = await identityRegistry.getIdentity(toAddress);

      const result = {
        canTransfer,
        isFromVerified,
        isToVerified,
        fromIdentity,
        toIdentity,
        identityRegistryAddress,
        timestamp: new Date().toISOString()
      };

      setComplianceResult(result);

    } catch (err) {
      setError('Compliance check failed: ' + err.message);
      console.error('Compliance check error:', err);
    } finally {
      setLoading(false);
    }
  };

  const ComplianceStatus = ({ label, status, details }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      margin: '8px 0',
      padding: '8px',
      borderRadius: '4px',
      backgroundColor: status ? '#e8f5e8' : '#fee',
      border: `1px solid ${status ? '#4caf50' : '#f44336'}`
    }}>
      <span style={{ marginRight: '8px', fontSize: '16px' }}>
        {status ? '✅' : '❌'}
      </span>
      <div>
        <strong>{label}:</strong> {status ? 'Passed' : 'Failed'}
        {details && <div style={{ fontSize: '12px', color: '#666' }}>{details}</div>}
      </div>
    </div>
  );

  return (
    <div style={{
      background: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      padding: '20px',
      margin: '20px 0',
      maxWidth: '600px'
    }}>
      <h3 style={{ color: '#333', marginTop: 0 }}>🛡️ ERC-3643 Compliance Checker</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <p style={{ fontSize: '14px', color: '#666', margin: '5px 0' }}>
          This tool checks ERC-3643 compliance requirements before token transfer.
        </p>
      </div>

      <button
        onClick={checkCompliance}
        disabled={loading || !tokenAddress || !fromAddress || !toAddress || !amount}
        style={{
          padding: '10px 20px',
          backgroundColor: '#17a2b8',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginBottom: '15px',
          fontWeight: 'bold'
        }}
      >
        {loading ? 'Checking Compliance...' : 'Check ERC-3643 Compliance'}
      </button>

      {error && (
        <div style={{
          background: '#f8d7da',
          color: '#721c24',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '15px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}

      {complianceResult && (
        <div>
          <h4 style={{ color: '#333', marginBottom: '10px' }}>Compliance Check Results:</h4>
          
          <ComplianceStatus
            label="Overall Transfer Allowed"
            status={complianceResult.canTransfer}
            details="Token contract's canTransfer() check"
          />
          
          <ComplianceStatus
            label="Sender Identity Verified"
            status={complianceResult.isFromVerified}
            details={`Identity: ${complianceResult.fromIdentity}`}
          />
          
          <ComplianceStatus
            label="Recipient Identity Verified"
            status={complianceResult.isToVerified}
            details={`Identity: ${complianceResult.toIdentity}`}
          />

          <div style={{
            background: '#e7f3ff',
            border: '1px solid #b3d9ff',
            borderRadius: '4px',
            padding: '10px',
            marginTop: '15px'
          }}>
            <h5 style={{ margin: '0 0 8px 0', color: '#0056b3' }}>Contract Information:</h5>
            <p style={{ margin: '4px 0', fontSize: '12px', fontFamily: 'monospace' }}>
              <strong>Token:</strong> {tokenAddress}
            </p>
            <p style={{ margin: '4px 0', fontSize: '12px', fontFamily: 'monospace' }}>
              <strong>Identity Registry:</strong> {complianceResult.identityRegistryAddress}
            </p>
            <p style={{ margin: '4px 0', fontSize: '12px' }}>
              <strong>Checked at:</strong> {new Date(complianceResult.timestamp).toLocaleString()}
            </p>
          </div>

          <div style={{
            background: complianceResult.canTransfer ? '#d4edda' : '#f8d7da',
            border: `1px solid ${complianceResult.canTransfer ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '4px',
            padding: '10px',
            marginTop: '10px'
          }}>
            <strong>
              {complianceResult.canTransfer 
                ? '✅ Transfer is compliant and allowed to proceed'
                : '❌ Transfer is NOT compliant - address compliance issues before proceeding'
              }
            </strong>
          </div>
        </div>
      )}

      <div style={{
        background: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '4px',
        padding: '10px',
        marginTop: '15px',
        fontSize: '12px'
      }}>
        <strong>Note:</strong> This checker requires the token to implement ERC-3643 standard.
        Make sure you're using a valid ERC-3643 compliant token address and that both
        sender and recipient have valid identity contracts.
      </div>
    </div>
  );
}

export default ERC3643ComplianceChecker;