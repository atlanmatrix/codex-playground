"""Bake a deterministic 8K terrain atlas. No scene models or external image sources."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parent.parent
REGIONS=json.loads((ROOT/'src/globe-regions.json').read_text())
W,H=8192,4096

def noise(x,y):
    ix=np.floor(x);iy=np.floor(y);fx=x-ix;fy=y-iy
    sx=fx*fx*fx*(fx*(fx*6-15)+10);sy=fy*fy*fy*(fy*(fy*6-15)+10)
    def gradient(a,b,dx,dy):
        v=np.sin(a*127.1+b*311.7)*43758.5453
        k=((v-np.floor(v))*8).astype(np.int32)
        gx=np.take([1,-1,1,-1,1,-1,0,0],k)
        gy=np.take([1,1,-1,-1,0,0,1,-1],k)
        return gx*dx+gy*dy
    a=gradient(ix,iy,fx,fy);b=gradient(ix+1,iy,fx-1,fy)
    c=gradient(ix,iy+1,fx,fy-1);d=gradient(ix+1,iy+1,fx-1,fy-1)
    return .5+((a*(1-sx)+b*sx)*(1-sy)+(c*(1-sx)+d*sx)*sy)*.7

def terrain(x,y):
    x,y=x+.08*np.sin(y*19),y+.08*np.sin(x*17)
    return sum(noise(x*f+19,y*f-7)*a for f,a in [(3,.48),(7,.25),(17,.14),(43,.08),(107,.035),(251,.015)])

atlas=np.empty((H,W,3),dtype=np.uint8)
u=(np.arange(W,dtype=np.float32)+.5)/W*2*np.pi
for row in range(0,H,128):
    t=(np.arange(row,min(row+128,H),dtype=np.float32)+.5)[:,None]/H*np.pi
    nx=-np.cos(u)[None,:]*np.sin(t);ny=np.broadcast_to(np.cos(t),nx.shape);nz=np.sin(u)[None,:]*np.sin(t)
    sea=noise(nx*7+nz*3,ny*8+nz*2)
    rgb=np.stack([29+sea*10,94+sea*18,123+sea*20],axis=-1)
    for r in REGIONS:
        lat,lon=np.deg2rad([r['lat'],r['lon']]);n=[np.cos(lat)*np.sin(lon),np.sin(lat),np.cos(lat)*np.cos(lon)]
        east=[np.cos(lon),0,-np.sin(lon)];north=np.cross(n,east)
        dot=nx*n[0]+ny*n[1]+nz*n[2];safe=np.maximum(dot,.001)
        x=(nx*east[0]+nz*east[2])/safe;y=(nx*north[0]+ny*north[1]+nz*north[2])/safe
        # Avoid huge noise coordinates on the opposite hemisphere.
        x=np.clip(x,-3,3);y=np.clip(y,-3,3)
        angle=np.arctan2(y,x);phase=r['phase']
        edge=r['size']*(1+.13*np.sin(3*angle+phase)+.07*np.cos(5*angle-phase)+.035*np.sin(9*angle))
        d=np.hypot(x,y)/edge
        coast=(dot>0)&(d<1.10)
        if not np.any(coast):continue
        shallow=np.clip((1.10-d)/.1,0,1)[...,None]
        coastal=rgb*(1-shallow)+np.array([72,157,164])*shallow
        rgb=np.where(coast[...,None],coastal,rgb)
        land=(dot>0)&(d<1)
        h=terrain(x+phase,y-phase)
        detail=noise(x*700,y*700)-.5
        if r['route']=='desert':
            dune=np.sin(x*105+np.sin(y*30)*2+h*12)
            h=h*.6+.25+dune*.05
            c=np.array(r['color'])+h[...,None]*np.array([38,30,18])+detail[...,None]*5
        elif r['route']=='ocean':
            c=np.array(r['color'])+(h[...,None]-.5)*55+detail[...,None]*5
            c=np.where((h>.62)[...,None],c*.65+np.array([124,186,168])*.35,c)
        else:
            ridge=1-np.abs(noise(x*23+phase,y*23-phase)*2-1)
            h=h*.7+ridge*.3
            c=np.array(r['color'])+(h[...,None]-.5)*75+detail[...,None]*8
            if r['route'] in ('summit','onsen'):
                rock=np.clip((h-.53)*4,0,.85)[...,None]
                c=c*(1-rock)+np.array([138,144,128])*rock
            if r['route']=='summit':
                snow=np.clip((h-.47)*7,0,1)[...,None]
                c=c*(1-snow)+np.array([235,239,225])*snow
        # Bake directional relief into the map; the runtime only draws a smooth sphere.
        slope=np.gradient(h,axis=1)*20
        c*=np.clip(1+slope,.70,1.22)[...,None]
        if r['route'] not in ('ocean','summit'):
            beach=np.clip((d-.95)/.05,0,1)[...,None]
            c=c*(1-beach)+np.array([211,202,154])*beach
        rgb=np.where(land[...,None],c,rgb)
    atlas[row:row+len(t)]=np.clip(rgb,0,255).astype(np.uint8)
(ROOT/'assets').mkdir(exist_ok=True)
Image.fromarray(atlas).save(ROOT/'assets/globe-terrain.webp',quality=92,method=6)
print(f'Baked {W}×{H} terrain atlas: {(ROOT/"assets/globe-terrain.webp").stat().st_size:,} bytes')
