"""Remove EXIF/XMP/IPTC/comments from classroom JPEG copies, without recompressing pixels.
Original owner photos are never changed. Usage: python strip-board-metadata.py DIRECTORY
"""
import sys
from pathlib import Path
for path in Path(sys.argv[1]).glob('*.jpg'):
    data=path.read_bytes()
    if data[:2]!=b'\xff\xd8':raise ValueError('Not JPEG: '+str(path))
    out=bytearray(data[:2]);pos=2
    while pos<len(data):
        start=pos
        if data[pos]!=255:raise ValueError('Invalid JPEG marker')
        while data[pos]==255:pos+=1
        marker=data[pos];pos+=1
        if marker in (0xda,0xd9):out.extend(data[start:]);break
        if marker in (0x01,*range(0xd0,0xd8)):out.extend(data[start:pos]);continue
        size=int.from_bytes(data[pos:pos+2],'big');end=pos+size
        if end>len(data) or size<2:raise ValueError('Invalid JPEG segment')
        if marker not in (0xe1,0xed,0xfe):out.extend(data[start:end])
        pos=end
    path.write_bytes(out)
print('Removed metadata from public board copies; compressed image pixels preserved.')
