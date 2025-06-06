# 🚀 Okto SDK Integration Demo with ERC-3643 Features

This project is a sample React application built to demonstrate the integration of the Okto Web3 React SDK, showcasing core wallet functionalities and a conceptual implementation for ERC-3643 compliant token operations.

It provides a user interface to:
- Authenticate using Google OAuth.
- Manage multi-chain accounts.
- Query portfolio and token balances.
- Perform Token Transfers.
- Execute Raw EVM Transactions.
- Track Transaction History.

## ✨ Features

*   **Google OAuth Authentication**: Secure user login via Google.
*   **Multi-chain Wallet**: Interact with different EVM-compatible networks.
*   **Token Transfer**: Easily send tokens to a recipient address, with built-in handling for token decimals.
*   **Raw Transaction**: Construct and send custom EVM raw transactions (e.g., native token transfers, contract interactions).
*   **Transaction History & Tracker**: View recent transactions and track specific job IDs.
*   **ERC-3643 Integration Concept**: Includes placeholder/demonstration logic for compliance checks (Note: The actual ERC-3643 compliance requires a full Identity Registry and rule engine implementation, which is beyond the scope of this basic template).

##  prerequisites

Before you begin, ensure you have met the following requirements:

*   Node.js and npm (or yarn) installed on your system.
*   An Okto Developer Account and an API Key.
*   A Google Cloud Project with OAuth Consent Screen and credentials configured for a Web application, providing you with a Google Client ID.

## 🛠️ Setup

1.  **Clone the repository:**

    ```bash
    git clone <repository_url>
    cd erc3643-okto-app # Replace with your project folder name if different
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Configure Environment Variables:**

    Create a file named `.env` in the root of your project. Copy the content from the `.env.example` file you just created and paste it into your new `.env` file.

    ```env
    REACT_APP_OKTO_API_KEY=your_okto_api_key_here
    REACT_APP_OKTO_ENVIRONMENT=sandbox # or 'production'
    REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id_here
    ```

    *   Replace `your_okto_api_key_here` with your actual Okto API Key.
    *   Set `REACT_APP_OKTO_ENVIRONMENT` to `sandbox` for testing or `production` for live usage.
    *   Add `REACT_APP_GOOGLE_CLIENT_ID` and replace `your_google_client_id_here` with your Google OAuth Client ID.

## 🏃 Running Locally

To start the development server and run the application locally:

```bash
npm start
# or
yarn start
```

The application should open in your browser at `http://localhost:3000` (or another port if 3000 is in use).

## 📝 How to Use

1.  **Login**: Click on the Google Sign-in button to authenticate using your Google account. This will initialize the Okto SDK session.
2.  **Get Account Details**: In the "Raw Transaction" section, click "Get Account Details" to fetch and display your wallet address for the selected network.
3.  **Token Transfer**:
    *   Select a Network from the dropdown.
    *   Select a Token from the dropdown (tokens will load based on the selected network).
    *   Enter the amount you wish to transfer (you can use decimals, e.g., 0.2).
    *   Enter the Recipient Address.
    *   Click "Transfer Token (Direct)" or "Create Token Transfer UserOp" to initiate the transaction process.
4.  **Raw Transaction**:
    *   Ensure your account details are loaded for the selected network.
    *   Enter the recipient "To Address".
    *   Enter the "Value (in wei)". **Note**: This field expects the amount in the smallest unit (like wei). Entering decimals here may lead to errors depending on the exact input and validation.
    *   Enter "Transaction Data" (usually '0x' for simple transfers).
    *   Click "Send Transaction".
5.  **Transaction History**: Click "📊 Get All History" in the "Transaction History & Tracker" section to view your recent transactions. You can also enter a specific Job ID to track its status.

## 📚 Further Information

*   Okto Web3 React SDK Documentation: [https://docs.okto.tech/docs/okto-web3-react-sdk](https://docs.okto.tech/docs/okto-web3-react-sdk)
*   Okto Supported Chains & Tokens: [https://docs.okto.tech/docs/supported-chains](https://docs.okto.tech/docs/supported-chains)
