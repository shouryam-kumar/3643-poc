// src/index.js - Updated with better error handling and debug info
import React, { StrictMode } from "react";
import { OktoProvider } from "@okto_web3/react-sdk";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.js";
import "./index.css";

// CRITICAL: Add Buffer polyfill for Create React App
import { Buffer } from 'buffer';
window.Buffer = Buffer;

// Also add global polyfills if needed
if (!window.global) {
  window.global = window;
}

// Configuration object for Okto SDK
const config = {
  environment: process.env.REACT_APP_OKTO_ENVIRONMENT || "sandbox",
  clientPrivateKey: process.env.REACT_APP_OKTO_CLIENT_PRIVATE_KEY,
  clientSWA: process.env.REACT_APP_OKTO_CLIENT_SWA,
};

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

// Validation function with additional debug info
const validateConfig = () => {
  const missing = [];
  
  if (!config.clientPrivateKey) missing.push('REACT_APP_OKTO_CLIENT_PRIVATE_KEY');
  if (!config.clientSWA) missing.push('REACT_APP_OKTO_CLIENT_SWA');
  if (!GOOGLE_CLIENT_ID) missing.push('REACT_APP_GOOGLE_CLIENT_ID');
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing);
    return false;
  }
  
  console.log('✅ All environment variables present');
  console.log('🔧 Config:', {
    environment: config.environment,
    clientPrivateKey: config.clientPrivateKey ? `${config.clientPrivateKey.slice(0, 10)}...` : '[MISSING]',
    clientSWA: config.clientSWA ? `${config.clientSWA.slice(0, 10)}...` : '[MISSING]',
    googleClientId: GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.slice(0, 20)}...` : '[MISSING]'
  });
  
  // Additional validation for key formats
  if (config.clientPrivateKey && !config.clientPrivateKey.startsWith('0x')) {
    console.warn('⚠️ CLIENT_PRIVATE_KEY should start with 0x');
  }
  
  if (config.clientSWA && !config.clientSWA.startsWith('0x')) {
    console.warn('⚠️ CLIENT_SWA should start with 0x');
  }
  
  // Debug: Check if Buffer is available
  console.log('🔧 Buffer polyfill:', typeof Buffer !== 'undefined' ? '✅ Available' : '❌ Missing');
  console.log('🔧 Global polyfill:', typeof window.global !== 'undefined' ? '✅ Available' : '❌ Missing');
  
  return true;
};

// Error Boundary Component
class OktoErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 Okto Error Boundary caught an error:', error, errorInfo);
    
    // Check for specific Okto errors
    if (error.message.includes('AA33')) {
      console.error('🚨 AA33 Error - This is typically a paymaster/gas issue');
      console.error('💡 Solutions:');
      console.error('1. Check if your Okto project has sufficient credits');
      console.error('2. Verify your API keys are correct and active');
      console.error('3. Ensure your project is properly configured in Okto Dashboard');
    }
  }

  render() {
    if (this.state.hasError) {
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
          <h1 style={{ color: '#ff4444', marginBottom: '20px' }}>🚨 Okto SDK Error</h1>
          <div style={{
            background: '#2a2a2a',
            padding: '30px',
            borderRadius: '10px',
            maxWidth: '600px',
            border: '2px solid #444'
          }}>
            <h2 style={{ color: '#61dafb', marginTop: 0 }}>Authentication Error</h2>
            <p style={{ marginBottom: '20px' }}>
              {this.state.error?.message?.includes('AA33') ? 
                'This appears to be a paymaster/gas configuration issue with your Okto project.' :
                'An error occurred while initializing the Okto SDK.'
              }
            </p>
            
            <div style={{
              background: '#1a1a1a',
              padding: '15px',
              borderRadius: '5px',
              textAlign: 'left',
              fontFamily: 'monospace',
              fontSize: '12px',
              marginBottom: '20px'
            }}>
              <strong>Error:</strong> {this.state.error?.message}
            </div>

            <h3 style={{ color: '#61dafb' }}>Troubleshooting Steps:</h3>
            <ol style={{ textAlign: 'left', lineHeight: 1.6, fontSize: '14px' }}>
              <li>Check your <strong>Okto Dashboard</strong> at <a href="https://dashboard.okto.tech" style={{color: '#61dafb'}}>dashboard.okto.tech</a></li>
              <li>Verify your project has <strong>sufficient credits</strong></li>
              <li>Ensure <strong>API keys are active</strong> and correctly copied</li>
              <li>Check if <strong>sandbox environment</strong> is properly configured</li>
              <li>Try <strong>refreshing the page</strong> and logging in again</li>
            </ol>

            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                backgroundColor: '#61dafb',
                color: '#1a1a1a',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🔄 Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Only render the app if configuration is valid
if (validateConfig()) {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <BrowserRouter>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <OktoErrorBoundary>
            <OktoProvider config={config}>
              <App />
            </OktoProvider>
          </OktoErrorBoundary>
        </GoogleOAuthProvider>
      </BrowserRouter>
    </StrictMode>
  );
}