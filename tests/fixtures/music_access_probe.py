# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""Zero-value StudioNet access diagnostic, not a market or settlement oracle."""
import json
import re
from genlayer import *

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36', 'Accept': 'text/html,application/json;q=0.9,*/*;q=0.8'}

class MusicAccessProbe(gl.Contract):
    owner: Address
    results: TreeMap[str, str]

    def __init__(self):
        self.owner = gl.message.sender_address

    @gl.public.write
    def probe(self, name: str, url: str) -> None:
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError('[EXPECTED] diagnostic owner only')
        if not re.fullmatch(r'[a-z0-9-]{1,64}', name) or len(url) > 1000:
            raise gl.vm.UserError('[EXPECTED] bounded diagnostic')
        direct = re.fullmatch(r'https://www\.billboard\.com/charts/billboard-200/[0-9]{4}-[0-9]{2}-[0-9]{2}/', url)
        index = url.startswith('https://web.archive.org/cdx/search/cdx?url=') and 'billboard' in url
        capture = re.fullmatch(r'https://web\.archive\.org/web/[0-9]{14}id_/https?://(?:www\.)?billboard\.com/charts/billboard-200/[0-9]{4}-[0-9]{2}-[0-9]{2}/?', url)
        if not (direct or index or capture):
            raise gl.vm.UserError('[EXPECTED] Billboard 200 and Wayback only')
        def fetch():
            response = gl.nondet.web.get(url, headers=HEADERS)
            body = response.body.decode('utf-8', errors='replace')
            chart = 'o-chart-results-list-row-container' in body
            captures = 0
            first = ''
            if index and response.status == 200:
                try:
                    rows = json.loads(body)
                    captures = max(0, len(rows) - 1) if isinstance(rows, list) else 0
                    first = str(rows[1][0]) if captures else ''
                except (ValueError, TypeError, IndexError):
                    pass
            return {'status': response.status, 'chart_markup': chart,
                    'capture_count': captures, 'first_capture': first,
                    'body_bytes': len(response.body), 'sample': body[:160]}
        def verify(leader):
            if not isinstance(leader, gl.vm.Return):
                return False
            independent = fetch()
            proposed = leader.calldata
            # Availability only: changing ads/HTML length do not prove a chart
            # mismatch. Product resolution must compare complete extracted rows.
            return all(independent[k] == proposed[k] for k in
                       ('status', 'chart_markup', 'capture_count', 'first_capture'))
        self.results[name] = json.dumps(gl.vm.run_nondet_unsafe(fetch, verify), sort_keys=True)

    @gl.public.view
    def get_result(self, name: str) -> str:
        return self.results.get(name, '')
