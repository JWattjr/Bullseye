"""Future-market logic with a mocked oracle; no future-result or network claim."""
import json
import pytest
from test_bullseye import warp, spec
from conftest import to_hex

GEN = 10**18
MARKET = '0x' + '11'*20
CLOSE = 2000000000

@pytest.fixture
def forecasts(direct_vm, direct_deploy, direct_owner, monkeypatch):
    direct_vm._chain_id = 61999
    direct_vm.sender = direct_owner
    warp(direct_vm, CLOSE-86400)
    pools = direct_deploy('contracts/forecast_pools.py', MARKET)
    sources = {key: {'spec': spec('competitive'), 'status': 'open', 'specification_hash': key, 'winner': None, 'evidence': None} for key in ['street-fighter', 'clayface']}
    import genlayer.gl as sdk
    class Source:
        def view(self): return self
        def get_round(self, identifier): return json.dumps(sources[identifier])
    original = sdk.get_contract_at
    monkeypatch.setattr(sdk, 'get_contract_at', lambda address: Source() if address.as_hex.lower() == MARKET else original(address))
    return pools, sources

def finalize(pools, vm, identifier):
    vm.sender = vm._contract_address
    pools.finalize(identifier)

def test_zero_value_creation_freezes_deadline_and_unknown_result(forecasts, direct_vm):
    pools, _ = forecasts
    identifier = pools.create_pool('street-fighter')
    assert pools.create_pool('street-fighter') == identifier
    record = json.loads(pools.get_pool(identifier))
    assert record['entry_deadline'] == CLOSE
    assert record['total'] == '0' and record['participants'] == []
    assert record['winner'] is None and record['value'] is None
    assert record['reference_winner'] is None and record['reference_value'] is None
    assert pools.get_source_pool_ids('street-fighter') == [identifier]

@pytest.mark.parametrize('amount', [0, GEN, 101*GEN])
def test_stake_bounds_do_not_create_a_market(forecasts, direct_vm, amount):
    pools, _ = forecasts
    direct_vm.value = amount
    with direct_vm.expect_revert('stake between'): pools.stake('street-fighter', 1)
    assert pools.get_pool_ids() == []

@pytest.mark.parametrize('choice', [-1, 4, True])
def test_unlisted_range_is_rejected(forecasts, direct_vm, choice):
    pools, _ = forecasts
    direct_vm.value = 2*GEN
    with direct_vm.expect_revert('choose a listed'): pools.stake('street-fighter', choice)
    assert pools.get_pool_ids() == []

@pytest.mark.parametrize('status', ['validated_pending_finality', 'pending', 'resolved_pending_finality', 'resolved', 'void'])
def test_only_finalized_open_source_can_accept_entries(forecasts, direct_vm, status):
    pools, sources = forecasts
    sources['street-fighter']['status'] = status
    direct_vm.value = 2*GEN
    with direct_vm.expect_revert('finalized and open'): pools.stake('street-fighter', 1)

def test_historical_source_cannot_create_future_pool(forecasts, direct_vm):
    pools, sources = forecasts
    sources['street-fighter']['spec']['mode'] = 'historical'
    with direct_vm.expect_revert('upcoming validator specification'): pools.create_pool('street-fighter')

def test_one_entry_per_market_and_no_rollover_after_close(forecasts, direct_vm, direct_alice):
    pools, _ = forecasts
    direct_vm.sender = direct_alice
    direct_vm.value = 2*GEN
    first = pools.stake('street-fighter', 1)
    second = pools.stake('clayface', 2)
    assert first != second
    with direct_vm.expect_revert('one immutable'): pools.stake('street-fighter', 2)
    warp(direct_vm, CLOSE)
    with direct_vm.expect_revert('entries closed'): pools.stake('street-fighter', 1)
    direct_vm.value = 0
    with direct_vm.expect_revert('entries closed'): pools.create_pool('street-fighter')
    assert pools.get_source_pool_ids('street-fighter') == [first]

def test_unknown_result_waits_then_finality_gates_entire_pot(forecasts, direct_vm, direct_alice, direct_bob, direct_owner):
    pools, sources = forecasts
    participants = [(direct_alice, 2*GEN+1, 1), (direct_bob, 3*GEN+2, 1), (direct_owner, 2*GEN, 0)]
    for address, value, choice in participants:
        direct_vm.sender = address
        direct_vm.value = value
        identifier = pools.stake('street-fighter', choice)
    direct_vm.value = 0
    with direct_vm.expect_revert('entries still open'): pools.settle(identifier)
    warp(direct_vm, CLOSE)
    with direct_vm.expect_revert('not finalized yet'): pools.settle(identifier)
    sources['street-fighter'].update(status='resolved_pending_finality', winner=1, evidence={'normalized_value': 125000000})
    with direct_vm.expect_revert('not finalized yet'): pools.settle(identifier)
    sources['street-fighter']['status'] = 'resolved'
    pools.settle(identifier)
    assert pools.get_claimable(identifier, to_hex(direct_alice)) == '0'
    with direct_vm.expect_revert('self callback'): pools.finalize(identifier)
    with direct_vm.expect_revert('settle after'): pools.claim(identifier)
    finalize(pools, direct_vm, identifier)
    amounts = [int(pools.get_claimable(identifier, to_hex(address))) for address, _, _ in participants]
    assert sum(amounts) == 7*GEN+3
    assert amounts[0] > 2*GEN and amounts[1] > 3*GEN and amounts[2] == 0
    assert json.loads(pools.get_pool(identifier))['value'] == 125000000

@pytest.mark.parametrize('voided', [False, True])
def test_missing_evidence_or_empty_winning_pool_refunds(forecasts, direct_vm, direct_alice, voided):
    pools, sources = forecasts
    direct_vm.sender = direct_alice
    direct_vm.value = 2*GEN
    identifier = pools.stake('street-fighter', 0)
    direct_vm.value = 0
    warp(direct_vm, CLOSE+100)
    sources['street-fighter'].update(status='void' if voided else 'resolved', winner=1, evidence={'normalized_value': 125000000})
    pools.settle(identifier)
    assert pools.get_claimable(identifier, to_hex(direct_alice)) == '0'
    finalize(pools, direct_vm, identifier)
    assert pools.get_claimable(identifier, to_hex(direct_alice)) == str(2*GEN)

def test_changed_source_hash_blocks_additional_entry_and_settlement(forecasts, direct_vm, direct_alice, direct_bob):
    pools, sources = forecasts
    direct_vm.sender = direct_alice
    direct_vm.value = 2*GEN
    identifier = pools.stake('street-fighter', 1)
    sources['street-fighter']['specification_hash'] = 'changed'
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert('specification changed'): pools.stake('street-fighter', 1)
    warp(direct_vm, CLOSE)
    direct_vm.value = 0
    with direct_vm.expect_revert('specification changed'): pools.settle(identifier)
