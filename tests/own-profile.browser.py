"""Own profile must come from an account control, never the visited profile."""
from pathlib import Path
from playwright.sync_api import sync_playwright
script=Path(__file__).resolve().parents[1]/'app/src/main/assets/filter.js'
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page()
    fixture={'body':''}
    page.route('https://www.instagram.com/**',lambda r:r.fulfill(body=fixture['body'],content_type='text/html'))
    def load(path,html):
        fixture['body']=html
        page.goto('https://www.instagram.com'+path)
        page.add_script_tag(path=str(script))
        return page.evaluate('window.__calmaOwnProfile()')
    assert load('/visited/', '<header><h1>visited</h1></header><nav><a href="/">Home</a><a href="/direct/inbox/">Messages</a><a href="/my.account/"><img alt="My profile"></a></nav>')=='my.account'
    switcher='<div role="button"><h2>my.account</h2><svg aria-label="Down chevron icon"></svg></div>'
    assert load('/direct/inbox/',switcher)=='my.account'
    assert page.evaluate('JSON.parse(window.__calmaContext()).own')=='my.account'
    assert load('/direct/t/123/',switcher)==''
    assert load('/visited/', '<h1>visited</h1><a href="/stranger/"><img alt="Profile picture"></a>')==''
    assert load('/visited/', '<nav><a href="/">Home</a><a href="/direct/inbox/">Messages</a><a href="https://example.com/foreign/"><img></a></nav>')==''
    print('PASS: own account from global navigation/inbox switcher; visited profiles and contacts ignored')
    browser.close()
