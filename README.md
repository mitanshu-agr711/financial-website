# 💰 Financial Management Application - Backend

A production-ready backend for a comprehensive financial management system built with **Express.js**, **MongoDB**, **Redis**, and **TypeScript**.

## ✨ Features

### 🔐 Enterprise-Grade Security
- **JWT Authentication** with role-based access control
- **Password Security** with bcryptjs hashing
- **Rate Limiting** to prevent abuse (5 auth attempts/15 min, 100 global/15 min)
- **Secure Sessions** with Redis-backed refresh tokens
- **Input Validation** with comprehensive error messages

### 👥 Role-Based Access Control (RBAC)
- **Admin**: Full system access + user management
- **Analyst**: Create/read records + dashboard analytics
- **Viewer**: Read-only dashboard access

### 💳 Financial Records Management
- ✅ Full CRUD operations
- ✅ Advanced filtering (date, category, type, search)
- ✅ Pagination support
- ✅ Soft delete (audit trail preservation)
- ✅ Bulk operations

### 📊 Analytics & Dashboard
- Total income, expenses, and net balance
- Category-wise breakdown with percentages
- Recent transactions tracking
- Daily and monthly trend analysis
- Date-range filtering for custom reports

### 🛡️ Production-Ready
- Comprehensive error handling
- Proper HTTP status codes
- Input validation on all endpoints
- MongoDB indexing for performance
- Scalable architecture

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- MongoDB (local or Atlas)
- Upstash Redis account (free tier available)

### 1️⃣ Installation

```bash
# Clone repository
cd zorvyn

# Install dependencies
npm install
```

### 2️⃣ Environment Setup

```bash
# Copy template
cp .env.example .env

# Edit .env with your credentials
# - MONGODB_URI: Your MongoDB connection string
# - JWT secrets: Generate with openssl rand -base64 32
# - Redis credentials: From Upstash console
```

### 3️⃣ Start Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm run build
npm start
```

Server runs on `http://localhost:5000`

---


## 🗂️ Project Structure

```
src/
├── controller/              # Business logic
│   ├── auth.controller.ts
│   ├── financial-record.controller.ts
│   └── dashboard.controller.ts
├── middleware/              # Express middleware
│   ├── authMiddleware.ts    # JWT & Role verification
│   ├── errorHandler.ts      # Global error handling
│   └── verifyToken.ts       # Token refresh logic
├── models/                  # MongoDB schemas
│   ├── user.model.ts
│   ├── financial-record.model.ts
│   └── connect.model.ts
├── route/                   # Express routes
│   ├── auth.route.ts
│   ├── financial-record.route.ts
│   └── dashboard.route.ts
├── types/                   # TypeScript interfaces
│   └── index.ts
├── constants/               # App constants
│   └── index.ts
├── utils/                   # Helper functions
│   ├── validation.ts
│   ├── tokengenerator.ts
│   └── redisClient.ts
└── index.ts                # App entry point
```

---

## 🔄 API Flow Examples

### Authentication Flow
```
1. POST /auth/register → Create user (default: viewer role)
2. POST /auth/login    → Get access token with role
3. POST /auth/refresh  → Renew access token (15m expiry)
4. POST /auth/logout   → Invalidate session
```

### Financial Records Flow
```
1. POST /api/records                → Create record (Analyst+)
2. GET  /api/records                → List with pagination & filters
3. GET  /api/records/:id            → Get single record
4. PUT  /api/records/:id            → Update record
5. DELETE /api/records/:id          → Soft delete (preserve audit)
6. DELETE /api/records/:id/permanent → Hard delete (Admin only)
```

### Dashboard Analytics Flow
```
1. GET /api/dashboard/summary              → Overall stats
2. GET /api/dashboard/summary/range        → Custom date range
3. GET /api/dashboard/breakdown/category   → Category analysis
4. GET /api/dashboard/trends/monthly       → Month-over-month trends
```

---

## 🔒 Security Best Practices Implemented

| Feature | Implementation |
|---------|-----------------|
| **JWT Tokens** | Signed with secret, includes role, 15m expiry |
| **Refresh Tokens** | Rotated, stored in Redis, 10d expiry |
| **Password Hashing** | bcryptjs with salt rounds = 10 |
| **Rate Limiting** | Express-rate-limit with IP-based tracking |
| **Input Validation** | Email regex, password strength, amount validation |
| **Error Handling** | Sanitized messages, no sensitive data exposure |
| **CORS** | Restricted to configured frontend URL |
| **Cookies** | HttpOnly, Secure, SameSite=None (for cross-origin) |
| **Session Management** | Redis-backed with unique session IDs |
| **Database Indexing** | Compound indexes for query performance |

---

## 📊 Data Models

### User Schema
```javascript
{
  username: String,          // unique
  email: String,             // unique
  password: String,          // hashed
  name: String,
  role: 'viewer' | 'analyst' | 'admin',
  status: 'active' | 'inactive',
  createdAt: Date,
  updatedAt: Date
}
```

### Financial Record Schema
```javascript
{
  userId: ObjectId,          // ref: User
  amount: Number,            // > 0
  type: 'income' | 'expense',
  category: String,
  date: Date,
  description: String,
  isDeleted: Boolean,        // soft delete
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🧪 Testing

### Manual Testing with cURL

```bash
# Register User
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jane_smith",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "password": "SecurePass123"
  }'

# Login
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jane_smith",
    "password": "SecurePass123"
  }'
# Response includes: accessToken, user info

# Create Record (use token from login response)
curl -X POST http://localhost:5000/api/records \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 3000,
    "type": "expense",
    "category": "Food",
    "date": "2024-01-20",
    "description": "Weekly grocery shopping"
  }'

# Get Dashboard Summary
curl -X GET http://localhost:5000/api/dashboard/summary \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

# List Records with Filters
curl -X GET "http://localhost:5000/api/records?page=1&limit=10&type=expense&category=Food" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## ⚙️ Configuration Guide

### Development Setup
```env

MONGODB_URI=mongodb://localhost:27017/financial-management
ACCESS_TOKEN_SECRET=dev_secret_key
REFRESH_TOKEN_SECRET=dev_refresh_secret
FRONTEND_URL=http://localhost:3000
```

### Production Setup
```env

MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/financial-management
ACCESS_TOKEN_SECRET=<generate_with_: openssl rand -base64 32>
REFRESH_TOKEN_SECRET=<generate_with_: openssl rand -base64 32>
UPSTASH_REDIS_REST_URL=https://production.upstash.io
UPSTASH_REDIS_REST_TOKEN=<your_production_token>
FRONTEND_URL=https://yourdomain.com
```

---

## 🐛 Troubleshooting

### MongoDB Connection Failed
```bash
# Check if MongoDB is running
mongod  # Windows: start MongoDB service

# Verify connection string in .env
# Format: mongodb://localhost:27017/database_name
```

### Redis Connection Issues
```bash
# Test Redis connection
curl https://your-upstash-url/get/test

# Verify UPSTASH_REDIS_REST_URL and token are correct
```

### "Token missing" Error
```
▶ Solution: Include Authorization header
  Authorization: Bearer <your_access_token>
```

### Rate Limit Exceeded
```
▶ Wait 15 minutes or use different IP address
▶ Check /auth endpoints specifically limited to 5 attempts
```

### Soft Deleted Records Still Appear
```
▶ By design: isDeleted=false filters in GET queries
▶ Only admins can permanently delete with /permanent endpoint
▶ Preserves audit trail
```

---

## 📈 Performance Tips

1. **Query Optimization**
   - Pagination on large datasets
   - Use date-range filters
   - Avoid full table scans

2. **Database Indexing**
   - Indexes on userId for quick filtering
   - Compound indexes on frequently queried combinations
   - Indexes on date for range queries

3. **Caching Strategy**
   - Redis for session storage
   - Token expiry for auto-cleanup
   - Consider caching dashboard summaries

4. **Scalability**
   - Stateless design allows horizontal scaling
   - Redis session store for multi-server deployment
   - MongoDB replica sets for high availability

---

## 🔄 Update Token with Role

When user role changes (via admin), existing tokens remain valid until expiry. To enforce immediate:
1. Next `/auth/refresh` request will include new role
2. Or user logs out and logs back in

---

## 📝 API Response Format

### Success Response
```json
{
  "message": "Operation successful",
  "data": { /* actual data */ },
  "pagination": { /* if applicable */ }
}
```

### Error Response
```json
{
  "message": "Error description",
  "statusCode": 400,
  "errors": {
    "field": "Field-specific error"
  }
}
```

---




## 📜 License

Private Project - For authorized use only

---


Author 

MITANSHU AGRAWAL

@mitanshu-agr711
@linkdin -> https://www.linkedin.com/in/mitanshu-agrawal/

@copyright2026