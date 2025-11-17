# Testing Guide - Rate Limiting Module Refactoring

Hướng dẫn đầy đủ để test code sau khi refactor thêm 3 design patterns (Strategy, Factory, Observer).

---

## 📋 Mục Lục

1. [Unit Testing](#1-unit-testing)
2. [Integration Testing](#2-integration-testing)
3. [Manual Testing - Local Development](#3-manual-testing---local-development)
4. [Manual Testing - Docker Scenario 1](#4-manual-testing---docker-scenario-1)
5. [Manual Testing - Docker Scenario 2](#5-manual-testing---docker-scenario-2)
6. [Load Testing với K6](#6-load-testing-với-k6)
7. [Kiểm Tra Event System](#7-kiểm-tra-event-system)

---

## 1. Unit Testing

### Chạy tất cả unit tests:

```bash
npm test
```

### Chạy tests với coverage:

```bash
npm run test:cov
```

### Chạy tests cho từng module cụ thể:

```bash
# Test Strategy Pattern
npm test -- sliding-window.strategy.spec
npm test -- token-bucket.strategy.spec

# Test Factory Pattern
npm test -- rate-limit-strategy.factory.spec

# Test Observer Pattern
npm test -- rate-limit.listener.spec

# Test Guard
npm test -- rate-limit.guard.spec
```

### Chạy tests ở watch mode (auto-reload):

```bash
npm run test:watch
```

### Kết quả mong đợi:

```
PASS  src/rate-limit/strategies/sliding-window.strategy.spec.ts
PASS  src/rate-limit/strategies/token-bucket.strategy.spec.ts
PASS  src/rate-limit/rate-limit-strategy.factory.spec.ts
PASS  src/rate-limit/listeners/rate-limit.listener.spec.ts
PASS  src/rate-limit/rate-limit.guard.spec.ts

Test Suites: 5 passed, 5 total
Tests:       30+ passed, 30+ total
```

---

## 2. Integration Testing

### Setup môi trường test:

```bash
# Đảm bảo Redis đang chạy
docker run -d -p 6379:6379 redis:7

# Hoặc sử dụng Docker Compose
docker-compose up -d redis
```

### Chạy e2e tests:

```bash
npm run test:e2e
```

---

## 3. Manual Testing - Local Development

### Bước 1: Khởi động Redis

```bash
docker run -d -p 6379:6379 --name redis-test redis:7
```

### Bước 2: Khởi động ứng dụng NestJS

```bash
npm run start:dev
```

### Bước 3: Test Sliding Window Strategy

Mở terminal và chạy:

```powershell
# PowerShell - Test 6 requests (limit = 5)
1..6 | % { 
    $response = Invoke-WebRequest http://localhost:3000/demo/sliding -UseBasicParsing
    Write-Host "Request $($_): Status $($response.StatusCode)"
}
```

**Kết quả mong đợi:**
- Request 1-5: Status `200` (OK)
- Request 6: Status `429` (Too Many Requests)
- Console sẽ hiển thị: `🚨 SECURITY ALERT: Rate limit exceeded...`

### Bước 4: Test Token Bucket Strategy

```powershell
# PowerShell - Test 12 requests (capacity = 10)
1..12 | % { 
    $response = try { 
        Invoke-WebRequest http://localhost:3000/demo/bucket -UseBasicParsing 
    } catch { 
        $_.Exception.Response 
    }
    Write-Host "Request $($_): Status $($response.StatusCode)"
}
```

**Kết quả mong đợi:**
- Request 1-10: Status `200` (OK)
- Request 11-12: Status `429` (Too Many Requests)
- Console sẽ hiển thị security alerts

### Bước 5: Kiểm tra Observer Pattern hoạt động

Khi bị rate limit, check console log của server:

```
🚨 SECURITY ALERT: Rate limit exceeded for IP ::1 on route GET:/demo/sliding:::1
🚨 SECURITY ALERT: Rate limit exceeded for IP ::1 on route GET:/demo/bucket:::1
```

✅ **Điều này chứng minh Observer Pattern hoạt động đúng!**

### Bước 6: Test với curl (Linux/Mac)

```bash
# Test sliding window
for i in {1..6}; do
    echo "Request $i:"
    curl -w "\nStatus: %{http_code}\n" http://localhost:3000/demo/sliding
    echo "---"
done

# Test token bucket
for i in {1..12}; do
    echo "Request $i:"
    curl -w "\nStatus: %{http_code}\n" http://localhost:3000/demo/bucket
    echo "---"
done
```

---

## 4. Manual Testing - Docker Scenario 1 (Direct Connection)

### Architecture:
```
Client → NestJS App (port 8080) → Redis
```

### Bước 1: Khởi động containers

```bash
docker-compose -f docker-compose.scenario1.yml up --build -d
```

### Bước 2: Kiểm tra containers đang chạy

```bash
docker ps
```

Bạn sẽ thấy:
- `nestjs_app_s1` (port 8080 → 3000)
- `redis_s1`

### Bước 3: Test endpoints

```powershell
# Test sliding window
1..6 | % { 
    $response = try {
        Invoke-WebRequest http://localhost:8080/demo/sliding -UseBasicParsing
    } catch {
        $_.Exception.Response
    }
    Write-Host "Request $($_): Status $($response.StatusCode)"
}

# Test token bucket
1..12 | % { 
    $response = try {
        Invoke-WebRequest http://localhost:8080/demo/bucket -UseBasicParsing
    } catch {
        $_.Exception.Response
    }
    Write-Host "Request $($_): Status $($response.StatusCode)"
}
```

### Bước 4: Xem logs để kiểm tra Observer Pattern

```bash
docker logs nestjs_app_s1 -f
```

Bạn sẽ thấy security alerts khi rate limit bị vượt quá.

### Bước 5: Dọn dẹp

```bash
docker-compose -f docker-compose.scenario1.yml down
```

---

## 5. Manual Testing - Docker Scenario 2 (With NGINX Gateway)

### Architecture:
```
Client → NGINX (port 8080) → NestJS App → Redis
```

### Bước 1: Khởi động containers

```bash
docker-compose -f docker-compose.scenario2.yml up --build -d
```

### Bước 2: Kiểm tra containers

```bash
docker ps
```

Bạn sẽ thấy:
- `nginx_gateway` (port 8080 → 80)
- `nestjs_app_s2`
- `redis_s2`

### Bước 3: Test với NGINX

```powershell
# Test qua NGINX gateway
1..6 | % { 
    $response = try {
        Invoke-WebRequest http://localhost:8080/demo/sliding -UseBasicParsing
    } catch {
        $_.Exception.Response
    }
    Write-Host "Request $($_): Status $($response.StatusCode)"
}
```

**Lưu ý:** IP được trích xuất từ `x-forwarded-for` header do NGINX forward.

### Bước 4: Xem logs

```bash
# NestJS logs
docker logs nestjs_app_s2 -f

# NGINX logs
docker logs nginx_gateway -f
```

### Bước 5: Dọn dẹp

```bash
docker-compose -f docker-compose.scenario2.yml down
```

---

## 6. Load Testing với K6

K6 giúp simulate nhiều users đồng thời để test rate limiting under load.

### Bước 1: Cài đặt K6

**Windows (Chocolatey):**
```powershell
choco install k6
```

**Mac:**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Bước 2: Chạy load test với Scenario 1

```bash
# Khởi động scenario 1
docker-compose -f docker-compose.scenario1.yml up --build -d

# Chạy K6 test
k6 run k6_script.js

# Dọn dẹp
docker-compose -f docker-compose.scenario1.yml down
```

### Bước 3: Chạy load test với Scenario 2

```bash
# Khởi động scenario 2
docker-compose -f docker-compose.scenario2.yml up --build -d

# Chạy K6 test
k6 run k6_script.js

# Dọn dẹp
docker-compose -f docker-compose.scenario2.yml down
```

### Kết quả mong đợi:

```
✓ status 200 (OK)
✓ status 429 (Too Many Requests - NestJS)
✗ status 503 (Service Unavailable - NGINX)

checks.........................: 66.67% ✓ 2000 ✗ 1000
http_req_duration..............: avg=50ms min=10ms med=45ms max=200ms
http_reqs......................: 6000 (200/s)
```

### Custom K6 script để test cụ thể:

Tạo file `k6_test_strategies.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 50 },  // Ramp up to 50 users
    { duration: '30s', target: 50 },  // Stay at 50 users
    { duration: '10s', target: 0 },   // Ramp down to 0 users
  ],
};

export default function () {
  // Test sliding window
  const slidingRes = http.get('http://localhost:8080/demo/sliding');
  check(slidingRes, {
    'sliding: status 200 or 429': (r) => r.status === 200 || r.status === 429,
  });

  sleep(0.5);

  // Test token bucket
  const bucketRes = http.get('http://localhost:8080/demo/bucket');
  check(bucketRes, {
    'bucket: status 200 or 429': (r) => r.status === 200 || r.status === 429,
  });

  sleep(0.5);
}
```

Chạy:
```bash
k6 run k6_test_strategies.js
```

---

## 7. Kiểm Tra Event System (Observer Pattern)

### Test 1: Verify Event Listener được đăng ký

```bash
# Khởi động app
npm run start:dev

# Trong logs, tìm kiếm:
# "EventEmitterModule dependencies initialized"
```

### Test 2: Kiểm tra Event được emit khi rate limit exceeded

Trigger rate limit và xem console:

```powershell
# Gửi nhiều requests nhanh
1..10 | % { Invoke-WebRequest http://localhost:3000/demo/sliding -UseBasicParsing }
```

**Kết quả mong đợi trong console:**
```
🚨 SECURITY ALERT: Rate limit exceeded for IP ::1 on route GET:/demo/sliding:::1
🚨 SECURITY ALERT: Rate limit exceeded for IP ::1 on route GET:/demo/sliding:::1
```

### Test 3: Tạo thêm listener để verify multiple observers

Tạo file `src/rate-limit/listeners/security-alert.listener.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserBlockedPayload } from '../events/user-blocked.event';

@Injectable()
export class SecurityAlertListener {
  @OnEvent('rate_limit.blocked')
  handleBlocked(payload: UserBlockedPayload): void {
    console.log(`[SECURITY] Potential attack detected from ${payload.ip}`);
  }
}
```

Add vào `rate-limit.module.ts`:

```typescript
providers: [
  // ... existing providers
  SecurityAlertListener,
],
```

Chạy lại test và bạn sẽ thấy **2 logs** cho mỗi blocked event:
- Log từ `RateLimitListener`
- Log từ `SecurityAlertListener`

✅ **Điều này chứng minh Observer Pattern cho phép nhiều listeners!**

---

**Happy Testing! 🎉**

