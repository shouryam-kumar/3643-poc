// src/LoginPage.js - Fixed React Hook dependencies and Google OAuth
import { useOkto } from "@okto_web3/react-sdk";
import { GoogleLogin } from "@react-oauth/google";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const oktoClient = useOkto();
  const navigate = useNavigate();
  const [authError, setAuthError] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Wrap handleAuthenticate in useCallback to fix React Hook dependency warning
  const handleAuthenticate = useCallback(async (idToken) => {
    setIsAuthenticating(true);
    setAuthError(null);
    
    try {
      console.log('🔐 Authenticating with Okto...');
      console.log('🔑 Using environment:', process.env.REACT_APP_OKTO_ENVIRONMENT);
      
      const user = await oktoClient.loginUsingOAuth(
        { idToken, provider: "google" },
        (session) => {
          console.log('💾 Storing session:', session);
          localStorage.setItem("okto_session", JSON.stringify(session));
        }
      );
      
      console.log('✅ Authentication successful:', user);
      navigate("/home");
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      
      // Enhanced error logging
      if (error.response) {
        console.error('📊 Error Response Data:', error.response.data);
        console.error('📊 Error Status:', error.response.status);
        console.error('📊 Error Headers:', error.response.headers);
        
        // Check for specific AA33 error
        if (error.response.data?.error?.data?.includes('AA33')) {
          setAuthError({
            type: 'AA33_PAYMASTER_ERROR',
            message: 'Okto project configuration issue - insufficient credits or paymaster misconfiguration.',
            details: error.response.data.error.data,
            solutions: [
              '🔧 Check your Okto Dashboard for sufficient credits',
              '🔧 Verify gas sponsorship is enabled in your project',
              '🔧 Ensure API keys are active and correctly configured',
              '🔧 Try regenerating your API keys',
              '🔧 Contact Okto support if issue persists'
            ]
          });
        } else {
          setAuthError({
            type: 'API_ERROR',
            message: error.response.data?.error?.message || 'Authentication failed',
            details: JSON.stringify(error.response.data, null, 2)
          });
        }
      } else {
        setAuthError({
          type: 'NETWORK_ERROR',
          message: error.message || 'Network or configuration error',
          details: error.stack
        });
      }
      
      localStorage.removeItem("googleIdToken");
    } finally {
      setIsAuthenticating(false);
    }
  }, [oktoClient, navigate]); // Dependencies for useCallback

  useEffect(() => {
    // If user is already logged in, redirect to home
    if (oktoClient.isLoggedIn()) {
      console.log('✅ User already logged in, redirecting to home');
      navigate("/home");
      return;
    }

    // Check for stored Google ID token
    const storedToken = localStorage.getItem("googleIdToken");
    if (storedToken) {
      console.log('🔄 Found stored Google token, attempting authentication');
      handleAuthenticate(storedToken);
    }
  }, [oktoClient, navigate, handleAuthenticate]); // Now handleAuthenticate is properly included

  const handleGoogleLogin = async (credentialResponse) => {
    const idToken = credentialResponse.credential || "";
    if (idToken) {
      console.log('📥 Google login successful, storing token');
      localStorage.setItem("googleIdToken", idToken);
      handleAuthenticate(idToken);
    } else {
      console.error('❌ No credential received from Google');
      setAuthError({
        type: 'GOOGLE_ERROR',
        message: 'No credential received from Google login'
      });
    }
  };

  const handleGoogleError = () => {
    console.error('❌ Google login failed');
    setAuthError({
      type: 'GOOGLE_ERROR',
      message: 'Google login failed. Please try again.'
    });
  };

  const retryAuthentication = () => {
    setAuthError(null);
    const storedToken = localStorage.getItem("googleIdToken");
    if (storedToken) {
      handleAuthenticate(storedToken);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 md:p-12">
      {/* Main Authentication Box */}
      <div className="bg-black border border-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-white text-center mb-8">
          🚀 ERC-3643 Okto Demo
        </h1>

        <div className="space-y-6">
          {/* Google OAuth Configuration Warning */}
          <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-100 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">⚠️ Google OAuth Configuration Required</h4>
            <p className="text-sm mb-2">
              Your Google Client ID needs to be configured for localhost:3000
            </p>
            <ol className="text-xs space-y-1">
              <li>1. Go to <a href="https://console.cloud.google.com" className="text-yellow-300 underline" target="_blank" rel="noopener noreferrer">Google Cloud Console</a></li>
              <li>2. Navigate to APIs & Services → Credentials</li>
              <li>3. Edit your OAuth 2.0 Client ID</li>
              <li>4. Add <code className="bg-yellow-800 px-1 rounded">http://localhost:3000</code> to Authorized JavaScript origins</li>
              <li>5. Save and try logging in again</li>
            </ol>
          </div>

          {/* Error Display */}
          {authError && (
            <div className="bg-red-900/50 border border-red-700 text-red-100 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">❌ {authError.type}</h4>
                <button
                  onClick={() => setAuthError(null)}
                  className="text-red-300 hover:text-red-100"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm mb-2">{authError.message}</p>
              
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
              
              {authError.details && (
                <details className="mt-3">
                  <summary className="text-xs cursor-pointer text-red-300">🔍 Technical Details</summary>
                  <pre className="text-xs mt-2 bg-red-950 p-2 rounded overflow-auto max-h-32">
                    {authError.details}
                  </pre>
                </details>
              )}
              
              <button
                onClick={retryAuthentication}
                className="mt-3 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
              >
                🔄 Retry Authentication
              </button>
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

          {/* Environment Status */}
          <div style={{ 
            marginTop: '20px', 
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
            </div>
          </div>

          {/* Info Section */}
          <div style={{ 
            marginTop: '20px', 
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
      <button
        onClick={() => navigate("/home")}
        className="mt-4 px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition text-sm"
      >
        🔧 Skip to Homepage (Debug)
      </button>
    </main>
  );
}