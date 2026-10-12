"""Cross-category scores from finalized sources; no model or native funds."""
import json
import pytest
from test_bullseye import warp
from conftest import to_hex

FILM = '0x' + '11' * 20
MUSIC = '0x' + '22' * 20


@pytest.fixture
def season(direct_vm, direct_deploy, direct_owner, monkeypatch):
    vm = direct_vm
    vm.sender = direct_owner
    warp(vm, 2000000000)
    contract = direct_deploy('contracts/seasons.py', FILM, MUSIC, 'test-season', 1900000000, 2100000000)
    film = {'spec': {'mode': 'competitive', 'entry_deadline': 2000000100},
            'status': 'resolved', 'winner': 2, 'specification_hash': 'film-frozen',
            'evidence': {'normalized_value': 100000000}}
    music = {'spec': {'historical': False, 'entry_deadline': 2000000200},
             'status': 'resolved', 'winner': 1, 'specification_hash': 'music-frozen',
             'evidence': {'matches': [{'position': 5}]}}
    entries = {'film': {'range': 2, 'guess': 100000000, 'submitted_at': 2000000000},
               'music': {'choice': 1, 'exact_rank': 5, 'submitted_at': 2000000001}}
    import genlayer.gl as sdk
    class Source:
        def __init__(self, category): self.category = category
        def view(self): return self
        def get_round(self, identifier): return json.dumps(film)
        def get_market(self, identifier): return json.dumps(music)
        def get_prediction(self, identifier, participant): return json.dumps(entries[self.category])
    monkeypatch.setattr(sdk, 'get_contract_at', lambda address: Source('film' if str(address).lower() == FILM else 'music'))
    return contract, film, music, entries


def track(contract, vm):
    return json.loads(contract.get_track_record(to_hex(vm.sender)))


def test_cross_category_exact_scores_and_idempotence(season, direct_vm):
    contract, _, _, _ = season
    participant = to_hex(direct_vm.sender)
    contract.sync_film('barbie', participant)
    contract.sync_music('album', participant)
    contract.sync_music('album', participant)
    result = track(contract, direct_vm)['competitive']
    assert result['points'] == 400
    assert result['entries'] == 2
    assert result['streak'] == 2
    assert result['average_closeness'] == 100
    assert len(json.loads(contract.get_leaderboard(False))) == 1


def test_unfinalized_source_cannot_award(season, direct_vm):
    contract, _, music, _ = season
    music['status'] = 'resolved_pending_finality'
    with direct_vm.expect_revert('finalized source result required'):
        contract.sync_music('album', to_hex(direct_vm.sender))


def test_film_curve_and_rank_distance(season, direct_vm):
    contract, _, _, entries = season
    entries['film']['guess'] = 125000000
    entries['music']['exact_rank'] = 6
    contract.sync_film('barbie', to_hex(direct_vm.sender))
    contract.sync_music('album', to_hex(direct_vm.sender))
    records = track(contract, direct_vm)['results']
    assert records[0]['closeness'] == 0
    assert records[1]['closeness'] == 99


def test_historical_exhibition_is_separate(season, direct_vm):
    contract, film, music, _ = season
    film['spec']['mode'] = 'historical'
    music['spec']['historical'] = True
    contract.sync_film('barbie', to_hex(direct_vm.sender))
    contract.sync_music('album', to_hex(direct_vm.sender))
    result = track(contract, direct_vm)
    assert result['competitive']['entries'] == 0
    assert result['historical']['points'] == 400


def test_void_does_not_change_accuracy_or_streak(season, direct_vm):
    contract, _, music, _ = season
    music.update(status='void', winner=None, evidence=None)
    contract.sync_music('void-album', to_hex(direct_vm.sender))
    assert track(contract, direct_vm)['competitive']['entries'] == 0


def test_cutoff_and_season_boundaries(season, direct_vm):
    contract, _, _, entries = season
    entries['music']['submitted_at'] = 2000000200
    with direct_vm.expect_revert('prediction after source cutoff'):
        contract.sync_music('late-album', to_hex(direct_vm.sender))
    entries['music']['submitted_at'] = 1800000000
    with direct_vm.expect_revert('prediction outside season'):
        contract.sync_music('old-album', to_hex(direct_vm.sender))
