// Regresiones mínimas del código que se inyecta en la página (sin Instagram real).
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('app/src/main/assets/filter.js','utf8');

function setup(path, {author='', create=false, approved='', pending=false} = {}) {
  let clicks = 0;
  let redirected = '';
  const link = {href: `https://www.instagram.com/${author}/`,closest:()=>null};
  const header = {querySelectorAll: () => author ? [link] : []};
  const createAnchor = create ? {
    getClientRects:()=>[{}], closest:()=>null, click:()=>{clicks++}
  } : null;
  const element = {style:{setProperty(){}},isConnected:true, children:[],
                   setAttribute(){}, parentElement:null};
  const document = {
    head:{appendChild(el){el.isConnected=true}}, documentElement:{},
    createElement:()=>({...element}),
    querySelectorAll(query){
      if (query.includes('article header') && path.startsWith('/p/')) return [header];
      return [];
    },
    querySelector(query){
      if (query.includes('a[href^="/create/"]')) return createAnchor;
      return null;
    },
    addEventListener(){},
  };
  const context = {
    window:{__calmaApprovedSingleClipPath: approved,
            __calmaClipPendingUntil: pending ? Date.now() + 3000 : 0}, document, location: {
      pathname:path,href:`https://www.instagram.com${path}`,
      replace(url){redirected=url},assign(url){redirected=url}
    },
    URL,
    MutationObserver:class {observe(){}},
    setInterval(){},setTimeout(){},
  };
  vm.createContext(context);
  vm.runInContext(source,context);
  return {
    context:()=>JSON.parse(context.window.__calmaContext()),
    open:()=>context.window.__calmaOpenComposer(),
    clicks:()=>clicks,
    redirect:()=>redirected,
  };
}

test('el perfil visitado es distinto de la cuenta logueada',()=>{
  const app=setup('/otro.usuario/');
  assert.equal(app.context().type,'profile');
  assert.equal(app.context().profile,'otro.usuario');
});

test('no confunde rutas de Instagram con nombres de usuarios',()=>{
  for (const path of ['/direct/inbox/','/create/','/p/','/explore/']) {
    assert.notEqual(setup(path).context().type,'profile');
  }
});

test('la autoría se obtiene del encabezado y no de la cuenta propia',()=>{
  const app=setup('/p/ABC1/',{author:'autor.real'});
  assert.equal(app.context().type,'post');
  assert.equal(app.context().author,'autor.real');
});

test('el botón publicar únicamente abre el compositor; no envía posts',()=>{
  const app=setup('/direct/inbox/',{create:true});
  assert.equal(app.open(),true);
  assert.equal(app.clicks(),1);
});


test('conserva el bloqueo de la sección Reels',()=>{
  assert.equal(setup('/reels/').redirect(),'https://www.instagram.com/direct/inbox/');
});

test('no redirige el editor ni el perfil visitado al feed',()=>{
  assert.equal(setup('/create/select/').redirect(),'');
  assert.equal(setup('/barthe.ops/').redirect(),'');
});


test('un Reel sin gesto previo sigue bloqueado',()=>{
  assert.equal(setup('/reel/ABCD1/').redirect(), 'https://www.instagram.com/direct/inbox/');
});
test('un único Reel autorizado respeta barra final, pero otro no',()=>{
  assert.equal(setup('/reel/ABCD1/',{approved:'/reel/ABCD1'}).redirect(), '');
  assert.equal(setup('/reel/ABCD2/',{approved:'/reel/ABCD1'}).redirect(),
    'https://www.instagram.com/direct/inbox/');
});
test('la historia compartida está autorizada sólo si coincide el enlace',()=>{
  assert.equal(setup('/stories/usuario.real/123456/',{approved:'/stories/usuario.real/123456'}).redirect(), '');
  assert.equal(setup('/stories/usuario.real/123457/',{approved:'/stories/usuario.real/123456'}).redirect(),
    'https://www.instagram.com/direct/inbox/');
});
test('Explorar permanece bloqueado incluso con clip temporal',()=>{
  assert.equal(setup('/explore/',{pending:true}).redirect(), 'https://www.instagram.com/direct/inbox/');
});


test('permite únicamente la ruta exacta del buscador de Instagram',()=>{
  for (const path of ['/explore/search', '/explore/search/']) {
    const app = setup(path);
    assert.equal(app.redirect(), '');
    assert.equal(app.context().type, 'search');
  }
  for (const path of ['/explore/', '/explore/search/reels/', '/explore/searching/', '/explore/tags/calma/']) {
    assert.equal(setup(path).redirect(), 'https://www.instagram.com/direct/inbox/');
  }
});
