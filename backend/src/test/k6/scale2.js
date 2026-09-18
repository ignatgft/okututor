import http from "k6/http";
import { sleep } from "k6";
export const options = { vus: 100, duration: "20s" };
export default function () {
  const port = Math.random() < 0.5 ? 8080 : 8081;
  http.get(`http://localhost:${port}/api/v1/tutors/slice?page=0&size=10`);
  sleep(0.5);
}
