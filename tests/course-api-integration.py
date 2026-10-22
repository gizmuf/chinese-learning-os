"""Only for an isolated local Worker/D1; never a production Site."""
import json,time,uuid
from urllib.request import Request,urlopen
from urllib.error import HTTPError
BASE='http://127.0.0.1:8788'
checks=[]
def call(method='GET',user=None,body=None,origin=BASE,extra=None,path='/api/course-progress'):
    headers={}
    if user:headers.update({'oai-authenticated-user-id':'qa-'+user,'oai-authenticated-user-email':user+'@example.test'})
    headers.update(extra or {})
    if method=='POST':headers.update({'Origin':origin,'Content-Type':'application/json'})
    payload=(body if isinstance(body,str) else json.dumps(body)).encode() if body is not None else None
    try:
        with urlopen(Request(BASE+path,data=payload,headers=headers,method=method),timeout=20) as r:return r.status,json.loads(r.read()),r.headers
    except HTTPError as e:
        raw=e.read()
        try:payload=json.loads(raw)
        except Exception:payload=raw[:200].decode(errors='replace')
        return e.code,payload,e.headers
suffix=uuid.uuid4().hex[:8];a='course-alice-'+suffix;b='course-bob-'+suffix
event={'id':str(uuid.uuid4()),'lessonId':'intensive-03','activityId':'time-days','kind':'answer','correct':True,'assisted':False,'at':int(time.time()*1000)}
assert call()[0]==401;checks.append('anonymous course read rejected')
assert call('POST',body={'events':[event]})[0]==401;checks.append('anonymous course write rejected')
assert call('POST',a,{'events':[event],'userId':'qa-'+b})[0]==200;checks.append('course identity resolved by server')
assert call('POST',a,{'events':[event]})[0]==200
status,payload,headers=call(user=a);assert status==200 and len(payload['events'])==1;checks.append('course replay idempotent')
assert headers.get('Cache-Control')=='no-store';checks.append('course data never cached')
assert call(user=b)[1]['events']==[];checks.append('course account isolation')
assert call('POST',b,{'events':[{**event,'correct':False}]})[0]==200
assert call(user=b)[1]['events'][0]['correct']==False and call(user=a)[1]['events'][0]['correct']==True;checks.append('course UUID scoped by account')
assert call('POST',a,{'events':[event]},origin='https://other.example')[0]==403;checks.append('course foreign origin rejected')
for key,value in [('activityId','unknown'),('kind','study'),('lessonId','intensive-04'),('at',int(time.time()*1000)+600000)]:
    assert call('POST',a,{'events':[{**event,key:value}]})[0]==400
checks.append('course registry, kind, lesson and future timestamp checked')
assert call('POST',a,'{bad')[0]==400;checks.append('course malformed body rejected')
batch_response=call('POST',a,{'events':[event]*21});assert batch_response[0]==400,batch_response;checks.append('course sync batches bounded')
assert call(user=a,extra={'X-Notebook-Owner':'qa-'+b})[0]==401;checks.append('course switched owner rejected')
assert call(user=a,extra={'Authorization':'Bearer invalid'})[0]==401;checks.append('course invalid token cannot fall back')
assert call(user=a,extra={'X-Notebook-Owner':'qa-'+a})[0]==200;checks.append('course matching owner accepted')
assert call(user=a,path='/api/progress')[1]['events']==[];checks.append('course results absent from HSK API')
assert call('POST',a,{'events':[event]},path='/api/progress')[0]==400;checks.append('course events cannot enter HSK API')
assert call('POST',a,'x'*100001)[0]==413;checks.append('course body size bounded')
for check in checks:print('PASS',check)
print(f'{len(checks)} course API integration checks passed')
