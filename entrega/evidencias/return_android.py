"""APK real en Android; chat/carrusel servidos como fixture mediante CDP."""
import base64,json,time,urllib.request,subprocess,re
from pathlib import Path
import websocket
out=Path(__file__).resolve().parent
def adb(*args): return subprocess.check_output(['adb','-s','emulator-5554',*args])
socket=re.search(rb'@(webview_devtools_remote_\d+)',adb('shell','cat','/proc/net/unix')).group(1).decode()
adb('forward','tcp:9223','localabstract:'+socket)
url=json.load(urllib.request.urlopen('http://127.0.0.1:9223/json/list'))[0]['webSocketDebuggerUrl']
ws=websocket.create_connection(url,suppress_origin=True,timeout=10)
html='''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<a id="shared" href="/reel/LOCAL123/" style="display:block;height:100px">Video local</a><div id="mount"></div>
<script>window.docToken=Math.random();shared.onclick=e=>{e.preventDefault();mount.innerHTML='<div id="carousel" role="dialog"><video style="width:300px;height:400px"></video><p>Carrusel detrás del visor</p></div>'}</script>'''
seq=0
loads=0
def send(method,params={}):
 global seq
 seq+=1;ws.send(json.dumps({'id':seq,'method':method,'params':params}));return seq
def rpc(method,params={}):
 global loads
 ident=send(method,params)
 while True:
  msg=json.loads(ws.recv())
  if msg.get('method')=='Fetch.requestPaused':
   loads+=1
   send('Fetch.fulfillRequest',{'requestId':msg['params']['requestId'],'responseCode':200,'responseHeaders':[{'name':'Content-Type','value':'text/html; charset=utf-8'}],'body':base64.b64encode(html.encode()).decode()})
  if msg.get('id')==ident:
   assert 'error' not in msg,msg
   return msg.get('result',{})
def js(code):
 r=rpc('Runtime.evaluate',{'expression':code,'returnByValue':True})
 return r.get('result',{}).get('value')
def open_clip():
 point=js('(()=>{let r=document.querySelector("#shared").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()')
 rpc('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point]})
 rpc('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
def wait(code):
 end=time.time()+15
 while time.time()<end:
  if js(code): return
  time.sleep(.1)
 raise AssertionError(code)
rpc('Page.enable');rpc('Runtime.enable')
rpc('Fetch.enable',{'patterns':[{'urlPattern':'https://www.instagram.com/direct/t/local-fixture/','resourceType':'Document','requestStage':'Request'}]})
rpc('Page.navigate',{'url':'https://www.instagram.com/direct/t/local-fixture/'})
wait('!!window.__calmaClipInstalled')
for action in ['button','back']:
 token=js('window.docToken')
 open_clip()
 wait('!!document.querySelector("#calma-single-clip video")')
 assert js('location.pathname')=='/direct/t/local-fixture/'
 assert js('!!document.querySelector("#carousel")')
 if action=='button': adb('shell','input','tap','110','450')
 else: adb('shell','input','keyevent','4')
 wait('window.docToken !== '+str(token)+' && !!window.__calmaClipInstalled && !document.querySelector("#carousel") && !document.querySelector("#calma-single-clip")')
 assert js('location.pathname')=='/direct/t/local-fixture/'
 print('PASS Android: '+action+' vuelve a cargar el chat de origen y elimina el carrusel. Cargas:',loads,flush=True)
# El destino explícito Buscar debe ganar al cierre del clip, sin carrera hacia Chats.
open_clip();wait('!!document.querySelector("#calma-single-clip video")')
adb('shell','input','tap','410','2170')
wait('location.pathname === "/explore/search/" || (location.pathname.includes("/accounts/login") && location.search.includes("explore"))')
print('PASS Android: Buscar desde el visor conserva el destino de búsqueda.',flush=True)
rpc('Fetch.disable')
(out/'android-final.png').write_bytes(adb('exec-out','screencap','-p'))
print('Fixture local; no se inició sesión en Instagram ni se usaron videos privados.',flush=True)
ws.close()
