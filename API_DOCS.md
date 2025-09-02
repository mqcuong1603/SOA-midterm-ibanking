# Banking API Documentation

## Base URL

```url
http://localhost:4000/api
```

## Authentication

### POST /auth/login

Login with username and password to authenticate user. Returns JWT token for API access.

**Request Body:**

```json
{
  "username": "testuser",
  "password": "password123"
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

**🔒 All student endpoints require JWT authentication**

**Authorization Header Required:**

```
Authorization: Bearer <your_jwt_token>
```

### GET /student/{student_id}

Get student information by student ID. Shows tuition amount if unpaid.

**URL Parameters:**

- `student_id` (string): The student ID (e.g., "2021001234")

**Headers:**

```
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

## Development Routes

### POST /dev/seed

Create test data for development purposes.

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
  "error": "Error message details"
}
```
