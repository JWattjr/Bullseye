# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""StudioNet-only GEN pool rehearsal. Known synthetic outcome; no film wager."""
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
    if record['status'] == 'void' or record['pools'][1] == 0:
        return entry['stake']
    if entry['range'] != 1:
        return 0
    # Cumulative integer allocation conserves the entire pot, including wei dust.
    prefix = 0
    for address in record['participants']:
        other = record['entries'][address]
        if other['range'] != 1:
            continue
        if address == participant:
            return record['total'] * (prefix + entry['stake']) // record['pools'][1] - record['total'] * prefix // record['pools'][1]
        prefix += other['stake']
    return 0

@gl.evm.contract_interface
class Recipient:
    class View:
        pass
    class Write:
        pass

class BullseyePoolRehearsal(gl.Contract):
    rounds: TreeMap[str, str]
    round_ids: DynArray[str]
    counter: u256

    def __init__(self):
        require(int(gl.message.chain_id) == 61999, 'StudioNet-only simulated GEN rehearsal')
        self.counter = u256(0)

    def _round(self, round_id):
        require(round_id in self.rounds, 'unknown pool')
        return json.loads(self.rounds[round_id])

    def _save(self, round_id, record):
        self.rounds[round_id] = json.dumps(record, sort_keys=True, separators=(',', ':'))

    @gl.public.write
    def start_demo(self) -> str:
        require(len(self.round_ids) < 2000, 'rehearsal capacity reached')
        self.counter = u256(int(self.counter) + 1)
        round_id = 'pool-' + str(self.counter)
        time = now()
        self._save(round_id, {'id': round_id, 'title': 'The Last Projection', 'mode': 'synthetic', 'network': 'StudioNet', 'status': 'open', 'entry_deadline': time + 120, 'observation_time': time + 123, 'resolution_deadline': time + 600, 'minimum': MINIMUM, 'maximum': MAXIMUM, 'pools': [0, 0, 0], 'total': 0, 'participants': [], 'entries': {}, 'claims': {}, 'winner': None, 'value': None, 'fixture': 'SYNTHETIC domestic opening weekend USD $42,500,000; winning range 1 is known before entry. This tests wallets and accounting, not prediction skill.'})
        self.round_ids.append(round_id)
        return round_id

    @gl.public.write.payable
    def stake(self, round_id: str, chosen_range: int) -> None:
        record = self._round(round_id)
        participant = str(gl.message.sender_address).lower()
        amount = int(gl.message.value)
        require(record['status'] == 'open' and now() < record['entry_deadline'], 'entries closed')
        require(type(chosen_range) is int and 0 <= chosen_range < 3, 'choose a listed range')
        require(MINIMUM <= amount <= MAXIMUM, 'stake between 2 and 100 simulated GEN')
        require(participant not in record['entries'], 'one immutable entry per wallet')
        require(len(record['participants']) < 200, 'participant capacity reached')
        record['entries'][participant] = {'range': chosen_range, 'stake': amount}
        record['participants'].append(participant)
        record['pools'][chosen_range] += amount
        record['total'] += amount
        self._save(round_id, record)

    @gl.public.write
    def resolve(self, round_id: str) -> None:
        record = self._round(round_id)
        require(record['status'] == 'open', 'already resolving or resolved')
        require(record['observation_time'] <= now() < record['resolution_deadline'], 'outside observation window')
        record['status'] = 'resolved_pending_finality'
        record['winner'] = 1
        record['value'] = 42500000
        self._save(round_id, record)
        gl.get_contract_at(gl.message.contract_address).emit(on='finalized').finalize(round_id)

    @gl.public.write
    def void(self, round_id: str) -> None:
        record = self._round(round_id)
        require(record['status'] == 'open' and now() >= record['resolution_deadline'], 'void only after unresolved deadline')
        record['status'] = 'void_pending_finality'
        self._save(round_id, record)
        gl.get_contract_at(gl.message.contract_address).emit(on='finalized').finalize(round_id)

    @gl.public.write
    def finalize(self, round_id: str) -> None:
        require(gl.message.sender_address == gl.message.contract_address, 'self callback only')
        record = self._round(round_id)
        if record['status'] == 'resolved_pending_finality':
            record['status'] = 'resolved'
        elif record['status'] == 'void_pending_finality':
            record['status'] = 'void'
        self._save(round_id, record)

    @gl.public.write
    def claim(self, round_id: str) -> None:
        record = self._round(round_id)
        participant = str(gl.message.sender_address).lower()
        require(record['status'] in ('resolved', 'void'), 'wait for successful finalization')
        require(participant not in record['claims'], 'claim already requested')
        amount = allocation(record, participant)
        require(amount > 0, 'no payout or refund for this wallet')
        require(int(self.balance) >= amount, 'contract balance insufficient')
        record['claims'][participant] = amount
        self._save(round_id, record)
        # Transfer executes on finalization. No administrator or backend holds keys.
        Recipient(gl.message.sender_address).emit_transfer(value=u256(amount))

    @gl.public.view
    def get_round_ids(self) -> list[str]:
        return list(self.round_ids)

    @gl.public.view
    def get_round(self, round_id: str) -> str:
        record = self._round(round_id)
        # Encode wei as strings to avoid JavaScript precision loss.
        record['pools'] = [str(v) for v in record['pools']]
        for key in ('total', 'minimum', 'maximum'):
            record[key] = str(record[key])
        for entry in record['entries'].values():
            entry['stake'] = str(entry['stake'])
        record['claims'] = {key: str(value) for key, value in record['claims'].items()}
        return json.dumps(record, sort_keys=True, separators=(',', ':'))

    @gl.public.view
    def get_claimable(self, round_id: str, participant: str) -> str:
        record = self._round(round_id)
        participant = participant.lower()
        if record['status'] not in ('resolved', 'void') or participant in record['claims']:
            return '0'
        return str(allocation(record, participant))
