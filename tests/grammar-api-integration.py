"""Only for an isolated local Worker/D1; never a production Site."""
import json,time,uuid,os
from urllib.request import Request,urlopen
from urllib.parse import urlsplit
from urllib.error import HTTPError
BASE=os.environ.get('CHINESE_OS_TEST_BASE','http://127.0.0.1:8788')
parsed_base=urlsplit(BASE)
if parsed_base.scheme!='http' or parsed_base.hostname not in ('127.0.0.1','localhost','::1'):
    raise SystemExit('Course API integration tests require an isolated local HTTP Worker/D1.')
checks=[]
from pathlib import Path
def call(method='GET',user=None,body=None,origin=BASE,extra=None,path='/api/course-progress?lessons=all'):
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
import json,uuid,time
units=json.loads(Path('data/grammar-hsk3-a.json').read_text())
ex=units[0]['cards'][0]['exercises'][0]
event={'id':str(uuid.uuid4()),'lessonId':'grammar-hsk3','activityId':ex['id'],'kind':'answer','correct':True,'assisted':False,'at':int(time.time()*1000)}
for _ in range(2):
    result=call('POST',a,{'events':[event]});assert result[0]==200,result[:2]
read=call(user=a)[1]['events'];assert sum(e['id']==event['id'] for e in read)==1
checks.append('grammar upload and repeated UUID deduplicated in D1')
assert not any(e['lessonId']=='grammar-hsk3' for e in call(user=b)[1]['events'])
checks.append('grammar server account isolation')
result=call('POST',b,{'events':[{**event,'correct':False}]});assert result[0]==200,result[:2]
assert next(e for e in call(user=b)[1]['events'] if e['id']==event['id'])['correct']==False
assert next(e for e in call(user=a)[1]['events'] if e['id']==event['id'])['correct']==True
checks.append('grammar same UUID can belong independently to two accounts')
assisted={**event,'id':str(uuid.uuid4()),'assisted':True}
assert call('POST',a,{'events':[assisted]})[0]==200
assert next(e for e in call(user=a)[1]['events'] if e['id']==assisted['id'])['assisted']==True
checks.append('grammar assisted marker survives server roundtrip')
assert all(e['lessonId']=='intensive-03' for e in call(user=a,path='/api/course-progress')[1]['events'])
checks.append('grammar does not break legacy course GET')
assert not any(e['id']==event['id'] for e in call(user=a,path='/api/progress')[1]['events'])
checks.append('grammar absent from vocabulary progress')
for patch in [{'lessonId':'intensive-05'},{'lessonId':'intensive-03'},{'activityId':'time-days'},{'activityId':'unknown'},{'kind':'writing'},{'kind':'study'},{'correct':None}]:
    assert call('POST',a,{'events':[{**event,**patch,'id':str(uuid.uuid4())}]})[0]==400
checks.append('grammar invalid activity, lesson and kind rejected by real API')
assert call('POST',a,{'events':[event]},extra={'X-Notebook-Owner':'qa-'+b})[0]==401
checks.append('grammar stale notebook owner rejected by real API')
for check in checks:print('PASS',check)
print(f'{len(checks)} grammar API integration checks passed')
