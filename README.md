# iBanking Tuition Payment System

A banking system for paying student tuition with OTP verification and multi-semester support.

## Requirements

- Node.js (v14 or higher)
- MySQL (or Docker)

## Setup & Run

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Create `.env` file in `backend` folder:

```env
# Database
DB_NAME=banking_app
DB_USER=root
DB_PASS=your_password
DB_HOST=localhost

# JWT
JWT_SECRET=your_secret_key_here

# Email (for OTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

### 3. Start Database

**Option A: Docker (Recommended)**

```bash
# From project root
docker-compose up -d
```

**Option B: Local MySQL**

```bash
mysql -u root -p
CREATE DATABASE banking_app;
exit
```

### 4. Run Application

```bash
cd backend
npm run dev
```

Server starts at: `http://localhost:4000`

The database tables and test data will be created automatically on first run.

## Test the Application

### Option 1: Use Postman

1. Import `SOA-midterm.postman_collection.json`
2. Run "Login" request first (token auto-saves)
3. Test other endpoints

### Option 2: Use Frontend

Open `frontend/index.html` in browser or use Live Server.

## Test Credentials

**Users:**

- Username: `cuongcfvipss5` / Password: `123456` (Balance: 50M VND)
- Username: `mqcuong1603` / Password: `123456` (Balance: 50M VND)

**Students:**

- `522i0001` - Tran Van B (3 unpaid semesters)
- `522i0002` - Le Thi C (1 unpaid semester)
- `522i0003` - Pham Minh D (2 unpaid semesters)

## API Endpoints

| Method | Endpoint                          | Description              |
| ------ | --------------------------------- | ------------------------ |
| POST   | `/api/auth/login`                 | Login                    |
| GET    | `/api/user/profile`               | Get user profile         |
| GET    | `/api/user/transactions`          | Balance change history   |
| GET    | `/api/student/{id}`               | Student info             |
| GET    | `/api/transaction/semesters/{id}` | Available semesters      |
| POST   | `/api/transaction/initialize`     | Start payment            |
| POST   | `/api/transaction/send_otp`       | Resend OTP               |
| POST   | `/api/transaction/complete`       | Complete payment         |
| GET    | `/api/transaction/pending`        | Get pending transactions |
| GET    | `/api/transaction/history`        | All transactions         |
| POST   | `/api/transaction/cancel`         | Cancel transaction       |

## Documentation

- Full API docs: [API_DOCS.md](API_DOCS.md)
- Use case diagram: [USE_CASE_DIAGRAM.txt](USE_CASE_DIAGRAM.txt)

## Troubleshooting

**Database connection error:**

- Check MySQL is running
- Verify `.env` credentials

**Email not sending:**

- Use Gmail App Password (not regular password)
- Check EMAIL\_\* settings in `.env`

**Port 4000 already in use:**

- Change `PORT=4000` in `.env`
- Update frontend `config.js` accordingly
