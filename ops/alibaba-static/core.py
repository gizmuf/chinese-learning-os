"""Bounded public-static publisher. No transport, environment config, shell or service control."""
import contextlib, fcntl, gzip, hashlib, json, os, re, shutil, stat, struct, time, unicodedata, uuid, zlib
from pathlib import Path

class Refused(Exception): pass
HASH = re.compile(r'[a-f0-9]{64}\Z')
RID = re.compile(r'(?:r-[a-f0-9]{64}|v[0-9]{1,3}-hk[0-9]{1,3}(?:-lesson10)?)\Z')
MAX_REQUEST = 2048
ROOT_JSON_MAX = 16*1024*1024
ROOT_JSON_MAX_STRING = 1024
ROOT_JSON_MAX_NODES = 250000
MAX_DIRECTORIES = 32768
VITE_BUILD_MARKER = 'assets/chineseos-vite-build.json'
VITE_CHUNK = re.compile(r'assets/[\w.-]+-[\w-]{8}\.(?:js|css)\Z', re.ASCII)
VITE_ROOT_REF = re.compile(rb'''["']/?(assets/[\w.-]+-[\w-]{8}\.(?:js|css))["']''')
VITE_LOCAL_REF = re.compile(rb'''["']\./([\w.-]+-[\w-]{8}\.(?:js|css))["']''')
POLICY_KEYS = {'enabled','directories','rootFiles','immutablePrefixes','maxArchive','maxExpanded','maxFile','maxEntries','maxPublished','maxPublishedEntries','reserveBytes','maxPath','maxDepth','maxPax','healthPaths'}
DEFAULT_POLICY = dict(enabled=False, directories=['assets','atlas','audio','audio-comparison','characters','dictionary','fonts','licenses','often-confused','speaking-chunks','video-self-introduction','writing-context','design-references'],rootFiles=['index.html','favicon.svg','file.svg','globe.svg','window.svg'],immutablePrefixes=['assets/','fonts/','audio/','characters/','dictionary/','atlas/','audio-comparison/'],maxArchive=300*1024**2,maxExpanded=600*1024**2,maxFile=100*1024**2,maxEntries=12000,maxPublished=1024**3,maxPublishedEntries=20000,reserveBytes=2*1024**3,maxPath=240,maxDepth=16,maxPax=4096,healthPaths=['/','/api/dictionary?text=%E5%91%86','/api/character-data?character=%E5%91%86','/connection-test/','/audio-comparison/my-day-first10/'])

def reject(message): raise Refused(message)
def strict_json(raw, limit):
    if len(raw)>limit: reject('JSON too large')
    def pairs(items):
        result={}
        for k,v in items:
            if k in result: reject('duplicate JSON key')
            result[k]=v
        return result
    try: return json.loads(raw.decode('utf8'),object_pairs_hook=pairs,parse_constant=lambda _:reject('nonfinite JSON'))
    except (ValueError,UnicodeError,RecursionError): reject('invalid JSON')

def request(raw, policy):
    v=strict_json(raw,MAX_REQUEST)
    if type(v)!=dict or set(v)!={'version','sha256','bytes','expectedCurrent'}: reject('request schema')
    if type(v['version'])!=int or v['version']!=1 or type(v['bytes'])!=int or not 1<=v['bytes']<=policy['maxArchive']: reject('request size/version')
    if type(v['sha256'])!=str or not HASH.fullmatch(v['sha256']): reject('request hash')
    if type(v['expectedCurrent'])!=str or not RID.fullmatch(v['expectedCurrent']): reject('request current')
    return v

def validate_policy(p):
    if type(p)!=dict or set(p)!=POLICY_KEYS or type(p['enabled'])!=bool: reject('policy schema')
    for k in ['directories','rootFiles','immutablePrefixes','healthPaths']:
        if type(p[k])!=list or len(p[k])>64 or any(type(x)!=str or not x or len(x)>240 for x in p[k]): reject('policy lists')
    for k in POLICY_KEYS-{'enabled','directories','rootFiles','immutablePrefixes','healthPaths'}:
        if type(p[k])!=int or p[k]<1: reject('policy bounds')
    # A per-release request cannot expand these hard ceilings.
    for k in ['maxArchive','maxExpanded','maxFile','maxEntries','maxPublished','maxPublishedEntries','maxPath','maxDepth','maxPax']:
        if p[k]>DEFAULT_POLICY[k]: reject('policy exceeds compiled ceiling')
    for x in p['directories']+p['rootFiles']:
        if '/' in x or x.startswith('.') or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]*',x): reject('policy path')
    if any(not x.startswith('/') or x.startswith('//') or '\r' in x or '\n' in x or len(x)>200 for x in p['healthPaths']): reject('policy health path')
    return p

def checked_dir(path, owner):
    """Open from / with no-follow, validating every ancestor; tests use private fixture anchors."""
    path=Path(path)
    if not path.is_absolute() or '..' in path.parts: reject('directory path')
    fd=os.open('/',os.O_RDONLY|os.O_DIRECTORY)
    try:
        for part in path.parts[1:]:
            nxt=os.open(part,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=fd);os.close(fd);fd=nxt
            s=os.fstat(fd)
            # System ancestors root-owned, private fixture/owned descendants test-owner-owned.
            if s.st_uid not in (0,owner) or s.st_mode&0o022:
                # /tmp is allowed only as a fixture ancestor, NEVER in production layout.
                if not (owner!=0 and str(path).startswith('/tmp/') and part=='tmp' and s.st_mode&stat.S_ISVTX): reject('untrusted directory')
        return fd
    except BaseException:
        os.close(fd);raise

def regular_fd(path, owner, private=False):
    parent=checked_dir(Path(path).parent,owner)
    try: fd=os.open(Path(path).name,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK,dir_fd=parent)
    finally: os.close(parent)
    s=os.fstat(fd)
    if not stat.S_ISREG(s.st_mode) or s.st_uid!=owner or s.st_nlink!=1 or s.st_mode&0o022 or private and s.st_mode&0o077:
        os.close(fd);reject('untrusted regular file')
    return fd

def metadata_bytes(value):
    # Structural limits precede JSON encoding; no unbounded single string/token.
    stack=[(value,0)];nodes=0
    while stack:
        item,depth=stack.pop();nodes+=1
        if nodes>ROOT_JSON_MAX_NODES or depth>32:reject('root metadata structure limit')
        if type(item)==str:
            if len(item)>ROOT_JSON_MAX_STRING or len(item.encode('utf8'))>ROOT_JSON_MAX_STRING:reject('root metadata string limit')
        elif type(item)==dict:
            if len(item)>DEFAULT_POLICY['maxPublishedEntries']:reject('root metadata map limit')
            for key,child in item.items():
                if type(key)!=str:reject('root metadata key type')
                stack.extend([(key,depth+1),(child,depth+1)])
        elif type(item)==list:
            if len(item)>DEFAULT_POLICY['maxPublishedEntries']:reject('root metadata list limit')
            stack.extend((child,depth+1) for child in item)
        elif item is None or type(item)==bool:pass
        elif type(item)==int:
            if item.bit_length()>64:reject('root metadata integer limit')
        else:reject('root metadata value type')
    encoded=bytearray()
    for token in json.JSONEncoder(ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False).iterencode(value):
        chunk=token.encode('utf8')
        if len(encoded)+len(chunk)+1>ROOT_JSON_MAX:reject('root metadata byte limit')
        encoded.extend(chunk)
    encoded.extend(b'\n');return encoded

# Worst-case admitted UTF8 path (including JSON escaping) plus scalar fields,
# keys and punctuation, per inventory entry. One inventory per root record.
assert DEFAULT_POLICY['maxPublishedEntries']*(2*DEFAULT_POLICY['maxPath']+256)+65536 < ROOT_JSON_MAX

def read_metadata(path,owner):
    fd=regular_fd(path,owner,True)
    with os.fdopen(fd,'rb') as f:row=strict_json(f.read(ROOT_JSON_MAX+1),ROOT_JSON_MAX)
    metadata_bytes(row)  # Same schema/structure/serialization bound on reads.
    return row

def atomic_json(path, value, owner):
    encoded=metadata_bytes(value)  # Refuse BEFORE creating/writing any temp file.
    fd=checked_dir(path.parent,owner);name='.json-'+uuid.uuid4().hex
    try:
        out=os.open(name,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600,dir_fd=fd)
        with os.fdopen(out,'wb') as f: f.write(encoded);f.flush();os.fsync(f.fileno())
        os.replace(name,path.name,src_dir_fd=fd,dst_dir_fd=fd);os.fsync(fd)
    finally:
        with contextlib.suppress(FileNotFoundError): os.unlink(name,dir_fd=fd)
        os.close(fd)

class BoundedGzip:
    """Streaming single gzip member. Expanded bytes bounded BEFORE tar/PAX parsing."""
    def __init__(self, source, maximum): self.source=source;self.maximum=maximum;self.total=0;self.buf=b'';self.pending=b'';self.done=False;self.z=zlib.decompressobj(31)
    def _pump(self):
        if self.done:return
        data=self.pending or self.source.read(65536);self.pending=b''
        if not data: reject('truncated gzip')
        try: chunk=self.z.decompress(data,65536)
        except zlib.error: reject('invalid gzip/CRC')
        self.pending=self.z.unconsumed_tail;self.total+=len(chunk)
        if self.total>self.maximum: reject('expanded limit')
        self.buf+=chunk
        if self.z.eof:
            if self.z.unused_data or self.pending or self.source.read(1): reject('trailing/concatenated gzip')
            self.done=True
    def read(self,n):
        if n>65536: reject('parser allocation bound')
        while len(self.buf)<n and not self.done:self._pump()
        result,self.buf=self.buf[:n],self.buf[n:];return result
    def exact(self,n):
        b=self.read(n)
        if len(b)!=n:reject('truncated tar')
        return b

def octal(b):
    if b[0]&128:reject('base256 tar numeric')
    b=b.rstrip(b'\0 ').lstrip(b' ')
    if b and not re.fullmatch(b'[0-7]+',b):reject('bad tar numeric')
    return int(b or b'0',8)
def field(b):
    head,sep,tail=b.partition(b'\0')
    if sep and any(tail):reject('ambiguous header name')
    try:return head.decode('utf8')
    except UnicodeError:reject('invalid UTF8 path')
def pax(raw, policy, global_record=False):
    result={};offset=0
    while offset<len(raw):
        space=raw.find(b' ',offset,offset+12)
        if space<0 or not re.fullmatch(b'[1-9][0-9]{0,8}',raw[offset:space]):reject('PAX length')
        length=int(raw[offset:space]);end=offset+length
        if end>len(raw) or end<=space+2 or raw[end-1:end]!=b'\n':reject('PAX record')
        key,sep,value=raw[space+1:end-1].partition(b'=')
        if not sep or key in result or key not in ([b'mtime',b'atime',b'ctime'] if global_record else [b'path',b'mtime',b'atime',b'ctime']):reject('unsupported PAX key')
        if key==b'path':
            if len(value)>policy['maxPath']+7:reject('PAX path limit')
        elif not re.fullmatch(br'-?[0-9]{1,20}(?:\.[0-9]{1,20})?',value):reject('PAX time')
        try: result[key]=value.decode('utf8')
        except UnicodeError:reject('PAX UTF8')
        offset=end
    return result

DENIED={'etc','backend','auth','notebook','notebooks','nginx','hk','server','node_modules','__pycache__','credentials','secrets'}
BADFILES={'package.json','package-lock.json','nginx.conf','sshd_config','authorized_keys','known_hosts','id_rsa','id_ed25519','server.js','server.mjs','wrangler.json','wrangler.toml'}
BADSUFFIX={'.db','.sqlite','.sqlite3','.pem','.key','.env','.py','.pyc','.sh','.bash','.php','.exe','.so','.dll','.service','.conf','.toml','.yaml','.yml'}

def public_name(name, directory, policy):
    if directory and name.endswith('/'):name=name[:-1]
    if not name or len(name.encode('utf8'))>policy['maxPath']+7 or any(c in name for c in '\\%?#') or name.startswith('/') or any(unicodedata.category(c).startswith('C') for c in name):reject('ambiguous path')
    parts=name.split('/')
    if len(parts)>policy['maxDepth']+1 or any(not p or p in ('.','..') or p.startswith('.') or p.endswith((' ','.')) or ':' in p for p in parts):reject('unsafe path')
    if parts[0]!='public':reject('PUBLIC tree only')
    if len(parts)==1:
        if directory:return ''
        reject('public root is directory')
    relative='/'.join(parts[1:]);first=parts[1]
    if len(relative.encode())>policy['maxPath']:reject('path limit')
    if any(p.casefold() in DENIED for p in parts[1:]) or parts[-1].casefold() in BADFILES or Path(parts[-1]).suffix.casefold() in BADSUFFIX:reject('nonpublic payload')
    if len(parts)==2 and not directory:
        if relative not in policy['rootFiles']:reject('root file not allowed')
    elif first not in policy['directories'] and not re.fullmatch(r'(?:course[0-9]{2,3}|lesson[0-9]{2,3}-materials)',first):reject('directory not allowed')
    return relative

def extract_public(source, destination, policy):
    reader=BoundedGzip(source,policy['maxExpanded']);seen=set();spellings={};created_dirs={''};count=0;pending_path=None;inventory={}
    def ensure_dirs(relative):
        if not relative:return
        components=relative.split('/')
        for n in range(1,len(components)+1):
            part='/'.join(components[:n])
            if part in created_dirs:continue
            if len(created_dirs)>=MAX_DIRECTORIES:reject('directory count limit')
            (destination/part).mkdir(mode=0o755,exist_ok=False);created_dirs.add(part)
    while True:
        header=reader.exact(512)
        if header==bytes(512):
            if reader.exact(512)!=bytes(512) or pending_path is not None:reject('bad tar terminator')
            while True:
                remainder=reader.read(65536)
                if any(remainder):reject('data after tar terminator')
                if not remainder:break
            break
        count+=1
        if count>policy['maxEntries']:reject('entry limit')
        if octal(header[148:156])!=sum(header[:148])+8*32+sum(header[156:]):reject('tar checksum')
        if header[257:263] not in (b'ustar\0',b'ustar '):reject('unsupported tar format')
        kind=header[156:157];size=octal(header[124:136])
        if kind in (b'x',b'g',b'L'):
            if size>policy['maxPax']:reject('metadata limit')
            raw=reader.exact(size);padding=reader.exact((-size)%512)
            if any(padding):reject('metadata padding')
            if kind==b'L':
                if pending_path is not None or len(raw)>policy['maxPath']+8 or not raw.endswith(b'\0') or b'\0' in raw[:-1]:reject('GNU longname')
                try:pending_path=raw[:-1].decode('utf8')
                except UnicodeError:reject('GNU UTF8')
            else:
                p=pax(raw,policy,kind==b'g')
                if b'path' in p:
                    if pending_path is not None:reject('ambiguous extended path')
                    pending_path=p[b'path']
            continue
        if kind not in (b'0',b'\0',b'5'):reject('links/special/sparse forbidden')
        if any(header[157:257]):reject('unexpected linkname')
        directory=kind==b'5'
        if directory and size:reject('directory data')
        if size>policy['maxFile']:reject('file limit')
        name=pending_path;pending_path=None
        if name is None:
            name=field(header[:100]);prefix=field(header[345:500]) if header[257:263]==b'ustar\0' else ''
            if prefix:name=prefix+'/'+name
        relative=public_name(name,directory,policy);canonical=unicodedata.normalize('NFC',relative)
        for n in range(1,len(relative.split('/'))+1):
            raw_prefix='/'.join(relative.split('/')[:n]);key=unicodedata.normalize('NFC',raw_prefix)
            if key in spellings and spellings[key]!=raw_prefix:reject('ambiguous Unicode parent')
            spellings[key]=raw_prefix
        if canonical in seen:reject('duplicate/canonically ambiguous member')
        seen.add(canonical)
        if not relative:continue
        target=destination/relative
        if directory:
            ensure_dirs(relative)
            if not target.is_dir() or target.is_symlink():reject('directory collision')
        else:
            ensure_dirs('/'.join(relative.split('/')[:-1]))
            fd=os.open(target,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600);digest=hashlib.sha256();remaining=size
            with os.fdopen(fd,'wb') as out:
                while remaining:
                    block=reader.exact(min(remaining,65536));out.write(block);digest.update(block);remaining-=len(block)
                out.flush();os.fsync(out.fileno());os.fchmod(out.fileno(),0o644)
            if any(reader.exact((-size)%512)):reject('nonzero tar padding')
            inventory[relative]={'bytes':size,'sha256':digest.hexdigest()}
    if 'index.html' not in inventory:reject('missing index')
    return inventory

def validate_vite_replacement(stage, inventory):
    if VITE_BUILD_MARKER not in inventory:
        return False
    path = stage / VITE_BUILD_MARKER
    if inventory[VITE_BUILD_MARKER]['bytes'] > 64*1024:
        reject('Vite build manifest limit')
    manifest = strict_json(path.read_bytes(), 64*1024)
    if (not isinstance(manifest, dict) or set(manifest) != {'version', 'chunks'}
            or manifest['version'] != 1 or not isinstance(manifest['chunks'], list)
            or not all(isinstance(chunk, str) and VITE_CHUNK.fullmatch(chunk) for chunk in manifest['chunks'])):
        reject('invalid Vite build manifest')
    chunks = {name for name in inventory if VITE_CHUNK.fullmatch(name)}
    if chunks != set(manifest['chunks']) or len(chunks) != len(manifest['chunks']):
        reject('Vite build manifest does not match the upload')
    roots = {ref.decode('ascii') for ref in VITE_ROOT_REF.findall((stage/'index.html').read_bytes())}
    if not any(name.endswith('.js') for name in roots) or not roots <= chunks:
        reject('missing Vite entry chunk')
    for name in chunks:
        source = (stage/name).read_bytes()
        refs = {match.decode('ascii') for match in VITE_ROOT_REF.findall(source)}
        refs.update('assets/'+match.decode('ascii') for match in VITE_LOCAL_REF.findall(source))
        if not refs <= chunks:
            reject('missing referenced Vite chunk')
    path.unlink()
    del inventory[VITE_BUILD_MARKER]
    return True

def hash_file(path, owner, maximum):
    fd=regular_fd(path,owner);total=0;digest=hashlib.sha256()
    with os.fdopen(fd,'rb') as f:
        while True:
            data=f.read(65536)
            if not data:break
            total+=len(data)
            if total>maximum:reject('stored file limit')
            digest.update(data)
    return {'bytes':total,'sha256':digest.hexdigest()}

def tree_inventory(root,owner,p):
    fd=checked_dir(root,owner);os.close(fd);result={};total=0;canonical=set();dir_count=0
    for parent,dirs,files in os.walk(root,followlinks=False):
        dir_count+=len(dirs)
        if dir_count>=MAX_DIRECTORIES:reject('published directory count limit')
        for name in dirs:
            fd=checked_dir(Path(parent)/name,owner);os.close(fd)
        for name in files:
            path=Path(parent)/name;relative=path.relative_to(root).as_posix()
            if len(relative.encode())>p['maxPath'] or len(relative.split('/'))>p['maxDepth']:reject('stored path limit')
            if relative not in ('release.json','public-files.json'):public_name('public/'+relative,False,p)
            canon=unicodedata.normalize('NFC',relative)
            if canon in canonical:reject('stored canonical collision')
            canonical.add(canon);value=hash_file(path,owner,p['maxFile']);total+=value['bytes'];result[relative]=value
            if total>p['maxPublished'] or len(result)>p['maxPublishedEntries']:reject('published tree limit')
    return result

def copy_verified(src,dst,expected,owner,p):
    fd=regular_fd(src,owner);out=os.open(dst,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600);digest=hashlib.sha256();total=0
    with os.fdopen(fd,'rb') as a,os.fdopen(out,'wb') as b:
        while True:
            chunk=a.read(65536)
            if not chunk:break
            total+=len(chunk)
            if total>expected['bytes']:reject('source grew during copy')
            b.write(chunk);digest.update(chunk)
        b.flush();os.fsync(b.fileno());os.fchmod(b.fileno(),0o644)
    if {'bytes':total,'sha256':digest.hexdigest()}!=expected:reject('copy verification')

class Layout:
    def __init__(self,base,state,inbox,backups,policy):self.base=Path(base);self.state=Path(state);self.inbox=Path(inbox);self.backups=Path(backups);self.policy=Path(policy)

def production_layout():return Layout('/var/www/chineseos','/var/lib/chineseos-static','/var/lib/chineseos-deploy/inbox','/var/www/chineseos/backups','/etc/chineseos-deploy/policy.json')

class Engine:
    def __init__(self,layout,owner_uid,publisher_uid,health):
        self.l=layout;self.owner=owner_uid;self.publisher=publisher_uid;self.health=health
        fd=regular_fd(layout.policy,owner_uid,True)
        with os.fdopen(fd,'rb') as f:self.p=validate_policy(strict_json(f.read(65537),65536))
        if not self.p['enabled']:reject('publisher disabled pending approval')
        for path in [layout.base,layout.base/'releases',layout.state]:
            fd=checked_dir(path,owner_uid);os.close(fd)
        if os.stat(layout.state).st_mode&0o077:reject('state must be private')
    @contextlib.contextmanager
    def locked(self):
        fd=checked_dir(self.l.state,self.owner)
        try:
            lock=os.open('operation.lock',os.O_RDWR|os.O_CREAT|os.O_NOFOLLOW|os.O_NONBLOCK,0o600,dir_fd=fd)
            s=os.fstat(lock)
            if not stat.S_ISREG(s.st_mode) or s.st_uid!=self.owner or s.st_nlink!=1 or s.st_mode&0o077:os.close(lock);reject('unsafe lock')
            try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
            except BlockingIOError:os.close(lock);reject('operation busy')
            try:yield
            finally:os.close(lock)
        finally:os.close(fd)
    def current(self):
        fd=checked_dir(self.l.base,self.owner)
        try:target=os.readlink('current',dir_fd=fd)
        finally:os.close(fd)
        prefix=str(self.l.base/'releases')+'/'
        rid=target[len(prefix):] if target.startswith(prefix) else target[len('releases/'):] if target.startswith('releases/') else ''
        if not RID.fullmatch(rid):reject('unsafe current symlink')
        fd=checked_dir(self.l.base/'releases'/rid,self.owner);os.close(fd)
        return rid
    def disk(self,extra):
        for where,needed in [(self.l.state,self.p['maxArchive']),(self.l.base,extra)]:
            fs=os.statvfs(where);metadata=2*(self.p['maxPublishedEntries']+MAX_DIRECTORIES)*fs.f_frsize+4*ROOT_JSON_MAX
            if fs.f_favail<2*(self.p['maxPublishedEntries']+MAX_DIRECTORIES)+8192:reject('inode reserve')
            if shutil.disk_usage(where).free<self.p['reserveBytes']+needed+metadata:reject('disk reserve; single-instance staging requires more free space')
    def snapshot(self,dest):
        # Inbox is the sole allowed publisher-owned directory; its parent remains trusted.
        parent=checked_dir(self.l.inbox.parent,self.owner)
        try:inbox=os.open(self.l.inbox.name,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=parent)
        finally:os.close(parent)
        try:
            s=os.fstat(inbox)
            if s.st_uid!=self.publisher or s.st_mode&0o077:reject('unsafe inbox')
            fd=os.open('request.upload',os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK,dir_fd=inbox)
        finally:os.close(inbox)
        s=os.fstat(fd)
        if not stat.S_ISREG(s.st_mode) or s.st_uid!=self.publisher or s.st_nlink!=1 or s.st_mode&0o077:os.close(fd);reject('unsafe upload inode')
        with os.fdopen(fd,'rb') as src:
            line=src.readline(MAX_REQUEST+1)
            if not line.endswith(b'\n'):reject('missing/big request line')
            req=request(line,self.p);digest=hashlib.sha256();total=0
            out=os.open(dest,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
            with os.fdopen(out,'wb') as dst:
                while total<req['bytes']:
                    data=src.read(min(65536,req['bytes']-total))
                    if not data:reject('truncated upload')
                    total+=len(data);digest.update(data);dst.write(data)
                if src.read(1):reject('trailing upload bytes')
                dst.flush();os.fsync(dst.fileno())
            if digest.hexdigest()!=req['sha256']:reject('upload hash mismatch')
        return req
    def swap(self,rid):
        if not RID.fullmatch(rid):reject('release id')
        target=checked_dir(self.l.base/'releases'/rid,self.owner);os.close(target)
        fd=checked_dir(self.l.base,self.owner);name='.next-'+uuid.uuid4().hex
        try:
            os.symlink('releases/'+rid,name,dir_fd=fd);os.replace(name,'current',src_dir_fd=fd,dst_dir_fd=fd);os.fsync(fd)
        finally:
            with contextlib.suppress(FileNotFoundError):os.unlink(name,dir_fd=fd)
            os.close(fd)
    def read_state(self,name):return read_metadata(self.l.state/name,self.owner)
    def remove_inactive_release(self, rid):
        if not RID.fullmatch(rid) or rid == self.current():
            reject('refusing to remove active or invalid release')
        path = self.l.base / 'releases' / rid
        self.remove_private_tree(path)
        with contextlib.suppress(FileNotFoundError):
            (self.l.state / (rid + '.json')).unlink()

    def remove_private_tree(self, path):
        # Only call with a fixed root and a trusted, validated child name.
        if not os.path.lexists(path):
            return
        fd = checked_dir(path, self.owner)
        os.close(fd)
        if os.stat(path).st_dev != os.stat(path.parent).st_dev or not shutil.rmtree.avoids_symlink_attacks:
            reject('unsafe tree removal')
        shutil.rmtree(path)

    def consume_upload(self, rid):
        # The gateway uses this same lock to replace its one request atomically.
        parent = checked_dir(self.l.inbox.parent, self.owner)
        try:
            lock = os.open('upload.lock', os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=parent)
            with os.fdopen(lock, 'rb'):
                metadata = os.fstat(lock)
                if (not stat.S_ISREG(metadata.st_mode) or metadata.st_uid != self.owner
                        or metadata.st_nlink != 1 or metadata.st_mode & 0o022):
                    reject('unsafe upload lock')
                fcntl.flock(lock, fcntl.LOCK_EX)
                inbox = os.open(self.l.inbox.name, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=parent)
                try:
                    metadata = os.fstat(inbox)
                    if metadata.st_uid != self.publisher or metadata.st_mode & 0o077:
                        reject('unsafe inbox')
                    with contextlib.suppress(FileNotFoundError):
                        fd = os.open('request.upload', os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=inbox)
                        with os.fdopen(fd, 'rb') as request_file:
                            metadata = os.fstat(fd)
                            if (not stat.S_ISREG(metadata.st_mode) or metadata.st_uid != self.publisher
                                    or metadata.st_nlink != 1 or metadata.st_mode & 0o077):
                                reject('unsafe upload inode')
                            row = request(request_file.readline(MAX_REQUEST + 1), self.p)
                            if 'r-' + row['sha256'] == rid:
                                os.unlink('request.upload', dir_fd=inbox)
                                os.fsync(inbox)
                finally:
                    os.close(inbox)
        finally:
            os.close(parent)

    def recover(self):
        pending = self.l.state / 'pending.json'
        if not os.path.lexists(pending):
            return
        row = self.read_state('pending.json')
        if (set(row) != {'before', 'after', 'committed'}
                or type(row['committed']) is not bool
                or any(type(row[k]) is not str or not RID.fullmatch(row[k]) for k in ('before', 'after'))
                or row['before'] == row['after']):
            reject('unrecognized pending transaction; operator review required')
        current = self.current()
        if row['committed']:
            if current != row['after']:
                reject('committed transaction current mismatch')
            self.remove_inactive_release(row['before'])
            self.consume_upload(row['after'])
        else:
            if current not in (row['before'], row['after']):
                reject('pending transaction conflict')
            if current == row['after']:
                self.swap(row['before'])
            self.remove_inactive_release(row['after'])
        pending.unlink()
        fd = checked_dir(self.l.state, self.owner)
        try:
            os.fsync(fd)
        finally:
            os.close(fd)

    def activate(self):
        with self.locked():
            self.recover()
            current = self.current()
            # Reserve for the temporary stage, one snapshot and decompression limits.
            # No additional published tree is copied into an archive.
            self.disk(2*self.p['maxArchive']+self.p['maxExpanded']+self.p['maxPublished']+64*1024**2)
            work = self.l.state / ('snapshot-' + uuid.uuid4().hex)
            stage = self.l.base / 'releases' / ('.stage-' + uuid.uuid4().hex)
            work.mkdir(mode=0o700)
            try:
                return self.publish(current, work, stage)
            finally:
                self.remove_private_tree(stage)
                self.remove_private_tree(work)

    def publish(self, before, work, stage):
        req = self.snapshot(work / 'archive.gz')
        rid = 'r-' + req['sha256']
        if before == rid:
            receipt = self.read_state(rid + '.json')
            if (receipt['sha256'] != req['sha256']
                    or tree_inventory(self.l.base/'releases'/rid, self.owner, self.p) != receipt['inventory']
                    or not self.health(rid, self.p)):
                reject('active release identity/health')
            self.consume_upload(rid)
            return {'status': 'already-active', 'release': rid}
        if req['expectedCurrent'] != before:
            reject('stale expectedCurrent')
        dest = self.l.base / 'releases' / rid
        if os.path.lexists(dest):
            reject('release already exists; operator review required')
        stage.mkdir(mode=0o700)
        with open(work/'archive.gz','rb') as src:inventory=extract_public(src,stage,self.p)
        replace_build = validate_vite_replacement(stage, inventory)
        old=tree_inventory(self.l.base/'releases'/before,self.owner,self.p)
        if not replace_build and any(name not in old and VITE_CHUNK.fullmatch(name) for name in inventory):
            reject('new Vite chunks require a complete build manifest')
        # Root metadata is replaced, never trusted as publication authorization.
        for name,value in old.items():
            if name in ('release.json','public-files.json'):continue
            if name in inventory:
                if (any(name.startswith(prefix) for prefix in self.p['immutablePrefixes']) or re.match(r'(?:course[0-9]{2,3}|lesson[0-9]{2,3}-materials)/',name)) and inventory[name]!=value:reject('immutable asset collision')
            else:
                if name in self.p['rootFiles']:reject('missing root baseline file')
                if replace_build and VITE_CHUNK.fullmatch(name):continue
                target=stage/name;target.parent.mkdir(parents=True,exist_ok=True,mode=0o755);copy_verified(self.l.base/'releases'/before/name,target,value,self.owner,self.p)
        merged=tree_inventory(stage,self.owner,self.p)
        receipt={'release':rid,'previous':before,'sha256':req['sha256'],'archiveBytes':req['bytes'],'integrity':'verified snapshot; NOT independent content authorization','authority':'ongoing static publication; explicit user request and source review required','transportRequester':'dedicated publisher; request metadata is not an owner approval','files':len(merged),'bytes':sum(x['bytes'] for x in merged.values())}
        atomic_json(stage/'release.json',receipt,self.owner);os.chmod(stage/'release.json',0o644)
        receipt['inventory'] = tree_inventory(stage, self.owner, self.p)
        pending = {'before': before, 'after': rid, 'committed': False}
        atomic_json(self.l.state / 'pending.json', pending, self.owner)
        try:
            atomic_json(self.l.state / (rid + '.json'), receipt, self.owner)
            os.chmod(stage, 0o755)
            os.rename(stage, dest)
            fd = checked_dir(self.l.base / 'releases', self.owner)
            try:
                os.fsync(fd)
            finally:
                os.close(fd)
            if self.current() != before:
                reject('current changed during staging')
            self.swap(rid)
            if not self.health(rid, self.p):
                reject('health check failed')
            pending['committed'] = True
            atomic_json(self.l.state / 'pending.json', pending, self.owner)
        except BaseException:
            self.recover()
            raise
        self.recover()
        return {'status': 'activated', 'release': rid, 'retention': 'active-only'}

    def rollback(self):
        reject('rollback disabled; redeploy a reviewed GitHub source')
