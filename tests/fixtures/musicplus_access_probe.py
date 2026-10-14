# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""Owner-only zero-GEN archive access research; never a market or ruling."""
import json
import re
import hashlib
from html.parser import HTMLParser
from urllib.parse import urlencode, urlparse
from genlayer import *

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36', 'Accept': 'text/html,application/json;q=0.9,*/*;q=0.8'}

class Paragraphs(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.current = None
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.skip += 1
        if tag in ('p', 'h1', 'h2') and not self.skip:
            self.current = []

    def handle_data(self, data):
        if self.current is not None and not self.skip:
            self.current.append(data)

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.skip = max(0, self.skip - 1)
        if tag in ('p', 'h1', 'h2') and self.current is not None:
            text = re.sub(r'\s+', ' ', ''.join(self.current)).strip()
            if text:
                self.parts.append(text)
            self.current = None

class MusicPlusAccessProbe(gl.Contract):
    owner: Address
    results: TreeMap[str, str]

    def __init__(self):
        if gl.message.value:
            raise gl.vm.UserError('[EXPECTED] zero-GEN diagnostic')
        self.owner = gl.message.sender_address

    @gl.public.write
    def index(self, name: str, original: str) -> None:
        if gl.message.value or gl.message.sender_address != self.owner:
            raise gl.vm.UserError('[EXPECTED] zero-GEN owner research only')
        if not re.fullmatch(r'[a-z0-9-]{1,64}', name) or len(original) > 700:
            raise gl.vm.UserError('[EXPECTED] bounded research')
        parsed = urlparse(original)
        if parsed.scheme != 'https' or parsed.hostname not in ('www.billboard.com', 'ca.billboard.com', 'media.rhino.com', 'www.hollywoodrecords.com', 'shorefire.com', 'www.capitolrecords.com'):
            raise gl.vm.UserError('[EXPECTED] official source domains only')
        start = '20260101' if parsed.hostname in ('media.rhino.com', 'www.hollywoodrecords.com', 'shorefire.com') else '20200101'
        url = 'https://web.archive.org/cdx/search/cdx?' + urlencode({'url': original, 'output': 'json', 'filter': 'statuscode:200', 'fl': 'timestamp,original,statuscode,digest', 'collapse': 'digest', 'limit': '16', 'from': start, 'to': '20261014'})
        def fetch():
            response = gl.nondet.web.get(url, headers=HEADERS)
            captures = []
            if response.status == 200:
                try:
                    rows = json.loads(response.body.decode('utf-8'))
                    if isinstance(rows, list) and rows and rows[0] == ['timestamp', 'original', 'statuscode', 'digest']:
                        captures = [row for row in rows[1:] if isinstance(row, list) and len(row) == 4 and row[1] == original and row[2] == '200'][:16]
                except (ValueError, TypeError):
                    pass
            return {'status': response.status, 'original': original, 'captures': captures}
        self.results[name] = json.dumps(gl.eq_principle.strict_eq(fetch), sort_keys=True)

    @gl.public.write
    def snapshot(self, name: str, url: str) -> None:
        if gl.message.value or gl.message.sender_address != self.owner:
            raise gl.vm.UserError('[EXPECTED] zero-GEN owner research only')
        if not re.fullmatch(r'[a-z0-9-]{1,64}', name) or not re.fullmatch(r'https://web\.archive\.org/web/[0-9]{14}id_/https://[^\s]{1,700}', url):
            raise gl.vm.UserError('[EXPECTED] frozen id_ snapshot only')
        def fetch():
            response = gl.nondet.web.get(url, headers=HEADERS)
            parser = Paragraphs()
            if response.status == 200:
                parser.feed(response.body.decode('utf-8', errors='replace'))
            text = '\n'.join(parser.parts)[:30000]
            return {'status': response.status, 'snapshot': url, 'text': text, 'digest': hashlib.sha256(text.encode()).hexdigest()}
        self.results[name] = json.dumps(gl.eq_principle.strict_eq(fetch), sort_keys=True)

    @gl.public.view
    def get_result(self, name: str) -> str:
        return self.results.get(name, '')

