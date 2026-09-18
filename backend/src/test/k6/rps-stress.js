import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { target: 10, duration: '20s' },
        { target: 20, duration: '20s' },
        { target: 30, duration: '20s' },
        { target: 50, duration: '20s' },
        { target: 80, duration: '20s' },
        { target: 0, duration: '10s' },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function(){
  http.get('http://localhost:8080/api/v1/tutors?page=0&size=5');
  http.get('http://localhost:8080/api/v1/tutors/popular');
  http.get('http://localhost:8080/api/v1/search/tutors?page=0&size=5');
  sleep(0.1);
}
