# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""Upcoming-film StudioNet GEN pools. Entries close before release; settlement uses a finalized Bullseye result. No outcome is written here:
the winning range is read from the Bullseye contract, where validators extracted the published number."""
import json
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

    def __init__(self, bullseye: str):
        require(int(gl.message.chain_id) == 61999, 'StudioNet-only simulated GEN pools')
        self.bullseye = Address(bullseye)
        self.counter = u256(0)

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
        round_id = source_round_id + '-pool-' + str(self.counter)
        record = {'id': round_id, 'source_round_id': source_round_id, 'title': spec['event'], 'mode': 'competitive', 'created_at': now(), 'network': 'StudioNet', 'status': 'open', 'specification_hash': source['specification_hash'], 'entry_deadline': spec['entry_deadline'], 'pools': [0 for _ in spec['ranges']], 'ranges': spec['ranges'], 'total': 0, 'participants': [], 'entries': {}, 'claims': {}, 'winner': None, 'value': None, 'reference_winner': None, 'reference_value': None}
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
    def claim(self, round_id: str) -> None:
        record = self._pool(round_id)
        participant = str(gl.message.sender_address).lower()
        require(record['status'] in ('resolved', 'void'), 'settle after the Bullseye round finalizes')
        require(participant not in record['claims'], 'claim already requested')
        amount = allocation(record, participant)
        require(amount > 0, 'no payout or refund for this wallet')
        require(int(self.balance) >= amount, 'contract balance insufficient')
        record['claims'][participant] = amount
        self._save(round_id, record)
        # Transfer executes on finalization. No administrator or backend holds keys.
        Recipient(gl.message.sender_address).emit_transfer(value=u256(amount))

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
        return json.dumps(record, sort_keys=True, separators=(',', ':'))

    @gl.public.view
    def get_claimable(self, round_id: str, participant: str) -> str:
        if round_id not in self.pools:
            return '0'
        record = self._pool(round_id)
        participant = participant.lower()
        if record['status'] not in ('resolved', 'void') or participant in record['claims']:
            return '0'
        return str(allocation(record, participant))

    @gl.public.view
    def get_source_pool_ids(self, source_round_id: str) -> list[str]:
        return json.loads(self.source_pools[source_round_id]) if source_round_id in self.source_pools else []
