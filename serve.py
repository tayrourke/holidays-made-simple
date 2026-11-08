#!/usr/bin/env python3
"""Local preview for the gift guide.

Serves the site on this computer and lets the dashboard pull photos from a
product page and save gift edits into index.html.

    python3 serve.py

Then open http://127.0.0.1:8765/#admin
"""
import io
import json
import re
import socket
import ipaddress
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urljoin, urlparse
import urllib.error
import urllib.request

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
SECTIONS = {
    'My Top Picks', 'Gift Baskets', 'Experiences', 'White Elephant', 'Stocking Stuffers',
    'Women', 'Men', 'Littles', 'Home', 'Books', 'Big Ticket', 'Holiday Fun', 'Holiday Treats', 'Holiday Scents',
}
VIBES = {
    'self-care', 'cozy', 'wellness', 'kitchen', 'style', 'learning', 'pretend play', 'creative',
    'game night', 'outdoors', 'little ones', 'holiday magic', 'treats', 'funny', 'stocking',
}
WHO = {
    'her', 'him', 'teens', 'big kids', 'little kids', 'baby', 'family', 'home', 'host',
    'teachers + neighbors', 'white elephant',
}
MARK = 'const ALL_ITEMS = '


class GuardRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not public_url(newurl):
            raise urllib.error.HTTPError(req.full_url, code, 'blocked redirect', headers, fp)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def public_url(url):
    try:
        parts = urlparse(url)
    except Exception:
        return False
    if parts.scheme not in ('http', 'https') or not parts.hostname:
        return False
    host = parts.hostname.lower().rstrip('.')
    if host in ('localhost',) or host.endswith('.local') or host.endswith('.internal'):
        return False
    try:
        infos = socket.getaddrinfo(host, None)
    except Exception:
        return False
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            return False
    return True


def fetch(url, limit, accept):
    if not public_url(url):
        raise ValueError('that link has to be a public http(s) page')
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': accept})
    opener = urllib.request.build_opener(GuardRedirect)
    with opener.open(req, timeout=15) as res:
        final = res.geturl()
        if not public_url(final):
            raise ValueError("that link redirected somewhere I won't open")
        ctype = res.headers.get('Content-Type', '')
        data = res.read(limit + 1)
    if len(data) > limit:
        data = data[:limit]
    return data, final, ctype


def catalog_bounds(html):
    i = html.find(MARK)
    if i < 0:
        raise ValueError('could not find the gift list in index.html')
    start = i + len(MARK)
    if html[start:start + 1] != '[':
        raise ValueError('the gift list is not where I expected')
    depth = 0
    ins = False
    esc = False
    for j in range(start, len(html)):
        c = html[j]
        if ins:
            if esc:
                esc = False
            elif c == '\\':
                esc = True
            elif c == '"':
                ins = False
            continue
        if c == '"':
            ins = True
        elif c == '[':
            depth += 1
        elif c == ']':
            depth -= 1
            if depth == 0:
                return start, j + 1
    raise ValueError('the gift list did not close')


def object_span(html, gid, start, end):
    needle = f'"id":"{gid}"'
    i = html.find(needle, start, end)
    if i < 0:
        return None
    a = html.rfind('{', start, i)
    if a < 0:
        return None
    depth = 0
    ins = False
    esc = False
    for j in range(a, end):
        c = html[j]
        if ins:
            if esc:
                esc = False
            elif c == '\\':
                esc = True
            elif c == '"':
                ins = False
            continue
        if c == '"':
            ins = True
        elif c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return a, j + 1
    return None


def dump_item(item):
    return json.dumps(item, ensure_ascii=False, separators=(',', ':'))


def next_id(items):
    n = -1
    for item in items:
        m = re.fullmatch(r'p57_(\d+)', item.get('id', ''))
        if m:
            n = max(n, int(m.group(1)))
    return f'p57_{n + 1:02d}'


def parse_price(value):
    if value is None or value == '':
        return None
    try:
        n = round(float(value), 2)
    except (TypeError, ValueError):
        raise ValueError('that price needs to be a number')
    if n < 0 or n > 20000:
        raise ValueError('that price looks off')
    if abs(n - round(n)) < 0.001:
        return int(round(n))
    return n


def clean_text(value, limit, label):
    text = re.sub(r'\s+', ' ', str(value or '')).strip()
    if len(text) > limit:
        raise ValueError(f'the {label} is too long')
    return text


def shopify_info(url):
    parts = urlparse(url)
    if '/products/' not in parts.path:
        return None
    path = parts.path[:-1] if parts.path.endswith('/') else parts.path
    if not path.endswith('.js'):
        path += '.js'
    js_url = f'{parts.scheme}://{parts.netloc}{path}'
    try:
        data, final, _ctype = fetch(js_url, 800_000, 'application/json')
        prod = json.loads(data.decode('utf-8', 'replace'))
    except Exception:
        return None
    if not isinstance(prod, dict) or not prod.get('title'):
        return None
    images = []
    for im in prod.get('images') or []:
        if isinstance(im, str):
            images.append(urljoin(final, im))
        elif isinstance(im, dict) and im.get('src'):
            images.append(urljoin(final, im['src']))
    price = None
    variants = [v for v in (prod.get('variants') or []) if isinstance(v, dict)]
    avail = [v for v in variants if v.get('available')]
    chosen = (avail or variants)
    if chosen:
        raw = chosen[0].get('price')
        # Shopify's product.js prices are cents. A decimal string is already dollars.
        if isinstance(raw, str) and '.' in raw:
            price = parse_price(raw)
        elif raw is not None and raw != '':
            price = parse_price(float(raw) / 100)
    return {'title': prod.get('title') or '', 'price': price, 'images': images}


def attr(tag, name):
    m = re.search(rf'{name}\s*=\s*("([^"]*)"|\'([^\']*)\')', tag, re.I)
    if not m:
        return ''
    return m.group(2) if m.group(2) is not None else m.group(3)


def meta_content(html, key):
    for tag in re.findall(r'<meta\b[^>]*>', html, re.I):
        prop = (attr(tag, 'property') or attr(tag, 'name') or attr(tag, 'itemprop')).lower()
        if prop == key.lower():
            return attr(tag, 'content')
    return ''


def page_images(html, base):
    found = []
    for key in ('og:image', 'twitter:image', 'og:image:url'):
        val = meta_content(html, key)
        if val:
            found.append(urljoin(base, val))
    for tag in re.findall(r'<img\b[^>]*>', html, re.I):
        src = attr(tag, 'src')
        if not src:
            srcset = attr(tag, 'srcset')
            src = srcset.split(',')[0].strip().split(' ')[0] if srcset else ''
        if src:
            found.append(urljoin(base, src))
    return found


def useful_images(urls):
    out = []
    seen = set()
    for url in urls:
        if not url or url.startswith('data:'):
            continue
        if not public_url(url):
            continue
        low = url.lower()
        if re.search(r'\.(svg|ico)(\?|$)', low):
            continue
        if re.search(r'(favicon|sprite|logo|icon|pixel|badge|spinner|blank)', low):
            continue
        if url in seen:
            continue
        seen.add(url)
        out.append(url)
        if len(out) >= 12:
            break
    return out


def pull_page(url):
    url = url.strip()
    if not public_url(url):
        raise ValueError('paste a public link that starts with https://')
    data, final, ctype = fetch(url, 1_500_000, 'text/html,application/xhtml+xml,image/*;q=0.8,*/*;q=0.5')
    if ctype.lower().startswith('image/'):
        return {'title': '', 'price': None, 'images': [final]}
    shop = shopify_info(final)
    html = data.decode('utf-8', 'replace')
    title = ''
    price = None
    images = []
    if shop:
        title = shop['title']
        price = shop['price']
        images.extend(shop['images'])
    if not title:
        title = meta_content(html, 'og:title') or ''
    if price is None:
        raw = meta_content(html, 'product:price:amount') or meta_content(html, 'og:price:amount')
        if raw:
            try:
                price = parse_price(raw)
            except ValueError:
                price = None
    images.extend(page_images(html, final))
    title = re.sub(r'\s+', ' ', title).strip()
    if len(title) > 180:
        title = title[:180].rstrip()
    return {'title': title, 'price': price, 'images': useful_images(images)}


def near_white(pixel):
    r, g, b, a = pixel
    return a > 10 and r > 244 and g > 244 and b > 244 and max(r, g, b) - min(r, g, b) < 14


def peel_white(im):
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    stack = []
    for x in range(w):
        stack.append((x, 0))
        stack.append((x, h - 1))
    for y in range(h):
        stack.append((0, y))
        stack.append((w - 1, y))
    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        if not near_white(px[x, y]):
            continue
        px[x, y] = (255, 255, 255, 0)
        stack.append((x + 1, y))
        stack.append((x - 1, y))
        stack.append((x, y + 1))
        stack.append((x, y - 1))
    return im


def make_webp(data):
    try:
        im = Image.open(io.BytesIO(data))
        im = ImageOps.exif_transpose(im)
    except Exception as exc:
        raise ValueError("couldn't read that photo. try another one") from exc
    im.thumbnail((2000, 2000), Image.Resampling.LANCZOS)
    im = im.convert('RGBA')
    w, h = im.size
    if w < 2 or h < 2:
        raise ValueError('that photo is too small')
    corners = [im.getpixel((0, 0)), im.getpixel((w - 1, 0)), im.getpixel((0, h - 1)), im.getpixel((w - 1, h - 1))]
    if all(near_white(p) for p in corners):
        before = im.copy()
        peel_white(im)
        alpha = im.getchannel('A')
        kept = sum(1 for v in alpha.getdata() if v > 12)
        if kept < (w * h) * 0.04:
            im = before
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    im.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=90, method=6)
    return buf.getvalue()


def save_gift(body):
    if not isinstance(body, dict):
        raise ValueError('that gift could not be read')
    name = clean_text(body.get('name'), 180, 'name')
    if not name:
        raise ValueError('add a name')
    if '<' in name:
        raise ValueError('leave the < out of the name')
    url = str(body.get('url') or '').strip()
    if not public_url(url):
        raise ValueError('add a public link that starts with https://')
    section = str(body.get('section') or '').strip()
    if section not in SECTIONS:
        raise ValueError('pick a section')
    group = clean_text(body.get('group'), 80, 'group')
    if not group:
        raise ValueError('add a group, like Mom or Games 5+')
    if '<' in group:
        raise ValueError('leave the < out of the group')
    who = body.get('who') or []
    if not isinstance(who, list):
        raise ValueError('pick who it is for')
    who = [w for w in who if w in WHO]
    if not who:
        raise ValueError('pick who it is for')
    vibe = str(body.get('vibe') or '').strip()
    if vibe not in VIBES:
        raise ValueError('pick a vibe')
    why = clean_text(body.get('why'), 500, 'blurb')
    note = clean_text(body.get('note'), 280, 'note')
    if '<' in why or '<' in note:
        raise ValueError('leave the < out of the blurb and the note')
    favorite = bool(body.get('favorite')) or bool(note)
    price = parse_price(body.get('price'))
    image = str(body.get('image') or '').strip()
    gid = str(body.get('id') or '').strip()
    if gid and not re.fullmatch(r'p\d{2}_\d{2,3}', gid):
        raise ValueError('that gift id looks off')

    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    start, end = catalog_bounds(html)
    items = json.loads(html[start:end])
    existing = next((item for item in items if item.get('id') == gid), None) if gid else None
    if not gid:
        gid = next_id(items)
    elif existing is None and any(item.get('id') == gid for item in items):
        raise ValueError('that gift id is already used')
    if existing is None and not image:
        raise ValueError('pick a photo for the new gift')

    webp = None
    if image:
        if not public_url(image):
            raise ValueError('that photo link has to be a public https address')
        data, _final, ctype = fetch(image, 8_000_000, 'image/avif,image/webp,image/png,image/jpeg,*/*')
        head = data.lstrip()[:1]
        if (ctype or '').lower().startswith('text/') or head == b'<':
            raise ValueError("that address didn't return a photo")
        webp = make_webp(data)

    item = existing if existing is not None else {'id': gid, 'src': 'o'}
    item['s'] = section
    item['g'] = group
    item['n'] = name
    item['u'] = url
    item['w'] = who
    item['v'] = vibe
    if price is None:
        item.pop('price', None)
    else:
        item['price'] = price
    if why:
        item['why'] = why
    else:
        item.pop('why', None)
    if favorite:
        item['tn'] = note or why or 'one of my favorites'
    else:
        item.pop('tn', None)
    item.pop('remote', None)
    if webp is not None:
        item.pop('pic', None)
    if existing is None:
        item['id'] = gid
        item['src'] = 'o'
        after = None
        for other in items:
            if other.get('s') == section:
                after = other.get('id')
        blob = dump_item(item)
        if after:
            span = object_span(html, after, start, end)
            if not span:
                raise ValueError('could not place the new gift')
            html = html[:span[1]] + ',' + blob + html[span[1]:]
        else:
            html = html[:start + 1] + blob + (',' if items else '') + html[start + 1:]
    else:
        span = object_span(html, gid, start, end)
        if not span:
            raise ValueError('could not find that gift in the guide')
        blob = dump_item(item)
        if html[span[0]:span[1]] != blob:
            html = html[:span[0]] + blob + html[span[1]:]
        elif webp is None:
            return {'ok': True, 'id': gid, 'image': False, 'same': True}

    tmp = ROOT / 'index.html.tmp'
    tmp.write_text(html, encoding='utf-8')
    tmp.replace(ROOT / 'index.html')
    if webp is not None:
        dest = ROOT / 'img' / f'{gid}.webp'
        img_tmp = dest.with_suffix('.webp.tmp')
        img_tmp.write_bytes(webp)
        img_tmp.replace(dest)
    return {'ok': True, 'id': gid, 'image': webp is not None}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def _json(self, code, payload):
        raw = json.dumps(payload).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if urlparse(self.path).path == '/api/health':
            self._json(200, {'ok': True, 'write': True})
            return
        super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            n = int(self.headers.get('Content-Length') or 0)
        except ValueError:
            n = 0
        if n > 200_000:
            self._json(413, {'error': 'that was too big'})
            return
        try:
            body = json.loads(self.rfile.read(n).decode('utf-8') or '{}')
        except Exception:
            self._json(400, {'error': 'that could not be read'})
            return
        try:
            if path == '/api/pull':
                self._json(200, pull_page(str(body.get('url') or '')))
            elif path == '/api/gift':
                self._json(200, save_gift(body))
            else:
                self._json(404, {'error': 'not found'})
        except ValueError as exc:
            self._json(400, {'error': str(exc)})
        except Exception as exc:
            print('dashboard request failed:', exc)
            self._json(400, {'error': "that didn't work. try again."})


def main():
    server = ThreadingHTTPServer(('127.0.0.1', 8765), Handler)
    print('gift guide dashboard at http://127.0.0.1:8765/#admin')
    server.serve_forever()


if __name__ == '__main__':
    main()
