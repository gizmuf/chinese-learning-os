"""Run against an isolated built Worker with local D1, never a live Site."""
import json,time,uuid
from urllib.request import Request,urlopen
from urllib.error import HTTPError
BASE='http://127.0.0.1:8788'
checks=[]
def call(method='GET',user=None,body=None,origin=BASE,extra=None):
    headers={}
    if user:
        headers.update({'oai-authenticated-user-id':'qa-'+user,'oai-authenticated-user-email':user+'@example.test'})
    headers.update(extra or {})
    if method=='POST':headers.update({'Origin':origin,'Content-Type':'application/json'})
    data=(body if isinstance(body,str) else json.dumps(body)).encode() if body is not None else None
    try:
        with urlopen(Request(BASE+'/api/progress',data=data,headers=headers,method=method),timeout=20) as r:return r.status,json.loads(r.read()),r.headers
    except HTTPError as e:
        raw=e.read()
        try:payload=json.loads(raw)
        except Exception:payload=raw[:200].decode(errors='replace')
        return e.code,payload,e.headers
suffix=uuid.uuid4().hex[:8];a='alice-'+suffix;b='bob-'+suffix
event={'id':str(uuid.uuid4()),'itemId':'hello','skill':'meaning','mode':'recall','rating':3,'assisted':False,'at':int(time.time()*1000),'timezone':'Asia/Shanghai','detail':{}}
assert call()[0]==401;checks.append('anonymous read rejected')
assert call('POST',body={'events':[event]})[0]==401;checks.append('anonymous write rejected')
assert call('POST',a,{'events':[event],'userId':'qa-'+b})[0]==200;checks.append('server owns identity')
assert call('POST',a,{'events':[event]})[0]==200
status,payload,headers=call(user=a);assert status==200 and len(payload['events'])==1;checks.append('duplicate replay deduplicated')
assert headers.get('Cache-Control')=='no-store';checks.append('private data not cached')
assert call(user=b)[1]['events']==[];checks.append('second user cannot read first user')
other={**event,'itemId':'water'}
assert call('POST',b,{'events':[other]})[0]==200
assert call(user=b)[1]['events'][0]['itemId']=='water' and call(user=a)[1]['events'][0]['itemId']=='hello';checks.append('same event ID isolated by account')
assert call('POST',a,{'events':[event]},origin='https://other.example')[0]==403;checks.append('cross-origin write rejected')
assert call('POST',a,{'events':[{**event,'itemId':'unknown'}]})[0]==400;checks.append('unknown learning item rejected')
assert call('POST',a,'{bad')[0]==400;checks.append('malformed JSON rejected')
assert call('POST',a,'x'*1000001)[0]==413;checks.append('oversized upload rejected')
assert call(user=a,extra={'X-Notebook-Owner':'qa-'+b})[0]==401;checks.append('switched notebook owner rejected')
assert call(user=a,extra={'Authorization':'Bearer invalid'})[0]==401;checks.append('invalid bearer cannot fall back to ChatGPT')
assert call(user=a,extra={'X-Notebook-Owner':'qa-'+a})[0]==200;checks.append('matching notebook owner accepted')
expanded={**event,'id':str(uuid.uuid4()),'itemId':'hsk1-300'}
assert call('POST',a,{'events':[expanded]})[0]==200;checks.append('expanded HSK vocabulary accepted by server')
assert any(e['id']==expanded['id'] for e in call(user=a)[1]['events']);checks.append('new vocabulary history retained')
for check in checks:print('PASS',check)
print(f'{len(checks)} API integration checks passed')
