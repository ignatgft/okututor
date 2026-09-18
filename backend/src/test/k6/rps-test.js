import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost:8080';
const STUDENT = { email: 'test@test.com', password: 'Student#12345' };
const TUTOR = { email: 'tutor@test.com', password: 'Tutor#12345' };
const ADMIN = { email: 'super@admin.test', password: 'Admin#12345' };

const httpErrors = new Counter('http_errors');
const apiLatency = new Trend('api_latency');

function api(method, path, body, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const opts = { headers, timeout: '30s' };
    if (body) opts.body = JSON.stringify(body);
    let res;
    if (method === 'GET') res = http.get(BASE + path, opts);
    else if (method === 'POST') res = http.post(BASE + path, opts.body, opts);
    else if (method === 'PUT') res = http.put(BASE + path, opts.body, opts);
    else res = http.del(BASE + path, null, opts);
    apiLatency.add(res.timings.duration);
    if (res.status >= 400) httpErrors.add(1);
    return res;
}
function ok(res, status, tag) {
    const s = Array.isArray(status) ? status : [status];
    return check(res, { [tag]: r => s.includes(r.status) });
}
function login(c){ const r=api('POST','/api/v1/auth/login',{email:c.email,password:c.password}); return r.json(); }

export function setup(){
    const s=login(STUDENT); const t=login(TUTOR); const a=login(ADMIN);
    return { s: s.access_token||'', t: t.access_token||'', a: a.access_token||'', tutorId: t.user?.id||'' };
}

export default function(data){
    group('Public: tutors list', ()=> ok(api('GET','/api/v1/tutors?page=0&size=10'),200,'tutors'));
    group('Public: search', ()=> ok(api('GET','/api/v1/search/tutors?online=true&page=0&size=10'),200,'search'));
    group('Public: popular', ()=> ok(api('GET','/api/v1/tutors/popular'),200,'popular'));
    group('Public: bySlug', ()=>{
        const r=api('GET','/api/v1/tutors?page=0&size=1');
        const slug=r.json()?.content?.[0]?.slug;
        if(slug) ok(api('GET','/api/v1/tutors/'+slug),200,'bySlug');
    });
    group('Public: users tutors', ()=> ok(api('GET','/api/v1/users/tutors?page=0&size=5'),200,'users-tutors'));
    sleep(0.2);
    group('Auth: me', ()=> ok(api('GET','/api/v1/auth/me',null,data.s),200,'me'));
    group('Auth: refresh', ()=>{
        const f=login(STUDENT);
        if(f.refresh_token) ok(api('POST','/api/v1/auth/refresh',{refresh_token:f.refresh_token}),200,'refresh');
    });
    sleep(0.1);
    // tutor profile
    group('Tutor: me', ()=> ok(api('GET','/api/v1/tutors/me',null,data.t),200,'tutor-me'));
    group('Tutor: search suggestions', ()=> ok(api('GET','/api/v1/search/suggestions?q=math'),200,'suggest'));
    sleep(0.1);
    // support + admin
    group('Support: create', ()=>{
        const r=api('POST','/api/v1/support/tickets',{category:'TECHNICAL',subject:'k6-'+Date.now(),description:'k6',priority:'NORMAL'},data.s);
        ok(r,[200,201,409],'ticket');
    });
    group('Admin: stats', ()=> ok(api('GET','/api/v1/admin/stats',null,data.a),200,'stats'));
    group('Admin: users', ()=> ok(api('GET','/api/v1/admin/users?page=0&size=10',null,data.a),200,'admin-users'));
    group('Msg: convs', ()=> ok(api('GET','/api/v1/conversations',null,data.s),200,'convs'));
    group('Notifications', ()=> ok(api('GET','/api/v1/notifications',null,data.s),200,'notifs'));
    sleep(0.2);
}

export const options = {
    scenarios: {
        rps_test: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '10s', target: 10 },
                { duration: '30s', target: 10 },
                { duration: '10s', target: 0 },
            ],
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<2000'],
        http_req_failed: ['rate<0.10'],
    },
};
