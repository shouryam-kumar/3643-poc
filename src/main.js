// src/main.js - Based on Official Okto Template Repository
import { OktoProvider } from "@okto_web3/react-sdk";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

// Configuration object for Okto SDK
const config = {
  environment: import.meta.env.VITE_OKTO_ENVIRONMENT || "sandbox",
  clientPrivateKey: import.meta.env.VITE_OKTO_CLIENT_PRIVATE_KEY,
  clientSWA: import.meta.env.VITE_OKTO_CLIENT_SWA,
};

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Validation function
const validateConfig = () => {
  const missing = [];
  
  if (!config.clientPrivateKey) missing.push('VITE_OKTO_CLIENT_PRIVATE_KEY');
  if (!config.clientSWA) missing.push('VITE_OKTO_CLIENT_SWA');
  if (!GOOGLE_CLIENT_ID) missing.push('VITE_GOOGLE_CLIENT_ID');
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing);
    console.error('📝 Please create a .env file with the following variables:');
    missing.forEach(variable => {
      console.error(`${variable}=your_value_here`);
    });
    
    // Show a user-friendly error page
    document.body.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: Arial, sans-serif; background: #1a1a1a; color: white; text-align: center; padding: 20px;">
        <h1 style="color: #ff4444; margin-bottom: 20px;">⚠️ Configuration Error</h1>
        <div style="background: #2a2a2a; padding: 30px; border-radius: 10px; max-width: 600px; border: 2px solid #444;">
          <h2 style="color: #61dafb; margin-top: 0;">Missing Environment Variables</h2>
          <p style="margin-bottom: 20px;">Please create a <code style="background: #333; padding: 2px 6px; border-radius: 3px;">.env</code> file in your project root with:</p>
          <div style="background: #1a1a1a; padding: 15px; border-radius: 5px; text-align: left; font-family: monospace; font-size: 14px; margin-bottom: 20px;">
            ${missing.map(variable => `${variable}=your_value_here`).join('<br>')}
          </div>
          <h3 style="color: #61dafb;">How to get these values:</h3>
          <ul style="text-align: left; line-height: 1.6;">
            <li><strong>Okto Keys:</strong> Visit <a href="https://docs.okto.tech" style="color: #61dafb;">docs.okto.tech</a> → Create account → Get API keys</li>
            <li><strong>Google Client ID:</strong> Visit <a href="https://console.cloud.google.com" style="color: #61dafb;">Google Cloud Console</a> → Create OAuth 2.0 credentials</li>
          </ul>
          <p style="margin-top: 20px; color: #888;">After adding the .env file, restart the development server with <code style="background: #333; padding: 2px 6px; border-radius: 3px;">npm start</code></p>
        </div>
      </div>
    `;
    return false;
  }
  
  console.log('✅ All environment variables present');
  console.log('🔧 Config:', {
    environment: config.environment,
    clientPrivateKey: config.clientPrivateKey ? '[SET]' : '[MISSING]',
    clientSWA: config.clientSWA ? '[SET]' : '[MISSING]',
    googleClientId: GOOGLE_CLIENT_ID ? '[SET]' : '[MISSING]'
  });
  
  return true;
};

// Only render the app if configuration is valid
if (validateConfig()) {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <BrowserRouter>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <OktoProvider config={config}>
            <App />
          </OktoProvider>
        </GoogleOAuthProvider>
      </BrowserRouter>
    </StrictMode>
  );
}