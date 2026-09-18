import http from 'k6/http';
export const options = {
  scenarios: {
    single: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 100,
      stages: [
        { target: 20, duration: '15s' },
        { target: 40, duration: '15s' },
        { target: 60, duration: '15s' },
        { target: 80, duration: '15s' },
        { target: 0, duration: '10s' },
      ],
    },
  },
};
export default function(){
  http.get('http://localhost:8080/api/v1/tutors?page=0&size=5');
}
