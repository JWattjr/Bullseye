"""The actual v2 staking gate and source amendment paths; cross reads mocked."""
import json
import pytest
from test_bullseye import warp
from conftest import to_hex
from test_music_markets import compilation

CHALLENGES = '0x' + '22' * 20

@pytest.fixture
def market_v2(direct_vm, direct_deploy, direct_owner, monkeypatch):
    vm = direct_vm
    vm.sender = direct_owner
    warp(vm, 2000000000)
    contract = direct_deploy('contracts/music_markets_v2.py', CHALLENGES)
    address = to_hex(vm._contract_address).lower()
    listing = {'creator': to_hex(direct_owner).lower(), 'status': 'compiling', 'remaining': 4*10**15,
               'question': 'Where did Renaissance by Beyonce debut August 13, 2022?',
               'entry_deadline': 2000000800, 'resolution_deadline': 2000001200, 'historical': True}
    gate = {'ready': False, 'approved_hash': None}
    challenge = {}
    import genlayer.gl as sdk
    class Proxy:
        def view(self): return self
        def emit(self, **kwargs): return self
        def get_listing(self, identifier): return json.dumps(listing)
        def get_config(self): return json.dumps({'markets': address})
        def get_open_gate(self, identifier): return json.dumps(gate)
        def get_challenge(self, identifier): return json.dumps(challenge)
        def finalize_compile(self, *args): pass
        def finalize_open(self, *args): pass
        def finalize_review(self, *args): pass
        def activate_listing(self, *args): pass
    monkeypatch.setattr(sdk, 'get_contract_at', lambda _: Proxy())
    return contract, listing, gate, challenge

def compile_market(bundle, vm):
    contract, listing, gate, _ = bundle
    vm.mock_llm('Compile one plain-English.*', json.dumps(compilation()))
    contract.compile('album', listing['question'], listing['entry_deadline'], listing['resolution_deadline'], True)
    sender = vm.sender
    vm.sender = vm._contract_address
    contract.finalize_compile('album')
    vm.sender = sender
    record = json.loads(contract.get_market('album'))
    gate['approved_hash'] = record['specification_hash']
    return record

def test_staking_open_is_blocked_until_the_bound_review_clears(market_v2, direct_vm):
    contract, _, gate, _ = market_v2
    record = compile_market(market_v2, direct_vm)
    with direct_vm.expect_revert('identity review must clear'):
        contract.open_market('album', record['specification_hash'])
    gate['ready'] = True
    gate['approved_hash'] = 'incorrect-review-version'
    with direct_vm.expect_revert('identity review must clear'):
        contract.open_market('album', record['specification_hash'])
    gate['approved_hash'] = record['specification_hash']
    contract.open_market('album', record['specification_hash'])
    assert json.loads(contract.get_market('album'))['status'] == 'opening_pending_finality'

def test_unfunded_or_different_listing_intent_cannot_compile(market_v2, direct_vm):
    contract, listing, _, _ = market_v2
    listing['remaining'] = 0
    with direct_vm.expect_revert('exact funded listing intent'):
        contract.compile('album', listing['question'], listing['entry_deadline'], listing['resolution_deadline'], True)

def test_only_finalized_bound_challenge_can_amend_and_hash_changes(market_v2, direct_vm):
    contract, _, gate, case = market_v2
    record = compile_market(market_v2, direct_vm)
    case.update(status='finalized', market_id='album', source_hash=record['specification_hash'], ground='EDITION_RULE',
                ruling={'verdict':'AMENDED','option':'edition:0:STANDARD_ONLY'})
    with direct_vm.expect_revert('bound challenge contract only'):
        contract.apply_review('album', 'case')
    direct_vm.sender = bytes.fromhex(CHALLENGES[2:])
    contract.apply_review('album', 'case')
    amended = json.loads(contract.get_market('album'))
    assert amended['spec']['albums'][0]['identity_rule'] == 'standard_only'
    assert amended['specification_hash'] != record['specification_hash']
    assert amended['status'] == 'review_pending_finality'
    direct_vm.sender = direct_vm._contract_address
    contract.finalize_review('album')
    assert json.loads(contract.get_market('album'))['status'] == 'compiled'

def test_voided_identity_never_opens(market_v2, direct_vm):
    contract, _, gate, case = market_v2
    record = compile_market(market_v2, direct_vm)
    case.update(status='finalized', market_id='album', source_hash=record['specification_hash'], ground='WRONG_ALBUM', ruling={'verdict':'VOIDED','option':None})
    direct_vm.sender = bytes.fromhex(CHALLENGES[2:])
    contract.apply_review('album', 'case')
    direct_vm.sender = direct_vm._contract_address
    contract.finalize_review('album')
    gate['ready'] = True
    with direct_vm.expect_revert('finalized compiled'):
        contract.open_market('album', record['specification_hash'])
    assert json.loads(contract.get_market('album'))['status'] == 'void'
