# Banking API Documentation

## Base URL

```
http://localhost:4000/api
```

## Authentication

### POST /auth/login

Login with username and password to authenticate user.

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
  "user": {
    "id": 1,
    "username": "testuser",
    "full_name": "Nguyen Van A",
    "balance": "5000000"
  }
}
```

**Response (Error - 401):**

```json
{
  "error": "Invalid credentials"
}
```

**Response (Error - 400):**

```json
{
  "error": "Username and password are required"
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
