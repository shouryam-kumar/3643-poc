// src/LoginPage.js - Fixed React Hook dependencies and Google OAuth
import { useOkto } from "@okto_web3/react-sdk";
import { GoogleLogin } from "@react-oauth/google";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import './LoginPage.css'; // Import the vanilla CSS file

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
    <div className="login-page-container">
      {/* Main Authentication Box */}
      <div className="login-box">{/* Login box container */}
        <h1 className="login-title">{/* Title */}
          🚀 ERC-3643 Okto Demo
        </h1>

        <div className="login-content-area">{/* Content area with spacing */}

          {/* Error Display */}
          {authError && (
            <div className="error-message-box">{/* Error container */}
              <div className="error-message-header">{/* Error header */}
                <h4 className="error-message-title">❌ {authError.type}</h4>
                <button
                  onClick={() => setAuthError(null)}
                  className="error-message-close"
                >
                  ✕
                </button>
              </div>
              <p className="error-message-text">{authError.message}</p>
              
              {authError.solutions && (
                <div className="error-solutions">{/* Solutions container */}
                  <p className="error-solutions-title">💡 Solutions:</p>
                  <ul className="error-solutions-list">
                    {authError.solutions.map((solution, index) => (
                      <li key={index} className="error-solution-item">• {solution}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {authError.details && (
                <details className="error-details">{/* Details container */}
                  <summary className="error-details-summary">🔍 Technical Details</summary>
                  <pre className="error-details-code">
                    {authError.details}
                  </pre>
                </details>
              )}
              
              <button
                onClick={retryAuthentication}
                className="error-retry-button"
              >
                🔄 Retry Authentication
              </button>
            </div>
          )}

          {/* Google Login */}
          <div className="google-login-section">{/* Google login section */}
            <p className="google-login-subtitle">{/* Subtitle */}
              Sign in with your Google account to access your embedded wallet
            </p>
            
            {isAuthenticating ? (
              <div className="loading-message">{/* Loading state */}
                <div className="loading-spinner"></div>{/* Spinner */}
                <span>Authenticating with Okto...</span>
              </div>
            ) : (
              <div className="google-login-button-container">
                 <GoogleLogin
                    onSuccess={handleGoogleLogin}
                    onError={handleGoogleError}
                    theme="filled_black"
                    size="large"
                    shape="rectangular"
                 />
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="info-box">{/* Info container */}
            <h4 className="info-box-title">ℹ️ About This Demo</h4>
            <p className="info-box-text">
              This demo showcases ERC-3643 compliant token operations using Okto's embedded wallet infrastructure.
              After authentication, you'll have access to multi-chain token transfers, portfolio management, and compliance checking.
            </p>
          </div>
        </div>
      </div>

      {/* Direct navigation for testing */}
      {/* Removing debug button as it's not part of core login UI */}
      {/* <button
        onClick={() => navigate("/home")}
        className="mt-4 px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition text-sm"
      >
        Skip to Homepage (Debug)
      </button> */}
    </div>
  );
}