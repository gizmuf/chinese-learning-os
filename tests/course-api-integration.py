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
    response=call('POST',a,{'events':[{**event,key:value}]});assert response[0]==400,(key,response[:2])
checks.append('course registry, kind, lesson and future timestamp checked')
assert call('POST',a,'{bad')[0]==400;checks.append('course malformed body rejected')
batch_response=call('POST',a,{'events':[event]*21});assert batch_response[0]==400,batch_response;checks.append('course sync batches bounded')
assert call(user=a,extra={'X-Notebook-Owner':'qa-'+b})[0]==401;checks.append('course switched owner rejected')
assert call(user=a,extra={'Authorization':'Bearer invalid'})[0]==401;checks.append('course invalid token cannot fall back')
assert call(user=a,extra={'X-Notebook-Owner':'qa-'+a})[0]==200;checks.append('course matching owner accepted')
assert call(user=a,path='/api/progress')[1]['events']==[];checks.append('course results absent from HSK API')
assert call('POST',a,{'events':[event]},path='/api/progress')[0]==400;checks.append('course events cannot enter HSK API')
lesson4={**event,'id':str(uuid.uuid4()),'lessonId':'intensive-04','activityId':'c04-check-0-0'}
result=call('POST',a,{'events':[lesson4]});assert result[0]==200,result[:2]
result=call('POST',a,{'events':[lesson4]});assert result[0]==200,result[:2]
assert sum(e['id']==lesson4['id'] for e in call(user=a)[1]['events'])==1;checks.append('lesson04 independent result syncs idempotently')
assert not any(e['lessonId']=='intensive-04' for e in call(user=b)[1]['events']);checks.append('lesson04 account isolation')
legacy=call(user=a,path='/api/course-progress')[1]['events'];assert legacy and all(e['lessonId']=='intensive-03' for e in legacy);checks.append('legacy lesson03 clients receive only their supported event schema')
assert call('POST',a,{'events':[{**lesson4,'id':str(uuid.uuid4()),'activityId':'time-days'}]})[0]==400
assert call('POST',a,{'events':[{**lesson4,'lessonId':'intensive-03'}]})[0]==400;checks.append('cross-lesson activity forgery rejected both ways')
builder={**lesson4,'id':str(uuid.uuid4()),'activityId':'c04-build-1'}
assert call('POST',a,{'events':[builder]})[0]==400
assert call('POST',a,{'events':[{**builder,'assisted':True}]})[0]==200;checks.append('lesson04 builders require supported scoring')
writing={**lesson4,'id':str(uuid.uuid4()),'activityId':'write:c04-t01','kind':'writing','rating':3}
assert call('POST',a,{'events':[writing]})[0]==200;checks.append('lesson04 handwriting result accepted')
assert call(user=a,path='/api/progress')[1]['events']==[];checks.append('lesson04 never enters HSK history')
lesson5={**event,'id':str(uuid.uuid4()),'lessonId':'intensive-05','activityId':'c05-check-c05-t01-read'}
for _ in range(2):
    result=call('POST',a,{'events':[lesson5]});assert result[0]==200,result[:2]
assert sum(e['id']==lesson5['id'] for e in call(user=a)[1]['events'])==1;checks.append('lesson05 independent result syncs idempotently')
assert not any(e['lessonId']=='intensive-05' for e in call(user=b)[1]['events']);checks.append('lesson05 account isolation')
result=call('POST',b,{'events':[{**lesson5,'correct':False}]});assert result[0]==200,result[:2]
assert next(e for e in call(user=b)[1]['events'] if e['id']==lesson5['id'])['correct']==False
assert next(e for e in call(user=a)[1]['events'] if e['id']==lesson5['id'])['correct']==True;checks.append('lesson05 replay UUID remains scoped by account')
for wrong_lesson,wrong_activity in [('intensive-03',lesson5['activityId']),('intensive-04',lesson5['activityId']),('intensive-05','time-days'),('intensive-05',lesson4['activityId'])]:
    result=call('POST',a,{'events':[{**lesson5,'id':str(uuid.uuid4()),'lessonId':wrong_lesson,'activityId':wrong_activity}]})
    assert result[0]==400,result[:2]
checks.append('lesson05 cross-lesson activity forgery rejected against lessons03 and04')
builder5={**lesson5,'id':str(uuid.uuid4()),'activityId':'c05-build-1'}
assert call('POST',a,{'events':[builder5]})[0]==400
assert call('POST',a,{'events':[{**builder5,'assisted':True}]})[0]==200;checks.append('lesson05 builders require supported scoring')
writing5={**lesson5,'id':str(uuid.uuid4()),'activityId':'write:c05-t01','kind':'writing','rating':3}
assert call('POST',a,{'events':[writing5]})[0]==200;checks.append('lesson05 handwriting result accepted')
legacy=call(user=a,path='/api/course-progress')[1]['events'];assert legacy and all(e['lessonId']=='intensive-03' for e in legacy);checks.append('legacy lesson03 clients exclude lesson05 events')
assert call(user=a,path='/api/progress')[1]['events']==[];checks.append('lesson05 never enters HSK history')
assert call('POST',a,{'events':[lesson5]},path='/api/progress')[0]==400;checks.append('HSK API rejects lesson05 events')
video={**event,'id':str(uuid.uuid4()),'lessonId':'video-self-introduction','activityId':'video-check-q001-read'}
for _ in range(2):
    result=call('POST',a,{'events':[video]});assert result[0]==200,result[:2]
assert sum(e['id']==video['id'] for e in call(user=a)[1]['events'])==1;checks.append('independent video results sync idempotently')
assert not any(e['lessonId']=='video-self-introduction' for e in call(user=b)[1]['events']);checks.append('video material account isolation')
listening={**video,'id':str(uuid.uuid4()),'activityId':'video-check-q001-listen'}
assert call('POST',a,{'events':[listening]})[0]==200;checks.append('video listening has independent activity identity')
for lesson,activity in [('intensive-05',video['activityId']),('video-self-introduction','c05-check-c05-t01-read'),('video-self-introduction','video-check-unknown-read')]:
 assert call('POST',a,{'events':[{**video,'id':str(uuid.uuid4()),'lessonId':lesson,'activityId':activity}]})[0]==400
checks.append('video registry rejects cross-material activities')
assert all(e['lessonId']=='intensive-03' for e in call(user=a,path='/api/course-progress')[1]['events']);checks.append('video material preserves legacy lesson clients')
lesson6={**event,'id':str(uuid.uuid4()),'lessonId':'intensive-06','activityId':'c06-check-c06-t01-read'}
assert call('POST',a,{'events':[lesson6]})[0]==200
assert call('POST',a,{'events':[lesson6]})[0]==200
assert sum(e['id']==lesson6['id'] for e in call(user=a)[1]['events'])==1;checks.append('lesson06 answer sync idempotent')
assert not any(e['lessonId']=='intensive-06' for e in call(user=b)[1]['events']);checks.append('lesson06 account isolation')
listen6={**lesson6,'id':str(uuid.uuid4()),'activityId':'c06-check-c06-t01-listen'}
assert call('POST',a,{'events':[listen6]})[0]==200;checks.append('lesson06 separate listening record')
build6={**lesson6,'id':str(uuid.uuid4()),'activityId':'c06-build-1'}
assert call('POST',a,{'events':[build6]})[0]==400
assert call('POST',a,{'events':[{**build6,'assisted':True}]})[0]==200;checks.append('lesson06 builders cannot score independently')
for changed in [{'lessonId':'intensive-05'},{'activityId':'c05-build-1'},{'activityId':'c06-unknown'}]:
 assert call('POST',a,{'events':[{**lesson6,**changed,'id':str(uuid.uuid4())}]})[0]==400
checks.append('lesson06 cross-lesson registry enforced')
assert all(e['lessonId']=='intensive-03' for e in call(user=a,path='/api/course-progress')[1]['events']);checks.append('lesson06 preserves old lesson clients')
assert call('POST',a,{'events':[lesson6]},path='/api/progress')[0]==400;checks.append('lesson06 cannot contaminate HSK history')
lesson7={**event,'id':str(uuid.uuid4()),'lessonId':'intensive-07','activityId':'c07-check-c07-t01-read'}
assert call('POST',a,{'events':[lesson7]})[0]==200
assert call('POST',a,{'events':[lesson7]})[0]==200
assert sum(e['id']==lesson7['id'] for e in call(user=a)[1]['events'])==1;checks.append('lesson07 answer sync idempotent')
assert not any(e['lessonId']=='intensive-07' for e in call(user=b)[1]['events']);checks.append('lesson07 account isolation')
listen7={**lesson7,'id':str(uuid.uuid4()),'activityId':'c07-check-c07-t01-listen'}
assert call('POST',a,{'events':[listen7]})[0]==200;checks.append('lesson07 separate listening record')
build7={**lesson7,'id':str(uuid.uuid4()),'activityId':'c07-build-1'}
assert call('POST',a,{'events':[build7]})[0]==400
assert call('POST',a,{'events':[{**build7,'assisted':True}]})[0]==200;checks.append('lesson07 builders cannot score independently')
for changed in [{'lessonId':'intensive-05'},{'activityId':'c05-build-1'},{'activityId':'c07-unknown'}]:
 assert call('POST',a,{'events':[{**lesson7,**changed,'id':str(uuid.uuid4())}]})[0]==400
checks.append('lesson07 cross-lesson registry enforced')
assert all(e['lessonId']=='intensive-03' for e in call(user=a,path='/api/course-progress')[1]['events']);checks.append('lesson07 preserves old lesson clients')
assert call('POST',a,{'events':[lesson7]},path='/api/progress')[0]==400;checks.append('lesson07 cannot contaminate HSK history')
lesson8={**event,'id':str(uuid.uuid4()),'lessonId':'intensive-08','activityId':'c08-check-c08-t01-read'}
assert call('POST',a,{'events':[lesson8]})[0]==200
assert call('POST',a,{'events':[lesson8]})[0]==200
assert sum(e['id']==lesson8['id'] for e in call(user=a)[1]['events'])==1;checks.append('lesson08 answer sync idempotent')
assert not any(e['lessonId']=='intensive-08' for e in call(user=b)[1]['events']);checks.append('lesson08 account isolation')
listen8={**lesson8,'id':str(uuid.uuid4()),'activityId':'c08-check-c08-t01-listen'}
assert call('POST',a,{'events':[listen8]})[0]==200;checks.append('lesson08 separate listening record')
build8={**lesson8,'id':str(uuid.uuid4()),'activityId':'c08-build-1'}
assert call('POST',a,{'events':[build8]})[0]==400
assert call('POST',a,{'events':[{**build8,'assisted':True}]})[0]==200;checks.append('lesson08 builders cannot score independently')
for changed in [{'lessonId':'intensive-05'},{'activityId':'c05-build-1'},{'activityId':'c08-unknown'}]:
 assert call('POST',a,{'events':[{**lesson8,**changed,'id':str(uuid.uuid4())}]})[0]==400
checks.append('lesson08 cross-lesson registry enforced')
assert all(e['lessonId']=='intensive-03' for e in call(user=a,path='/api/course-progress')[1]['events']);checks.append('lesson08 preserves old lesson clients')
assert call('POST',a,{'events':[lesson8]},path='/api/progress')[0]==400;checks.append('lesson08 cannot contaminate HSK history')
chunk={**event,'id':str(uuid.uuid4()),'lessonId':'speaking-chunks','activityId':'chunk-recall-request-1'}
for _ in range(2):
 result=call('POST',a,{'events':[chunk]});assert result[0]==200,result[:2]
assert sum(e['id']==chunk['id'] for e in call(user=a)[1]['events'])==1;checks.append('chunks syncs idempotently')
assert not any(e['lessonId']=='speaking-chunks' for e in call(user=b)[1]['events']);checks.append('chunks account isolation')
assert call('POST',b,{'events':[{**chunk,'correct':False}]})[0]==200
assert next(e for e in call(user=a)[1]['events'] if e['id']==chunk['id'])['correct']==True;checks.append('chunks replay UUID remains scoped to student')
for patch in [{'lessonId':'intensive-06'},{'activityId':'c06-build-1'},{'activityId':'chunk-recall-unknown'},{'kind':'writing'}]:
 assert call('POST',a,{'events':[{**chunk,**patch,'id':str(uuid.uuid4())}]})[0]==400
checks.append('chunks cross-material and kind validation enforced')
assert call('POST',a,{'events':[{**chunk,'id':str(uuid.uuid4()),'assisted':True}]})[0]==200;checks.append('chunks assisted records can sync without independent scheduling')
assert all(e['lessonId']=='intensive-03' for e in call(user=a,path='/api/course-progress')[1]['events']);checks.append('chunks hidden from legacy lesson clients')
assert call('POST',a,{'events':[chunk]},path='/api/progress')[0]==400;checks.append('chunks never enters HSK event registry')
for activity in ['chunk-gap-hsk3-1000','chunk-gap-request-1','chunk-frame-attitude-interest-1','chunk-frame-adv-even-if-1','chunk-frame-adv-past-focus-2']:
 cloze={**chunk,'id':str(uuid.uuid4()),'activityId':activity}
 result=call('POST',a,{'events':[cloze]});assert result[0]==200,result[:2]
 assert call('POST',a,{'events':[cloze]})[0]==200
 assert sum(e['id']==cloze['id'] for e in call(user=a)[1]['events'])==1
 assert not any(e['activityId']==activity for e in call(user=b)[1]['events'])
 assert call('POST',a,{'events':[{**cloze,'id':str(uuid.uuid4()),'lessonId':'intensive-08'}]})[0]==400
 checks.append('cloze account isolation, idempotency and material validation: '+activity)
assert call('POST',a,{'events':[{**chunk,'id':str(uuid.uuid4()),'activityId':'chunk-frame-unknown'}]})[0]==400;checks.append('unknown cloze rejected')
assert call('POST',a,'x'*100001)[0]==413;checks.append('course body size bounded')
for check in checks:print('PASS',check)
print(f'{len(checks)} course API integration checks passed')
