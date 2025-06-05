// src/LoginPage.js - Fixed Authentication without UserOperations
import { useOkto } from "@okto_web3/react-sdk";
import { GoogleLogin } from "@react-oauth/google";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const oktoClient = useOkto();
  const navigate = useNavigate();
  const [authError, setAuthError] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});

  // Debug the Okto client state
  useEffect(() => {
    const debug = {
      oktoClient: !!oktoClient,
      isLoggedIn: oktoClient?.isLoggedIn(),
      userSWA: oktoClient?.userSWA,
      clientSWA: oktoClient?.clientSWA,
      environment: process.env.REACT_APP_OKTO_ENVIRONMENT,
      timestamp: new Date().toISOString()
    };
    setDebugInfo(debug);
    console.log('🔍 LoginPage Debug Info:', debug);
  }, [oktoClient]);

  // Add this before the handleAuthenticate function
  const modifyRequest = (config) => {
    if (config.data) {
      try {
        const data = JSON.parse(config.data);
        if (data.params && data.params[0] && data.params[0].sessionData) {
          data.params[0].sessionData.paymaster = "0x74324fA6Fa67b833dfdea4C1b3A9898574d076e3";
          config.data = JSON.stringify(data);
          console.log('🔄 Modified request with new paymaster address');
        }
      } catch (e) {
        console.error('Failed to modify request:', e);
      }
    }
    return config;
  };

  // Simplified authentication handler - NO USER OPERATIONS
  const handleAuthenticate = useCallback(async (idToken) => {
    setIsAuthenticating(true);
    setAuthError(null);
    
    let interceptor;
    // Safely check for axiosInstance
    if (oktoClient?.axiosInstance?.interceptors) {
      // Add request interceptor
      interceptor = oktoClient.axiosInstance.interceptors.request.use(
        (config) => modifyRequest(config),
        (error) => Promise.reject(error)
      );
      console.log('✅ Request interceptor added successfully');
    } else {
      console.warn('⚠️ Okto client axiosInstance not available, proceeding without request interceptor');
    }
    
    console.log('🔐 Starting Authentication Process...');
    console.log('📋 Auth Details:', {
      hasIdToken: !!idToken,
      tokenLength: idToken?.length,
      environment: process.env.REACT_APP_OKTO_ENVIRONMENT,
      timestamp: new Date().toISOString()
    });
    
    try {
      // CRITICAL: This should ONLY be authentication - NO blockchain operations
      console.log('📡 Calling oktoClient.loginUsingOAuth...');
      
      const authResponse = await oktoClient.loginUsingOAuth(
        { 
          idToken: idToken, 
          provider: "google" 
        },
        // Session callback - should NOT involve any UserOperations
        (session) => {
          console.log('💾 Session Callback Triggered:', {
            hasSession: !!session,
            sessionKeys: session ? Object.keys(session) : [],
            timestamp: new Date().toISOString()
          });
          
          // Override paymaster address in session data
          if (session && session.sessionData) {
            session.sessionData.paymaster = "0x74324fA6Fa67b833dfdea4C1b3A9898574d076e3";
            console.log('🔄 Updated paymaster address in session data');
          }
          
          // Store session data
          if (session) {
            localStorage.setItem("okto_session", JSON.stringify(session));
          }
        }
      );
      
      console.log('✅ Authentication Response:', authResponse);
      console.log('🎯 Auth Success - User SWA:', oktoClient.userSWA);
      
      // Clear any stored error tokens
      localStorage.removeItem("googleIdToken");
      
      // Navigate to homepage
      navigate("/home");
      
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      
      // Detailed error analysis
      const errorAnalysis = {
        message: error.message,
        code: error.code,
        hasResponse: !!error.response,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      
      console.error('🔍 Detailed Error Analysis:', errorAnalysis);
      
      // Check for AA33 error (THIS SHOULD NOT HAPPEN DURING AUTH)
      if (error.response?.data?.error?.data?.includes('AA33')) {
        console.error('🚨 AA33 ERROR DURING AUTHENTICATION - THIS IS A BUG!');
        console.error('🚨 Authentication should NOT involve UserOperations or Paymasters!');
        
        setAuthError({
          type: 'CRITICAL_SDK_BUG',
          message: 'AA33 Paymaster Error During Authentication',
          details: 'This is a critical bug in the Okto SDK. Authentication should not involve UserOperations.',
          technicalDetails: errorAnalysis,
          solutions: [
            '🔧 This is likely a bug in the Okto SDK itself',
            '🔧 Try using an older SDK version temporarily',
            '🔧 Contact Okto support immediately',
            '🔧 Check if paymaster/gas sponsorship is incorrectly enabled for auth',
            '🔧 Verify your API keys are for the correct environment',
            '🔧 Check if your Okto project configuration is correct'
          ]
        });
      } else if (error.response?.data) {
        // Check for AA31 error (Paymaster deposit too low)
        if (error.response.data.error.data.includes('AA31')) {
          console.error('🚨 AA31 PAYMASTER ERROR DETECTED');
          console.error('💡 Paymaster deposit is too low');
          console.error('🔍 Current Paymaster:', "0x74324fA6Fa67b833dfdea4C1b3A9898574d076e3");
          
          setAuthError({
            type: 'PAYMASTER_ERROR',
            message: 'Paymaster Deposit Too Low',
            details: 'The paymaster contract does not have enough funds to sponsor the transaction.',
            technicalDetails: errorAnalysis,
            solutions: [
              '🔧 Check if the paymaster contract has sufficient funds',
              '🔧 Verify the paymaster address is correct',
              '🔧 Contact Okto support if the issue persists'
            ]
          });
        } else {
          // Other API errors
          setAuthError({
            type: 'API_ERROR',
            message: error.response.data?.error?.message || 'Authentication API Error',
            details: JSON.stringify(error.response.data, null, 2),
            technicalDetails: errorAnalysis,
            solutions: [
              '🔧 Check your Okto API keys',
              '🔧 Verify your environment configuration (sandbox vs production)',
              '🔧 Ensure your Okto project has sufficient credits',
              '🔧 Check if your project is properly configured in Okto Dashboard'
            ]
          });
        }
      } else {
        // Network or other errors
        setAuthError({
          type: 'NETWORK_ERROR',
          message: error.message || 'Network or configuration error',
          details: error.stack,
          technicalDetails: errorAnalysis,
          solutions: [
            '🔧 Check your internet connection',
            '🔧 Verify environment variables are set correctly',
            '🔧 Try refreshing the page',
            '🔧 Check browser console for additional errors'
          ]
        });
      }
      
      // Clean up stored tokens on error
      localStorage.removeItem("googleIdToken");
      
    } finally {
      // Remove the request interceptor if it was added
      if (interceptor && oktoClient?.axiosInstance?.interceptors) {
        oktoClient.axiosInstance.interceptors.request.eject(interceptor);
        console.log('✅ Request interceptor removed');
      }
      setIsAuthenticating(false);
    }
  }, [oktoClient, navigate]);

  // Check for existing session on mount
  useEffect(() => {
    // If user is already logged in, redirect to home
    if (oktoClient?.isLoggedIn()) {
      console.log('✅ User already logged in, redirecting to home');
      navigate("/home");
      return;
    }

    // Check for stored Google ID token and retry authentication
    const storedToken = localStorage.getItem("googleIdToken");
    if (storedToken && !isAuthenticating) {
      console.log('🔄 Found stored Google token, attempting authentication');
      handleAuthenticate(storedToken);
    }
  }, [oktoClient, navigate, handleAuthenticate, isAuthenticating]);

  const handleGoogleLogin = async (credentialResponse) => {
    console.log('📥 Google OAuth Response:', {
      hasCredential: !!credentialResponse.credential,
      credentialLength: credentialResponse.credential?.length,
      timestamp: new Date().toISOString()
    });

    const idToken = credentialResponse.credential || "";
    if (idToken) {
      console.log('💾 Storing Google ID token');
      localStorage.setItem("googleIdToken", idToken);
      handleAuthenticate(idToken);
    } else {
      console.error('❌ No credential received from Google');
      setAuthError({
        type: 'GOOGLE_ERROR',
        message: 'No credential received from Google login',
        solutions: [
          '🔧 Check your Google Client ID configuration',
          '🔧 Ensure localhost:3000 is in authorized origins',
          '🔧 Try logging in again'
        ]
      });
    }
  };

  const handleGoogleError = () => {
    console.error('❌ Google OAuth failed');
    setAuthError({
      type: 'GOOGLE_ERROR',
      message: 'Google OAuth failed. Please try again.',
      solutions: [
        '🔧 Check your Google Client ID',
        '🔧 Verify authorized origins include localhost:3000',
        '🔧 Check browser console for Google-specific errors'
      ]
    });
  };

  const retryAuthentication = () => {
    console.log('🔄 Retrying authentication...');
    setAuthError(null);
    const storedToken = localStorage.getItem("googleIdToken");
    if (storedToken) {
      handleAuthenticate(storedToken);
    } else {
      console.log('❌ No stored token found for retry');
    }
  };

  const clearAllData = () => {
    console.log('🗑️ Clearing all stored data...');
    localStorage.clear();
    sessionStorage.clear();
    setAuthError(null);
    window.location.reload();
  };

  return (
    <main className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 md:p-12">
      {/* Main Authentication Box */}
      <div className="bg-black border border-gray-800 rounded-lg shadow-xl p-8 w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-white text-center mb-8">
          🚀 ERC-3643 Okto Demo
        </h1>

        <div className="space-y-6">
          {/* Environment Status */}
          <div style={{ 
            padding: '15px', 
            background: '#1a4d1a', 
            borderRadius: '5px',
            border: '1px solid #4CAF50'
          }}>
            <h4 style={{ color: '#4CAF50', marginTop: 0, fontSize: '14px' }}>✅ Configuration Status</h4>
            <div style={{ fontSize: '12px', color: '#cccccc' }}>
              <p>🔑 Okto Keys: {process.env.REACT_APP_OKTO_CLIENT_PRIVATE_KEY ? 'Configured' : 'Missing'}</p>
              <p>🔗 Google OAuth: {process.env.REACT_APP_GOOGLE_CLIENT_ID ? 'Configured' : 'Missing'}</p>
              <p>🌍 Environment: {process.env.REACT_APP_OKTO_ENVIRONMENT || 'sandbox'}</p>
              <p>🌐 Current Origin: {window.location.origin}</p>
              <p>📊 Okto Client: {debugInfo.oktoClient ? 'Loaded' : 'Not Loaded'}</p>
              <p>🔐 Logged In: {debugInfo.isLoggedIn ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {/* Critical Error Display */}
          {authError && (
            <div className={`border rounded-lg p-4 ${
              authError.type === 'CRITICAL_SDK_BUG' 
                ? 'bg-red-900/50 border-red-700 text-red-100'
                : 'bg-red-900/50 border-red-700 text-red-100'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">
                  {authError.type === 'CRITICAL_SDK_BUG' ? '🚨 CRITICAL SDK BUG' : `❌ ${authError.type}`}
                </h4>
                <button
                  onClick={() => setAuthError(null)}
                  className="text-red-300 hover:text-red-100"
                >
                  ✕
                </button>
              </div>
              
              <p className="text-sm mb-2">{authError.message}</p>
              
              {authError.type === 'CRITICAL_SDK_BUG' && (
                <div className="bg-red-950 border border-red-600 p-3 rounded mb-3">
                  <strong>⚠️ Critical Issue:</strong>
                  <p className="text-xs mt-1">
                    AA33 errors should NEVER occur during authentication. This indicates the Okto SDK
                    is incorrectly trying to perform blockchain operations during login.
                  </p>
                </div>
              )}
              
              {authError.solutions && (
                <div className="mt-3">
                  <p className="text-xs font-semibold mb-2">💡 Solutions:</p>
                  <ul className="text-xs space-y-1">
                    {authError.solutions.map((solution, index) => (
                      <li key={index}>• {solution}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {authError.technicalDetails && (
                <details className="mt-3">
                  <summary className="text-xs cursor-pointer text-red-300">🔍 Technical Details</summary>
                  <pre className="text-xs mt-2 bg-red-950 p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(authError.technicalDetails, null, 2)}
                  </pre>
                </details>
              )}
              
              <div className="flex gap-2 mt-3">
                <button
                  onClick={retryAuthentication}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                >
                  🔄 Retry
                </button>
                <button
                  onClick={clearAllData}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded"
                >
                  🗑️ Clear All Data
                </button>
              </div>
            </div>
          )}

          {/* Google Login */}
          <div className="flex flex-col items-center space-y-4">
            <p className="text-gray-400 text-center">
              Sign in with your Google account to access your embedded wallet
            </p>
            
            {isAuthenticating ? (
              <div className="flex items-center space-x-2 text-blue-400">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                <span>Authenticating with Okto...</span>
              </div>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={handleGoogleError}
                theme="filled_black"
                size="large"
                shape="rectangular"
              />
            )}
          </div>

          {/* Debug Information */}
          {process.env.NODE_ENV === 'development' && (
            <details className="bg-gray-800 rounded p-4">
              <summary className="cursor-pointer text-yellow-400 font-semibold">
                🔧 Debug Information (Development Only)
              </summary>
              <pre className="text-xs mt-2 text-gray-300 overflow-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          )}

          {/* Info Section */}
          <div style={{ 
            padding: '15px', 
            background: '#1a3d5c', 
            borderRadius: '5px',
            border: '1px solid #61dafb'
          }}>
            <h4 style={{ color: '#61dafb', marginTop: 0, fontSize: '14px' }}>ℹ️ About This Demo</h4>
            <p style={{ fontSize: '12px', color: '#cccccc', margin: 0 }}>
              This demo showcases ERC-3643 compliant token operations using Okto's embedded wallet infrastructure.
              After authentication, you'll have access to multi-chain token transfers, portfolio management, and compliance checking.
            </p>
          </div>
        </div>
      </div>

      {/* Direct navigation for testing */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => navigate("/home")}
          className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition text-sm"
        >
          🔧 Skip to Homepage (Debug)
        </button>
        <button
          onClick={() => navigate("/test")}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
        >
          🧪 Run Auth Tests
        </button>
      </div>
    </main>
  );
}