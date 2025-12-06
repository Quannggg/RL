import http from 'k6/http';
import { check } from 'k6';

// Scenario: Test /orders endpoint WITH queue (CKI - Có Queue)
// Gửi 15 requests/giây vào endpoint giới hạn 10 req/s
export const options = {
  scenarios: {
    orders_with_queue: {
      executor: 'constant-arrival-rate',
      rate: 15, // 15 requests per second
      timeUnit: '1s',
      duration: '10s', // Test trong 10 giây
      preAllocatedVUs: 10,
      maxVUs: 50,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function () {
  const targetUrl = 'http://localhost:3000/demo/orders';
  const payload = JSON.stringify({
    productId: `PROD-${Math.floor(Math.random() * 1000)}`,
    quantity: Math.floor(Math.random() * 10) + 1,
    customerId: `CUST-${Math.floor(Math.random() * 100)}`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(targetUrl, payload, params);

  // Kiểm tra các mã status trả về
  check(res, {
    'status 201 (Created - Processed immediately)': (r) => r.status === 201,
    'status 202 (Accepted - Queued)': (r) => r.status === 202,
    'status 429 (Too Many Requests - Queue full)': (r) => r.status === 429,
    'has jobId when queued': (r) => {
      if (r.status === 202) {
        try {
          const body = JSON.parse(r.body);
          return body.jobId !== undefined;
        } catch (e) {
          return false;
        }
      }
      return true;
    },
  });
}

