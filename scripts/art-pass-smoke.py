"""Production browser checks for the Plum Light iteration.
Requires Python playwright + Pillow and Chromium. Start `npm run preview -- --host
127.0.0.1 --port 5175 --strictPort` after `npm run build`, then run this file.
Set QUIET_PATH_URL to test another host, preserving /the-quiet-path/.
"""
import base64
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/art-pass'
OUT.mkdir(parents=True, exist_ok=True)
URL = os.environ.get('QUIET_PATH_URL', 'http://127.0.0.1:5175/the-quiet-path/')
report = {'url': URL, 'checks': [], 'errors': []}

def check(name, ok, detail=None):
    report['checks'].append({'name': name, 'passed': bool(ok), 'detail': detail})
    print(name, 'PASS' if ok else 'FAIL', detail or '', flush=True)
    assert ok, name

def shot(page, name):
    page.screenshot(path=str(OUT / (name + '.jpg')), type='jpeg', quality=86, timeout=60000)

def boot(context):
    page = context.new_page()
    page.on('pageerror', lambda e: report['errors'].append(str(e)))
    page.route('https://fonts.googleapis.com/**', lambda r: r.abort())
    page.goto(URL)
    page.wait_for_function('window.__ready === true', timeout=90000)
    page.locator('.loading').wait_for(state='detached')
    page.locator('.title-art img').evaluate('(img) => img.decode()')
    return page

def seed(context, quality='medium'):
    save = {'version': 2, 'started': True, 'pos': {'x':19,'z':38,'yaw':0.283},
            'day':1,'time':2,'weather':'mist','season':'spring','zone':'hutYard',
            'flags':{'readWelcome':True,'seen_hutYard':True},'visited':{},
            'roll':{'id':3,'shots':5},'stamp':7}
    settings = {'quality':quality,'muted':True,'bellFrequency':'off','instantReview':True}
    context.add_init_script(f"""if (!localStorage.getItem('quietpath.progress.v2')) {{
      localStorage.setItem('quietpath.progress.v2',JSON.stringify({json.dumps(save)}));
      localStorage.setItem('quietpath.settings.v2',JSON.stringify({json.dumps(settings)}));
    }}""")

POSE = """({x,z,yaw,pitch})=>{const g=__game;g.player.stop();g.player.lookTarget=null;
Object.assign(g.player,{x,z,yaw,pitch});g.player.update(1,{});
g._acc.zone=1;window.__frame(0);g.engine.resize(innerWidth,innerHeight,1);g.player.applyTo(g.engine.camera);
g.engine.render();}"""

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM', '/usr/bin/chromium'),
        headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage'])
    # Fresh opening, keyboard focus and no-save Begin.
    fresh = browser.new_context(viewport={'width':1440,'height':900},device_scale_factor=1)
    page = boot(fresh)
    check('production base path and wide artwork', page.locator('.title-art img').evaluate('(e)=>e.currentSrc.endsWith("/the-quiet-path/art/retreat-wide.webp") && e.naturalWidth>0'))
    shot(page,'title-desktop')
    page.get_by_role('button',name='Silent',exact=True).click()
    page.get_by_role('button',name='Begin',exact=True).click()
    page.wait_for_function('__game.mode === "explore"')
    check('fresh Begin and saved progress',page.evaluate('JSON.parse(localStorage.getItem("quietpath.progress.v2")).started'))
    page.close();fresh.close()

    desktop = browser.new_context(viewport={'width':1440,'height':900},device_scale_factor=1)
    seed(desktop, 'high')
    page = boot(desktop)
    check('existing v2 save offers Continue',page.get_by_role('button',name='Continue your stay').count()==1)
    page.get_by_role('button',name='Continue your stay').click()
    check('Continue retains progress and roll',page.evaluate('(()=>{const s=JSON.parse(localStorage.getItem("quietpath.progress.v2"));return __game.player.x===19 && __game.player.z===38 && s.roll.id===3 && s.roll.shots===5 && s.stamp===7})()'))
    # Freeze time for repeatable comparison, using the public debugging game object.
    page.evaluate('window.__frame=__game.frame.bind(__game); __game.frame=()=>{}; __game.mode="explore"; __game.hud.show(true)')
    page.evaluate(POSE,{'x':19,'z':38,'yaw':0.283,'pitch':0.04})
    page.evaluate('document.querySelector("#ui").style.visibility="hidden"')
    shot(page,'hut-after')
    page.evaluate('document.querySelector("#ui").style.visibility=""')
    routes = page.evaluate('''()=>{const n=__game.world.nav;return [[19,38,10,25],[10,25,3,-9],[3,-9,3,-17],[19,38,20,45]].map(a=>!!n.route(...a))}''')
    check('hut, pond, hall and hut interior navigation routes',all(routes),routes)
    # Actual keyboard event, then manual simulation frame (software WebGL is slow).
    before = page.evaluate('({x:__game.player.x,z:__game.player.z})')
    page.keyboard.down('w'); page.evaluate('__frame(0.1)');page.keyboard.up('w')
    moved = page.evaluate('({x:__game.player.x,z:__game.player.z})')
    check('keyboard exploration',abs(moved['x']-before['x'])+abs(moved['z']-before['z'])>0.05)
    # Human scale and detailed interior screenshots.
    page.evaluate(POSE,{'x':20,'z':44.7,'yaw':-1.15,'pitch':-0.2})
    shot(page,'darkroom')
    page.evaluate(POSE,{'x':3,'z':-14,'yaw':0.4,'pitch':-0.25})
    shot(page,'hall-interior')
    # A deterministic fish close to the bridge; tails and movement remain ordinary scene meshes.
    page.evaluate('''()=>{const g=__game;g.world.animals.update(0,12,g.player,0);g.toggleCamera(true);
      const fish=g.world.animals.list.filter(a=>a.kind==='koi');fish.forEach(a=>{a.t=0});g.world.animals.update(0,12,g.player,0);
      const f=fish[0].obj.position;window.__fishTarget={x:f.x,y:f.y,z:f.z};}''')
    motion=page.evaluate("""()=>{const g=__game;let maxStep=0,wet=true;const fish=g.world.animals.list.filter(a=>a.kind==='koi');for(let i=0;i<300;i++){const old=fish.map(a=>a.obj.position.clone());g.world.animals.update(.1,i*.1,g.player,0);fish.forEach((a,k)=>{maxStep=Math.max(maxStep,old[k].distanceTo(a.obj.position));const p=a.obj.position;wet=wet&&p.y<1.2&&Math.hypot((p.x-6)/11,(p.z-12)/8.5)<.9})}fish.forEach(a=>a.t=0);g.world.animals.update(0,12,g.player,0);return {maxStep,wet}}""")
    check('fish glide continuously below surface inside pond',motion['wet'] and 0.001<motion['maxStep']<0.15,motion)
    target=page.evaluate('__fishTarget')
    page.evaluate(POSE,{'x':17.8,'z':9,'yaw':0,'pitch':-0.4})
    page.evaluate('''()=>{const g=__game;const f=__fishTarget;g.engine.camera.lookAt(f.x,f.y,f.z);
      g.player.yaw=g.engine.camera.rotation.y;g.player.pitch=g.engine.camera.rotation.x;g.vf.setZoom(1.8);g.updateFov();g.engine.render()}''')
    shot(page,'fish-viewfinder')
    # Take a photograph through the real shutter, then retrieve its persisted JPEG.
    page.evaluate('async()=>{await __game.shutter()}')
    def saved_photo(filename):
        encoded=page.evaluate('''async()=>{const req=indexedDB.open('quietpath-photos');const db=await new Promise((r,j)=>{req.onsuccess=()=>r(req.result);req.onerror=j});
          const read=(k)=>new Promise((r,j)=>{const q=db.transaction('photos').objectStore('photos').get(k);q.onsuccess=()=>r(q.result);q.onerror=j});
          const list=await read('index');const meta=list[list.length-1];const blob=await read('img:'+meta.id);const data=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(blob)});db.close();return {meta,data};}''')
        (OUT/filename).write_bytes(base64.b64decode(encoded['data'].split(',')[1]))
        return encoded['meta']
    meta=saved_photo('fish-saved.jpg')
    check('fish identified in actual saved photo', 'koi beneath the surface' in meta['subjects'],meta)
    page.evaluate('''()=>{__game.world.animals.list.filter(a=>a.kind==='koi').forEach(a=>a.obj.visible=false)}''')
    page.evaluate('async()=>{await __game.shutter()}')
    saved_photo('fish-hidden-control.jpg')
    im=Image.open(OUT/'fish-saved.jpg');ctrl=Image.open(OUT/'fish-hidden-control.jpg')
    diff=ImageChops.difference(im,ctrl)
    # Grain varies between exposures; large differences locate actual fish pixels.
    mask=diff.convert('L').point(lambda v:255 if v>32 else 0)
    changed=sum(1 for v in mask.get_flattened_data() if v)
    check('visible fish pixels survive saved JPEG (fish-hidden control)',changed>80,{'changed_pixels_above_grain':changed,'jpeg_size':im.size})
    page.reload()
    page.wait_for_function('window.__ready',timeout=90000)
    retained=page.evaluate("""async(id)=>{const req=indexedDB.open('quietpath-photos');const db=await new Promise(r=>{req.onsuccess=()=>r(req.result)});const blob=await new Promise(r=>{const q=db.transaction('photos').objectStore('photos').get('img:'+id);q.onsuccess=()=>r(q.result)});db.close();return blob?.size;}""",meta['id'])
    check('fish JPEG persists across reload',retained==(OUT/'fish-saved.jpg').stat().st_size,retained)
    page.get_by_role('button',name='Begin a new stay',exact=True).click()
    page.get_by_role('button',name='Cancel',exact=True).click()
    check('cancel new stay returns to title',page.get_by_role('button',name='Continue your stay').count()==1)
    page.get_by_role('button',name='Continue your stay').click()
    page.get_by_role('button',name='Album (P)').click()
    page.locator('.frame-btn').nth(1).wait_for(state='visible')
    check('saved photographs appear in album',page.locator('.frame-btn').count()==2)
    check('roll advanced and persisted',page.evaluate('JSON.parse(localStorage.getItem("quietpath.progress.v2")).roll.shots===7'))
    page.close();desktop.close()

    phone=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1,reduced_motion='reduce')
    seed(phone,'low')
    page=boot(phone)
    check('portrait art and reduced motion',page.locator('.title-art img').evaluate('(e)=>e.currentSrc.endsWith("retreat-portrait.webp")') and page.locator('.title-screen').evaluate('(e)=>getComputedStyle(e).animationName==="none"'))
    buttons=page.locator('.title-screen .actions button').evaluate_all('(es)=>es.map(e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height,bottom:r.bottom}})')
    check('phone primary controls visible and touch sized',all(x['h']>=48 and x['bottom']<=844 for x in buttons),buttons)
    shot(page,'title-phone')
    page.get_by_role('button',name='Continue your stay').tap()
    page.wait_for_function('__game.mode === "explore"')
    page.evaluate('window.__frame=__game.frame.bind(__game);__game.frame=()=>{}')
    page.evaluate(POSE,{'x':19,'z':38,'yaw':0.283,'pitch':-0.05})
    page.evaluate('__game.hud.show(true); __game._acc.zone=1; __frame(0)')
    shot(page,'hut-phone')
    # Real touch events via CDP exercise pointer drag and tap-to-walk.
    cdp=phone.new_cdp_session(page)
    yaw=page.evaluate('__game.player.yaw')
    for typ,pts in [('touchStart',[{'x':190,'y':400}]),('touchMove',[{'x':260,'y':415}]),('touchEnd',[])]:
        cdp.send('Input.dispatchTouchEvent',{'type':typ,'touchPoints':pts})
    check('touch drag looks around',abs(page.evaluate('__game.player.yaw')-yaw)>0.05)
    page.evaluate(POSE,{'x':19,'z':38,'yaw':0.283,'pitch':-0.32})
    # Find a point where a ground tap resolves to a valid, nearby route.
    tap=page.evaluate('''()=>{const g=__game;for(let y=550;y<700;y+=35)for(let x=80;x<320;x+=40){const hit=g.raycastScreen(x,y);if(!hit)continue;const p=hit.point;const d=Math.hypot(p.x-g.player.x,p.z-g.player.z);if(d>1&&d<12&&g.world.nav.route(g.player.x,g.player.z,p.x,p.z))return {x,y}}}''')
    check('touch ground route available',bool(tap),tap)
    page.touchscreen.tap(tap['x'],tap['y'])
    check('touch tap starts walking',page.evaluate('!!__game.player.route'))
    page.evaluate('__frame(0.1)')
    page.get_by_role('button',name='Stop',exact=True).tap()
    check('touch Stop cancels walking',page.evaluate('__game.player.route===null'))
    page.get_by_role('button',name='Raise camera (C)').tap()
    check('touch camera controls',page.evaluate('__game.vf.active'))
    page.get_by_role('button',name='Lower camera (Esc)').tap()
    # A look interaction remains in place, with its existing dialog.
    page.evaluate('''()=>{const it=__game.world.interactables.find(i=>i.kind==='look');__game.use(it)}''')
    check('look interaction opens dialog',page.locator('.dialog').count()==1)
    check('low quality scene renders',page.evaluate('__game.engine.tierName==="low" && __game.engine.renderer.info.render.triangles>0'))
    report['low_tier_render']=page.evaluate('({calls:__game.engine.renderer.info.render.calls,triangles:__game.engine.renderer.info.render.triangles})')
    check('no JavaScript errors',not report['errors'],report['errors'])
    page.close();phone.close();browser.close()

(OUT/'checks.json').write_text(json.dumps(report,indent=2)+'\n')
print('Saved evidence to',OUT,flush=True)
