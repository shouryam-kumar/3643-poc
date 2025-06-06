// src/Homepage.js - Based on Official Template + ERC-3643 Features
import {
    getAccount,
    getPortfolio,
    getTokens,
    useOkto,
  } from "@okto_web3/react-sdk";
  import { googleLogout, GoogleLogin } from "@react-oauth/google";
  import { useState, useEffect } from "react";
  import { useNavigate } from "react-router-dom";
  import TokenTransfer from './components/TokenTransfer';
  import RawTransaction from './components/RawTransaction';
  import JobTracker from './components/JobTracker';
  import './components/styles.css'; // Ensure styles are imported
  
  export default function Homepage() {
    const oktoClient = useOkto();
    const navigate = useNavigate();
    const [results, setResults] = useState({});
    const [loading, setLoading] = useState({});
    
    const isLoggedIn = oktoClient.isLoggedIn();
    const userSWA = oktoClient.userSWA;
    const clientSWA = oktoClient.clientSWA;
    const accountInfo = results.getAccount?.result;
  
    // State for login specific UI
    const [isLoginLoading, setIsLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState(null);
  
    useEffect(() => {
        // Check if already logged in on mount
        if (isLoggedIn) {
          console.log('✅ Already logged in, navigating to homepage content.');
          // No navigation needed here if Homepage is the content for logged in users
        } else {
          console.log('❌ Not logged in, showing login screen.');
          // Clear any previous login errors on load if they were from a failed attempt
          setLoginError(null); 
          setIsLoginLoading(false);
        }
      }, [isLoggedIn]);
  
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
        navigate("/"); // Navigate back to the root which will show the login UI
        return { result: "logout success" };
      } catch (error) {
        console.error("❌ Logout failed:", error);
        return { result: "logout failed" };
      }
    }
  
    // Handles Google login success
    const handleGoogleLoginSuccess = async (credentialResponse) => {
        console.log('🔑 Google login success, credential:', credentialResponse);
        setIsLoginLoading(true);
        setLoginError(null);
        try {
          if (credentialResponse.credential) {
            localStorage.setItem("googleIdToken", credentialResponse.credential);
            console.log('Sending credential to Okto SDK...');
            await oktoClient.handleCredentialResponse(credentialResponse.credential);
            console.log('✅ Okto SDK login handled');
            // The useOkto hook should update isLoggedIn, which will trigger the useEffect
            // and render the main content.
          } else {
            throw new Error('No credential found in Google response');
          }
        } catch (error) {
          console.error('❌ Okto SDK login failed:', error);
          setLoginError(error.message || 'Okto SDK login failed');
        } finally {
           setIsLoginLoading(false);
        }
      };
  
    // Handles Google login error
    const handleGoogleLoginError = () => {
        console.error('❌ Google login failed');
        setIsLoginLoading(false);
        setLoginError('Google login failed. Please try again.');
      };
  
    // Generic function to handle API calls with loading states
    const handleApiCall = async (apiFunction, functionName) => {
      setLoading(prev => ({ ...prev, [functionName]: true }));
      try {
        const response = await apiFunction(oktoClient);
        // Add console logs to inspect the response and result before updating state
        console.log(`${functionName} raw response:`, response);
        // Handle both direct results and wrapped results
        const result = response?.result || response;
        console.log(`${functionName} processed result:`, result);
        setResults(prev => ({ ...prev, [functionName]: result }));
        console.log(`${functionName} result:`, result);
        return { result };
      } catch (error) {
        console.error(`${functionName} error:`, error);
        const errorResult = { error: error.message || 'An unknown error occurred' };
        setResults(prev => ({ ...prev, [functionName]: errorResult }));
        return errorResult;
      } finally {
        setLoading(prev => ({ ...prev, [functionName]: false }));
      }
    };
  
    // ERC-3643 Compliance Check Function (Demonstration)
    const checkERC3643Compliance = async () => {
      setLoading(prev => ({ ...prev, 'erc3643': true }));
      try {
        // This is a demonstration - in a real implementation, you would:
        // 1. Check if token implements ERC-3643 interface
        // 2. Verify identity registry using the Okto SDK or a separate service
        // 3. Check transfer eligibility based on various compliance rules
        
        // Simulate an API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        const demoComplianceResult = {
          tokenAddress: "0xDemoERC3643TokenAddress...", // Example ERC-3643 token
          isERC3643Compliant: true, // Assume the token is compliant for demo
          identityRegistry: "0xDemoIdentityRegistry...", // Example Registry Address
          userVerified: true, // Assume user is verified for demo
          transferEligible: true, // Assume user is eligible for demo
          complianceChecks: {
            identityVerification: { status: '✅ Verified', details: 'User identity confirmed.' },
            countryRestrictions: { status: '✅ Allowed', details: 'User location is not restricted.' },
            investorAccreditation: { status: '✅ Accredited', details: 'User meets accreditation criteria.' },
            transferLimits: { status: '✅ Within limits', details: 'Transfer amount is within daily/transaction limits.' },
            sanctionsScreening: { status: '✅ Passed', details: 'User passed sanctions checks.' },
          },
          message: "User is eligible for ERC-3643 token operations based on compliance checks."
        };
        
        setResults(prev => ({ ...prev, 'erc3643': demoComplianceResult }));
        console.log('ERC-3643 compliance check:', demoComplianceResult);
        return { result: demoComplianceResult };
      } catch (error) {
        console.error('ERC-3643 compliance check error:', error);
        const errorResult = { error: error.message || 'An unknown error occurred during compliance check.' };
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
          className={`btn btn-primary w-full ${loading[functionName] ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !loading[functionName] && handleApiCall(apiFunction, functionName)}
          disabled={loading[functionName]}
        >
          {loading[functionName] ? 'Loading...' : title}
        </button>
        {description && (
          <p className="text-xs text-gray-400 mt-sm">{description}</p>
        )}
      </div>
    );
  
    // Results display component - Refactored for better rendering
    const ResultsDisplay = ({ functionName, title }) => {
      const res = results[functionName];
      // The actual result object from the API call (might contain a 'result' wrapper or be direct)
      const apiResponse = res?.result || res;

      const error = res?.error;

      // Debugging logs (commented out)
      // console.log(`ResultsDisplay: ${functionName} - res:`, res);
      // console.log(`ResultsDisplay: ${functionName} - apiResponse:`, apiResponse);
      // console.log(`ResultsDisplay: ${functionName} - error:`, error);
      // console.log(`ResultsDisplay: ${functionName} - loading:`, loading[functionName]);

      // Display loading state immediately if applicable
      if (loading[functionName]) {
        return (
          <div className="card-dark p-md">
            <h4 className="font-semibold text-white mb-sm">{title} Results:</h4>
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <p className="text-gray-400">Loading...</p>
            </div>
          </div>
        );
      }

      // If not loading and no result yet, or if there's an error, handle accordingly
      if (!res && !error) {
        return null; // Don't render the section yet
      }

      // Display error state if error object is present
      if (error) {
        return (
          <div className="card-dark p-md">
            <h4 className="font-semibold text-white mb-sm">{title} Results:</h4>
            <div className="text-error text-sm bg-red-900/20 p-sm rounded break-words border border-red-500/30">
              <p className="font-medium">Error:</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        );
      }

      // Helper function to format JSON data
      const formatValue = (value) => {
        if (typeof value === 'object' && value !== null) {
          return (
            <pre className="bg-gray-800/50 p-2 rounded text-sm overflow-x-auto">
              {JSON.stringify(value, null, 2)}
            </pre>
          );
        }
        return value;
      };

      // Display results if not loading and no error
      // Always display the raw apiResponse data in a code block
      return (
        <div className="card-dark p-md">
          <h4 className="font-semibold text-white mb-sm">{title} Results:</h4>
          <div className="results-container space-y-4">

            {/* Display raw apiResponse if available and no error/loading */}
            {!loading[functionName] && !error && apiResponse !== undefined && apiResponse !== null && (
              <div className="generic-result bg-gray-800/30 p-3 rounded">
                 {/* Access nested data if it exists, otherwise show the whole response */}
                 {apiResponse.data ? formatValue(apiResponse.data) : formatValue(apiResponse)}
              </div>
            )}

             {/* Message if no data and no error */}
             {!loading[functionName] && !error && (apiResponse === undefined || apiResponse === null) && (
               <p className="text-gray-400">No data available.</p>
             )}

          </div>
        </div>
      );
    };
  
    // Conditional rendering based on login status
    if (!isLoggedIn) {
        return (
            <div className="login-container">
                <div className="login-box">
                    <h1 className="login-title">Welcome to Okto Demo</h1>
                    <p className="login-subtitle">Connect your wallet via Google to get started</p>
                    <div className="google-login-button-container">
                         <GoogleLogin
                            onSuccess={handleGoogleLoginSuccess}
                            onError={handleGoogleLoginError}
                            // You might want to add requestStatus here if the GoogleLogin component supports it
                         />
                    </div>
                    {isLoginLoading && <p className="loading-message">Loading...</p>}
                    {loginError && <p className="error-message">{loginError}</p>}
                     {/* Basic instruction for setting up Google Auth */}
                     <p className="setup-instruction">
                        If Google login isn't working, ensure you have set up Google OAuth credentials
                        and added your Google Client ID to the .env file as `REACT_APP_GOOGLE_CLIENT_ID`.
                    </p>
                </div>
            </div>
        );
    }
  
    // Render main application content if logged in
    return (
      <main className="min-h-screen bg-gradient-to-b from-violet-100 to-violet-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto space-y-8">
          <div className="text-center mb-lg">
            <h1 className="text-4xl font-bold text-violet-900 mb-sm">
              🚀 ERC-3643 Okto Integration
            </h1>
            <p className="text-lg text-violet-700">
              Official Okto SDK with ERC-3643 Compliance Features
            </p>
          </div>
  
          {/* User Details */}
          <div className="card-dark p-xl mb-xl">
            <h2 className="text-xl font-bold text-white mb-lg flex items-center">
              <span className="mr-md">👤</span> User Details
            </h2>
            <div className="bg-white/10 p-md rounded-lg">
              <div className="text-sm text-gray-300 whitespace-pre-wrap break-words">
                {isLoggedIn
                  ? <><p>✅ Logged in</p><p>🔧 Client SWA: <span className="address">{clientSWA || 'Not available'}</span></p></>
                  : <p>❌ Not signed in</p>}
              </div>
            </div>
          </div>
  
          {/* Session Management */}
          <div className="card-dark p-xl mb-xl">
            <h2 className="text-xl font-bold text-white mb-lg flex items-center">
              <span className="mr-md">🔐</span> Session Management
            </h2>
            <div className="flex justify-center">
              <button
                title="Logout"
                onClick={handleLogout}
                disabled={loading.logout}
                className="btn btn-outline text-error"
              >
                {loading.logout ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
  
          {/* Token Transfer */}
          <TokenTransfer />

          {/* Raw Transaction */}
          <RawTransaction />
  
          {/* Okto Explorer Functions */}
          <div className="card-dark p-xl mb-xl">
            <h2 className="text-xl font-bold text-white mb-lg flex items-center">
              <span className="mr-md">🔍</span> Okto Explorer Functions
            </h2>
            <p className="text-gray-400 mb-lg">
              For supported networks, check out{" "}
              <a
                className="text-secondary hover:underline"
                href="https://docs.okto.tech/docs/supported-chains"
                target="_blank"
                rel="noopener noreferrer"
              >
                Supported Chains & Tokens Guide
              </a>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
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
            <div className="space-y-md mt-xl">
              <ResultsDisplay functionName="getAccount" title="Account" />
              <ResultsDisplay functionName="getPortfolio" title="Portfolio" />
              <ResultsDisplay functionName="getTokens" title="Tokens" />
            </div>
          </div>

          <JobTracker />
  
         
          
  
          {/* Development Info */}
          <div className="bg-gray-800 text-white rounded-xl shadow-lg p-6 mt-xl">
            <h2 className="text-xl font-semibold mb-4">🔧 Development Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-semibold text-blue-400 mb-2">Environment:</h3>
                <p>Mode: {process.env.REACT_APP_OKTO_ENVIRONMENT || 'sandbox'}</p>
                <p>Okto SDK: @okto_web3/react-sdk</p>
              </div>
              <div>
                <h3 className="font-semibold text-green-400 mb-2">Features Implemented:</h3>
                <ul className="space-y-1">
                  <li>✅ Google OAuth Authentication</li>
                  <li>✅ Multi-chain Account Management</li>
                  <li>✅ Portfolio & Token Queries</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="glass-dark mt-xl p-xl">
          <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-lg">
            <div>
              <h4 className="text-white font-bold mb-md">ERC-3643 Features</h4>
              <ul className="space-y-sm text-gray-400 text-sm">
                <li>🛡️ Identity Registry Integration</li>
                <li>📋 Compliance Rule Engine</li>
                <li>🔒 Transfer Restriction Controls</li>
                <li>📊 Regulatory Reporting</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-md">Supported Networks</h4>
              <ul className="space-y-sm text-gray-400 text-sm">
                <li>🔗 Ethereum Mainnet</li>
                <li>🔗 Polygon</li>
                <li>🔗 Binance Smart Chain</li>
                <li>🔗 Arbitrum</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-md">Security</h4>
              <ul className="space-y-sm text-gray-400 text-sm">
                <li>🔐 End-to-end Encryption</li>
                <li>🛡️ Multi-signature Support</li>
                <li>⚡ Gas Optimization</li>
                <li>🔍 Real-time Monitoring</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-lg pt-lg text-center">
            <p className="text-gray-400 text-sm">
              Powered by <span className="text-primary font-medium">Okto SDK v2</span> •
              Environment: <span className="text-secondary">{process.env.REACT_APP_OKTO_ENVIRONMENT || 'sandbox'}</span>
            </p>
          </div>
        </footer>
      </main>
    );
  }