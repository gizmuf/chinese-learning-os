"""Isolated local Worker/D1 only; never target a production Site."""
import json,time,uuid
from urllib.request import Request,urlopen
from urllib.error import HTTPError
BASE='http://127.0.0.1:8788';path='/api/course-progress';suffix=uuid.uuid4().hex[:8];alice='qa-lab-alice-'+suffix;bob='qa-lab-bob-'+suffix
checks=[]
def call(method='GET',user=alice,body=None,extra=None):
 headers={'oai-authenticated-user-id':user,'oai-authenticated-user-email':'qa@example.test',**(extra or {})}
 if method=='POST':headers.update({'Origin':BASE,'Content-Type':'application/json'})
 data=json.dumps(body).encode() if body is not None else None
 try:
  with urlopen(Request(BASE+path,headers=headers,data=data,method=method),timeout=20) as r:return r.status,json.loads(r.read())
 except HTTPError as e:
  raw=e.read()
  try:payload=json.loads(raw)
  except Exception:payload=raw.decode(errors='replace')[:100]
  return e.code,payload
def event(id,**extra):return {'id':str(uuid.uuid4()),'lessonId':'intensive-03','activityId':id,'kind':'answer','correct':True,'assisted':False,'at':int(time.time()*1000),**extra}
rows=[event('lab-build-today'),event('lab-family-sun',assisted=True),event('lab-read-1'),event('lab-recall-1'),event('write:lab-word-friend',kind='writing',rating=3)]
response=call('POST',body={'events':rows});assert response[0]==200,response;checks.append('all new activity types and borrowed HSK writing accepted')
assert call('POST',body={'events':rows})[0]==200;assert len(call()[1]['events'])==5;checks.append('replayed lab batch remains idempotent')
assert call(user=bob)[1]['events']==[];checks.append('new lab history remains owner scoped')
assert call('POST',body={'events':[event('lab-family-ice')]})[0]==400;checks.append('visible family examples cannot claim independent recall')
assert call('POST',body={'events':[event('lab-read-999')]})[0]==400;checks.append('unknown lab IDs rejected')
assert call('POST',body={'events':[event('lab-build-today',kind='writing')]})[0]==400;checks.append('lab activity-kind mismatch rejected')
assert call(extra={'X-Notebook-Owner':bob})[0]==401;checks.append('owner switch cannot access lab history')
assert call('POST',body={'events':[event('time-days')]})[0]==200;checks.append('original course activities still accepted')
for check in checks:print('PASS',check)
print(len(checks),'lab API integration checks passed')
