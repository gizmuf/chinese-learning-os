"""Isolated built Worker + local D1 only. Never point this at the live Site."""
import json,time,uuid,os
from urllib.request import Request,urlopen
from urllib.error import HTTPError
BASE=os.environ.get('CHINESE_OS_QA_URL','http://127.0.0.1:8788')
assert BASE.startswith('http://127.0.0.1:'), 'Local test transport only'
def call(method='GET',user=None,body=None,origin=BASE,owner=None):
    headers={}
    if user:headers.update({'oai-authenticated-user-id':user,'oai-authenticated-user-email':user+'@example.test'})
    if owner:headers['X-Notebook-Owner']=owner
    if method=='POST':headers.update({'Origin':origin,'Content-Type':'application/json'})
    data=(body if isinstance(body,str) else json.dumps(body)).encode() if body is not None else None
    try:
        with urlopen(Request(BASE+'/api/recognition-progress',data=data,headers=headers,method=method),timeout=20) as r:return r.status,json.loads(r.read()),r.headers
    except HTTPError as e:
        return e.code,json.loads(e.read()),e.headers
suffix=uuid.uuid4().hex[:8];a='qa-recognition-alice-'+suffix;b='qa-recognition-bob-'+suffix
base={'version':1,'id':str(uuid.uuid4()),'target':'情','partId':'qing','wordId':'atlas-example:u60c5','choices':['情','晴','清','请'],'choice':'清','correct':False,'at':int(time.time()*1000)}
checks=[]
assert call()[0]==401;assert call('POST',body={'events':[base]})[0]==401;checks.append('anonymous history and writes rejected')
assert call('POST',a,{'events':[base]},owner=b)[0]==401;checks.append('notebook owner mismatch rejected')
assert call('POST',a,{'events':[base]},origin='https://untrusted.example')[0]==403;checks.append('cross-origin write rejected')
assert call('POST',a,{'events':[base],'userId':b})[0]==400;checks.append('client cannot choose another owner')
assert call('POST',a,{'events':[{**base,'correct':True}]})[0]==400
assert call('POST',a,{'events':[{**base,'wordId':'hello'}]})[0]==400
assert call('POST',a,{'events':[{**base,'choices':['情','晴','清','木']}]})[0]==400
assert call('POST',a,{'events':[{**base,'at':base['at']+3600000}]})[0]==400;checks.append('forged outcomes contexts and future timestamps rejected')
assert call('POST',a,{'events':[base]})[0]==200
assert call('POST',a,{'events':[base]})[0]==200
status,history,headers=call(user=a);assert status==200 and len(history['events'])==1 and history['events'][0]['correct']==False
assert headers.get('Cache-Control')=='no-store';checks.append('retry deduplicated and private history is not cached')
assert call(user=b)[1]['events']==[];checks.append('second student cannot read first history')
right={**base,'choice':'情','correct':True}
assert call('POST',b,{'events':[right]})[0]==200
assert call(user=b)[1]['events']==[right]
assert call(user=a)[1]['events']==[base];checks.append('same event ID remains isolated between two real local D1 owners')
assert call('POST',a,{'events':[right]})[0]==409
assert call(user=a)[1]['events']==[base];checks.append('conflicting replay cannot alter an existing result')
resolved={**right,'id':str(uuid.uuid4()),'at':base['at']+1000}
assert call('POST',a,{'events':[resolved]})[0]==200
assert len(call(user=a)[1]['events'])==2 and len(call(user=b)[1]['events'])==1;checks.append('later correction persists without changing another student')
for path in ['/api/progress','/api/atlas-progress','/api/course-progress?lessons=all']:
    with urlopen(Request(BASE+path,headers={'oai-authenticated-user-id':a,'oai-authenticated-user-email':a+'@example.test'}),timeout=20) as r:assert json.load(r)['events']==[]
checks.append('word Atlas and course histories remain separate')
for check in checks:print('PASS',check)
print(str(len(checks))+' recognition API integration checks passed')
