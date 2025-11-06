# Testing Guide - Incomplete Transaction Handling Features

This guide will help you test all the new incomplete transaction handling features on your local computer.

## Prerequisites

- Node.js installed (v14 or higher)
- MySQL database running
- Git installed

## Step 1: Setup

### 1.1 Pull the Latest Code

```bash
# Navigate to project directory
cd SOA-midterm-ibanking

# Make sure you're on the correct branch
git checkout claude/review-backend-frontend-011CUqiki6tKcvhLyDf4e9DF

# Pull latest changes
git pull origin claude/review-backend-frontend-011CUqiki6tKcvhLyDf4e9DF
```

### 1.2 Install Backend Dependencies

```bash
cd backend
npm install
```

### 1.3 Configure Environment Variables

Make sure your backend has a `.env` file with database credentials. If not, create one:

```bash
# backend/.env
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=ibanking_db
PORT=4000
JWT_SECRET=your_secret_key

# Email configuration (for OTP)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### 1.4 Start the Backend Server

```bash
# From backend directory
npm start

# OR for development with auto-reload
npm run dev
```

**Expected Output:**
```
Server is running on port 4000
🚀 Starting cleanup scheduler (runs every 30 minutes)
🧹 Starting scheduled cleanup tasks...
✅ Cleanup: No expired transactions found
✅ Cleanup: Removed 0 expired locks
✅ Cleanup: Removed 0 old OTP codes
✅ All cleanup tasks completed successfully
```

### 1.5 Open the Frontend

Open your browser and navigate to:
```
http://localhost:4000/dashboard.html
```

Or if using Live Server:
```
http://127.0.0.1:5500/frontend/dashboard.html
```

## Step 2: Testing Scenarios

### Test 1: Pending Transaction Detection on Login

**Steps:**
1. Login to the application
2. Start a tuition payment but DON'T complete the OTP verification
3. Close the browser tab
4. Login again on the dashboard

**Expected Result:**
- A yellow warning modal should appear: "Pending Transactions Found"
- Shows transaction details (ID, student, amount, status)
- Provides "Later" and "View Transactions" buttons

**What to Check:**
- Modal appears automatically
- Transaction count is correct
- Transaction details are displayed properly

---

### Test 2: View All Transactions Page

**Steps:**
1. Click "Transactions" in the navigation bar (or "View Transactions" from modal)
2. You should see the new Transaction History page

**Expected Result:**
- Page displays all transactions grouped by status:
  - **Pending Transactions** (yellow section)
  - **Completed Transactions** (green section)
  - **Failed/Cancelled Transactions** (red section)
- Each transaction shows:
  - Transaction ID
  - Status badge (color-coded)
  - Student name and ID
  - Semester and academic year
  - Amount
  - Created date
  - Failed OTP attempts (if any)

**What to Check:**
- Transactions are properly grouped
- Status badges have correct colors
- All information displays correctly

---

### Test 3: Resume Pending Transaction

**Steps:**
1. From the Transactions page, find a pending transaction
2. Click the **"Resume"** button

**Expected Result:**
- Redirects to payment.html page
- OTP verification form appears
- Can enter OTP and complete payment

**What to Check:**
- Resume button only appears for non-expired pending transactions
- Redirect works correctly
- Can complete the payment

---

### Test 4: Cancel Pending Transaction

**Steps:**
1. From the Transactions page, find a pending transaction
2. Click the **"Cancel"** button
3. Confirmation modal appears: "Are you sure you want to cancel?"
4. Click **"Cancel Transaction"**

**Expected Result:**
- Modal shows warning message
- After confirming, transaction is cancelled
- Success message appears: "Transaction cancelled successfully"
- Transaction moves to "Failed/Cancelled" section
- Status badge changes to red "Failed"

**What to Check:**
- Confirmation modal appears
- Transaction is properly cancelled
- Page refreshes and shows updated status
- Can start a new payment for the same semester

---

### Test 5: Expired Transaction Warning

**Steps:**
1. Create a pending transaction
2. Wait for it to expire (you can manually update the database to make it older than 1 hour):

```sql
-- In MySQL, make transaction appear old
UPDATE transactions
SET createdAt = DATE_SUB(NOW(), INTERVAL 2 HOUR)
WHERE id = YOUR_TRANSACTION_ID;
```

3. Refresh the Transactions page

**Expected Result:**
- Transaction shows a red "Expired" badge
- Card has red border
- Resume button is disabled or hidden
- Only "Cancel" button is available

**What to Check:**
- Expired indicator is visible
- Cannot resume expired transactions
- Can cancel expired transactions

---

### Test 6: Filter Transactions by Status

**Steps:**
1. Go to Transactions page
2. Use the dropdown filter at the top right
3. Select different statuses:
   - All Transactions
   - Completed
   - Pending
   - OTP Sent
   - Failed

**Expected Result:**
- Page updates to show only selected status
- Counter shows correct number of transactions
- Empty state appears if no transactions match filter

**What to Check:**
- Filter dropdown works
- Transactions update correctly
- Each status shows appropriate transactions

---

### Test 7: Insufficient Balance Handling

**Steps:**
1. Check your user balance (should be less than tuition amount)
2. Start a payment for a semester with higher tuition
3. Complete OTP verification successfully
4. Submit the payment

**Expected Result:**
- Error appears: "Insufficient balance. Transaction has been cancelled."
- Transaction is marked as **"failed"** (not just rollback)
- Resource locks are released
- Can immediately start a new transaction
- Transaction appears in "Failed" section

**What to Check:**
- Transaction marked as failed in database
- Error message displays clearly
- Locks are released (can start new payment immediately)
- Balance remains unchanged

---

### Test 8: Automatic Cleanup Job

**Steps:**
1. Create several pending transactions
2. Manually set their creation time to >1 hour ago:

```sql
UPDATE transactions
SET createdAt = DATE_SUB(NOW(), INTERVAL 2 HOUR)
WHERE status IN ('pending', 'otp_sent');
```

3. Wait for cleanup job to run (every 30 minutes) OR restart the server to trigger immediate cleanup

**Expected Result:**
- Backend console shows cleanup logs:
```
🧹 Cleanup: Found X expired transactions
✅ Cleanup: Successfully cleaned up X expired transactions
```
- Expired transactions are marked as "failed"
- Locks are released
- OTPs are marked as used

**What to Check:**
- Console logs show cleanup activity
- Transactions in database have `status='failed'`
- Transaction locks table has records removed
- OTP codes are marked `is_used=true`

---

### Test 9: Multiple Failed OTP Attempts

**Steps:**
1. Start a payment
2. Enter wrong OTP 3 times
3. On 3rd failure, check transaction status

**Expected Result:**
- After 3rd wrong OTP: Transaction marked as "failed"
- Error: "Transaction locked due to multiple failed OTP attempts"
- Transaction appears in "Failed" section with note: "Failed OTP attempts: 3/3"

**What to Check:**
- Counter increments with each failure
- Transaction fails after 3 attempts
- Locks are released
- Can start new payment

---

### Test 10: API Endpoints Testing (Optional - Using Postman/curl)

**Test GET /api/transaction/pending:**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:4000/api/transaction/pending
```

Expected Response:
```json
{
  "pending_transactions": [
    {
      "id": 123,
      "student_id": "522i0001",
      "student_name": "Nguyen Van A",
      "semester": "2024-1",
      "academic_year": "2024",
      "amount": "5000000",
      "status": "otp_sent",
      "created_at": "2024-11-06T...",
      "is_expired": false,
      "failed_otp_attempts": 0
    }
  ],
  "count": 1
}
```

**Test GET /api/transaction/history:**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:4000/api/transaction/history?status=completed
```

**Test POST /api/transaction/cancel:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"transaction_id": 123}' \
  http://localhost:4000/api/transaction/cancel
```

---

## Troubleshooting

### Issue: Modal doesn't appear on dashboard

**Solution:**
- Check browser console for JavaScript errors
- Verify API endpoint is returning data
- Clear browser cache and reload

### Issue: Cleanup job not running

**Solution:**
- Check backend console for error messages
- Verify database connection is working
- Restart backend server

### Issue: Cannot cancel transaction

**Solution:**
- Check that transaction is in `pending` or `otp_sent` status
- Verify JWT token is valid
- Check backend logs for errors

### Issue: Transactions not loading

**Solution:**
- Check backend is running on port 4000
- Verify API_BASE_URL in `frontend/assets/js/config.js` is correct
- Check browser console for CORS errors

---

## Database Queries for Manual Testing

### View all pending transactions:
```sql
SELECT * FROM transactions
WHERE status IN ('pending', 'otp_sent')
ORDER BY createdAt DESC;
```

### View transaction locks:
```sql
SELECT * FROM transaction_locks
WHERE expires_at > NOW();
```

### View OTP codes:
```sql
SELECT * FROM otp_codes
ORDER BY createdAt DESC
LIMIT 10;
```

### Manually expire a transaction (for testing):
```sql
UPDATE transactions
SET createdAt = DATE_SUB(NOW(), INTERVAL 2 HOUR)
WHERE id = YOUR_TRANSACTION_ID;
```

### Check cleanup results:
```sql
-- Count failed transactions created in last 3 hours
SELECT COUNT(*) FROM transactions
WHERE status = 'failed'
AND createdAt > DATE_SUB(NOW(), INTERVAL 3 HOUR);
```

---

## Success Criteria

All tests pass if:

✅ Pending transactions are detected on login
✅ Transaction history page loads with all statuses
✅ Can resume pending transactions
✅ Can cancel pending transactions with confirmation
✅ Expired transactions show warning badges
✅ Status filter works correctly
✅ Insufficient balance marks transaction as failed
✅ Cleanup job runs every 30 minutes and cleans up expired transactions
✅ Failed OTP attempts are tracked (max 3)
✅ All API endpoints return correct data

---

## Need Help?

If you encounter any issues:
1. Check backend console logs
2. Check browser console for JavaScript errors
3. Verify database connection and data
4. Check that all files were pulled correctly from git

Happy Testing! 🚀
