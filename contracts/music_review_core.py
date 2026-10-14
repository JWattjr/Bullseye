"""Pure bounded review options shared by Markets v2 and Challenges."""
import hashlib
import json
import re
from datetime import datetime, timezone, timedelta
from html.parser import HTMLParser
from urllib.parse import urlparse, parse_qs

REVIEW_BINS = [{'lower': 1, 'upper': 2}, {'lower': 2, 'upper': 6}, {'lower': 6, 'upper': 11},
               {'lower': 11, 'upper': 51}, {'lower': 51, 'upper': 201}, {'lower': None, 'upper': None}]
GROUNDS = ('WRONG_ALBUM', 'EDITION_RULE', 'WRONG_CHART_WEEK', 'AMBIGUOUS_BINS')
VERDICTS = ('UPHELD', 'AMENDED', 'VOIDED', 'INSUFFICIENT_EVIDENCE')

def review_canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))

def review_hash(value):
    return hashlib.sha256(review_canonical(value).encode()).hexdigest()

def review_options(spec, ground):
    options = []
    if ground == 'EDITION_RULE':
        for i, album in enumerate(spec['albums']):
            for label, value in [('STANDARD_ONLY', 'standard_only'), ('MERGE_ALL_EDITIONS', 'combined_standard_deluxe')]:
                if value != album['identity_rule']:
                    options.append({'id': 'edition:' + str(i) + ':' + label, 'album': i, 'field': 'identity_rule', 'value': value, 'label': label})
    elif ground == 'WRONG_CHART_WEEK':
        for i, album in enumerate(spec['albums']):
            original = datetime.strptime(album['chart_week'], '%Y-%m-%d').replace(tzinfo=timezone.utc)
            for days in (-14, -7, 7, 14):
                week = original + timedelta(days=days)
                timestamp = int(week.timestamp())
                if not 2010 <= week.year <= 2100 or timestamp >= spec['resolution_deadline']:
                    continue
                if not spec['historical'] and spec['entry_deadline'] > timestamp - 15 * 86400:
                    continue
                value = week.strftime('%Y-%m-%d')
                options.append({'id': 'week:' + str(i) + ':' + value, 'album': i, 'field': 'chart_week', 'value': value, 'label': value})
    elif ground == 'AMBIGUOUS_BINS' and spec['market_type'] == 'rank' and spec['bins'] != REVIEW_BINS:
        options.append({'id': 'bins:complete-200', 'field': 'bins', 'value': REVIEW_BINS, 'label': 'Complete non-overlapping Billboard 200 bins'})
    return options

def review_apply(spec, ground, option_id):
    option = next((item for item in review_options(spec, ground) if item['id'] == option_id), None)
    if option is None:
        return None
    amended = json.loads(review_canonical(spec))
    if option['field'] == 'bins':
        amended['bins'] = option['value']
    else:
        amended['albums'][option['album']][option['field']] = option['value']
    amended['observation_time'] = max(int(datetime.strptime(album['chart_week'], '%Y-%m-%d').replace(tzinfo=timezone.utc).timestamp()) for album in amended['albums'])
    return amended if review_hash(amended) != review_hash(spec) else None

def review_archive(url, domains):
    match = re.fullmatch(r'https://web\.archive\.org/web/([0-9]{14})id_/(https?://[^\s]{1,700})', url)
    if not match:
        return None
    try:
        original = urlparse(match[2])
        if original.username or original.password or original.port or original.hostname not in domains:
            return None
        timestamp = int(datetime.strptime(match[1], '%Y%m%d%H%M%S').replace(tzinfo=timezone.utc).timestamp())
    except ValueError:
        return None
    return {'capture': match[1], 'original': match[2], 'timestamp': timestamp}

def review_release_url(url, domains):
    archived = review_archive(url, domains)
    if archived:
        return archived
    try:
        original = urlparse(url)
        if original.port:
            return None
    except ValueError:
        return None
    query = parse_qs(original.query)
    if (original.scheme == 'https' and original.hostname == 'en.wikipedia.org' and original.path == '/w/index.php'
            and not original.username and not original.password and not original.port
            and set(query) <= {'title', 'oldid', 'action'} and query.get('action', ['render']) == ['render'] and len(query.get('oldid', [])) == 1
            and re.fullmatch(r'[0-9]{6,12}', query['oldid'][0])):
        return {'capture': 'Wikipedia oldid ' + query['oldid'][0], 'original': url, 'timestamp': None}
    return None

class ReviewParagraphs(HTMLParser):
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
            value = re.sub(r'\s+', ' ', ''.join(self.current)).strip()
            if value and len(self.parts) < 500:
                self.parts.append(value)
            self.current = None

def review_text(body):
    parser = ReviewParagraphs()
    parser.feed(body)
    return '\n'.join(parser.parts)[:30000]
