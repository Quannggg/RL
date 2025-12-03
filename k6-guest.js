import http from 'k6/http';
import { sleep } from 'k6';

export let options = {
  vus: 50,      // số user ảo đồng thời
  duration: '30s'
};

export default function () {
  http.get('http://127.0.0.1:3000/demo/sliding', { headers: { 'x-user-role': 'guest' }});
  sleep(0.01);
}
