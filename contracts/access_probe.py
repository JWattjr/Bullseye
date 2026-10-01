# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
import json
from genlayer import *

class AccessProbe(gl.Contract):
    results: TreeMap[str, str]

    def __init__(self):
        pass

    @gl.public.write
    def probe(self, url: str) -> None:
        def fetch():
            response = gl.nondet.web.get(url)
            body = response.body.decode('utf-8', errors='replace')
            return json.dumps({'status': response.status, 'has_number': '162,022,044' in body, 'length': len(body), 'sample': body[:180]})
        self.results[url] = gl.eq_principle.strict_eq(fetch)

    @gl.public.view
    def result(self, url: str) -> str:
        return self.results.get(url, '')
