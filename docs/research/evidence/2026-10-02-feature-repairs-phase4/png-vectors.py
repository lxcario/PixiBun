import struct,zlib,base64,io
from PIL import Image
for channels in [3,4]:
    row0=list(range(10,10+10*channels*2,10))
    rows=[bytes([0]+row0),bytes([1]+[v+5 for v in row0[:channels]]+[channels*10]*channels),bytes([2]+[5]*(channels*2)),bytes([3]+[15+5*i for i in range(channels)]+[18 if channels==3 else 23]*channels),bytes([4]+[5]*(channels*2))]
    chunk=lambda t,b:struct.pack('>I',len(b))+t+b+struct.pack('>I',zlib.crc32(t+b)&0xffffffff)
    png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',2,5,8,2 if channels==3 else 6,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows)))+chunk(b'IEND',b'')
    im=Image.open(io.BytesIO(png));print(channels,base64.b64encode(png).decode(),list(im.getdata()))
