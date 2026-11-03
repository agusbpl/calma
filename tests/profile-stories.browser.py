"""Single profile story fixtures; no authenticated Instagram backend."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root = Path(__file__).resolve().parents[1]
script = root / 'app/src/main/assets/profile-stories.js'
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 400, 'height': 800})
    html = '''<img id="story" width="300" height="600" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='600'%3E%3Crect width='300' height='600' fill='red'/%3E%3C/svg%3E">'''
    page.route('https://www.instagram.com/**', lambda r: r.fulfill(body=html, content_type='text/html'))
    page.goto('https://www.instagram.com/alicia/')
    page.add_script_tag(path=str(root / 'app/src/main/assets/viewer-controls.js'))
    page.add_script_tag(path=str(script))
    assert not page.evaluate("window.__calmaProfileStoryClick(null,new URL('https://www.instagram.com/stories/beto/12/'))")
    assert page.evaluate("window.__calmaProfileStoryClick(null,new URL('https://www.instagram.com/stories/alicia/'))")
    page.evaluate("history.pushState({},'', '/stories/alicia/12/');window.__calmaProfileStoryRefresh()")
    page.wait_for_selector('#calma-profile-story')
    assert page.locator('#calma-profile-story .calma-media-controls button svg').count() == 1
    assert page.locator('#calma-profile-story').inner_text() == ''
    assert page.evaluate("window.__calmaProfileStoryAllowed('/stories/alicia/12/')")
    assert not page.evaluate("window.__calmaProfileStoryAllowed('/stories/alicia/13/')")
    original = page.locator('#calma-profile-story img').get_attribute('src')
    page.evaluate("document.querySelector('#story').src='different.jpg';history.pushState({},'', '/stories/beto/99/')")
    assert page.url.endswith('/stories/alicia/12/')
    assert page.locator('#calma-profile-story img').get_attribute('src') == original
    page.keyboard.press('ArrowRight')
    assert page.url.endswith('/stories/alicia/12/')
    page.get_by_role('button', name='Volver al perfil').click()
    page.wait_for_url('https://www.instagram.com/alicia/')
    # Explicit highlight remains restricted to its chosen collection.
    page.add_script_tag(path=str(root / 'app/src/main/assets/viewer-controls.js'))
    page.add_script_tag(path=str(script))
    assert page.evaluate("window.__calmaProfileStoryClick(null,new URL('https://www.instagram.com/stories/highlights/123/'))")
    assert page.evaluate("window.__calmaProfileStoryAllowed('/stories/highlights/123/')")
    assert not page.evaluate("window.__calmaProfileStoryAllowed('/stories/highlights/124/')")
    page.goto('https://www.instagram.com/alicia/')
    page.set_content('<header><div role="button" id="avatar"><img alt="Profile picture" src="x"></div></header>')
    page.add_script_tag(path=str(root / 'app/src/main/assets/viewer-controls.js'))
    page.add_script_tag(path=str(script))
    page.locator('#avatar').click()
    assert page.evaluate("window.__calmaProfileStoryAllowed('/stories/alicia/77/')")
    page.evaluate("history.pushState({},'', '/stories/alicia/77/')")
    page.set_content('<video id="source" src="https://www.instagram.com/first.mp4" style="width:300px;height:600px"></video>')
    page.evaluate('window.__calmaProfileStoryRefresh()')
    page.wait_for_selector('#calma-profile-story video')
    assert page.locator('#calma-profile-story video').get_attribute('src').endswith('/first.mp4')
    assert page.locator('#calma-profile-story .calma-media-controls button svg').count() == 4
    assert not page.locator('#calma-profile-story video').evaluate('(el)=>el.controls')
    page.evaluate("document.querySelector('#source').src='second.mp4';document.querySelector('#source').remove()")
    assert page.locator('#calma-profile-story video').get_attribute('src').endswith('/first.mp4')
    # Integration with the filter's real capture listener and SPA navigation.
    page.goto('https://www.instagram.com/alicia/')
    page.set_content('<a id="chosen" href="/stories/highlights/456/">Destacada</a>')
    page.add_script_tag(path=str(root / 'app/src/main/assets/viewer-controls.js'))
    page.add_script_tag(path=str(script))
    page.add_script_tag(path=str(root / 'app/src/main/assets/filter.js'))
    assert page.locator('#chosen').is_visible()
    page.evaluate("() => { document.querySelector('#chosen').onclick=e=>{e.preventDefault();history.pushState({},'',e.currentTarget.href)}; }")
    page.locator('#chosen').click()
    assert page.url.endswith('/stories/highlights/456/')
    page.evaluate("history.replaceState({},'', '/stories/highlights/456/99/')")
    assert page.url.endswith('/stories/highlights/456/99/')
    page.evaluate("history.replaceState({},'', '/stories/highlights/456/100/')")
    assert page.url.endswith('/stories/highlights/456/99/')
    print('PASS: same-profile authorization, first-item pin, static photo, blocked route/keyboard chaining, return profile, selected highlight only.')
    browser.close()
