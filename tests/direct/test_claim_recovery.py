"""Adversarial claim lifecycle with real contract code and a controlled native ledger.

Receipt transport and native delivery are fixtures, not hosted Studio transactions.
The ledger processes each emission once and asserts recipient and pool balances.
"""
import base64
import json
from types import SimpleNamespace

import pytest
from test_bullseye import spec, warp
from conftest import to_hex

GEN = 10**18
ORACLE = '0x' + '11' * 20
PARENT = '0x' + 'aa' * 32
CHILD = '0x' + 'bb' * 32


@pytest.fixture(params=['film_pools', 'forecast_pools'])
def recovery(request, direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, direct_charlie, monkeypatch):
    vm = direct_vm
    vm._chain_id = 61999
    vm.sender = direct_owner
    warp(vm, 1999999900)
    pools = direct_deploy('contracts/' + request.param + '.py', ORACLE)
    contract = to_hex(vm._contract_address).lower()
    wallets = [to_hex(address).lower() for address in (direct_alice, direct_bob, direct_charlie)]
    ledger = {wallet: 10 * GEN for wallet in wallets}
    ledger[contract] = 0
    emitted, callbacks, receipts, reads = [], [], {}, []
    source = {'spec': spec('competitive' if request.param == 'forecast_pools' else 'historical'),
              'status': 'open' if request.param == 'forecast_pools' else 'resolved',
              'specification_hash': 'frozen', 'winner': 2, 'evidence': {'normalized_value': 162022044}}
    import genlayer.gl as sdk
    from genlayer.py import calldata

    class Source:
        def view(self): return self
        def get_round(self, identifier): return json.dumps(source)

    class Self:
        def emit(self, **kwargs):
            assert kwargs == {'on': 'finalized'}
            return self
        def finalize(self, identifier): callbacks.append(('settle', identifier))
        def finalize_claim(self, identifier, wallet, attempt): callbacks.append(('claim', identifier, wallet, attempt))

    original = sdk.get_contract_at
    monkeypatch.setattr(sdk, 'get_contract_at', lambda address: Source() if str(address).lower() == ORACLE
                        else Self() if str(address).lower() == contract else original(address))

    def send(recipient, **kwargs):
        emitted.append({'to': str(recipient.address).lower(), 'value': int(kwargs['value']), 'delivered': False})

    # EVM emission is asynchronous. The native ledger deliberately delivers it
    # later, or terminally fails it, so a reservation cannot masquerade as credit.
    import sys
    contract_module = next(m for m in list(sys.modules.values()) if getattr(m, '__file__', '')
                           and str(m.__file__).replace('\\', '/').endswith('contracts/' + request.param + '.py'))
    class NativeTarget:
        def __init__(self, address): self.address = address
        def emit_transfer(self, **kwargs): send(self, **kwargs)
    monkeypatch.setattr(contract_module, 'Recipient', NativeTarget)

    def post(url, **kwargs):
        assert url == 'https://studio.genlayer.com/api'
        query = json.loads(kwargs['body'])
        assert query['method'] == 'eth_getTransactionByHash'
        reads.append(query['params'][0])
        return SimpleNamespace(status=200, body=json.dumps({'result': receipts.get(query['params'][0])}).encode())

    monkeypatch.setattr(sdk.nondet.web, 'post', post)

    def stake(address, value, choice):
        vm.sender, vm.value = address, value
        identifier = pools.stake('film', choice)
        wallet = to_hex(address).lower()
        ledger[wallet] -= value
        ledger[contract] += value
        vm.deal(vm._contract_address, ledger[contract])
        vm.value = 0
        return identifier

    identifier = stake(direct_alice, 2 * GEN + 1, 2)
    stake(direct_bob, 3 * GEN + 2, 2)
    stake(direct_charlie, 2 * GEN, 0)
    source['status'] = 'resolved'
    warp(vm, 2000000120)
    pools.settle(identifier)
    vm.sender = vm._contract_address
    pools.finalize(identifier)

    def evidence(wallet, attempt=1, parent_hash=PARENT, child_hash=CHILD, credited=False, **changes):
        parent = {'hash': parent_hash, 'status': 'FINALIZED', 'result': 6,
                  'from_address': wallet, 'to_address': contract,
                  'consensus_data': {'leader_receipt': [{'execution_result': 'SUCCESS'}]},
                  'data': {'calldata': base64.b64encode(calldata.encode({'method': 'claim', 'args': [identifier, attempt]})).decode()},
                  'triggered_transactions': [child_hash]}
        state = json.loads(pools.get_claim(identifier, wallet))
        child = {'hash': child_hash, 'status': 'FINALIZED', 'from_address': contract,
                 'to_address': wallet, 'value': state['amount'], 'type': 0,
                 'consensus_data': None, 'triggered_on': 'finalized', 'value_credited': credited}
        child.update(changes)
        receipts[parent_hash], receipts[child_hash] = parent, child
        return parent, child

    def deliver(index, succeeds):
        message = emitted[index]
        assert not message['delivered']
        message['delivered'] = True
        if succeeds:
            ledger[contract] -= message['value']
            ledger[message['to']] += message['value']
            vm.deal(vm._contract_address, ledger[contract])

    return SimpleNamespace(pools=pools, vm=vm, identifier=identifier, contract=contract, wallets=wallets,
        alice=direct_alice, bob=direct_bob, charlie=direct_charlie, ledger=ledger, emitted=emitted,
        receipts=receipts, reads=reads, evidence=evidence, deliver=deliver, callbacks=callbacks)


def claim(r, address, attempt=1):
    r.vm.sender = address
    r.pools.claim(r.identifier, attempt)


def verify_and_finalize(r, wallet, parent=PARENT, attempt=1):
    r.vm.sender = r.charlie  # Verification is permissionless, never a payout setter.
    result = r.pools.verify_claim(r.identifier, wallet, parent)
    r.vm.sender = r.vm._contract_address
    r.pools.finalize_claim(r.identifier, wallet, attempt)
    return result


def test_success_only_marks_paid_after_exact_credit_and_finalized_verification(recovery):
    r = recovery
    wallet = r.wallets[0]
    amount = int(r.pools.get_claimable(r.identifier, wallet))
    claim(r, r.alice)
    assert json.loads(r.pools.get_pool(r.identifier))['claims'] == {}
    assert r.pools.get_claimable(r.identifier, wallet) == '0'
    assert r.ledger[wallet] == 8 * GEN - 1
    with r.vm.expect_revert('already pending'): claim(r, r.alice)
    r.deliver(0, True)
    r.evidence(wallet, credited=True)
    r.vm.sender = r.charlie
    assert r.pools.verify_claim(r.identifier, wallet, PARENT) == 'paid_pending_finality'
    assert json.loads(r.pools.get_pool(r.identifier))['claims'] == {}
    with r.vm.expect_revert('self callback'): r.pools.finalize_claim(r.identifier, wallet, 1)
    r.vm.sender = r.vm._contract_address
    r.pools.finalize_claim(r.identifier, wallet, 1)
    assert json.loads(r.pools.get_pool(r.identifier))['claims'] == {wallet: str(amount)}
    with r.vm.expect_revert('already paid'): claim(r, r.alice, 2)
    assert len(r.emitted) == 1
    assert r.ledger[wallet] == 8 * GEN - 1 + amount
    assert set(r.reads) == {PARENT, CHILD}


def test_failed_transfer_recovery_retry_and_final_balances_conserve_every_wei(recovery):
    r = recovery
    a, b, c = r.wallets
    amounts = [int(r.pools.get_claimable(r.identifier, wallet)) for wallet in [a, b, c]]
    assert sum(amounts) == 7 * GEN + 3 and amounts[2] == 0
    claim(r, r.alice)
    r.deliver(0, False)
    r.evidence(a, credited=False)
    r.vm.sender = r.charlie
    assert r.pools.verify_claim(r.identifier, a, PARENT) == 'failed_pending_finality'
    with r.vm.expect_revert('already pending'): claim(r, r.alice, 2)
    r.vm.sender = r.vm._contract_address
    r.pools.finalize_claim(r.identifier, a, 1)
    assert r.pools.get_claimable(r.identifier, a) == str(amounts[0])
    assert r.ledger[r.contract] == 7 * GEN + 3
    with r.vm.expect_revert('next claim attempt'): claim(r, r.alice, 1)
    claim(r, r.alice, 2)
    # A delayed old callback and old failed receipt cannot unlock attempt two.
    r.vm.sender = r.vm._contract_address
    r.pools.finalize_claim(r.identifier, a, 1)
    r.vm.sender = r.charlie
    with r.vm.expect_revert('attempt mismatch'): r.pools.verify_claim(r.identifier, a, PARENT)
    r.deliver(1, True)
    parent2, child2 = '0x' + 'cc' * 32, '0x' + 'dd' * 32
    r.evidence(a, 2, parent2, child2, credited=True)
    verify_and_finalize(r, a, parent2, 2)
    claim(r, r.bob)
    r.deliver(2, True)
    parent3, child3 = '0x' + 'ee' * 32, '0x' + 'ff' * 32
    r.evidence(b, 1, parent3, child3, credited=True)
    verify_and_finalize(r, b, parent3)
    with r.vm.expect_revert('already paid'): claim(r, r.alice, 3)
    with r.vm.expect_revert('no payout'): claim(r, r.charlie)
    assert r.ledger[r.contract] == 0
    assert r.ledger[a] == 8 * GEN - 1 + amounts[0]
    assert r.ledger[b] == 7 * GEN - 2 + amounts[1]
    assert r.ledger[c] == 8 * GEN
    assert sum(r.ledger.values()) == 30 * GEN
    assert len(r.emitted) == 3


@pytest.mark.parametrize('change,reason', [
    ({'status': 'PENDING'}, 'still pending'),
    ({'status': 'UNDETERMINED'}, 'still pending'),
    ({'status': 'ACCEPTED'}, 'still pending'),
    ({'value_credited': None}, 'credit is unknown'),
    ({'value_credited': 'false'}, 'credit is unknown'),
    ({'value': '1'}, 'amount mismatch'),
    ({'to_address': '0x' + '99' * 20}, 'recipient or amount mismatch'),
    ({'from_address': '0x' + '99' * 20}, 'recipient or amount mismatch'),
    ({'hash': '0x' + '99' * 32}, 'hash mismatch'),
    ({'type': 2}, 'native transfer emission'),
    ({'consensus_data': {}}, 'native transfer emission'),
    ({'triggered_on': 'accepted'}, 'native transfer emission'),
])
def test_uncertain_or_unrelated_receipts_never_unlock_retry(recovery, change, reason):
    r = recovery
    claim(r, r.alice)
    r.evidence(r.wallets[0], **change)
    r.vm.sender = r.charlie
    with r.vm.expect_revert(reason): r.pools.verify_claim(r.identifier, r.wallets[0], PARENT)
    assert json.loads(r.pools.get_claim(r.identifier, r.wallets[0]))['status'] == 'pending'
    with r.vm.expect_revert('already pending'): claim(r, r.alice, 2)
    assert len(r.emitted) == 1


@pytest.mark.parametrize('field,value,reason', [
    ('from_address', '0x' + '99' * 20, 'sender or contract mismatch'),
    ('to_address', '0x' + '99' * 20, 'sender or contract mismatch'),
    ('status', 'ACCEPTED', 'not finalized'),
    ('result', 5, 'did not succeed'),
    ('triggered_transactions', [CHILD, '0x' + '99' * 32], 'not available yet'),
])
def test_parent_binding_rejects_wrong_wallet_contract_failure_and_ambiguous_children(recovery, field, value, reason):
    r = recovery
    claim(r, r.alice)
    parent, _ = r.evidence(r.wallets[0])
    parent[field] = value
    with r.vm.expect_revert(reason): r.pools.verify_claim(r.identifier, r.wallets[0], PARENT)
    assert len(r.emitted) == 1


def test_missing_receipt_and_wrong_pool_calldata_fail_closed(recovery):
    r = recovery
    claim(r, r.alice)
    with r.vm.expect_revert('unavailable'): r.pools.verify_claim(r.identifier, r.wallets[0], PARENT)
    parent, _ = r.evidence(r.wallets[0])
    from genlayer.py import calldata
    parent['data']['calldata'] = base64.b64encode(calldata.encode({'method': 'claim', 'args': ['different-pool', 1]})).decode()
    with r.vm.expect_revert('pool or attempt mismatch'): r.pools.verify_claim(r.identifier, r.wallets[0], PARENT)
    assert r.pools.get_claimable(r.identifier, r.wallets[0]) == '0'


def test_failed_recovery_does_not_borrow_insufficient_funds_or_pay_another_wallet(recovery):
    r = recovery
    claim(r, r.alice)
    r.evidence(r.wallets[0])
    verify_and_finalize(r, r.wallets[0])
    r.vm.deal(r.vm._contract_address, 0)
    with r.vm.expect_revert('balance insufficient'): claim(r, r.alice, 2)
    assert json.loads(r.pools.get_claim(r.identifier, r.wallets[0]))['status'] == 'failed'
    amount = int(r.pools.get_claimable(r.identifier, r.wallets[0]))
    r.vm.deal(r.vm._contract_address, amount)
    with r.vm.expect_revert('wait for refunds'): claim(r, r.alice, 2)
    r.vm.deal(r.vm._contract_address, r.ledger[r.contract])
    with r.vm.expect_revert('no payout'): claim(r, r.charlie)
    assert len(r.emitted) == 1


def test_validators_refetch_receipts_and_reject_a_changed_credit_decision(recovery, monkeypatch):
    r = recovery
    claim(r, r.alice)
    r.evidence(r.wallets[0], credited=True)
    r.pools.verify_claim(r.identifier, r.wallets[0], PARENT)
    import genlayer.gl as sdk
    # Direct mode has no WASM sub-VM. Preserve the SDK validator's comparison
    # while executing its real observation again through the receipt fixture.
    monkeypatch.setattr(sdk.vm, 'spawn_sandbox', lambda fn: sdk.vm.Return(calldata=fn()))
    before = len(r.reads)
    result, _, validator = r.vm._captured_validators[-1]
    assert validator(sdk.vm.Return(calldata=result)) is True
    assert r.reads[before:] == [PARENT, CHILD]
    r.receipts[CHILD]['value_credited'] = False
    assert validator(sdk.vm.Return(calldata=result)) is False
    assert json.loads(r.pools.get_pool(r.identifier))['claims'] == {}
