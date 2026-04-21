# Sangini Trading Engine (API)

The robust backend infrastructure for the Sangini Trading platform. This service manages the core business logic, real-time market simulations, and secure financial transactions.

## 🚀 Key Features
* **Real-Time Price Engine:** A custom-built simulation engine using `setInterval` logic to mimic market volatility for tracked equities.
* **Atomic Transactions:** Secure "Buy/Sell" logic that ensures data consistency across MongoDB collections (Users, Holdings, Positions, and Orders).
* **Authentication:** Enterprise-grade security using **JWT (JSON Web Tokens)** and **Bcrypt** password hashing.
* **Virtual Wallet System:** Manages real-time balance deductions and credits based on current market prices.

## 🛠 Tech Stack
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB Atlas (NoSQL)
* **ORM:** Mongoose
* **Security:** JWT, Dotenv, Cors

## 📡 API Endpoints (Gist)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/signup` | Registers new users with encrypted credentials. |
| GET | `/allHoldings` | Fetches long-term equity portfolio for the user. |
| POST | `/newOrder` | Executes market orders and updates virtual balance. |
* **Assessment Engine:** Backend logic to serve randomized financial literacy questions and validate user responses against a secure answer key.
* **Knowledge Tracking:** (Optional: If you store scores) Architecture to track user progress and "unlock" trading tiers based on quiz performance.