# 🏦 Banking/iBanking Tuition Payment System

A secure banking API system for tuition payments with JWT authentication, OTP verification, and transaction management.

## ✨ Features

- 🔐 JWT-based authentication
- 📧 Real OTP verification (6-digit codes, 5-minute expiration)
- 🔒 Resource locking to prevent concurrent payments
- 📊 Transaction history tracking
- ⚡ Atomic balance operations
- 🛡️ Security: Rate limiting, failed attempt tracking

## 🚀 Quick Start

### Prerequisites

- Node.js
- **Choose one:**
  - MySQL - Local installation
  - Docker & Docker Compose - For containerized MySQL

### Installation

1. **Clone and Install**

   ```bash
   git clone <repository-url>
   cd midterm3/backend
   npm install
   ```

2. **Database Setup - Choose Option A or B**

   #### Option A: Local MySQL

   ```bash
   mysql -u root -p
   CREATE DATABASE banking_app;
   exit
   ```

   #### Option B: Docker MySQL (Recommended)

   ```bash
   docker-compose up -d
   ```

3. **Run Application**

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

4. **Access API**
   - Server: <http://localhost:4000>
   - API Docs: See [API_DOCS.md](API_DOCS.md)

### API Testing Tools

- **Postman**: Import collection from [API_DOCS.md](API_DOCS.md)
- **Database**: Use MySQL Workbench or Adminer

## 📚 API Endpoints

| Method | Endpoint                      | Description             |
| ------ | ----------------------------- | ----------------------- |
| `POST` | `/api/auth/login`             | User authentication     |
| `GET`  | `/api/user/profile`           | Get user profile        |
| `GET`  | `/api/user/transactions`      | Get transaction history |
| `GET`  | `/api/student/{id}`           | Get student info        |
| `POST` | `/api/transaction/initialize` | Start payment           |
| `POST` | `/api/transaction/send_otp`   | Resend OTP              |
| `POST` | `/api/transaction/complete`   | Complete payment        |

## 📖 Documentation

- [Complete API Documentation](API_DOCS.md)
- [Database Schema](backend/src/config/database_schema.sql)

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# View logs
npm run logs

# Database reset (development only)
# Set force: true in app.js temporarily
```

## 📝 License

This project is for educational purposes (SOA Course - TDTU).
