// src/App.js - Based on Official Okto Template Repository
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { useOkto } from "@okto_web3/react-sdk";
import './App.css';
import LoginPage from './LoginPage';
import Homepage from './Homepage';
import SimpleAuthTest from './SimpleAuthTest';

function App() {
  const oktoClient = useOkto();
  
  // Check if user is already logged in
  const isLoggedIn = oktoClient.isLoggedIn();

  console.log('🔍 App Component Status:');
  console.log('- Okto Client:', oktoClient ? 'Loaded' : 'Not loaded');
  console.log('- Is Logged In:', isLoggedIn);
  console.log('- User SWA:', oktoClient.userSWA || 'Not available');

  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/home" element={<Homepage />} />
      <Route path="/test" element={<SimpleAuthTest />} />
    </Routes>
  );
}

export default App;