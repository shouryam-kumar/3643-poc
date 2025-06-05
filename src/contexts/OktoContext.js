// src/contexts/OktoContext.js - Official Okto implementation
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useOkto, getAccount, getPortfolio, tokenTransfer } from '@okto_web3/react-sdk';

const OktoContext = createContext();

// Action types
const OKTO_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  SET_PORTFOLIO: 'SET_PORTFOLIO',
  SET_ACCOUNTS: 'SET_ACCOUNTS',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Initial state
const initialState = {
  isLoggedIn: false,
  userSWA: null,
  portfolio: null,
  accounts: [],
  loading: false,
  error: ''
};

// Reducer
const oktoReducer = (state, action) => {
  switch (action.type) {
    case OKTO_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case OKTO_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    
    case OKTO_ACTIONS.LOGIN_SUCCESS:
      return { 
        ...state, 
        isLoggedIn: true, 
        userSWA: action.payload.userSWA,
        loading: false,
        error: ''
      };
    
    case OKTO_ACTIONS.LOGOUT:
      return { 
        ...state, 
        isLoggedIn: false, 
        userSWA: null, 
        portfolio: null,
        accounts: [],
        error: ''
      };
    
    case OKTO_ACTIONS.SET_PORTFOLIO:
      return { ...state, portfolio: action.payload, loading: false };
    
    case OKTO_ACTIONS.SET_ACCOUNTS:
      return { ...state, accounts: action.payload, loading: false };
    
    case OKTO_ACTIONS.CLEAR_ERROR:
      return { ...state, error: '' };
    
    default:
      return state;
  }
};

// Context Provider Component
export const OktoProvider = ({ children }) => {
  const [state, dispatch] = useReducer(oktoReducer, initialState);
  const oktoClient = useOkto();

  // Sync with Okto client state
  useEffect(() => {
    if (oktoClient.userSWA && !state.isLoggedIn) {
      dispatch({ 
        type: OKTO_ACTIONS.LOGIN_SUCCESS, 
        payload: { userSWA: oktoClient.userSWA } 
      });
    } else if (!oktoClient.userSWA && state.isLoggedIn) {
      dispatch({ type: OKTO_ACTIONS.LOGOUT });
    }
  }, [oktoClient.userSWA, state.isLoggedIn]);

  // Login with Google OAuth
  const loginWithGoogle = async (credentialResponse) => {
    dispatch({ type: OKTO_ACTIONS.SET_LOADING, payload: true });
    dispatch({ type: OKTO_ACTIONS.CLEAR_ERROR });

    try {
      await oktoClient.loginUsingOAuth({
        idToken: credentialResponse.credential,
        provider: 'google',
      });
      
      dispatch({ 
        type: OKTO_ACTIONS.LOGIN_SUCCESS, 
        payload: { userSWA: oktoClient.userSWA } 
      });
    } catch (err) {
      dispatch({ 
        type: OKTO_ACTIONS.SET_ERROR, 
        payload: 'Authentication failed: ' + err.message 
      });
    }
  };

  // Logout
  const logout = async () => {
    try {
      await oktoClient.logout();
      dispatch({ type: OKTO_ACTIONS.LOGOUT });
    } catch (err) {
      dispatch({ 
        type: OKTO_ACTIONS.SET_ERROR, 
        payload: 'Logout failed: ' + err.message 
      });
    }
  };

  // Get Portfolio and Accounts
  const fetchUserData = async () => {
    if (!oktoClient.userSWA) {
      dispatch({ type: OKTO_ACTIONS.SET_ERROR, payload: 'User not authenticated' });
      return;
    }

    dispatch({ type: OKTO_ACTIONS.SET_LOADING, payload: true });
    dispatch({ type: OKTO_ACTIONS.CLEAR_ERROR });

    try {
      // Get user's accounts
      const userAccounts = await getAccount(oktoClient);
      dispatch({ type: OKTO_ACTIONS.SET_ACCOUNTS, payload: userAccounts.data || [] });
      
      // Get user's portfolio
      const userPortfolio = await getPortfolio(oktoClient);
      dispatch({ type: OKTO_ACTIONS.SET_PORTFOLIO, payload: userPortfolio });
    } catch (err) {
      dispatch({ 
        type: OKTO_ACTIONS.SET_ERROR, 
        payload: 'Failed to fetch data: ' + err.message 
      });
    }
  };

  // Token Transfer
  const transferToken = async (transferData) => {
    if (!oktoClient.userSWA) {
      dispatch({ type: OKTO_ACTIONS.SET_ERROR, payload: 'User not authenticated' });
      return null;
    }

    dispatch({ type: OKTO_ACTIONS.SET_LOADING, payload: true });
    dispatch({ type: OKTO_ACTIONS.CLEAR_ERROR });

    try {
      const result = await tokenTransfer(oktoClient, transferData);
      dispatch({ type: OKTO_ACTIONS.SET_LOADING, payload: false });
      return result;
    } catch (err) {
      dispatch({ 
        type: OKTO_ACTIONS.SET_ERROR, 
        payload: 'Transfer failed: ' + err.message 
      });
      return null;
    }
  };

  const clearError = () => {
    dispatch({ type: OKTO_ACTIONS.CLEAR_ERROR });
  };

  const value = {
    ...state,
    oktoClient,
    loginWithGoogle,
    logout,
    fetchUserData,
    transferToken,
    clearError
  };

  return (
    <OktoContext.Provider value={value}>
      {children}
    </OktoContext.Provider>
  );
};

// Custom hook to use Okto context
export const useOktoContext = () => {
  const context = useContext(OktoContext);
  if (!context) {
    throw new Error('useOktoContext must be used within an OktoProvider');
  }
  return context;
};