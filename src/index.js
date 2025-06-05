// src/index.js - Fixed Okto SDK v2 Setup
import React, { StrictMode } from "react";
import { OktoProvider } from "@okto_web3/react-sdk";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.js";
// import "./index.css";

// Polyfills
import 'buffer';
import process from 'process/browser.js';
import { Buffer } from 'buffer';
window.Buffer = Buffer;

// Add global polyfills
if (!window.global) {
  window.global = window;
}

// Add process polyfill for browser environment
if (!window.process) {
  window.process = process;
}

// Configuration object for Okto SDK v2 - CORRECTED FORMAT
const OKTO_CONFIG = {
  environment: process.env.REACT_APP_OKTO_ENVIRONMENT || "sandbox",
  clientPrivateKey: process.env.REACT_APP_OKTO_CLIENT_PRIVATE_KEY,
  clientSWA: process.env.REACT_APP_OKTO_CLIENT_SWA,
  // Additional v2 specific configurations
  buildType: process.env.REACT_APP_OKTO_ENVIRONMENT === "production" ? "PRODUCTION" : "SANDBOX",
  // Add paymaster configuration
  paymaster: {
    address: "0x74324fA6Fa67b833dfdea4C1b3A9898574d076e3"
  }
};

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

// Enhanced validation function
const validateConfig = () => {
  console.log('🔧 Validating Okto SDK Configuration...');
  
  const missing = [];
  const warnings = [];
  
  // Check required environment variables
  if (!OKTO_CONFIG.clientPrivateKey) missing.push('REACT_APP_OKTO_CLIENT_PRIVATE_KEY');
  if (!OKTO_CONFIG.clientSWA) missing.push('REACT_APP_OKTO_CLIENT_SWA');
  if (!GOOGLE_CLIENT_ID) missing.push('REACT_APP_GOOGLE_CLIENT_ID');
  
  if (missing.length > 0) {
    console.error('❌ Missing critical environment variables:', missing);
    console.error('📝 Create a .env file in your project root with:');
    missing.forEach(variable => {
      console.error(`${variable}=your_value_here`);
    });
    return false;
  }
  
  // Validate key formats
  if (OKTO_CONFIG.clientPrivateKey && !OKTO_CONFIG.clientPrivateKey.startsWith('0x')) {
    warnings.push('CLIENT_PRIVATE_KEY should start with 0x');
  }
  
  if (OKTO_CONFIG.clientSWA && !OKTO_CONFIG.clientSWA.startsWith('0x')) {
    warnings.push('CLIENT_SWA should start with 0x');
  }
  
  // Validate key lengths
  if (OKTO_CONFIG.clientPrivateKey && OKTO_CONFIG.clientPrivateKey.length !== 66) {
    warnings.push('CLIENT_PRIVATE_KEY should be 64 characters (plus 0x prefix)');
  }
  
  if (OKTO_CONFIG.clientSWA && OKTO_CONFIG.clientSWA.length !== 42) {
    warnings.push('CLIENT_SWA should be 40 characters (plus 0x prefix)');
  }
  
  // Display warnings
  if (warnings.length > 0) {
    console.warn('⚠️ Configuration warnings:', warnings);
  }
  
  console.log('✅ All required environment variables present');
  console.log('🔧 Configuration Summary:', {
    environment: OKTO_CONFIG.environment,
    buildType: OKTO_CONFIG.buildType,
    clientPrivateKey: OKTO_CONFIG.clientPrivateKey ? `${OKTO_CONFIG.clientPrivateKey.slice(0, 10)}...` : '[MISSING]',
    clientSWA: OKTO_CONFIG.clientSWA ? `${OKTO_CONFIG.clientSWA.slice(0, 10)}...` : '[MISSING]',
    googleClientId: GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.slice(0, 20)}...` : '[MISSING]'
  });
  
  // Check browser environment
  console.log('🌐 Browser Environment Check:');
  console.log('- Buffer polyfill:', typeof Buffer !== 'undefined' ? '✅' : '❌');
  console.log('- Global polyfill:', typeof window.global !== 'undefined' ? '✅' : '❌');
  console.log('- Process polyfill:', typeof window.process !== 'undefined' ? '✅' : '❌');
  
  return true;
};

// Enhanced Error Boundary Component
class OktoErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 Okto Error Boundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Analyze specific error types
    if (error.message.includes('AA33')) {
      console.error('🚨 AA33 PAYMASTER ERROR DETECTED');
      console.error('💡 This error should NOT occur during authentication!');
      console.error('🔍 Possible causes:');
      console.error('1. SDK is incorrectly triggering UserOperation during auth');
      console.error('2. Paymaster configuration is interfering with auth');
      console.error('3. Environment/network mismatch');
      console.error('4. Insufficient Okto credits or wrong API keys');
    }
    
    if (error.message.includes('Buffer')) {
      console.error('🚨 Buffer polyfill issue detected');
      console.error('💡 Make sure Buffer is properly polyfilled');
    }
    
    if (error.message.includes('Cannot read properties of undefined')) {
      console.error('🚨 SDK initialization issue detected');
      console.error('💡 Check if all environment variables are properly set');
    }
  }

  render() {
    if (this.state.hasError) {
      const isAA33Error = this.state.error?.message?.includes('AA33');
      
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'Arial, sans-serif',
          background: '#1a1a1a',
          color: 'white',
          textAlign: 'center',
          padding: '20px'
        }}>
          <h1 style={{ 
            color: isAA33Error ? '#ff6b6b' : '#ff4444', 
            marginBottom: '20px',
            fontSize: '2rem'
          }}>
            {isAA33Error ? '🚨 AA33 Authentication Error' : '🚨 Okto SDK Error'}
          </h1>
          
          <div style={{
            background: '#2a2a2a',
            padding: '30px',
            borderRadius: '10px',
            maxWidth: '800px',
            border: `2px solid ${isAA33Error ? '#ff6b6b' : '#444'}`,
            textAlign: 'left'
          }}>
            {isAA33Error ? (
              <>
                <h2 style={{ color: '#ff6b6b', marginTop: 0 }}>Critical SDK Issue Detected</h2>
                <div style={{
                  background: '#3d1a1a',
                  padding: '15px',
                  borderRadius: '5px',
                  marginBottom: '20px',
                  border: '1px solid #ff6b6b'
                }}>
                  <strong>⚠️ AA33 errors should NEVER occur during authentication!</strong>
                  <p style={{ margin: '10px 0' }}>
                    This indicates the Okto SDK is incorrectly trying to perform a UserOperation 
                    during the login process, which is a serious bug.
                  </p>
                </div>
              </>
            ) : (
              <h2 style={{ color: '#61dafb', marginTop: 0 }}>SDK Initialization Error</h2>
            )}
            
            <div style={{
              background: '#1a1a1a',
              padding: '15px',
              borderRadius: '5px',
              fontFamily: 'monospace',
              fontSize: '12px',
              marginBottom: '20px',
              overflow: 'auto',
              maxHeight: '200px'
            }}>
              <strong>Error:</strong> {this.state.error?.message}
              {this.state.errorInfo && (
                <details style={{ marginTop: '10px' }}>
                  <summary style={{ cursor: 'pointer', color: '#61dafb' }}>Stack Trace</summary>
                  <pre style={{ fontSize: '10px', marginTop: '5px' }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <h3 style={{ color: '#61dafb' }}>Immediate Actions:</h3>
            <ol style={{ lineHeight: 1.8, fontSize: '14px' }}>
              {isAA33Error ? (
                <>
                  <li><strong>Contact Okto Support</strong> - This is likely a SDK bug</li>
                  <li><strong>Check SDK Version</strong> - Try downgrading to a stable version</li>
                  <li><strong>Verify API Keys</strong> - Ensure they're for the correct environment</li>
                  <li><strong>Test Without Paymaster</strong> - Disable gas sponsorship temporarily</li>
                </>
              ) : (
                <>
                  <li><strong>Verify Environment Variables</strong> - Check all REACT_APP_ prefixed vars</li>
                  <li><strong>Check Network Connection</strong> - Ensure you can reach Okto APIs</li>
                  <li><strong>Clear Browser Cache</strong> - Hard refresh (Ctrl+Shift+R)</li>
                  <li><strong>Check Console</strong> - Look for additional error details</li>
                </>
              )}
            </ol>

            <div style={{ 
              display: 'flex', 
              gap: '10px', 
              marginTop: '20px',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#61dafb',
                  color: '#1a1a1a',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🔄 Reload Page
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.reload();
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ff6b6b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🗑️ Clear Storage & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Render application only if configuration is valid
if (validateConfig()) {
  console.log('🚀 Starting Okto React App...');
  
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <BrowserRouter>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <OktoErrorBoundary>
            <OktoProvider config={OKTO_CONFIG}>
              <App />
            </OktoProvider>
          </OktoErrorBoundary>
        </GoogleOAuthProvider>
      </BrowserRouter>
    </StrictMode>
  );
} else {
  // Show configuration error page
  createRoot(document.getElementById("root")).render(
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif',
      background: '#1a1a1a',
      color: 'white',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h1 style={{ color: '#ff4444', marginBottom: '20px' }}>⚠️ Configuration Error</h1>
      <div style={{
        background: '#2a2a2a',
        padding: '30px',
        borderRadius: '10px',
        maxWidth: '600px',
        border: '2px solid #444'
      }}>
        <h2 style={{ color: '#61dafb', marginTop: 0 }}>Missing Environment Variables</h2>
        <p>Please check the console for detailed configuration requirements.</p>
      </div>
    </div>
  );
}