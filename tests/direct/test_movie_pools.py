"""Pools read the winning range from a finalized Bullseye round; nothing is hardcoded."""
import json
import pytest
from test_bullseye import warp, spec
from conftest import to_hex

GEN = 10**18

MARKET = '0x' + '11' * 20

class FakeBullseye:
    """Direct mode runs one contract per process, so the Bullseye round is served from this stub.
    Its records use the exact shape of Bullseye.get_round."""
    def __init__(self):
        self.round = {'spec': spec(), 'specification_hash': 'h1', 'status': 'open', 'winner': None, 'evidence': None}
    def view(self):
        outer = self
        class View:
            def get_round(self, round_id):
                assert round_id == 'barbie'
                return json.dumps(outer.round)
        return View()

@pytest.fixture
def pair(direct_vm, direct_deploy, direct_owner, monkeypatch):
    direct_vm._chain_id = 61999
    warp(direct_vm, 1999999900); direct_vm.sender = direct_owner
    pools = direct_deploy('contracts/movie_pools.py', MARKET)
    import genlayer.gl as sdk
    fake = FakeBullseye()
    seen = []
    def get_contract_at(address):
        seen.append(address.as_hex.lower())
        return fake
    monkeypatch.setattr(sdk, 'get_contract_at', get_contract_at)
    return fake, pools, seen

def finalize(fake, status='resolved', value=162022044, winner=2):
    fake.round['status'] = status
    if status == 'resolved':
        fake.round['winner'] = winner
        fake.round['evidence'] = {'normalized_value': value}

def test_pool_pays_the_range_validators_read(pair, direct_vm, direct_alice, direct_bob):
    fake, pools, seen = pair
    direct_vm.sender = direct_alice; direct_vm.value = 3 * GEN; pools.stake('barbie', 2)
    direct_vm.sender = direct_bob; direct_vm.value = 2 * GEN; pools.stake('barbie', 0)
    with direct_vm.expect_revert('one immutable'): pools.stake('barbie', 1)
    direct_vm.value = 0
    with direct_vm.expect_revert('not finalized'): pools.settle('barbie')
    finalize(fake)
    pools.settle('barbie')
    assert set(seen) == {MARKET}
    record = json.loads(pools.get_pool('barbie'))
    assert record['winner'] == 2 and record['value'] == 162022044
    assert pools.get_claimable('barbie', to_hex(direct_alice)) == str(5 * GEN)
    assert pools.get_claimable('barbie', to_hex(direct_bob)) == '0'

def test_unfinalized_adjudication_cannot_settle(pair, direct_vm, direct_alice):
    fake, pools, _ = pair
    direct_vm.sender = direct_alice; direct_vm.value = 2 * GEN; pools.stake('barbie', 2); direct_vm.value = 0
    # Adjudicated but its finality callback has not run: the pool must wait.
    fake.round['status'] = 'resolved_pending_finality'; fake.round['winner'] = 2
    with direct_vm.expect_revert('not finalized'): pools.settle('barbie')

def test_entries_close_with_the_round_and_void_refunds(pair, direct_vm, direct_alice):
    fake, pools, _ = pair
    direct_vm.sender = direct_alice; direct_vm.value = 2 * GEN; pools.stake('barbie', 1)
    warp(direct_vm, 2000000000)
    with direct_vm.expect_revert('entries closed'): pools.stake('barbie', 1)
    direct_vm.value = 0; finalize(fake, 'void')
    pools.settle('barbie')
    assert pools.get_claimable('barbie', to_hex(direct_alice)) == str(2 * GEN)

@pytest.mark.parametrize('chosen,value', [(4, 2 * GEN), (1, GEN)])
def test_invalid_stake_creates_no_pool(pair, direct_vm, chosen, value):
    _, pools, _ = pair
    direct_vm.value = value
    with direct_vm.expect_revert(): pools.stake('barbie', chosen)
    assert pools.get_pool_ids() == []

def test_changed_specification_blocks_settlement(pair, direct_vm, direct_alice):
    fake, pools, _ = pair
    direct_vm.sender = direct_alice; direct_vm.value = 2 * GEN; pools.stake('barbie', 2); direct_vm.value = 0
    finalize(fake); fake.round['specification_hash'] = 'other'
    with direct_vm.expect_revert('specification changed'): pools.settle('barbie')

def test_nobody_on_winner_refunds_everyone(pair, direct_vm, direct_alice, direct_bob):
    fake, pools, _ = pair
    direct_vm.sender = direct_alice; direct_vm.value = 2 * GEN; pools.stake('barbie', 0)
    direct_vm.sender = direct_bob; direct_vm.value = 3 * GEN; pools.stake('barbie', 1); direct_vm.value = 0
    finalize(fake); pools.settle('barbie')
    assert pools.get_claimable('barbie', to_hex(direct_alice)) == str(2 * GEN)
    assert pools.get_claimable('barbie', to_hex(direct_bob)) == str(3 * GEN)
