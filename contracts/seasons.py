# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""Free Film + Music points. No model, wagers, operator awards or mutable winners.

Anyone may import a participant's existing immutable prediction after its source
finalizes. Historical entries stay visibly separate from competitive rankings.
"""
import json
from genlayer import *


def require(condition, message):
    if not condition:
        raise gl.vm.UserError('[EXPECTED] ' + message)


def film_closeness(guess, value):
    return max(0, 100 - 400 * abs(guess - value) // value) if guess > 0 and value > 0 else 0


def rank_closeness(guess, position):
    if position is None or not 1 <= guess <= 200:
        return 0
    return max(0, 100 - (100 * abs(guess - position) + 198) // 199)


def standing(records):
    counted = sorted([r for r in records if not r['void']], key=lambda r: (r['entry_deadline'], r['category'], r['market_id']))
    streak, best = 0, 0
    for record in counted:
        streak = streak + 1 if record['correct'] else 0
        best = max(best, streak)
    exact = [r['closeness'] for r in counted if r['has_exact']]
    return {'entries': len(counted), 'hits': sum(1 for r in counted if r['correct']),
            'points': sum(r['points'] for r in counted), 'streak': streak, 'best_streak': best,
            'average_closeness': sum(exact) // len(exact) if exact else None,
            'hit_rate': 100 * sum(1 for r in counted if r['correct']) // len(counted) if counted else None}


class BullseyeSeasons(gl.Contract):
    film: Address
    music: Address
    season_id: str
    starts_at: u256
    ends_at: u256
    results: TreeMap[str, str]
    wallets: DynArray[str]
    wallet_results: TreeMap[str, str]

    def __init__(self, film: str, music: str, season_id: str, starts_at: int, ends_at: int):
        require(not gl.message.value, 'native GEN only belongs in pool stakes')
        self.film = Address(film)
        self.music = Address(music)
        require(self.film != self.music, 'distinct source contracts')
        require(1 <= len(season_id) <= 80 and 0 < starts_at < ends_at, 'fixed season boundaries')
        self.season_id = season_id
        self.starts_at = u256(starts_at)
        self.ends_at = u256(ends_at)

    def _record(self, category, identifier, participant):
        participant = str(Address(participant)).lower()
        key = category + ':' + identifier + ':' + participant
        if key in self.results:
            return
        source = gl.get_contract_at(self.film if category == 'film' else self.music).view()
        market = json.loads(source.get_round(identifier) if category == 'film' else source.get_market(identifier))
        require(market['status'] in ('resolved', 'void'), 'finalized source result required')
        raw_entry = source.get_prediction(identifier, participant)
        require(raw_entry, 'existing source prediction required')
        entry = json.loads(raw_entry)
        require(int(self.starts_at) <= entry['submitted_at'] < int(self.ends_at), 'prediction outside season')
        require(entry['submitted_at'] < market['spec']['entry_deadline'], 'prediction after source cutoff')
        void = market['status'] == 'void'
        if category == 'film':
            historical = market['spec']['mode'] != 'competitive'
            guess = entry.get('guess', 0)
            choice = entry['range']
            closeness = 0 if void else film_closeness(guess, market['evidence']['normalized_value'])
        else:
            historical = market['spec']['historical']
            guess = entry['exact_rank']
            choice = entry['choice']
            position = market['evidence']['matches'][0]['position'] if not void else None
            closeness = 0 if void else rank_closeness(guess, position)
        correct = not void and choice == market['winner']
        record = {'category': category, 'market_id': identifier, 'participant': participant,
                  'entry_deadline': market['spec']['entry_deadline'], 'historical': historical,
                  'void': void, 'correct': correct, 'has_exact': guess > 0,
                  'closeness': closeness, 'points': (100 if correct else 0) + closeness,
                  'specification_hash': market['specification_hash']}
        require(len(self.wallets) < 2000 or participant in self.wallet_results, 'season wallet capacity')
        identifiers = json.loads(self.wallet_results.get(participant, '[]'))
        require(len(identifiers) < 500, 'season result capacity')
        if participant not in self.wallet_results:
            self.wallets.append(participant)
        identifiers.append(key)
        self.wallet_results[participant] = json.dumps(identifiers)
        self.results[key] = json.dumps(record, sort_keys=True)

    @gl.public.write
    def sync_film(self, round_id: str, participant: str) -> None:
        require(not gl.message.value, 'native GEN only belongs in pool stakes')
        self._record('film', round_id, participant)

    @gl.public.write
    def sync_music(self, market_id: str, participant: str) -> None:
        require(not gl.message.value, 'native GEN only belongs in pool stakes')
        self._record('music', market_id, participant)

    @gl.public.view
    def get_track_record(self, participant: str) -> str:
        participant = str(Address(participant)).lower()
        records = [json.loads(self.results[key]) for key in json.loads(self.wallet_results.get(participant, '[]'))]
        return json.dumps({'participant': participant, 'competitive': standing([r for r in records if not r['historical']]),
                           'historical': standing([r for r in records if r['historical']]), 'results': records}, sort_keys=True)

    @gl.public.view
    def get_leaderboard(self, historical: bool) -> str:
        rows = []
        for wallet in self.wallets:
            track = json.loads(self.get_track_record(wallet))
            score = track['historical' if historical else 'competitive']
            if score['entries']:
                rows.append({'participant': wallet, **score})
        rows.sort(key=lambda row: (-row['points'], -row['hits'], row['participant']))
        return json.dumps(rows, sort_keys=True)

    @gl.public.view
    def get_sources(self) -> dict:
        return {'film': self.film.as_hex, 'music': self.music.as_hex, 'season_id': self.season_id,
                'starts_at': int(self.starts_at), 'ends_at': int(self.ends_at)}
