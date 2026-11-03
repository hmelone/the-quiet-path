"""Capture characters using their actual game meshes and materials.
Run against Vite (npm run dev), with CHARACTER_URL, CHARACTER_OUTPUT and
CHARACTER_LABEL to compare versions. Requires Playwright and Chromium.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('CHARACTER_OUTPUT', ROOT / 'docs/characters'))
OUT.mkdir(parents=True, exist_ok=True)
URL = os.environ.get('CHARACTER_URL', 'http://127.0.0.1:5173/the-quiet-path/')
LABEL = os.environ.get('CHARACTER_LABEL', 'after')

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
        args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage'])
    page = b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.route('https://fonts.googleapis.com/**',lambda r:r.abort())
    page.goto(URL)
    page.wait_for_function('window.__ready === true',timeout=90000)
    page.evaluate('''async(isBefore)=>{
      const T=await import('/the-quiet-path/node_modules/.vite/deps/three.js');
      const {figure}=await import('/the-quiet-path/src/world3d/people.js');
      const {Animals}=await import('/the-quiet-path/src/world3d/animals.js');
      const g=__game;g.frame=()=>{};document.querySelector('#ui').style.display='none';
      const scene=new T.Scene();scene.background=new T.Color('#85958f');
      const hemi=new T.HemisphereLight('#f0ece1','#626e62',2.0);scene.add(hemi);
      const sun=new T.DirectionalLight('#fff2db',2.1);sun.position.set(-3,6,-4);scene.add(sun);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-6;sun.shadow.camera.right=6;sun.shadow.camera.top=5;sun.shadow.camera.bottom=-5;sun.shadow.bias=-.0004;
      const floor=new T.Mesh(new T.PlaneGeometry(60,60).rotateX(-Math.PI/2),new T.MeshLambertMaterial({color:'#85958f'}));floor.position.y=-.015;floor.receiveShadow=true;scene.add(floor);
      const stage=new T.Group();scene.add(stage);const cam=new T.PerspectiveCamera(35,1440/900,.01,100);
      g.engine.renderer.setPixelRatio(1);g.engine.renderer.setSize(1440,900,false);g.engine.renderer.shadowMap.enabled=true;g.engine.renderer.shadowMap.type=T.PCFSoftShadowMap;g.engine.renderer.toneMappingExposure=1;
      const humans=[figure(99,{kind:'monastic'}),figure(2,{kind:'lay'}),figure(4,{kind:'monastic',seated:true}),figure(5,{kind:'lay',seated:true,pose:'tea'})];
      humans.forEach((o,i)=>{o.position.x=-2.55+i*1.7;o.rotation.y=(isBefore?Math.PI:0)-.17;o.position.y-=new T.Box3().setFromObject(o).min.y;stage.add(o)});
      const animals=new Animals(new T.Scene());const creatures={};
      for(const time of [3,2,1]){animals.arrange(time,'clear');for(const a of animals.list){if(creatures[a.kind])continue;const o=a.obj.clone(true);o.traverse(m=>{if(m.isMesh)m.geometry=m.geometry.clone()});o.position.set(0,0,0);o.rotation.set(0,0,0);creatures[a.kind]=o}}
      window.review={T,scene,stage,cam,humans,creatures,renderer:g.engine.renderer};
      cam.position.set(.3,2.3,-8.5);cam.lookAt(0,.85,0);review.renderer.render(scene,cam);
    }''', LABEL == 'before')
    page.screenshot(path=str(OUT/f'people-{LABEL}.jpg'),quality=90,timeout=60000)
    page.evaluate('''isBefore=>{const v=review;v.stage.clear();const f=v.humans[0];f.position.set(0,0,0);f.rotation.y=(isBefore?Math.PI:0)-.2;v.stage.add(f);v.cam.position.set(.18,1.66,-1.35);v.cam.lookAt(0,1.56,0);v.renderer.render(v.scene,v.cam)}''', LABEL == 'before')
    page.screenshot(path=str(OUT/f'face-{LABEL}.jpg'),quality=90,timeout=60000)
    for kind in ['deer','fox','rabbit','heron','cat','koi','owl','squirrel','groundBird']:
        result=page.evaluate('''kind=>{const v=review,o=v.creatures[kind];if(!o)return null;
          v.stage.clear();o.position.set(0,0,0);o.rotation.set(0,0,0);v.stage.add(o);
          const box=new v.T.Box3().setFromObject(o),size=box.getSize(new v.T.Vector3()),c=box.getCenter(new v.T.Vector3());
          o.position.y-=box.min.y;c.y-=box.min.y;const d=Math.max(size.x,size.y,size.z)*2.65;v.cam.position.set(c.x+d*.6,c.y+d*.33,c.z+d);v.cam.lookAt(c);v.renderer.render(v.scene,v.cam);
          return {size:size.toArray(),triangles:v.renderer.info.render.triangles,calls:v.renderer.info.render.calls};}''',kind)
        if result:
            page.screenshot(path=str(OUT/f'{kind}-{LABEL}.jpg'),quality=88,timeout=60000)
            print(kind,result,flush=True)
    if LABEL != 'before':
        page.evaluate("""async()=>{const {game}=await import('/the-quiet-path/src/core/state.js');
          game.set({started:true,time:2,weather:'clear'});const g=__game;g.world.setConditions(g.cond);
          const person=g.world.people.hien.fig, p=person.position,yaw=person.rotation.y;g.engine.followShadow(p.x,p.y,p.z);
          g.engine.resize(1440,900,1);g.engine.camera.position.set(p.x-Math.sin(yaw)*4,p.y+1.62,p.z-Math.cos(yaw)*4);
          g.engine.camera.lookAt(p.x,p.y+1.05,p.z);g.engine.render();}""")
        page.screenshot(path=str(OUT/'people-walking-distance.jpg'),quality=88,timeout=60000)
        page.set_viewport_size({'width':390,'height':844})
        page.evaluate("""()=>{const e=__game.engine;e.resize(390,844,1);e.render()}""")
        page.screenshot(path=str(OUT/'people-phone.jpg'),quality=88,timeout=60000)
    print('JavaScript errors:',errors,flush=True)
    assert not errors
    b.close()
