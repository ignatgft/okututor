import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const STUDENT_EMAIL = __ENV.STUDENT_EMAIL;
const STUDENT_PASSWORD = __ENV.STUDENT_PASSWORD;

const errors = new Rate('api_errors');
const apiRequests = new Counter('api_requests');
const searchDuration = new Trend('search_duration');

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 2),
      duration: __ENV.DURATION || '30s',
    },
  },

  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<800'],
    api_errors: ['rate<0.02'],
  },
};

function request(method, path, body = null, token = null, params = {}) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${path}`;

  let response;

  if (method === 'GET') {
    response = http.get(url, {
      headers,
      ...params,
    });
  } else if (method === 'POST') {
    response = http.post(
      url,
      body ? JSON.stringify(body) : null,
      {
        headers,
        ...params,
      },
    );
  } else if (method === 'PUT') {
    response = http.put(
      url,
      body ? JSON.stringify(body) : null,
      {
        headers,
        ...params,
      },
    );
  } else if (method === 'DELETE') {
    response = http.del(url, null, {
      headers,
      ...params,
    });
  }

  apiRequests.add(1);

  return response;
}

function json(response) {
  try {
    return response.json();
  } catch (_) {
    return {};
  }
}

export function setup() {
  const response = request(
    'POST',
    '/api/v1/auth/login',
    {
      email: STUDENT_EMAIL,
      password: STUDENT_PASSWORD,
    },
  );

  check(response, {
    'login returns 200': r => r.status === 200,
    'login returns access token': r => !!json(r).access_token,
  });

  const data = json(response);

  if (!data.access_token) {
    throw new Error(
      `Unable to login. HTTP ${response.status}: ${response.body}`,
    );
  }

  return {
    accessToken: data.access_token,
  };
}

export default function (data) {
  const token = data.accessToken;

  group('public endpoints', () => {
    let response;

    response = request(
      'GET',
      '/api/v1/courses?page=0&size=20',
    );

    check(response, {
      'courses status 200': r => r.status === 200,
      'courses has content': r => {
        const body = json(r);
        return Array.isArray(body.content);
      },
    });

    errors.add(response.status >= 400);

    response = request(
      'GET',
      '/api/v1/courses/popular',
    );

    check(response, {
      'popular courses status 200': r => r.status === 200,
    });

    errors.add(response.status >= 400);

    response = request(
      'GET',
      '/api/v1/users/tutors?page=0&size=20',
    );

    check(response, {
      'tutors status 200': r => r.status === 200,
    });

    errors.add(response.status >= 400);
  });

  group('search', () => {
    const start = Date.now();

    const response = request(
      'GET',
      '/api/v1/courses?q=java&subject=PROGRAMMING&page=0&size=20',
    );

    searchDuration.add(Date.now() - start);

    check(response, {
      'search status 200': r => r.status === 200,
      'search response exists': r => !!r.body,
    });

    errors.add(response.status >= 400);
  });

  group('authenticated user', () => {
    let response;

    response = request(
      'GET',
      '/api/v1/auth/me',
      null,
      token,
    );

    check(response, {
      'auth/me status 200': r => r.status === 200,
    });

    errors.add(response.status >= 400);

    response = request(
      'GET',
      '/api/v1/users/me',
      null,
      token,
    );

    check(response, {
      'users/me status 200': r => r.status === 200,
    });

    errors.add(response.status >= 400);

    response = request(
      'GET',
      '/api/v1/bookings/me?page=0&size=20',
      null,
      token,
    );

    check(response, {
      'my bookings status 200': r => r.status === 200,
    });

    errors.add(response.status >= 400);

    response = request(
      'GET',
      '/api/v1/students/me/enrollments?page=0&size=20',
      null,
      token,
    );

    check(response, {
      'my enrollments status 200': r => r.status === 200,
    });

    errors.add(response.status >= 400);

    response = request(
      'GET',
      '/api/v1/lessons?page=0&size=20',
      null,
      token,
    );

    check(response, {
      'lessons status 200': r => r.status === 200,
    });

    errors.add(response.status >= 400);

    response = request(
      'GET',
      '/api/v1/notifications',
      null,
      token,
    );

    check(response, {
      'notifications status 200': r => r.status === 200,
    });

    errors.add(response.status >= 400);

    response = request(
      'GET',
      '/api/v1/notifications/unread-count',
      null,
      token,
    );

    check(response, {
      'unread count status 200': r => r.status === 200,
    });

    errors.add(response.status >= 400);

    response = request(
      'GET',
      '/api/v1/messages/conversations',
      null,
      token,
    );

    check(response, {
      'conversations status 200': r => r.status === 200,
    });

    errors.add(response.status >= 400);

    response = request(
      'GET',
      '/api/v1/support/tickets?page=0&size=20',
      null,
      token,
    );

    check(response, {
      'support tickets status 200': r => r.status === 200,
    });

    errors.add(response.status >= 400);
  });

  group('authorization', () => {
    const response = request(
      'GET',
      '/api/v1/admin/stats',
      null,
      token,
    );

    check(response, {
      'student cannot access admin stats': r =>
        r.status === 403 || r.status === 401,
    });
  });

  sleep(1);
}