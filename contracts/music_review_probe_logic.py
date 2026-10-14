"""Zero-GEN real-source diagnostics, never a bonded market or payout proof."""
class MusicPlusReviewProbe(gl.Contract):
    owner: Address
    rules_url: str
    source: Address
    results: TreeMap[str, str]

    def __init__(self, rules_url: str, source: str):
        require(not gl.message.value and int(gl.message.chain_id) == 61999, 'zero-GEN StudioNet diagnostics')
        self.owner = gl.message.sender_address
        self.rules_url = rules_url
        self.source = Address(source)

    @gl.public.write
    def access(self, name: str, url: str) -> None:
        require(not gl.message.value and gl.message.sender_address == self.owner, 'zero-GEN owner research only')
        require(re.fullmatch(r'[a-z0-9-]{1,64}', name) and len(url) <= 900 and review_release_url(url, ['www.billboard.com', 'ca.billboard.com', 'en.wikipedia.org']), 'frozen release reference required')
        def fetch():
            response = gl.nondet.web.get(url, headers=HEADERS)
            text = review_text(response.body.decode('utf-8', errors='replace')) if response.status == 200 else ''
            return {'status': response.status, 'url': url, 'characters': len(text), 'digest': hashlib.sha256(text.encode()).hexdigest(), 'excerpt': text[:1000]}
        self.results[name] = review_canonical(gl.eq_principle.strict_eq(fetch))

    @gl.public.write
    def preview(self, name: str, market_id: str, ground: str, argument: str, release_url: str) -> None:
        require(not gl.message.value and gl.message.sender_address == self.owner, 'zero-GEN owner research only')
        require(re.fullmatch(r'[a-z0-9-]{1,64}', name) and ground in GROUNDS and 20 <= len(argument) <= 1500, 'bounded diagnostic')
        require(not release_url or review_release_url(release_url, ['www.billboard.com', 'ca.billboard.com', 'en.wikipedia.org']), 'frozen release reference required')
        record = json.loads(gl.get_contract_at(self.source).view().get_market(market_id))
        require(record['spec'] is not None, 'actual compiled source spec required')
        case = {'ground': ground, 'spec': record['spec'], 'argument': argument, 'release_url': release_url, 'options': review_options(record['spec'], ground)}
        rules_url = self.rules_url
        def judge():
            return judge_review(case, fetch_review_page(rules_url), fetch_review_page(release_url) if release_url else None)
        def verify(leader):
            if not isinstance(leader, gl.vm.Return):
                return False
            rules = fetch_review_page(rules_url)
            release = fetch_review_page(release_url) if release_url else None
            own = judge_review(case, rules, release)
            proposed = leader.calldata
            if not isinstance(proposed, dict) or proposed.get('status') != own['status']:
                return False
            if own['status'] == 'pending':
                return True
            if any(own[key] != proposed[key] for key in ('verdict', 'option', 'rules_digest', 'release_digest')):
                return False
            evidence = release['text'] if release else review_canonical(case['spec'])
            return proposed['rule_quote'] in rules['text'] and proposed['evidence_quote'] in evidence
        result = gl.vm.run_nondet_unsafe(judge, verify)
        self.results[name] = review_canonical({'diagnostic': True, 'source': str(self.source), 'market_id': market_id, 'source_hash': record['specification_hash'], 'ruling': result})

    @gl.public.view
    def get_result(self, name: str) -> str:
        return self.results.get(name, '')
