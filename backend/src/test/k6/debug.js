import http from 'k6/http';
import { check } from 'k6';
export default function(){
  const r1 = http.get('http://localhost:8080/api/v1/courses?page=0&size=10');
  console.log('courses status='+r1.status+' body='+r1.body.substring(0,500));
  const r2 = http.get('http://localhost:8080/api/v1/courses?subject=IT&price_min=100&rating_min=4&location_type=online');
  console.log('search status='+r2.status+' body='+r2.body.substring(0,500));
  const login = http.post('http://localhost:8080/api/v1/auth/login', JSON.stringify({email:'tutor@test.com',password:'Tutor#12345'}), {headers:{'Content-Type':'application/json'}});
  console.log('login status='+login.status+' body='+login.body.substring(0,500));
  const tok = login.json().access_token || '';
  const r3 = http.post('http://localhost:8080/api/v1/courses', JSON.stringify({title:'k6-'+Date.now(),description:'k6 test',subject:'IT',category:null,days:['weekdays'],specific_days:[],group_size:'individual',location_type:'online',experience:2,price_per_hour:200,currency:'KGS',max_students:1,status:'DRAFT'}), {headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok}});
  console.log('create status='+r3.status+' body='+r3.body.substring(0,800));
}
export const options = { vus:1, iterations:1 };
