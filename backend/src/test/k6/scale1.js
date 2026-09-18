import http from "k6/http";
import { sleep } from "k6";
export const options = { vus: 100, duration: "20s" };
export default function () {
  http.get("http://localhost:8080/api/v1/tutors/slice?page=0&size=10");
  sleep(0.5);
}
