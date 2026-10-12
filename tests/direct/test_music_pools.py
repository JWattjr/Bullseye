"""Deadline, finalized-source and refund guarantees for simulated GEN music."""
import json
import pytest
from test_bullseye import warp
from conftest import to_hex

SOURCE = '0x' + '11' * 20
CLOSE = 2000000200
DEADLINE = 2000000400


@pytest.fixture
def music_pool(direct_vm, direct_deploy, direct_owner, monkeypatch):
    vm = direct_vm
    vm._chain_id = 61999
    vm.sender = direct_owner
    warp(vm, 2000000000)
    contract = direct_deploy('contracts/music_pools.py', SOURCE)
    source = {'status': 'open', 'question': 'Where does this exact album debut?',
              'specification_hash': 'frozen', 'winner': None, 'evidence': None,
              'spec': {'historical': True, 'entry_deadline': CLOSE,
                       'resolution_deadline': DEADLINE, 'bins': list(range(6))}}
    import genlayer.gl as sdk
    class Proxy:
        def view(self): return self
        def get_market(self, identifier): return json.dumps(source)
        def emit(self, **kwargs): return self
        def finalize(self, identifier): pass
    monkeypatch.setattr(sdk, 'get_contract_at', lambda _: Proxy())
    return contract, source


def stake(pools, vm, choice=0, amount=10**16):
    vm.value = amount
    identifier = pools.stake('album', choice)
    vm.value = 0
    return identifier


def finalize(pools, vm, identifier):
    vm.sender = vm._contract_address
    pools.finalize(identifier)


def test_tiny_stakes_with_frozen_refund_path(music_pool, direct_vm):
    pools, _ = music_pool
    identifier = stake(pools, direct_vm)
    record = json.loads(pools.get_pool(identifier))
    assert record['entry_deadline'] == CLOSE
    assert record['refund_deadline'] == DEADLINE + 86400
    assert record['total'] == str(10**16)


@pytest.mark.parametrize('state', ['compiled_pending_finality', 'compiled', 'opening_pending_finality', 'resolved_pending_finality', 'void'])
def test_unfinalized_or_closed_source_rejects_stake(music_pool, direct_vm, state):
    pools, source = music_pool
    source['status'] = state
    with direct_vm.expect_revert('finalized and open'):
        stake(pools, direct_vm)


def test_missing_source_can_be_refunded_at_fixed_deadline(music_pool, direct_vm):
    pools, source = music_pool
    participant = to_hex(direct_vm.sender)
    identifier = stake(pools, direct_vm)
    source['status'] = 'pending'
    warp(direct_vm, CLOSE)
    with direct_vm.expect_revert('refund available at frozen deadline'):
        pools.settle(identifier)
    warp(direct_vm, DEADLINE + 86400)
    pools.settle(identifier)
    assert pools.get_claimable(identifier, participant) == '0'
    finalize(pools, direct_vm, identifier)
    assert pools.get_claimable(identifier, participant) == str(10**16)


@pytest.mark.parametrize('void', [True, False])
def test_void_and_empty_winning_pool_refund(music_pool, direct_vm, void):
    pools, source = music_pool
    participant = to_hex(direct_vm.sender)
    identifier = stake(pools, direct_vm, choice=0)
    source.update(status='void' if void else 'resolved', winner=None if void else 1,
                  evidence={'matches': [{'position': 3}]})
    warp(direct_vm, CLOSE)
    pools.settle(identifier)
    finalize(pools, direct_vm, identifier)
    assert pools.get_claimable(identifier, participant) == str(10**16)


def test_source_specification_cannot_change(music_pool, direct_vm):
    pools, source = music_pool
    identifier = stake(pools, direct_vm)
    source.update(status='resolved', specification_hash='changed', winner=0)
    warp(direct_vm, CLOSE)
    with direct_vm.expect_revert('round specification changed'):
        pools.settle(identifier)


@pytest.mark.parametrize('status,recipient,method,expected', [
    ('ACCEPTED', None, 'settle', 'settlement not successfully finalized'),
    ('FINALIZED', SOURCE, 'settle', 'wrong settlement contract'),
    ('FINALIZED', None, 'claim', 'wrong settlement pool or method'),
    ('FINALIZED', None, 'settle', None),
])
def test_settlement_callback_recovery_checks_protocol(music_pool, direct_vm, monkeypatch, status, recipient, method, expected):
    import base64
    from types import SimpleNamespace
    from genlayer.py import calldata
    import genlayer.gl as sdk
    pools, source = music_pool
    participant = to_hex(direct_vm.sender)
    identifier = stake(pools, direct_vm)
    source.update(status='resolved', winner=0, evidence={'matches': [{'position': 1}]})
    warp(direct_vm, CLOSE)
    pools.settle(identifier)
    parent = {'hash': '0x' + 'ab' * 32, 'status': status, 'result': 6, 'to_address': recipient or to_hex(direct_vm._contract_address),
              'consensus_data': {'leader_receipt': [{'execution_result': 'SUCCESS'}]},
              'data': {'calldata': base64.b64encode(calldata.encode({'method': method, 'args': [identifier]})).decode()}}
    monkeypatch.setattr(sdk.nondet.web, 'post', lambda *args, **kwargs: SimpleNamespace(status=200, body=json.dumps({'result': parent}).encode()))
    if expected:
        with direct_vm.expect_revert(expected): pools.verify_settlement(identifier, '0x' + 'ab' * 32)
        assert pools.get_claimable(identifier, participant) == '0'
    else:
        pools.verify_settlement(identifier, '0x' + 'ab' * 32)
        assert pools.get_claimable(identifier, participant) == str(10**16)


def test_claim_cannot_absorb_unaccounted_native_value(music_pool, direct_vm):
    pools,_=music_pool
    direct_vm.value=10**16
    with direct_vm.expect_revert('native GEN only belongs in pool stakes'):
        pools.claim('not-a-deposit', 1)
