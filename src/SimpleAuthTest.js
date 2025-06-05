// src/SimpleAuthTest.js - Minimal authentication test
import React, { useState } from 'react';
import { useOkto } from "@okto_web3/react-sdk";
import { GoogleLogin } from "@react-oauth/google";

export default function SimpleAuthTest() {
  const oktoClient = useOkto();
  const [testResult, setTestResult] = useState(null);
  const [isTestRunning, setIsTestRunning] = useState(false);

  // Test 1: Check Okto Client Status
  const testOktoClient = () => {
    const result = {
      timestamp: new Date().toISOString(),
      test: 'Okto Client Status',
      oktoClient: !!oktoClient,
      isLoggedIn: oktoClient?.isLoggedIn() || false,
      userSWA: oktoClient?.userSWA || null,
      clientSWA: oktoClient?.clientSWA || null,
      environment: process.env.REACT_APP_OKTO_ENVIRONMENT,
      hasPrivateKey: !!process.env.REACT_APP_OKTO_CLIENT_PRIVATE_KEY,
      hasClientSWA: !!process.env.REACT_APP_OKTO_CLIENT_SWA,
      hasGoogleId: !!process.env.REACT_APP_GOOGLE_CLIENT_ID
    };
    
    setTestResult(result);
    console.log('🧪 Okto Client Test:', result);
  };

  // Test 2: Minimal Google OAuth Test
  const handleGoogleLoginTest = async (credentialResponse) => {
    setIsTestRunning(true);
    setTestResult(null);

    const testLog = {
      timestamp: new Date().toISOString(),
      test: 'Google OAuth + Okto Auth',
      steps: []
    };

    try {
      // Step 1: Validate Google Token
      testLog.steps.push({
        step: 1,
        action: 'Google OAuth',
        status: 'SUCCESS',
        data: {
          hasCredential: !!credentialResponse.credential,
          tokenLength: credentialResponse.credential?.length || 0
        }
      });

      const idToken = credentialResponse.credential;
      if (!idToken) {
        throw new Error('No Google ID token received');
      }

      // Step 2: Attempt Okto Authentication (MINIMAL)
      testLog.steps.push({
        step: 2,
        action: 'Starting Okto Authentication',
        status: 'IN_PROGRESS',
        authParams: {
          provider: 'google',
          hasIdToken: !!idToken,
          environment: process.env.REACT_APP_OKTO_ENVIRONMENT
        }
      });

      // This is where the AA33 error should occur
      const authResult = await oktoClient.loginUsingOAuth(
        { 
          idToken: idToken, 
          provider: "google" 
        },
        (session) => {
          testLog.steps.push({
            step: 3,
            action: 'Session Callback',
            status: 'SUCCESS',
            sessionData: {
              hasSession: !!session,
              sessionKeys: session ? Object.keys(session) : []
            }
          });
        }
      );

      // If we get here, authentication succeeded
      testLog.steps.push({
        step: 4,
        action: 'Authentication Complete',
        status: 'SUCCESS',
        result: {
          hasAuthResult: !!authResult,
          userSWA: oktoClient.userSWA,
          isLoggedIn: oktoClient.isLoggedIn()
        }
      });

      testLog.overallStatus = 'SUCCESS';
      testLog.conclusion = 'Authentication completed successfully - no AA33 error!';

    } catch (error) {
      // Capture the exact error
      testLog.steps.push({
        step: 'ERROR',
        action: 'Authentication Failed',
        status: 'FAILED',
        error: {
          message: error.message,
          code: error.code,
          hasResponse: !!error.response,
          responseStatus: error.response?.status,
          responseData: error.response?.data,
          isAA33Error: error.response?.data?.error?.data?.includes('AA33') || false
        }
      });

      testLog.overallStatus = 'FAILED';
      
      if (error.response?.data?.error?.data?.includes('AA33')) {
        testLog.conclusion = 'AA33 ERROR DURING LOGIN - This should NOT happen! Authentication should not involve UserOperations.';
      } else {
        testLog.conclusion = `Different authentication error: ${error.message}`;
      }
    } finally {
      setIsTestRunning(false);
      setTestResult(testLog);
      console.log('🧪 Authentication Test Complete:', testLog);
    }
  };

  const handleGoogleError = () => {
    setTestResult({
      timestamp: new Date().toISOString(),
      test: 'Google OAuth Error',
      overallStatus: 'FAILED',
      conclusion: 'Google OAuth failed - check Google Client ID configuration'
    });
  };

  const clearResults = () => {
    setTestResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          🧪 Okto Authentication Debug Test
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Test Controls */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
            
            <div className="space-y-4">
              <button
                onClick={testOktoClient}
                className="w-full p-3 bg-blue-600 hover:bg-blue-700 rounded text-white"
              >
                🔍 Test 1: Check Okto Client Status
              </button>

              <div className="border-t border-gray-600 pt-4">
                <p className="text-sm text-gray-300 mb-3">Test 2: Minimal Authentication</p>
                {isTestRunning ? (
                  <div className="flex items-center justify-center p-3 bg-yellow-600 rounded">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Running Authentication Test...
                  </div>
                ) : (
                  <GoogleLogin
                    onSuccess={handleGoogleLoginTest}
                    onError={handleGoogleError}
                    theme="filled_black"
                    size="large"
                    shape="rectangular"
                  />
                )}
              </div>

              <button
                onClick={clearResults}
                className="w-full p-2 bg-gray-600 hover:bg-gray-700 rounded text-white text-sm"
              >
                🗑️ Clear Results
              </button>
            </div>
          </div>

          {/* Test Results */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            
            {testResult ? (
              <div className="space-y-4">
                <div className="bg-gray-700 rounded p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">{testResult.test}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${
                      testResult.overallStatus === 'SUCCESS' 
                        ? 'bg-green-600' 
                        : testResult.overallStatus === 'FAILED'
                        ? 'bg-red-600'
                        : 'bg-yellow-600'
                    }`}>
                      {testResult.overallStatus || 'INFO'}
                    </span>
                  </div>
                  
                  {testResult.conclusion && (
                    <div className={`p-3 rounded text-sm mb-3 ${
                      testResult.conclusion.includes('AA33') 
                        ? 'bg-red-900 border border-red-600'
                        : testResult.overallStatus === 'SUCCESS'
                        ? 'bg-green-900 border border-green-600'
                        : 'bg-yellow-900 border border-yellow-600'
                    }`}>
                      <strong>Conclusion:</strong> {testResult.conclusion}
                    </div>
                  )}

                  <div className="max-h-96 overflow-y-auto">
                    <pre className="text-xs bg-gray-900 p-3 rounded overflow-x-auto">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-center py-8">
                No test results yet. Run a test to see detailed output.
              </div>
            )}
          </div>
        </div>

        {/* Environment Info */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Current Configuration</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Environment:</span>
              <div className="font-mono">{process.env.REACT_APP_OKTO_ENVIRONMENT || 'not set'}</div>
            </div>
            <div>
              <span className="text-gray-400">Private Key:</span>
              <div className="font-mono">{process.env.REACT_APP_OKTO_CLIENT_PRIVATE_KEY ? 'SET' : 'NOT SET'}</div>
            </div>
            <div>
              <span className="text-gray-400">Client SWA:</span>
              <div className="font-mono">{process.env.REACT_APP_OKTO_CLIENT_SWA ? 'SET' : 'NOT SET'}</div>
            </div>
            <div>
              <span className="text-gray-400">Google ID:</span>
              <div className="font-mono">{process.env.REACT_APP_GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}