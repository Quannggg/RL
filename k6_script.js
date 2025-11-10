import http from 'k6/http';
import { check } from 'k6';

export const options = {
  // 200 người dùng ảo đồng thời
  vus: 200,
  // Tấn công liên tục trong 30 giây
  duration: '30s',
};

export default function () {
  const targetUrl = 'http://localhost:8080/demo';

  const res = http.get(targetUrl);

  // Kiểm tra các mã status trả về
  check(res, {
    'status 200 (OK)': (r) => r.status === 200,
    'status 429 (Too Many Requests - NestJS)': (r) => r.status === 429,
    'status 503 (Service Unavailable - NGINX)': (r) => r.status === 503,
  });
}
