# Banking/iBanking Tuition Payment System - API Documentation

## Base URL

```url
http://localhost:4000/api
```

## Overview

This API provides a complete banking system for tuition payments with:

- JWT-based authentication
- Real OTP verification system (6-digit codes, 5-minute expiration)
- Resource locking to prevent concurrent payments
- Transaction history tracking
- Balance management with atomic operations

## Authentication

### POST /auth/login

Login with username and password to authenticate user. Returns JWT token for API access.

**Request Body:**

```json
{
  "username": "testuser",
  "password": "123456"
}
```

**Response (Success - 200):**

```json
{
  "message": "Login successful",
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "testuser",
    "full_name": "Nguyen Van A",
    "balance": "50000000"
  }
}
```

**Response (Error - 401):**

```json
{
  "error": "Invalid credentials"
}
```

## Student Management

### 🔒 Authentication Required

All student endpoints require JWT authentication.

**Authorization Header Required:**

```header
Authorization: Bearer <your_jwt_token>
```

### GET /student/{student_id}

Get student information by student ID. Shows tuition amount if unpaid.

**URL Parameters:**

- `student_id` (string): The student ID (e.g., "2021001234")

**Headers:**

```header
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Response (Success - 200):**

**For Unpaid Student:**

```json
{
  "message": "Retrieve student information successfully",
  "student": {
    "student_id": "2021001234",
    "full_name": "Tran Van B",
    "tuition_amount": "20000000",
    "is_paid": false
  }
}
```

**For Paid Student:**

```json
{
  "message": "Retrieve student information successfully",
  "student": {
    "student_id": "2021001234",
    "full_name": "Tran Van B",
    "is_paid": true
  }
}
```

**Response (Error - 404):**

```json
{
  "error": "Student not found"
}
```

**Response (Error - 401):**

```json
{
  "error": "No token provided"
}
```

```json
{
  "error": "Invalid token"
}
```

## User Management

**🔒 All user endpoints require JWT authentication**

### GET /user/profile

Get current user's account information including balance.

**Headers:**

```
Authorization: Bearer <your_jwt_token>
```

**Response (Success - 200):**

```json
{
  "message": "User profile retrieved successfully",
  "user": {
    "id": 1,
    "username": "testuser",
    "full_name": "Nguyen Van A",
    "email": "test@example.com",
    "phone": "0901234567",
    "balance": "50000000"
  }
}
```

**Response (Error - 404):**

```json
{
  "error": "User not found"
}
```

### GET /user/transactions

Get user's transaction history (balance changes).

**Headers:**

```
Authorization: Bearer <your_jwt_token>
```

**Response (Success - 200):**

```json
{
  "message": "Transaction history retrieved successfully",
  "history": [
    {
      "id": 1,
      "transaction_id": 5,
      "balance_before": "50000000",
      "balance_after": "35000000",
      "created_at": "2025-01-01T10:30:00.000Z"
    }
  ]
}
```

## Transaction Management

**🔒 All transaction endpoints require JWT authentication**

### Payment Flow

1. **Initialize** → Creates transaction, generates OTP, locks resources
2. **Send OTP** → Resend OTP (1-minute cooldown protection)
3. **Complete** → Validate OTP, deduct balance, release locks

### POST /transactions/initialize

Initialize a new payment transaction for a student's tuition.

- Generates real 6-digit OTP code (5-minute expiration)
- Creates resource locks to prevent concurrent payments
- Locks both user account and student tuition

**Headers:**

```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "student_id": "2021001234"
}
```

**Response (Success - 200):**

```json
{
  "message": "Transaction created successfully. OTP sent to your email.",
  "transaction": {
    "id": 1,
    "student_id": "2021001234",
    "amount": "20000000",
    "status": "otp_sent"
  }
}
```

**Response (Error - 404):**

```json
{
  "error": "Student not found"
}
```

**Response (Error - 400):**

```json
{
  "error": "Student tuition already paid"
}
```

**Response (Error - 409 - Conflict):**

```json
{
  "error": "You already have a pending transaction. Please complete or wait for expiration"
}
```

```json
{
  "error": "This student's payment is already being processed by another user."
}
```

### POST /transactions/send_otp

Resend OTP for a pending transaction.

- **1-minute cooldown protection** - Users must wait 60 seconds between OTP requests
- Invalidates previous OTP codes and generates new ones
- Shows remaining cooldown time if requested too early

**Headers:**

```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "transaction_id": 1
}
```

**Response (Success - 200):**

```json
{
  "message": "OTP resent successfully. Check your email."
}
```

**Response (Error - 404):**

```json
{
  "error": "Transaction not found or already completed"
}
```

**Response (Error - 429 - Too Many Requests):**

```json
{
  "error": "Please wait 45 seconds before requesting new OTP"
}
```

### POST /transactions/complete

Complete a payment transaction using OTP verification.

- **Validates real OTP codes** from database (not hardcoded)
- Checks OTP expiration (5-minute timeout)
- Uses atomic database transactions for safety
- Deducts user balance and marks student as paid
- Creates transaction history record
- Releases resource locks

**Headers:**

```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "transaction_id": 1,
  "otp_code": "567890"
}
```

**Response (Success - 200):**

```json
{
  "message": "Transaction completed successfully!",
  "transaction": {
    "id": 1,
    "student_id": "2021001234",
    "amount": "20000000",
    "status": "completed"
  },
  "new_balance": "30000000"
}
```

**Response (Error - 400):**

```json
{
  "error": "Invalid or expired OTP code"
}
```

```json
{
  "error": "Insufficient balance"
}
```

**Response (Error - 404):**

```json
{
  "error": "Transaction not found or not ready for completion"
}
```

## Development Routes

**⚠️ Development/Testing endpoints - Not for production use**

### POST /dev/seed

Create test data for development purposes.

- Creates test user: `testuser` / `123456` with 50M VND balance
- Creates 2 test students with unpaid tuition

**Request Body:**

```json
{}
```

**Response (Success - 200):**

```json
{
  "message": "Test data created successfully!"
}
```

**Response (Error - 400):**

```json
{
  "error": "Validation error"
}
```

### POST /dev/reduce-balance

Reduce test user's balance to 10M VND for testing insufficient balance scenarios.

**Response (Success - 200):**

```json
{
  "message": "Balance reduced to 10M for testing"
}
```

### POST /dev/increase-balance

Increase test user's balance to 100M VND for testing high balance scenarios.

**Response (Success - 200):**

```json
{
  "message": "Balance increase to 100M for testing"
}
```

## Security Features

### Resource Locking

- **User Account Lock**: Prevents multiple transactions per user
- **Student Tuition Lock**: Prevents concurrent payments for same student
- **Lock Duration**: 5 minutes (auto-expires)
- **Conflict Resolution**: HTTP 409 responses with clear error messages

### OTP Security

- **Real 6-digit codes**: Generated randomly, stored in database
- **Expiration**: 5 minutes from generation
- **Single-use**: OTP codes marked as used after validation
- **Cooldown**: 1-minute between OTP requests
- **Rate limiting**: HTTP 429 for spam prevention

### Database Safety

- **Atomic Transactions**: All balance/payment operations use database transactions
- **Rollback on Failure**: Ensures data consistency
- **Foreign Key Constraints**: Maintains referential integrity
- **Balance Validation**: Prevents overdrafts

## Error Codes Summary

| Code | Meaning           | Common Scenarios                                     |
| ---- | ----------------- | ---------------------------------------------------- |
| 400  | Bad Request       | Invalid OTP, insufficient balance, validation errors |
| 401  | Unauthorized      | Invalid/missing JWT token, wrong credentials         |
| 404  | Not Found         | Student not found, transaction not found             |
| 409  | Conflict          | Resource locks (user busy, student being paid)       |
| 429  | Too Many Requests | OTP cooldown protection                              |
| 500  | Server Error      | Database errors, system failures                     |
