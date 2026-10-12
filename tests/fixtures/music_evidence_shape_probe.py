# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""Zero-value StudioNet access diagnostic, not a market or settlement oracle."""
import json
import re
from genlayer import *

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36', 'Accept': 'text/html,application/json;q=0.9,*/*;q=0.8'}

"""Deterministic Billboard 200 extraction. Never pass page HTML to a model.

This module is kept separately so the saved source fixture can exercise the
same parser that will be bundled into the deployed intelligent contract.
"""
import hashlib
import json
import re
from html.parser import HTMLParser


class ChartRows(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.cells = []
        self.collectors = []
        self.rows = []

    def handle_starttag(self, tag, attrs):
        classes = dict(attrs).get('class', '').split()
        if not self.depth:
            if tag == 'div' and 'o-chart-results-list-row-container' in classes:
                self.depth = 1
                self.cells = []
                self.collectors = []
            return
        if tag == 'div':
            self.depth += 1
        if tag in ('span', 'h3'):
            self.collectors.append({'tag': tag, 'classes': classes, 'text': []})

    def handle_data(self, data):
        for collector in self.collectors:
            collector['text'].append(data)

    def handle_endtag(self, tag):
        if not self.depth:
            return
        if tag in ('span', 'h3') and self.collectors:
            # Close the nearest matching text element, retaining nested text.
            for index in range(len(self.collectors) - 1, -1, -1):
                if self.collectors[index]['tag'] == tag:
                    collector = self.collectors.pop(index)
                    value = ' '.join(''.join(collector['text']).split())
                    self.cells.append((tag, collector['classes'], value))
                    break
        if tag == 'div':
            self.depth -= 1
            if not self.depth:
                self.rows.append(self.cells)
                self.collectors = []


def integer(value, low, high):
    if not re.fullmatch(r'[0-9]+', value):
        raise ValueError('non-integer chart metric')
    result = int(value)
    if not low <= result <= high:
        raise ValueError('chart metric outside bounds')
    return result


def extract_rows(page):
    parser = ChartRows()
    parser.feed(page)
    parser.close()
    if parser.depth or len(parser.rows) != 200:
        raise ValueError('complete 200-row chart required')
    rows = []
    for cells in parser.rows:
        values = [cell[2] for cell in cells if cell[2]]
        position = integer(values[0], 1, 200)
        titles = [text for tag, classes, text in cells
                  if tag == 'h3' and ('a-truncate-ellipsis-2line' in classes
                                      or 'a-no-trucate' in classes)]
        artists = [text for tag, classes, text in cells
                   if tag == 'span' and 'a-no-trucate' in classes]
        if len(titles) != 1 or len(artists) != 1:
            raise ValueError('ambiguous chart row markup')
        title, artist = titles[0], artists[0]
        if not 1 <= len(title) <= 200 or not 1 <= len(artist) <= 300:
            raise ValueError('unbounded chart identity')
        def metric(label):
            matches = [values[index + 1] for index, text in enumerate(values[:-1])
                       if text == label]
            if not matches or len(set(matches)) != 1:
                raise ValueError('missing or inconsistent chart metric')
            return matches[0]
        if 'LW' in values and 'WEEKS ON CHART' in values:
            last = metric('LW')
            weeks = integer(metric('WEEKS ON CHART'), 1, 10000)
        else:
            # Archived 2022 layout: LW / peak / weeks, duplicated for mobile.
            # Select only the dedicated statistic cells, never hidden history.
            stats = [text for tag, classes, text in cells if tag == 'span'
                     and 'c-label' in classes
                     and 'lrv-u-padding-tb-050@mobile-max' in classes]
            if len(stats) != 6 or stats[:3] != stats[3:]:
                raise ValueError('missing or inconsistent archived chart metrics at #'
                                 + str(position))
            last = stats[0]
            integer(stats[1], 1, 200)
            weeks = integer(stats[2], 1, 10000)
        last_week = None if last in ('-', '—') else integer(last, 1, 200)
        rows.append({'position': position, 'title': title, 'artist': artist,
                     'last_week': last_week, 'weeks': weeks})
    if [row['position'] for row in rows] != list(range(1, 201)):
        raise ValueError('ordered unique positions 1 through 200 required')
    return rows


def rows_digest(rows):
    encoded = json.dumps(rows, ensure_ascii=False, sort_keys=True,
                         separators=(',', ':')).encode('utf-8')
    return hashlib.sha256(encoded).hexdigest()


def row_quote(row):
    last = '—' if row['last_week'] is None else str(row['last_week'])
    return ('#' + str(row['position']) + ' | ' + row['title'] + ' | '
            + row['artist'] + ' | LW: ' + last + ' | Weeks: ' + str(row['weeks']))


class MusicEvidenceShapeProbe(gl.Contract):
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
            row_count = body.count('o-chart-results-list-row-container')
            picker = re.search(r'<div\b[^>]*\bid=[\"\']chart-date-picker[\"\'][^>]*>', body)
            picker_tag = picker.group(0)[:500] if picker else ''
            digest = ''
            error = ''
            first_row = {}
            last_row = {}
            if chart:
                try:
                    extracted = extract_rows(body)
                    digest = rows_digest(extracted)
                    first_row, last_row = extracted[0], extracted[-1]
                except ValueError as failure:
                    error = str(failure)
            return {'chart_date_picker': picker_tag, 'row_containers': row_count, 'rows_digest': digest,
                    'extraction_error': error, 'first_row': first_row, 'last_row': last_row,
                    'status': response.status, 'chart_markup': chart,
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
                       ('status', 'chart_markup', 'capture_count', 'first_capture', 'rows_digest', 'extraction_error', 'row_containers'))
        self.results[name] = json.dumps(gl.vm.run_nondet_unsafe(fetch, verify), sort_keys=True)

    @gl.public.view
    def get_result(self, name: str) -> str:
        return self.results.get(name, '')
