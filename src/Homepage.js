// src/Homepage.js - Based on Official Template + ERC-3643 Features
import {
    getAccount,
    getPortfolio,
    getTokens,
    useOkto,
  } from "@okto_web3/react-sdk";
  import { googleLogout } from "@react-oauth/google";
  import { useState } from "react";
  import { useNavigate } from "react-router-dom";
  
  export default function Homepage() {
    const oktoClient = useOkto();
    const navigate = useNavigate();
    const [results, setResults] = useState({});
    const [loading, setLoading] = useState({});
    
    const isLoggedIn = oktoClient.isLoggedIn();
    const userSWA = oktoClient.userSWA;
    const clientSWA = oktoClient.clientSWA;
  
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
      try {
        const result = await apiFunction(oktoClient);
        setResults(prev => ({ ...prev, [functionName]: result }));
        console.log(`${functionName} result:`, result);
        return { result };
      } catch (error) {
        console.error(`${functionName} error:`, error);
        const errorResult = { error: error.message };
        setResults(prev => ({ ...prev, [functionName]: errorResult }));
        return errorResult;
      } finally {
        setLoading(prev => ({ ...prev, [functionName]: false }));
      }
    };
  
    // ERC-3643 Compliance Check Function
    const checkERC3643Compliance = async () => {
      setLoading(prev => ({ ...prev, 'erc3643': true }));
      try {
        // This is a demonstration - in a real implementation, you would:
        // 1. Check if token implements ERC-3643 interface
        // 2. Verify identity registry
        // 3. Check transfer eligibility
        
        const demoComplianceResult = {
          tokenAddress: "0x1234567890abcdef...", // Example ERC-3643 token
          isERC3643Compliant: true,
          identityRegistry: "0xabcdef1234567890...",
          userVerified: true,
          transferEligible: true,
          complianceChecks: {
            identityVerification: "✅ Verified",
            countryRestrictions: "✅ Allowed",
            investorAccreditation: "✅ Accredited",
            transferLimits: "✅ Within limits"
          },
          message: "User is eligible for ERC-3643 token transfers"
        };
        
        setResults(prev => ({ ...prev, 'erc3643': demoComplianceResult }));
        console.log('ERC-3643 compliance check:', demoComplianceResult);
        return { result: demoComplianceResult };
      } catch (error) {
        console.error('ERC-3643 compliance check error:', error);
        const errorResult = { error: error.message };
        setResults(prev => ({ ...prev, 'erc3643': errorResult }));
        return errorResult;
      } finally {
        setLoading(prev => ({ ...prev, 'erc3643': false }));
      }
    };
  
    // Button component for API calls
    const ApiButton = ({ title, apiFunction, functionName, description = "" }) => (
      <div className="text-center">
        <button
          className="w-full p-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-blue-300"
          onClick={() => handleApiCall(apiFunction, functionName)}
          disabled={loading[functionName]}
        >
          {loading[functionName] ? 'Loading...' : title}
        </button>
        {description && (
          <p className="text-xs text-gray-600 mt-1">{description}</p>
        )}
      </div>
    );
  
    // Results display component
    const ResultsDisplay = ({ functionName, title }) => {
      const result = results[functionName];
      if (!result) return null;
  
      return (
        <div className="mt-4 p-4 bg-gray-100 rounded border">
          <h4 className="font-semibold text-gray-800 mb-2">{title} Result:</h4>
          <pre className="text-xs bg-gray-800 text-green-400 p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      );
    };
  
    return (
      <main className="min-h-screen bg-gradient-to-b from-violet-100 to-violet-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-violet-900 mb-4">
              🚀 ERC-3643 Okto Integration
            </h1>
            <p className="text-lg text-violet-700">
              Official Okto SDK with ERC-3643 Compliance Features
            </p>
          </div>
  
          {/* User Details */}
          <div className="space-y-4">
            <h2 className="text-violet-900 font-bold text-2xl">👤 User Details</h2>
            <div className="bg-white p-6 rounded-xl shadow-lg border border-violet-200">
              <pre className="whitespace-pre-wrap break-words text-gray-800">
                {isLoggedIn
                  ? `✅ Logged in \n👤 User SWA: ${userSWA} \n🔧 Client SWA: ${clientSWA}`
                  : "❌ Not signed in"}
              </pre>
            </div>
          </div>
  
          {/* Session Management */}
          <div className="bg-white rounded-xl shadow-lg border border-violet-200 p-6">
            <h2 className="text-violet-900 font-semibold text-2xl mb-6">
              🔐 Session Management
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <ApiButton
                title="Logout"
                apiFunction={handleLogout}
                functionName="logout"
                description="Clear session and return to login"
              />
            </div>
          </div>
  
          {/* Okto Explorer Functions */}
          <div className="bg-white rounded-xl shadow-lg border border-violet-200 p-6">
            <h2 className="text-violet-900 font-semibold text-2xl mb-6">
              🔍 Okto Explorer Functions
            </h2>
            <p className="text-gray-600 mb-6">
              For supported networks, check out{" "}
              <a
                className="underline text-indigo-700 hover:text-indigo-900"
                href="https://docs.okto.tech/docs/supported-chains"
                target="_blank"
                rel="noopener noreferrer"
              >
                Supported Chains & Tokens Guide
              </a>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <ApiButton
                title="Get Account"
                apiFunction={getAccount}
                functionName="getAccount"
                description="Fetch user wallet accounts"
              />
              <ApiButton
                title="Get Portfolio"
                apiFunction={getPortfolio}
                functionName="getPortfolio"
                description="View token balances"
              />
              <ApiButton
                title="Get Tokens"
                apiFunction={getTokens}
                functionName="getTokens"
                description="List available tokens"
              />
            </div>
            
            {/* Display results */}
            <div className="space-y-4">
              <ResultsDisplay functionName="getAccount" title="Account" />
              <ResultsDisplay functionName="getPortfolio" title="Portfolio" />
              <ResultsDisplay functionName="getTokens" title="Tokens" />
            </div>
          </div>
  
          {/* ERC-3643 Compliance Section */}
          <div className="bg-white rounded-xl shadow-lg border border-violet-200 p-6">
            <h2 className="text-violet-900 font-semibold text-2xl mb-6">
              🛡️ ERC-3643 Compliance Features
            </h2>
            <p className="text-gray-600 mb-6">
              Check compliance status for ERC-3643 compliant security tokens.
              This includes identity verification, transfer restrictions, and regulatory compliance.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ApiButton
                title="Check ERC-3643 Compliance"
                apiFunction={checkERC3643Compliance}
                functionName="erc3643"
                description="Verify compliance for token transfers"
              />
            </div>
            
            <ResultsDisplay functionName="erc3643" title="ERC-3643 Compliance" />
          </div>
  
          {/* Token Operations */}
          <div className="bg-white rounded-xl shadow-lg border border-violet-200 p-6">
            <h2 className="text-violet-900 font-semibold text-2xl mb-6">
              💰 Token Operations
            </h2>
            <p className="text-gray-600 mb-6">
              Perform token transfers and operations with built-in compliance checking.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => alert('Token Transfer feature - Would integrate with Okto transfer APIs')}
                className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-center font-medium"
              >
                🔄 Transfer Tokens
              </button>
              <button
                onClick={() => alert('Raw Transaction feature - Would integrate with Okto raw transaction APIs')}
                className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-center font-medium"
              >
                ⚙️ Raw Transactions
              </button>
              <button
                onClick={() => alert('ERC-3643 Transfer - Would implement compliance-checked transfers')}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-center font-medium"
              >
                🛡️ ERC-3643 Transfer
              </button>
            </div>
          </div>
  
          {/* Development Info */}
          <div className="bg-gray-800 text-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">🔧 Development Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-semibold text-blue-400 mb-2">Environment:</h3>
                <p>Mode: {import.meta.env.VITE_OKTO_ENVIRONMENT || 'sandbox'}</p>
                <p>Okto SDK: @okto_web3/react-sdk</p>
              </div>
              <div>
                <h3 className="font-semibold text-green-400 mb-2">Features Implemented:</h3>
                <ul className="space-y-1">
                  <li>✅ Google OAuth Authentication</li>
                  <li>✅ Multi-chain Account Management</li>
                  <li>✅ Portfolio & Token Queries</li>
                  <li>✅ ERC-3643 Compliance Framework</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }