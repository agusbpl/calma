"""Only explicitly labelled account recommendation cards may be hidden."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root = Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page()
    page.route('https://www.instagram.com/**',lambda r:r.fulfill(body='''<section><main><h1 id="profile">Profile</h1>
      <span>Suggested for you</span><div id="unknown"><a href="/unknown/">Unknown</a><button>Follow</button></div>
      <h2 id="heading">Suggested for you</h2><ul aria-labelledby="heading">
      <li id="card"><a href="/candidate/">Candidate</a><button>Follow</button></li>
      <li id="unsafe"><nav>Content navigation</nav><a href="/other/">Other</a><button>Follow</button></li>
      <li id="activity"><a href="/friend/">Friend</a><button>Following</button></li></ul>
      <ul><li id="unlabelled"><a href="/friend/">Friend</a><button>Follow</button></li></ul>
      <div role="list" aria-label="Sugerencias para ti"><div role="listitem" id="spanish"><a href="/cuenta/">Cuenta</a><button>Seguir</button></div></div>
      <div id="notification"><a href="/existing/">Activity</a><button>Follow</button></div>
      <div><h4>Suggested for you</h4></div><div><div><div>
      <div id="observed"><div><a href="/observed/"><img alt="avatar"></a></div><div><a href="/observed/">Observed</a></div><div><button>Follow</button></div></div>
      </div></div><div><a href="/explore/people/">See All Suggestions</a></div></div>
      </main></section>''',content_type='text/html'))
    page.goto('https://www.instagram.com/profile/')
    page.add_script_tag(path=str(root/'app/src/main/assets/recommendations.js'))
    page.evaluate('window.__calmaHideRecommendationCards()')
    for card in ['card','spanish','observed']:
        assert page.locator('#'+card).is_hidden()
    for kept in ['profile','unknown','unsafe','activity','unlabelled','notification']:
        assert page.locator('#'+kept).is_visible(), kept
    assert page.locator('section').is_visible()
    assert page.locator('main').is_visible()
    print('PASS: labelled recommendation cards hidden; unknown wrappers, navigation, profile, and activity retained')
    browser.close()
