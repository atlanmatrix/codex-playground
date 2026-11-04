"""Bake a seamless 8K miniature-Earth atlas with soft, shared biome transitions."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parent.parent
REGIONS=json.loads((ROOT/'src/globe-regions.json').read_text());W,H=8192,4096

def smooth(a,b,x):
 t=np.clip((x-a)/(b-a),0,1);return t*t*(3-2*t)

atlas=np.empty((H,W,3),dtype=np.uint8)
u=(np.arange(W,dtype=np.float32)+.5)/W*2*np.pi
for row in range(0,H,128):
 t=(np.arange(row,min(row+128,H),dtype=np.float32)+.5)[:,None]/H*np.pi
 nx=-np.cos(u)[None,:]*np.sin(t);ny=np.broadcast_to(np.cos(t),nx.shape);nz=np.sin(u)[None,:]*np.sin(t)
 sea=np.ones_like(nx);weights=np.zeros_like(nx);rgb=np.zeros((*nx.shape,3),dtype=np.float32)
 for r in REGIONS:
  if r['route']=='ocean':continue
  lat,lon=np.deg2rad([r['lat'],r['lon']]);n=[np.cos(lat)*np.sin(lon),np.sin(lat),np.cos(lat)*np.cos(lon)]
  east=[np.cos(lon),0,-np.sin(lon)];north=np.cross(n,east)
  dot=nx*n[0]+ny*n[1]+nz*n[2];safe=np.maximum(dot,.001)
  x=(nx*east[0]+nz*east[2])/safe;y=(nx*north[0]+ny*north[1]+nz*north[2])/safe
  angle=np.arctan2(y,x);phase=r['phase'];edge=r['size']*(1+.13*np.sin(3*angle+phase)+.07*np.cos(5*angle-phase)+.035*np.sin(9*angle))
  d=np.where(dot>0,np.hypot(x,y)/edge,100)
  sea*=smooth(.72,1.20,d)
  w=np.maximum(0,1-d/1.12)**2;weights+=w;rgb+=w[...,None]*np.array(r['color'])
 land=1-sea;rgb/=np.maximum(weights,.00001)[...,None]
 variation=(np.sin(nx*29+ny*13)*np.cos(nz*23-ny*7)+.35*np.sin(nx*71-nz*19)*np.cos(ny*83+nz*37))
 rgb+=variation[...,None]*5
 beach=(1-smooth(.62,.82,land))[...,None]
 rgb=rgb*(1-beach)+np.array([219,207,164])*beach
 ocean=np.array([32,106,140])+(variation[...,None]+.3)*3
 shallow=smooth(.10,.62,land)[...,None]
 ocean=ocean*(1-shallow)+np.array([91,169,172])*shallow
 # Sea floor and beach meet beneath the shared translucent sea surface.
 emergence=smooth(.52,.68,land)[...,None]
 rgb=ocean*(1-emergence)+rgb*emergence
 atlas[row:row+len(t)]=np.clip(rgb,0,255).astype(np.uint8)
Image.fromarray(atlas).save(ROOT/'assets/globe-terrain.webp',quality=94,method=6)
print(f'Baked continuous {W}×{H} atlas: {(ROOT/"assets/globe-terrain.webp").stat().st_size:,} bytes')
