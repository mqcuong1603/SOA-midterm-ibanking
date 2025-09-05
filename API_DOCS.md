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

## Complete API Testing Guide

### Testing with cURL

#### 1. Login to get JWT token

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "123456"
  }'
```

#### 2. Get user profile

```bash
curl -X GET http://localhost:4000/api/user/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 3. Get student information

```bash
curl -X GET http://localhost:4000/api/student/2021001234 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 4. Initialize payment transaction

```bash
curl -X POST http://localhost:4000/api/transaction/initialize \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "2021001234"
  }'
```

#### 5. Resend OTP (if needed)

```bash
curl -X POST http://localhost:4000/api/transaction/send_otp \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": 1
  }'
```

#### 6. Complete transaction with OTP

```bash
curl -X POST http://localhost:4000/api/transaction/complete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": 1,
    "otp_code": "123456"
  }'
```

#### 7. Get transaction history

```bash
curl -X GET http://localhost:4000/api/user/transactions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Testing Scenarios

#### Scenario A: Successful Payment Flow

1. Login → Get JWT token
2. Check student info (should show unpaid tuition)
3. Initialize transaction → OTP sent
4. Complete transaction with correct OTP
5. Check user balance (should be reduced)
6. Check student info again (should show paid)
7. View transaction history

#### Scenario B: Invalid OTP Testing

1. Initialize transaction
2. Complete with wrong OTP code (e.g., "999999")
3. Should get "Invalid OTP code" error
4. Transaction should remain in "otp_sent" status

#### Scenario C: Expired OTP Testing

1. Initialize transaction
2. Wait 6+ minutes (OTP expires after 5 minutes)
3. Complete with any OTP code
4. Should get "OTP has expired" error
5. Transaction should be marked as "failed"

#### Scenario D: Insufficient Balance Testing

1. Reduce user balance in database: `UPDATE users SET balance = '1000000' WHERE username = 'testuser';`
2. Initialize transaction (should succeed)
3. Complete with correct OTP
4. Should get "Insufficient balance" error

#### Scenario E: Resource Locking Testing

1. Initialize transaction for student "2021001234"
2. Try to initialize another transaction for same student (different user)
3. Should get conflict error about student being processed
4. Try to initialize transaction for different student (same user)
5. Should get conflict error about user having pending transaction

#### Scenario F: OTP Rate Limiting Testing

1. Initialize transaction
2. Request OTP resend immediately
3. Should succeed
4. Request OTP resend again within 60 seconds
5. Should get rate limit error with countdown

### Error Response Examples

#### Authentication Errors

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

#### Transaction Errors

```json
{
  "error": "Invalid OTP code",
  "error_code": "INVALID_OTP"
}
```

```json
{
  "error": "OTP has expired. Transaction has been cancelled.",
  "error_code": "OTP_EXPIRED",
  "transaction_status": "failed"
}
```

```json
{
  "error": "You already have a pending transaction. Please complete or wait for expiration"
}
```

```json
{
  "error": "Please wait 45 seconds before requesting new OTP"
}
```

### Postman Collection Setup

Import these settings into Postman for easier testing:

1. **Environment Variables**:

   - `baseUrl`: `http://localhost:4000/api`
   - `token`: `{{token}}` (auto-updated from login response)

2. **Headers**:

   - `Authorization`: `Bearer {{token}}`
   - `Content-Type`: `application/json`

3. **Auto-token Script** (in login request's Tests tab):

```javascript
pm.test("Login successful", function () {
  pm.response.to.have.status(200);
  const response = pm.response.json();
  pm.environment.set("token", response.token);
});
```

### Database Schema Overview

The API uses the following main tables:

- **users**: User accounts with balances
- **students**: Student records with tuition amounts
- **transactions**: Payment transactions with status tracking
- **otp_codes**: Real OTP codes with expiration
- **transaction_history**: Balance change history
- **transaction_locks**: Resource locking for concurrency control

This completes the comprehensive API documentation for the Banking/iBanking Tuition Payment System.
