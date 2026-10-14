"""Build new standalone roles without touching any deployed v1 contract bytes."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
contracts = ROOT / 'contracts'
core = (contracts / 'music_review_core.py').read_text(encoding='utf-8')
pools = (contracts / 'music_pools.py').read_text(encoding='utf-8')
receipt_helpers = '# StudioNet receipts' + pools.split('# StudioNet receipts', 1)[1].split('class BullseyeMusicPools', 1)[0]
challenge = (contracts / 'music_challenge_logic.py').read_text(encoding='utf-8')
header, challenge_body = challenge.split('\n', 1)
(contracts / 'music_challenges.py').write_text(header + '\n' + core + '\n' + challenge_body.split('class BullseyeMusicChallenges', 1)[0] + '\n' + receipt_helpers + '\nclass BullseyeMusicChallenges' + challenge_body.split('class BullseyeMusicChallenges', 1)[1], encoding='utf-8', newline='\r\n')
probe = (contracts / 'music_review_probe_logic.py').read_text(encoding='utf-8')
(ROOT / 'tests/fixtures/musicplus_review_probe.py').write_text(header + '\n' + core + '\n' + challenge_body.split('class BullseyeMusicChallenges', 1)[0] + '\n' + probe, encoding='utf-8', newline='\r\n')

logic = (contracts / 'music_market_logic.py').read_text(encoding='utf-8').split('\n', 1)[1]
def replace_once(source, old, new):
    assert source.count(old) == 1, old[:100]
    return source.replace(old, new, 1)

logic = replace_once(logic, 'class BullseyeMusicMarkets(gl.Contract):', 'class BullseyeMusicMarketsV2(gl.Contract):\n    challenges: Address')
logic = replace_once(logic, 'def __init__(self):', 'def __init__(self, challenges: str):')
logic = replace_once(logic, '        pass\n\n    def _market', '        self.challenges = Address(challenges)\n\n    def _market')
logic = replace_once(logic, "('combined_standard_deluxe', 'exact_edition'), 'canonical edition rule'", "('combined_standard_deluxe', 'exact_edition', 'standard_only'), 'canonical edition rule'")
logic = replace_once(logic, '        current = now()\n', '''        review_contract = gl.get_contract_at(self.challenges).view()
        require(json.loads(review_contract.get_config())['markets'].lower() == str(gl.message.contract_address).lower(), 'challenge source binding mismatch')
        listing_raw = review_contract.get_listing(market_id)
        require(listing_raw, 'funded listing required before compilation')
        listing = json.loads(listing_raw)
        require(listing['status'] == 'compiling' and listing['remaining'] > 0 and listing['question'] == question
                and listing['entry_deadline'] == entry_deadline and listing['resolution_deadline'] == resolution_deadline
                and listing['historical'] == historical, 'exact funded listing intent required')
        current = now()
''')
logic = replace_once(logic, 'Current UTC: ', 'Treat an explicitly supplied Saturday chart date as the proposed date to be reviewed against archived release evidence; do not silently substitute a different week. Canonical titles stay the base album title; explicitly named edition labels go in aliases even when exact_edition is requested. When the question explicitly asks for a separate physical reissue/edition entry, transcribe exact_edition for challenge review rather than overriding its stated premise. Missing identity or date is still rejected. Current UTC: ')
logic = replace_once(logic, 'exactly combined_standard_deluxe or exact_edition', 'exactly combined_standard_deluxe, exact_edition or standard_only; standard_only means match only the named standard row and exclude alternate edition aliases')
logic = replace_once(logic, 'exact_edition requires the named edition as a separate chart entry.', 'exact_edition requires the named edition as a separate chart entry. standard_only matches only the canonical standard title and excludes alternate edition aliases.')
logic = replace_once(logic, "spec = {'version': 1,", "spec = {'version': 2, 'ranking_mode': 'chart_position' if re.search(r'reissue|re-entry|chart position', question, re.I) else 'debut',")
logic = replace_once(logic, "record = {'creator': str(gl.message.sender_address).lower(),", "record = {'creator': listing['creator'],")
logic = replace_once(logic, '            self._save(market_id, record)\n\n    @gl.public.write\n    def open_market', '            self._save(market_id, record)\n            gl.get_contract_at(self.challenges).emit(on="finalized").activate_listing(market_id)\n\n    @gl.public.write\n    def open_market')
logic = replace_once(logic, "        require(str(gl.message.sender_address).lower() == record['creator'], 'creator confirmation only')", "        gate = json.loads(gl.get_contract_at(self.challenges).view().get_open_gate(market_id))\n        require(gate['ready'] and gate['approved_hash'] == record['specification_hash'], 'finalized identity review must clear before opening')")
logic = replace_once(logic, "A matched album must have weeks=1 to prove a debut, otherwise return ambiguous.", "For ranking_mode=debut a matched album must have weeks=1, otherwise ambiguous. For ranking_mode=chart_position a re-entry or physical reissue may have more than one week; identify the same standard album under its frozen edition rule.")
logic = replace_once(logic, "            require(charts[album['chart_week']]['rows'][position - 1]['weeks'] == 1, 'matching row must prove first chart week')", "            require(spec.get('ranking_mode', 'debut') == 'chart_position' or charts[album['chart_week']]['rows'][position - 1]['weeks'] == 1, 'matching row must prove first chart week')")
extra = '''
    @gl.public.write
    def apply_review(self, market_id: str, case_id: str) -> None:
        require(not gl.message.value and gl.message.sender_address == self.challenges, 'bound challenge contract only')
        record = self._market(market_id)
        case = json.loads(gl.get_contract_at(self.challenges).view().get_challenge(case_id))
        require(case['status'] == 'finalized' and case['market_id'] == market_id, 'finalized matching challenge required')
        require(record['status'] == 'compiled' and not record['participants'] and case['source_hash'] == record['specification_hash'], 'amend only the reviewed pre-stake spec')
        verdict = case['ruling']['verdict']
        if verdict == 'AMENDED':
            amended = review_apply(record['spec'], case['ground'], case['ruling']['option'])
            require(amended is not None, 'code-generated amendment only')
            record.update(spec=amended, specification_hash=review_hash(amended), status='review_pending_finality')
        elif verdict == 'VOIDED':
            record.update(status='void_pending_finality', winner=None, evidence={'status': 'identity_voided', 'charts': [], 'matches': [], 'challenge_id': case_id, 'ruling': case['ruling']})
        else:
            require(False, 'only an amendment or void changes the source')
        record['review_case'] = case_id
        self._save(market_id, record)
        gl.get_contract_at(gl.message.contract_address).emit(on='finalized').finalize_review(market_id)

    @gl.public.write
    def finalize_review(self, market_id: str) -> None:
        require(not gl.message.value and gl.message.sender_address == gl.message.contract_address, 'self finality callback only')
        record = self._market(market_id)
        if record['status'] == 'review_pending_finality':
            record['status'] = 'compiled'
        elif record['status'] == 'void_pending_finality':
            record['status'] = 'void'
        self._save(market_id, record)

    @gl.public.view
    def get_challenges(self) -> str:
        return str(self.challenges)

    @gl.public.write
    def recover_review(self, market_id: str) -> None:
        require(not gl.message.value, 'free finalized identity recovery')
        record = self._market(market_id)
        if record['status'] not in ('review_pending_finality', 'void_pending_finality'):
            return
        case = json.loads(gl.get_contract_at(self.challenges).view().get_challenge(record['review_case']))
        require(case['status'] == 'finalized' and case['market_id'] == market_id, 'finalized matching challenge required')
        if record['status'] == 'review_pending_finality':
            amended = review_apply(case['spec'], case['ground'], case['ruling']['option'])
            require(case['ruling']['verdict'] == 'AMENDED' and amended is not None and review_hash(amended) == record['specification_hash'], 'exact finalized amendment required')
            record['status'] = 'compiled'
        else:
            require(case['ruling']['verdict'] == 'VOIDED' and case['source_hash'] == record['specification_hash'], 'exact finalized void required')
            record['status'] = 'void'
        self._save(market_id, record)
'''
logic += extra
parser = (contracts / 'music_rows.py').read_text(encoding='utf-8')
(contracts / 'music_markets_v2.py').write_text(header + '\n' + parser + '\n' + core + '\n' + logic, encoding='utf-8', newline='\r\n')

# The new source requires a distinct pool binding; payout logic is byte-for-byte
# the existing proven algorithm except for the class name. v1 remains untouched.
(contracts / 'music_pools_v2.py').write_text(pools.replace('class BullseyeMusicPools(', 'class BullseyeMusicPoolsV2('), encoding='utf-8', newline='\r\n')

seasons = (contracts / 'seasons.py').read_text(encoding='utf-8')
seasons = replace_once(seasons, 'class BullseyeSeasons(gl.Contract):', 'class BullseyeSeasonsV2(gl.Contract):\n    previous_music: Address')
seasons = replace_once(seasons, 'starts_at: int, ends_at: int):', 'starts_at: int, ends_at: int, previous_music: str):')
seasons = replace_once(seasons, '        self.music = Address(music)', '        self.music = Address(music)\n        self.previous_music = Address(previous_music)')
seasons = replace_once(seasons, 'def _record(self, category, identifier, participant):', 'def _record(self, category, identifier, participant, previous=False):')
seasons = replace_once(seasons, "key = category + ':' + identifier + ':' + participant", "key = category + (':previous:' if previous else ':') + identifier + ':' + participant")
seasons = replace_once(seasons, "self.film if category == 'film' else self.music", "self.film if category == 'film' else self.previous_music if previous else self.music")
seasons = replace_once(seasons, "record = {'category': category,", "record = {'release': 'previous' if previous else 'current', 'category': category,")
seasons += '''
    @gl.public.write
    def sync_previous_music(self, market_id: str, participant: str) -> None:
        require(not gl.message.value, 'free previous-release season import')
        self._record('music', market_id, participant, True)

    @gl.public.view
    def get_previous_music(self) -> str:
        return str(self.previous_music)
'''
(contracts / 'seasons_v2.py').write_text(seasons, encoding='utf-8', newline='\r\n')
print('Built four standalone Music+ roles. All deployed v1 files unchanged.')
