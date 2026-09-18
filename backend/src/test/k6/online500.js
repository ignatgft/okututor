import http from "k6/http";
import { sleep } from "k6";
export const options = {
  scenarios: {
    online500: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "20s", target: 100 },
        { duration: "30s", target: 500 },
        { duration: "30s", target: 500 },
        { duration: "10s", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<500"],
  },
};
export default function () {
  http.get("http://localhost:8080/api/v1/tutors?page=0&size=10");
  sleep(0.5);
  http.get("http://localhost:8080/api/v1/tutors/popular?limit=6");
  sleep(0.5);
  http.get("http://localhost:8080/api/v1/search/tutors?q=math&page=0&size=10");
  sleep(1);
}
