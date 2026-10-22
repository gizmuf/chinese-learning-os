"""Only for an isolated local Worker/D1; never a production Site."""
import json,time,uuid
from urllib.request import Request,urlopen
from urllib.error import HTTPError
BASE='http://127.0.0.1:8788'
checks=[]
def call(method='GET',user=None,body=None,origin=BASE,extra=None,path='/api/atlas-progress'):
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
suffix=uuid.uuid4().hex[:8];a='atlas-alice-'+suffix;b='atlas-bob-'+suffix
event={'version':1,'id':str(uuid.uuid4()),'targetId':'u6674','skill':'meaning','mode':'choice','rating':3,'assisted':False,'at':int(time.time()*1000)}
assert call()[0]==401;checks.append('anonymous atlas read rejected')
assert call('POST',body={'events':[event]})[0]==401;checks.append('anonymous atlas write rejected')
assert call('POST',a,{'events':[event],'userId':'qa-'+b})[0]==200;checks.append('atlas identity resolved by server')
assert call('POST',a,{'events':[event]})[0]==200
status,payload,headers=call(user=a);assert status==200 and len(payload['events'])==1;checks.append('atlas replay idempotent')
assert headers.get('Cache-Control')=='no-store';checks.append('atlas data never cached')
assert call(user=b)[1]['events']==[];checks.append('atlas account isolation')
assert call('POST',b,{'events':[{**event,'rating':1}]})[0]==200
assert call(user=b)[1]['events'][0]['rating']==1 and call(user=a)[1]['events'][0]['rating']==3;checks.append('atlas UUID scoped by account')
assert call('POST',a,{'events':[event]},origin='https://other.example')[0]==403;checks.append('atlas foreign origin rejected')
for key,value in [('targetId','unknown'),('skill','study'),('mode','copy'),('rating',2),('at',int(time.time()*1000)+600000)]:
    assert call('POST',a,{'events':[{**event,key:value}]})[0]==400
checks.append('atlas registry, kind, lesson and future timestamp checked')
assert call('POST',a,'{bad')[0]==400;checks.append('atlas malformed body rejected')
batch_response=call('POST',a,{'events':[event]*21});assert batch_response[0]==400,batch_response;checks.append('atlas sync batches bounded')
assert call(user=a,extra={'X-Notebook-Owner':'qa-'+b})[0]==401;checks.append('atlas switched owner rejected')
assert call(user=a,extra={'Authorization':'Bearer invalid'})[0]==401;checks.append('atlas invalid token cannot fall back')
assert call(user=a,extra={'X-Notebook-Owner':'qa-'+a})[0]==200;checks.append('atlas matching owner accepted')
assert call(user=a,path='/api/progress')[1]['events']==[];checks.append('atlas results absent from HSK API')
assert call('POST',a,{'events':[event]},path='/api/progress')[0]==400;checks.append('atlas events cannot enter HSK API')
assert call(user=a,path='/api/course-progress')[1]['events']==[];checks.append('Atlas results absent from course API')
assert call('POST',a,'x'*100001)[0]==413;checks.append('atlas body size bounded')
for check in checks:print('PASS',check)
print(f'{len(checks)} atlas API integration checks passed')
