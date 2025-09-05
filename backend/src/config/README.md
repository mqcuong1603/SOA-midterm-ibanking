# Database Configuration

This folder contains database configuration and setup files for the iBanking Tuition Payment System.

## Setup Options

You have **two ways** to set up the database:

### Option 1: Automatic Setup (Recommended)

The application will automatically create tables and test data when you start the server:

```bash
npm run dev
```

**What happens:**
- Tables are created automatically using Sequelize models
- Test data is seeded if database is empty
- No manual SQL execution needed

**Files involved:**
- `database.js` - Database connection
- `initDatabase.js` - Automatic initialization

### Option 2: Manual SQL Setup

For users who prefer manual database setup or want to customize the schema:

1. Create the MySQL database:
```sql
CREATE DATABASE banking_app;
USE banking_app;
```

2. Run the complete SQL file:
```bash
mysql -u root -p banking_app < backend/src/config/database_schema.sql
```

**Files involved:**
- `database_schema.sql` - Complete database schema with test data

## Configuration

Update your `.env` file with database credentials:

```env
DB_NAME=banking_app
DB_USER=root
DB_PASS=your_password
DB_HOST=localhost

# Email configuration for OTP
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

## Test Data

Both setup methods create the same test data:

**Test User:**
- Username: `testuser`
- Password: `123456` 
- Balance: 50,000,000 VND
- Email: Update to your real email for OTP testing

**Test Students:**
- `2021001234` - Tran Van B (20M VND)
- `2021005678` - Le Thi C (15M VND)
- `2021009999` - Pham Minh D (18M VND)
- `2021111111` - Hoang Van E (22M VND)
- `2021222222` - Vo Thi F (17M VND)

## Database Schema

The system includes these tables:
- `users` - User accounts with VND balance
- `students` - Student records with tuition amounts
- `transactions` - Payment processing with status tracking
- `otp_codes` - OTP verification codes (5-minute expiration)
- `transaction_history` - Balance change audit trail
- `transaction_locks` - Resource locking for concurrent payment prevention

## Security Notes

- All passwords are bcrypt hashed
- OTP codes expire after 5 minutes
- Resource locking prevents concurrent payments
- Database transactions ensure atomicity
- Foreign key constraints maintain data integrity