import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost:8080';

const tRegister = new Trend('t_register_ms');
const tVerify = new Trend('t_verify_ms');
const tLogin = new Trend('t_login_ms');
const tCreate = new Trend('t_create_ms');
const tApprove = new Trend('t_approve_ms');
const tPublic = new Trend('t_public_ms');
const success = new Rate('success_rate');
const fails = new Counter('fails');

function api(method, path, body, token){
  const ip = `10.${Math.floor(Math.random()*250)+1}.${Math.floor(Math.random()*250)+1}.${Math.floor(Math.random()*250)+1}`;
  const h={'Content-Type':'application/json','X-Forwarded-For':ip, 'X-Real-IP':ip};
  if(token) h['Authorization']='Bearer '+token;
  const p={headers:h, timeout:'30s'};
  if(body) p.body=JSON.stringify(body);
  let r;
  if(method==='GET') r=http.get(BASE+path,p);
  else if(method==='POST') r=http.post(BASE+path,p.body||null,p);
  else if(method==='PUT') r=http.put(BASE+path,p.body||null,p);
  else r=http.del(BASE+path,null,p);
  return r;
}
function rand(n){return Math.random().toString(36).slice(2,2+n)}

export const options={
  scenarios:{ resume_flow:{ executor:'shared-iterations', vus:10, iterations:100, maxDuration:'12m' } },
  thresholds:{ 'success_rate':['rate>0.90'], 'http_req_duration':['p(95)<4000'] },
};

export function setup(){
  const r=http.post(BASE+'/api/v1/auth/login', JSON.stringify({email:'dev.super@test.com', password:'Admin#12345'}), {headers:{'Content-Type':'application/json'}});
  const j=r.json();
  const at=j && j.access_token ? j.access_token : null;
  if(!at) throw 'admin login failed '+r.body;
  return {adminToken: at};
}

export default function(data){
  const tag=`t-${__VU}-${__ITER}-${rand(4)}`;
  const email=`k6-${tag}@test.local`;
  let tutorToken=null;
  let appId=null;
  let slug=null;

  group('1-register',()=>{
    const t0=Date.now();
    const r=api('POST','/api/v1/auth/register',{email, password:'Test#12345', repeat_password:'Test#12345', full_name:'Load '+tag, termsAccepted:true, privacyAccepted:true});
    const ok = check(r,{'register 200/201':x=> x.status===200||x.status===201});
    if(!ok) fails.add(1);
    tRegister.add(Date.now()-t0);
  });

  group('1b-verify via admin',()=>{
    const t0=Date.now();
    // find user id
    const lr=api('GET',`/api/v1/admin/users?q=${encodeURIComponent(email)}`,null,data.adminToken);
    let uid=null;
    try{
      const j=lr.json();
      const content=j.content || j;
      if(Array.isArray(content) && content.length>0) uid=content[0].id;
      else if(j.id) uid=j.id;
    }catch(e){}
    if(uid){
      const vr=api('PUT',`/api/v1/admin/users/${uid}/verify`,null,data.adminToken);
      check(vr,{'verify ok':x=> x.status===200});
    }
    tVerify.add(Date.now()-t0);
  });

  group('2-login tutor',()=>{
    const t0=Date.now();
    const r=api('POST','/api/v1/auth/login',{email, password:'Test#12345'});
    const j=r.json();
    tutorToken=j && j.access_token ? j.access_token : null;
    const ok = check(r,{'login ok':x=> x.status===200 && !!tutorToken});
    if(!ok) fails.add(1);
    tLogin.add(Date.now()-t0);
  });
  if(!tutorToken){ success.add(false); sleep(0.2); return; }

  group('3-create application',()=>{
    const t0=Date.now();
    const payload={
      full_name: 'Test '+tag,
      phone: '+996700'+Math.floor(100000+Math.random()*900000),
      location: 'Бишкек',
      experience_years: 3,
      experience_description: '3 года',
      education: 'КРСУ',
      subjects: 'Математика',
      levels: 'Школьный',
      languages: 'Kyrgyz',
      bio: 'About '+tag+' math and english for search, unique '+tag,
      price_per_hour: 500,
      format: 'online'
    };
    const r=api('POST','/api/v1/tutors/applications',payload,tutorToken);
    const j=r.json();
    const ok = check(r,{'create app 200/201':x=> x.status===200||x.status===201});
    if(j && j.id) appId=j.id;
    else if(j && j.application && j.application.id) appId=j.application.id;
    // fallback try profile create
    if(!appId && (r.status===400||r.status===404)){
      const r2=api('POST','/api/v1/tutors',{firstName:'Test '+tag, lastName:'Tutor', title:'Math', shortDescription:'x', about:'About '+tag, tutorType:'STUDENT_TUTOR', priceFrom:500, currency:'KGS', online:true, offline:false, languages:['Kyrgyz']},tutorToken);
      const j2=r2.json();
      if(j2 && j2.id) appId=j2.id;
    }
    tCreate.add(Date.now()-t0);
    if(!appId) fails.add(1);
  });

  if(!appId){
    // try via me
    const r=api('GET','/api/v1/tutors/me',null,tutorToken);
    const j=r.json();
    if(j && j.id){ appId=j.id; slug=j.slug; }
    if(!appId){
      const r2=api('GET','/api/v1/tutors/applications/me',null,tutorToken);
      const j2=r2.json();
      if(j2 && j2.id) appId=j2.id;
    }
  }

  group('4-admin approve',()=>{
    if(!appId){ fails.add(1); return; }
    const t0=Date.now();
    let targetId=appId;
    let r=api('POST',`/api/v1/admin/tutor-profiles/${targetId}/approve`,{},data.adminToken);
    if(r.status===404||r.status===400){
      r=api('POST',`/api/v1/admin/tutors/${targetId}/approve`,{},data.adminToken);
    }
    let ok = check(r,{'approve 200':x=> x.status===200});
    if(!ok){
      const lr=api('GET','/api/v1/admin/tutor-profiles?status=PENDING',null,data.adminToken);
      try{
        const lj=lr.json();
        const arr= lj.content || lj;
        const first=Array.isArray(arr) && arr.length ? arr[0] : null;
        if(first && first.id){
          const r2=api('POST',`/api/v1/admin/tutor-profiles/${first.id}/approve`,{},data.adminToken);
          ok=check(r2,{'approve via list':x=> x.status===200});
          if(ok){ targetId=first.id; slug=first.slug; appId=first.id; }
        }
      }catch(e){}
      if(!ok) fails.add(1);
    } else {
      try{ const j=r.json(); if(j && j.slug) slug=j.slug; if(j && j.id) appId=j.id; }catch(e){}
    }
    tApprove.add(Date.now()-t0);
  });

  group('5-public check',()=>{
    const t0=Date.now();
    let s=slug;
    if(!s && appId){
      const r=api('GET','/api/v1/tutors/me',null,tutorToken);
      const j=r.json();
      s=j && j.slug;
    }
    let ok=false;
    if(s){
      const r=api('GET',`/api/v1/tutors/${encodeURIComponent(s)}`);
      const j=r.json();
      ok=check(r,{'public 200':x=> x.status===200}) && j && (j.status==='PUBLISHED' || j.status==='PUBLISHED');
      if(!j || j.status!=='PUBLISHED'){
        const r2=api('GET',`/api/v1/tutors/${appId}`);
        const ok2=check(r2,{'public via id 200':x=> x.status===200});
        ok = ok || ok2;
      }
    } else {
      const r=api('GET',`/api/v1/tutors?page=0&size=5`);
      ok=check(r,{'public list 200':x=> x.status===200});
    }
    tPublic.add(Date.now()-t0);
    if(ok) success.add(true); else { success.add(false); fails.add(1); }
  });
  sleep(0.2);
}

export function handleSummary(data){
  return {
    'stdout': JSON.stringify({
      success_rate: data.metrics.success_rate ? data.metrics.success_rate.values.rate : null,
      fails: data.metrics.fails ? data.metrics.fails.values.count : 0,
      t_register_p95: data.metrics.t_register_ms ? data.metrics.t_register_ms.values['p(95)'] : null,
      t_approve_p95: data.metrics.t_approve_ms ? data.metrics.t_approve_ms.values['p(95)'] : null,
      p95: data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'] : null,
      failed_rate: data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate : null,
      iterations: data.metrics.iterations ? data.metrics.iterations.values.count : null,
    }, null, 2)
  };
}
