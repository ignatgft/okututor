import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = {
  scenarios: {
    rps: { executor: 'constant-arrival-rate', rate: 50, timeUnit: '1s', duration: '15s', preAllocatedVUs: 20, maxVUs: 50 }
  },
  thresholds: { http_req_duration: ['p(95)<500'], http_req_failed: ['rate<0.05'] }
};
export default function() {
  const r = http.get('http://localhost:8080/api/v1/tutors?page=0&size=10');
  check(r, { '200': x=>x.status===200 });
}
