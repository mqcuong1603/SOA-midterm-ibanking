# iBanking Tuition Payment System - API Documentation

## Base URL

```url
http://localhost:4000/api
```

## Overview

This API provides a complete banking system for student tuition payments with enhanced security features:

- **JWT-based authentication** - Secure token-based access control
- **Real OTP verification system** - 6-digit codes with 5-minute expiration
- **Multi-semester support** - Pay specific semesters for any student
- **Resource locking** - Prevents concurrent payment conflicts
- **Transaction history tracking** - Complete audit trail with all statuses
- **Incomplete transaction handling** - Recovery and cleanup for abandoned payments
- **Email notifications** - OTP delivery and payment confirmations
- **Atomic operations** - Database transactions ensure data consistency
- **Rate limiting** - 60-second cooldown between OTP requests
- **Failed attempt tracking** - 3 attempts max before transaction lock
- **Automatic cleanup** - Scheduled jobs clean up expired transactions every 30 minutes

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

Get complete student information including all semester tuition records.

**URL Parameters:**

- `student_id` (string): The student ID (e.g., "522i0001")

**Headers:**

```header
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Response (Success - 200):**

```json
{
  "message": "Retrieve student information successfully",
  "student": {
    "student_id": "522i0001",
    "full_name": "Tran Van B",
    "major": "Computer Science",
    "enrollment_year": 2022
  },
  "tuition_summary": {
    "total_semesters": 3,
    "unpaid_semesters": 3,
    "total_unpaid_amount": 60000000
  },
  "semesters": [
    {
      "id": 1,
      "semester": "2024-1",
      "academic_year": "2024-2025",
      "tuition_amount": "20000000",
      "is_paid": false,
      "paid_at": null
    },
    {
      "id": 2,
      "semester": "2024-2",
      "academic_year": "2024-2025",
      "tuition_amount": "20000000",
      "is_paid": false,
      "paid_at": null
    },
    {
      "id": 3,
      "semester": "2025-1",
      "academic_year": "2024-2025",
      "tuition_amount": "20000000",
      "is_paid": false,
      "paid_at": null
    }
  ]
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

#### Standard Payment Flow:
1. **Get Semesters** → View available semesters for a student
2. **Initialize** → Creates transaction for specific semester, generates OTP, locks resources
3. **Send OTP** → Resend OTP if needed (60-second cooldown protection)
4. **Complete** → Validate OTP, deduct balance, mark semester paid, release locks

#### Incomplete Transaction Flow:
1. **Get Pending** → Check for any incomplete transactions
2. **Resume** → Continue with pending transaction OR
3. **Cancel** → Cancel pending transaction to start fresh
4. **Get History** → View all transaction statuses (pending, completed, failed)

### GET /transaction/semesters/{student_id}

Get all available semesters for a specific student with payment status.

**URL Parameters:**

- `student_id` (string): The student ID (e.g., "522i0001")

**Query Parameters:**

- `show_all` (boolean, optional): Show all semesters including paid ones. Default: false (only unpaid)

**Headers:**

```
Authorization: Bearer <your_jwt_token>
```

**Response (Success - 200):**

```json
{
  "student": {
    "student_id": "522i0001",
    "full_name": "Tran Van B",
    "major": "Computer Science"
  },
  "semesters": [
    {
      "id": 1,
      "semester": "2024-1",
      "academic_year": "2024-2025",
      "tuition_amount": "20000000",
      "is_paid": false,
      "paid_at": null
    },
    {
      "id": 2,
      "semester": "2024-2",
      "academic_year": "2024-2025",
      "tuition_amount": "20000000",
      "is_paid": false,
      "paid_at": null
    }
  ],
  "total_unpaid": 40000000
}
```

**Response (Error - 404):**

```json
{
  "error": "Student not found"
}
```

### POST /transaction/initialize

Initialize a new payment transaction for a specific semester's tuition.

- Validates student and semester exist
- Checks if semester is already paid
- Generates real 6-digit OTP code (5-minute expiration)
- Creates resource locks to prevent concurrent payments
- Locks both user account and specific semester tuition
- Sends OTP to user's registered email

**Headers:**

```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "student_id": "522i0001",
  "tuition_id": 1
}
```

**Response (Success - 200):**

```json
{
  "message": "Transaction created successfully. OTP sent to your email.",
  "transaction": {
    "id": 1,
    "student_id": "522i0001",
    "tuition_id": 1,
    "semester": "2024-1",
    "academic_year": "2024-2025",
    "amount": "20000000",
    "status": "otp_sent"
  }
}
```

**Response (Error - 400):**

```json
{
  "error": "Student ID and Tuition ID are required"
}
```

```json
{
  "error": "This semester tuition is already paid"
}
```

**Response (Error - 404):**

```json
{
  "error": "Student not found"
}
```

```json
{
  "error": "Tuition record not found for this student"
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
  "error": "This semester tuition payment is already being processed by another user."
}
```

### POST /transaction/send_otp

Resend OTP for a pending transaction.

- **60-second cooldown protection** - Users must wait 60 seconds between OTP requests
- Invalidates previous OTP codes and generates new ones
- Shows remaining cooldown time if requested too early
- Resets OTP expiration timer to 5 minutes

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

**Response (Error - 400):**

```json
{
  "error": "Transaction ID is required"
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

### POST /transaction/complete

Complete a payment transaction using OTP verification.

- **Validates real OTP codes** from database (not hardcoded)
- **Tracks failed attempts** - Maximum 3 attempts before transaction lock
- Checks OTP expiration (5-minute timeout)
- Uses atomic database transactions for safety
- Deducts user balance and marks specific semester as paid
- Creates transaction history record for audit trail
- Releases resource locks (user account and semester tuition)
- **Sends payment confirmation email** with detailed receipt

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
    "student_id": "522i0001",
    "amount": "20000000",
    "status": "completed"
  },
  "new_balance": "30000000"
}
```

**Response (Error - 400):**

```json
{
  "error": "OTP code and transaction ID are required"
}
```

```json
{
  "error": "Invalid OTP code",
  "error_code": "INVALID_OTP",
  "failed_attempts": 1,
  "remaining_attempts": 2
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
  "error": "Insufficient balance. Transaction has been cancelled.",
  "error_code": "INSUFFICIENT_BALANCE",
  "transaction_status": "failed",
  "current_balance": "5000000",
  "required_amount": "20000000"
}
```

**Response (Error - 404):**

```json
{
  "error": "Transaction not found or not ready for completion"
}
```

```json
{
  "error": "Payer not found"
}
```

**Response (Error - 423 - Locked):**

```json
{
  "error": "Transaction locked due to multiple failed OTP attempts. Please start a new payment.",
  "error_code": "TOO_MANY_ATTEMPTS",
  "failed_attempts": 3,
  "transaction_status": "failed"
}
```

### GET /transaction/pending

Get all pending/incomplete transactions for the current user.

- Returns transactions in `pending` or `otp_sent` status
- Includes student and semester information
- Shows expiration status (>1 hour old)
- Displays failed OTP attempt counts
- Use to check for incomplete payments on login
- Useful for resuming abandoned transactions

**Headers:**

```
Authorization: Bearer <your_jwt_token>
```

**Response (Success - 200):**

```json
{
  "pending_transactions": [
    {
      "id": 123,
      "student_id": "522i0001",
      "student_name": "Tran Van B",
      "semester": "2024-1",
      "academic_year": "2024-2025",
      "amount": "20000000",
      "status": "otp_sent",
      "created_at": "2025-01-01T10:30:00.000Z",
      "is_expired": false,
      "failed_otp_attempts": 0
    }
  ],
  "count": 1
}
```

### GET /transaction/history

Get complete transaction history with all statuses (pending, completed, failed).

**Query Parameters:**

- `status` (optional): Filter by status - `pending`, `otp_sent`, `completed`, or `failed`

**Headers:**

```
Authorization: Bearer <your_jwt_token>
```

**Response (Success - 200):**

```json
{
  "transactions": [
    {
      "id": 123,
      "student_id": "522i0001",
      "student_name": "Tran Van B",
      "semester": "2024-1",
      "academic_year": "2024-2025",
      "amount": "20000000",
      "status": "completed",
      "created_at": "2025-01-01T10:30:00.000Z",
      "completed_at": "2025-01-01T10:35:00.000Z",
      "failed_otp_attempts": 0
    },
    {
      "id": 124,
      "student_id": "522i0002",
      "student_name": "Le Thi C",
      "semester": "2024-2",
      "academic_year": "2024-2025",
      "amount": "15000000",
      "status": "failed",
      "created_at": "2025-01-01T11:00:00.000Z",
      "completed_at": "2025-01-01T11:05:00.000Z",
      "failed_otp_attempts": 3
    }
  ],
  "count": 2
}
```

**Example with Filter:**

```bash
GET /transaction/history?status=completed
GET /transaction/history?status=failed
GET /transaction/history?status=pending
```

### POST /transaction/cancel

Cancel a pending or otp_sent transaction.

- Marks transaction as `failed`
- Releases resource locks immediately
- Invalidates unused OTP codes
- Allows user to start a new payment right away
- Only works for `pending` or `otp_sent` status
- Cannot cancel completed or already failed transactions

**Headers:**

```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "transaction_id": 123
}
```

**Response (Success - 200):**

```json
{
  "message": "Transaction cancelled successfully",
  "transaction_id": 123,
  "status": "failed"
}
```

**Response (Error - 400):**

```json
{
  "error": "Transaction ID is required"
}
```

**Response (Error - 404):**

```json
{
  "error": "Transaction not found or already completed/cancelled"
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

### Email Notifications

- **OTP Delivery**: 6-digit verification codes sent to user's email
  - Includes payment details (student info, semester, amount)
  - Security warnings (5-minute expiration, never share code)
  - Professional HTML template design
- **Payment Confirmation**: Detailed receipt sent after successful payment
  - Transaction ID and timestamp
  - Student and semester information
  - Amount paid and new balance
  - Complete payment summary
- **Non-intrusive**: Email failures don't affect transaction processing

### Database Safety

- **Atomic Transactions**: All balance/payment operations use database transactions
- **Rollback on Failure**: Ensures data consistency
- **Foreign Key Constraints**: Maintains referential integrity
- **Balance Validation**: Prevents overdrafts

### Automatic Cleanup Service

- **Scheduled Cleanup**: Runs every 30 minutes automatically on server startup
- **Expired Transaction Cleanup**:
  - Finds transactions >1 hour old in `pending` or `otp_sent` status
  - Marks them as `failed`
  - Releases all resource locks
  - Invalidates unused OTP codes
- **Lock Cleanup**: Removes expired locks from database
- **OTP Cleanup**: Deletes OTP codes older than 24 hours
- **Console Logging**: All cleanup operations logged with counts
- **Non-blocking**: Runs in background without affecting API performance

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
curl -X GET http://localhost:4000/api/student/522i0001 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 4. Get available semesters for payment

```bash
curl -X GET http://localhost:4000/api/transaction/semesters/522i0001 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 5. Initialize payment transaction

```bash
curl -X POST http://localhost:4000/api/transaction/initialize \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "522i0001",
    "tuition_id": 1
  }'
```

#### 6. Resend OTP (if needed)

```bash
curl -X POST http://localhost:4000/api/transaction/send_otp \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": 1
  }'
```

#### 7. Complete transaction with OTP

```bash
curl -X POST http://localhost:4000/api/transaction/complete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": 1,
    "otp_code": "123456"
  }'
```

#### 8. Get transaction history

```bash
curl -X GET http://localhost:4000/api/user/transactions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 9. Get pending transactions

```bash
curl -X GET http://localhost:4000/api/transaction/pending \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 10. Get complete transaction history (all statuses)

```bash
# Get all transactions
curl -X GET http://localhost:4000/api/transaction/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Filter by status
curl -X GET "http://localhost:4000/api/transaction/history?status=completed" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

curl -X GET "http://localhost:4000/api/transaction/history?status=failed" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 11. Cancel a pending transaction

```bash
curl -X POST http://localhost:4000/api/transaction/cancel \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": 1
  }'
```

---

## Test Credentials

### Users

| Username      | Password | Balance       | Email                   |
| ------------- | -------- | ------------- | ----------------------- |
| cuongcfvipss5 | 123456   | 50,000,000 ₫  | cuongcfvipss5@gmail.com |
| mqcuong1603   | 123456   | 50,000,000 ₫  | mqcuong1603@gmail.com   |
| testuser      | 123456   | 100,000,000 ₫ | testuser@example.com    |

### Students

| Student ID | Name        | Major                | Unpaid Semesters |
| ---------- | ----------- | -------------------- | ---------------- |
| 522i0001   | Tran Van B  | Computer Science     | 3 (60M ₫)        |
| 522i0002   | Le Thi C    | Information Tech     | 1 (15M ₫)        |
| 522i0003   | Pham Minh D | Software Engineering | 2 (36M ₫)        |

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

#### Scenario G: Incomplete Transaction Handling

1. Initialize transaction
2. Leave it incomplete (don't enter OTP)
3. Check pending transactions: `GET /api/transaction/pending`
4. Should see transaction with `is_expired: false`
5. Cancel transaction: `POST /api/transaction/cancel`
6. Check transaction history: `GET /api/transaction/history?status=failed`
7. Should see cancelled transaction with status "failed"

#### Scenario H: Automatic Cleanup Testing

1. Create several pending transactions
2. Update database to make them old:
   ```sql
   UPDATE transactions
   SET createdAt = DATE_SUB(NOW(), INTERVAL 2 HOUR)
   WHERE status IN ('pending', 'otp_sent');
   ```
3. Wait for cleanup (or restart server)
4. Check backend console for cleanup logs
5. Check transaction history - should show as "failed"

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
