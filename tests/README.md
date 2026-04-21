# FarmEasy Test Suite

## Directory Structure

```
tests/
├── backend/
│   ├── unit/              # Pure function tests (no DB/network)
│   │   ├── encrypt.test.js    # AES-256-GCM encryption, masking, XSS strip
│   │   ├── jwt.test.js        # Token sign/verify
│   │   ├── otp.test.js        # OTP generation security
│   │   └── geo.test.js        # Haversine distance, attachDistance
│   ├── api/               # HTTP endpoint tests (supertest)
│   │   ├── auth.api.test.js       # OTP, refresh, logout, rate limit
│   │   ├── agristore.api.test.js  # Products, cart, orders, seller CRUD
│   │   ├── rent.api.test.js       # Machinery, labour, bookings
│   │   └── user.api.test.js       # Profile, PII masking, validation
│   ├── db/                # Database integration tests
│   │   └── prisma.test.js     # Constraints, FK, transactions, race conditions
│   ├── security/          # Security-specific tests
│   │   ├── injection.test.js      # SQLi, XSS, path traversal, mass assignment
│   │   └── auth.security.test.js  # Token forgery, IDOR, privilege escalation
│   └── load/              # Performance & concurrency
│       ├── booking-concurrency.test.js  # Race condition tests
│       └── k6-script.js               # k6 load test (500 VU browse, 50 VU upload)
├── mobile/
│   ├── component/         # React Native component tests (copy to frontend)
│   │   ├── LoginScreen.test.js
│   │   └── RentScreens.test.js
│   ├── e2e/               # Detox E2E tests (copy to frontend)
│   │   ├── buying-flow.e2e.js
│   │   └── booking-flow.e2e.js
│   └── unit/              # (placeholder)
├── fixtures/
│   ├── factories.js       # Test data builders for all models
│   └── setup.js           # DB setup, auth helpers, cleanup
└── README.md              # This file
```

## Running Tests

### Prerequisites

```bash
# 1. PostgreSQL running with test database
export DATABASE_URL="postgresql://user:pass@localhost:5432/farmeasy_test"
export JWT_SECRET="test-secret-at-least-32-characters-long"

# 2. Install dependencies
npm install --save-dev supertest jest @jest/globals

# 3. Push schema to test DB
npx prisma db push
```

### Unit Tests (no DB required for encrypt/jwt/geo)

```bash
npm test -- --testPathPattern='tests/backend/unit'
```

### API Tests (requires PostgreSQL)

```bash
npm test -- --testPathPattern='tests/backend/api'
```

### Security Tests (requires PostgreSQL)

```bash
npm test -- --testPathPattern='tests/backend/security'
```

### Database Tests (requires PostgreSQL)

```bash
npm test -- --testPathPattern='tests/backend/db'
```

### Concurrency Tests (requires PostgreSQL)

```bash
npm test -- --testPathPattern='tests/backend/load/booking'
```

### Load Tests (requires k6 + running server)

```bash
npm run dev &
k6 run tests/backend/load/k6-script.js
```

### All Backend Tests

```bash
npm test
```

### Mobile Tests

Mobile tests must be run from the frontend projects:

```bash
# Component tests (copy to frontend, then)
cd ../Farmeasy-froontend
npx jest tests/mobile/component/

# E2E tests (requires Detox setup)
cd ../Farmeasy-froontend
detox test --configuration ios.sim.debug
```

## Test Database

Tests use a real PostgreSQL database (not mocks) for maximum fidelity.
Each test file cleans up its own data via `cleanupTestData()` in `afterAll()`.

**IMPORTANT:** Never run against a production database. Use a dedicated test DB.

## CI Integration

Add to your CI pipeline:

```yaml
test:
  services:
    - postgres:15
  variables:
    DATABASE_URL: postgresql://postgres:postgres@postgres:5432/farmeasy_test
    JWT_SECRET: ci-test-secret-32-chars-minimum
  script:
    - npm ci
    - npx prisma db push
    - npm test -- --forceExit --detectOpenHandles
```

## Known Issues Documented in Tests

Tests marked with `BUG:` comments document real bugs found during the audit.
Search for `console.warn('[' ` to find all documented bugs.

Key bugs that tests prove exist:
1. **Booking race condition** — multiple concurrent bookings succeed for same slot
2. **Checkout race condition** — concurrent last-unit purchases both succeed
3. **Seller order status hijack** — any seller in a multi-seller order can change entire order status
4. **Client-controlled totalAmount** — booking amount accepted from client without server validation
5. **Missing XSS sanitization** — product descriptions, review comments stored with raw HTML
6. **No role guard on seller routes** — any FARMER can create products
