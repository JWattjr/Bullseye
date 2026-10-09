# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""Upcoming-film StudioNet GEN pools. Entries close before release; settlement uses a finalized Bullseye result. No outcome is written here:
the winning range is read from the Bullseye contract, where validators extracted the published number."""
import json
import base64
from genlayer.py import calldata
from datetime import datetime
from genlayer import *

MINIMUM = 2 * 10**18
MAXIMUM = 100 * 10**18

def now():
    return int(datetime.fromisoformat(str(gl.message_raw['datetime']).replace('Z', '+00:00')).timestamp())

def require(condition, message):
    if not condition:
        raise gl.vm.UserError('[EXPECTED] ' + message)

def allocation(record, participant):
    entry = record['entries'].get(participant)
    if entry is None:
        return 0
    winner = record['winner']
    if record['status'] == 'void' or record['pools'][winner] == 0:
        return entry['stake']
    if entry['range'] != winner:
        return 0
    # Cumulative integer allocation conserves the entire pot, including wei dust.
    prefix = 0
    for address in record['participants']:
        other = record['entries'][address]
        if other['range'] != winner:
            continue
        if address == participant:
            return record['total'] * (prefix + entry['stake']) // record['pools'][winner] - record['total'] * prefix // record['pools'][winner]
        prefix += other['stake']
    return 0


# StudioNet receipts are read from the fixed protocol RPC, never a caller URL.
# Each validator independently reads the immutable parent and its native child.
RECEIPT_RPC = 'https://studio.genlayer.com/api'

def receipt_hash(value):
    require(type(value) is str and len(value) == 66 and value.startswith('0x')
            and all(c in '0123456789abcdefABCDEF' for c in value[2:]), 'invalid receipt hash')
    return value.lower()

def protocol_receipt(tx_hash):
    response = gl.nondet.web.post(RECEIPT_RPC,
        body=json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': 'eth_getTransactionByHash',
                         'params': [tx_hash]}).encode(),
        headers={'Content-Type': 'application/json'})
    require(response.status == 200, 'protocol receipt unavailable; keep claim pending')
    payload = json.loads(response.body.decode('utf-8'))
    require('error' not in payload and type(payload.get('result')) is dict,
            'protocol receipt unavailable; keep claim pending')
    tx = payload['result']
    require(receipt_hash(tx.get('hash')) == tx_hash, 'receipt hash mismatch')
    return tx

def transfer_decision(parent, child, contract, participant, round_id, attempt, amount):
    """Fail closed on absent credit, pending receipts, or unrelated transfers."""
    require(parent.get('status') == 'FINALIZED', 'claim transaction is not finalized')
    require(str(parent.get('from_address', '')).lower() == participant
            and str(parent.get('to_address', '')).lower() == contract,
            'claim sender or contract mismatch')
    leader = (parent.get('consensus_data') or {}).get('leader_receipt', [])
    require(parent.get('result') == 6 and len(leader) > 0
            and leader[0].get('execution_result') == 'SUCCESS', 'claim execution did not succeed')
    encoded = parent.get('data', {}).get('calldata')
    require(type(encoded) is str, 'claim calldata unavailable')
    call = calldata.decode(base64.b64decode(encoded, validate=True))
    require(call == {'method': 'claim', 'args': [round_id, attempt]}, 'claim pool or attempt mismatch')
    children = parent.get('triggered_transactions')
    require(type(children) is list and len(children) == 1
            and receipt_hash(children[0]) == receipt_hash(child.get('hash')), 'transfer parent mismatch')
    require(str(child.get('from_address', '')).lower() == contract
            and str(child.get('to_address', '')).lower() == participant
            and str(child.get('value')) == str(amount), 'transfer recipient or amount mismatch')
    require(child.get('type') == 0 and child.get('consensus_data') is None
            and child.get('triggered_on') == 'finalized', 'not a finalized native transfer emission')
    require(child.get('status') == 'FINALIZED', 'native transfer is still pending')
    credit = child.get('value_credited')
    require(type(credit) is bool, 'native credit is unknown; keep claim pending')
    return 'paid' if credit else 'failed'

@gl.evm.contract_interface
class Recipient:
    class View:
        pass
    class Write:
        pass

class BullseyeForecastPools(gl.Contract):
    bullseye: Address
    pools: TreeMap[str, str]
    pool_ids: DynArray[str]
    latest: TreeMap[str, str]
    source_pools: TreeMap[str, str]
    counter: u256
    total_staked: u256
    total_paid: u256

    def __init__(self, bullseye: str):
        require(int(gl.message.chain_id) == 61999, 'StudioNet-only simulated GEN pools')
        self.bullseye = Address(bullseye)
        self.counter = u256(0)
        self.total_staked = u256(0)
        self.total_paid = u256(0)

    def _source(self, round_id):
        return json.loads(gl.get_contract_at(self.bullseye).view().get_round(round_id))

    def _pool(self, round_id):
        require(round_id in self.pools, 'no pool for this round')
        return json.loads(self.pools[round_id])

    def _save(self, round_id, record):
        self.pools[round_id] = json.dumps(record, sort_keys=True, separators=(',', ':'))

    def _create(self, source_round_id, source):
        spec = source['spec']
        require(spec['mode'] == 'competitive' and source['status'] == 'open', 'upcoming validator specification must be finalized and open')
        require(now() < spec['entry_deadline'], 'entries closed')
        if source_round_id in self.latest:
            round_id = self.latest[source_round_id]
            record = self._pool(round_id)
            require(record['specification_hash'] == source['specification_hash'], 'round specification changed')
            require(record['status'] == 'open', 'entries closed')
            return round_id
        require(len(self.pool_ids) < 2000, 'pool capacity reached')
        self.counter = u256(int(self.counter) + 1)
        round_id = source_round_id + '-pool-v2-' + str(self.counter)
        record = {'id': round_id, 'source_round_id': source_round_id, 'title': spec['event'], 'mode': 'competitive', 'created_at': now(), 'network': 'StudioNet', 'status': 'open', 'specification_hash': source['specification_hash'], 'entry_deadline': spec['entry_deadline'], 'pools': [0 for _ in spec['ranges']], 'ranges': spec['ranges'], 'total': 0, 'participants': [], 'entries': {}, 'claims': {}, 'claim_attempts': {}, 'payout_version': 2, 'winner': None, 'value': None, 'reference_winner': None, 'reference_value': None}
        self._save(round_id, record)
        self.pool_ids.append(round_id)
        self.latest[source_round_id] = round_id
        self.source_pools[source_round_id] = json.dumps([round_id])
        return round_id

    @gl.public.write
    def create_pool(self, source_round_id: str) -> str:
        return self._create(source_round_id, self._source(source_round_id))

    @gl.public.write.payable
    def stake(self, source_round_id: str, chosen_range: int) -> str:
        source = self._source(source_round_id)
        spec = source['spec']
        require(type(chosen_range) is int and 0 <= chosen_range < len(spec['ranges']), 'choose a listed range')
        amount = int(gl.message.value)
        require(MINIMUM <= amount <= MAXIMUM, 'stake between 2 and 100 simulated GEN')
        round_id = self._create(source_round_id, source)
        record = self._pool(round_id)
        participant = str(gl.message.sender_address).lower()
        require(participant not in record['entries'], 'one immutable entry per wallet per market')
        require(len(record['participants']) < 200, 'participant capacity reached')
        record['entries'][participant] = {'range': chosen_range, 'stake': amount}
        record['participants'].append(participant)
        record['pools'][chosen_range] += amount
        record['total'] += amount
        self.total_staked = u256(int(self.total_staked) + amount)
        self._save(round_id, record)
        return round_id

    @gl.public.write
    def settle(self, round_id: str) -> None:
        record = self._pool(round_id)
        require(record['status'] == 'open', 'already settled')
        require(now() >= record['entry_deadline'], 'entries still open')
        source = self._source(record['source_round_id'])
        require(source['specification_hash'] == record['specification_hash'], 'round specification changed')
        # Bullseye only reaches 'resolved' or 'void' through its own finality callbacks.
        if source['status'] == 'resolved':
            record['status'] = 'resolved_pending_finality'
            record['winner'] = source['winner']
            record['value'] = source['evidence']['normalized_value']
        elif source['status'] == 'void':
            record['status'] = 'void_pending_finality'
        else:
            raise gl.vm.UserError('[EXPECTED] Bullseye round is not finalized yet')
        self._save(round_id, record)
        gl.get_contract_at(gl.message.contract_address).emit(on='finalized').finalize(round_id)

    @gl.public.write
    def finalize(self, round_id: str) -> None:
        require(gl.message.sender_address == gl.message.contract_address, 'self callback only')
        record = self._pool(round_id)
        if record['status'] == 'resolved_pending_finality':
            record['status'] = 'resolved'
        elif record['status'] == 'void_pending_finality':
            record['status'] = 'void'
        self._save(round_id, record)

    @gl.public.write
    def claim(self, round_id: str, attempt: int) -> None:
        record = self._pool(round_id)
        participant = str(gl.message.sender_address).lower()
        require(record['status'] in ('resolved', 'void'), 'settle after the Bullseye round finalizes')
        previous = record['claim_attempts'].get(participant)
        require(participant not in record['claims'], 'claim already paid')
        require(previous is None or previous['status'] == 'failed', 'claim already pending')
        require(type(attempt) is int and attempt == (previous['attempt'] + 1 if previous else 1),
                'use the next claim attempt')
        amount = allocation(record, participant)
        require(amount > 0, 'no payout or refund for this wallet')
        require(int(self.balance) >= amount, 'contract balance insufficient; retry after funds return')
        if previous is not None:
            # A failed child may refund asynchronously. Requiring full unpaid
            # backing prevents a retry from spending another pool's escrow.
            require(int(self.balance) >= int(self.total_staked) - int(self.total_paid),
                    'contract balance insufficient; wait for refunds and other claim verification')
        record['claim_attempts'][participant] = {'attempt': attempt, 'amount': amount,
            'status': 'pending', 'claim_hash': None, 'transfer_hash': None}
        self._save(round_id, record)
        # The reservation blocks duplicates, but is not a paid claim.
        Recipient(gl.message.sender_address).emit_transfer(value=u256(amount))

    @gl.public.write
    def verify_claim(self, round_id: str, participant: str, claim_hash: str) -> str:
        record = self._pool(round_id)
        participant = str(Address(participant)).lower()
        pending = record['claim_attempts'].get(participant)
        require(pending is not None, 'no claim attempt for this wallet')
        if pending['status'] != 'pending':
            return pending['status']
        claim_hash = receipt_hash(claim_hash)
        contract = str(gl.message.contract_address).lower()
        attempt, amount = pending['attempt'], pending['amount']

        def observe():
            parent = protocol_receipt(claim_hash)
            children = parent.get('triggered_transactions')
            require(type(children) is list and len(children) == 1, 'native transfer not available yet')
            child_hash = receipt_hash(children[0])
            child = protocol_receipt(child_hash)
            decision = transfer_decision(parent, child, contract, participant, round_id, attempt, amount)
            return {'decision': decision, 'transfer_hash': child_hash}

        # Finalized native receipt fields are deterministic, so strict equality
        # makes every validator fetch and verify the same positive evidence.
        evidence = gl.eq_principle.strict_eq(observe)
        pending.update(status=evidence['decision'] + '_pending_finality',
                       claim_hash=claim_hash, transfer_hash=evidence['transfer_hash'])
        self._save(round_id, record)
        gl.get_contract_at(gl.message.contract_address).emit(on='finalized').finalize_claim(
            round_id, participant, attempt)
        return pending['status']

    @gl.public.write
    def finalize_claim(self, round_id: str, participant: str, attempt: int) -> None:
        require(gl.message.sender_address == gl.message.contract_address, 'self callback only')
        record = self._pool(round_id)
        pending = record['claim_attempts'].get(participant)
        # A delayed/replayed callback cannot alter a later retry.
        if pending is None or pending['attempt'] != attempt:
            return
        if pending['status'] == 'paid_pending_finality':
            pending['status'] = 'paid'
            record['claims'][participant] = pending['amount']
            self.total_paid = u256(int(self.total_paid) + pending['amount'])
        elif pending['status'] == 'failed_pending_finality':
            pending['status'] = 'failed'
        self._save(round_id, record)

    @gl.public.view
    def get_claim(self, round_id: str, participant: str) -> str:
        record = self._pool(round_id)
        pending = record['claim_attempts'].get(participant.lower())
        if pending is None:
            return json.dumps({'status': 'available', 'attempt': 0,
                               'amount': str(allocation(record, participant.lower()))
                               if record['status'] in ('resolved', 'void') else '0'})
        return json.dumps({**pending, 'amount': str(pending['amount'])}, sort_keys=True)

    @gl.public.view
    def get_bullseye(self) -> str:
        return self.bullseye.as_hex

    @gl.public.view
    def get_pool_ids(self) -> list[str]:
        return list(self.pool_ids)

    @gl.public.view
    def get_pool(self, round_id: str) -> str:
        record = self._pool(round_id)
        # Encode wei as strings to avoid JavaScript precision loss.
        record['pools'] = [str(v) for v in record['pools']]
        record['total'] = str(record['total'])
        for entry in record['entries'].values():
            entry['stake'] = str(entry['stake'])
        record['claims'] = {key: str(value) for key, value in record['claims'].items()}
        record['claim_attempts'] = {key: {**value, 'amount': str(value['amount'])}
                                    for key, value in record['claim_attempts'].items()}
        return json.dumps(record, sort_keys=True, separators=(',', ':'))

    @gl.public.view
    def get_claimable(self, round_id: str, participant: str) -> str:
        if round_id not in self.pools:
            return '0'
        record = self._pool(round_id)
        participant = participant.lower()
        if record['status'] not in ('resolved', 'void') or participant in record['claims']:
            return '0'
        pending = record['claim_attempts'].get(participant)
        if pending is not None and pending['status'] != 'failed':
            return '0'
        return str(allocation(record, participant))

    @gl.public.view
    def get_source_pool_ids(self, source_round_id: str) -> list[str]:
        return json.loads(self.source_pools[source_round_id]) if source_round_id in self.source_pools else []
