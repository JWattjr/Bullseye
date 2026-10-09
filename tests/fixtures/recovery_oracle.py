# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""TEST ONLY: fixed-result oracle to exercise a forecast pool without a future film result.

This address is never used by the website or production market manifests.
"""
import json
from datetime import datetime
from genlayer import *

class RecoveryOracle(gl.Contract):
    owner: Address
    deadline: u256
    resolved: bool

    def __init__(self):
        self.owner = gl.message.sender_address
        self.deadline = u256(int(datetime.fromisoformat(str(gl.message_raw['datetime']).replace('Z', '+00:00')).timestamp()) + 180)
        self.resolved = False

    @gl.public.write
    def resolve_fixture(self) -> None:
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError('[EXPECTED] fixture owner only')
        if int(datetime.fromisoformat(str(gl.message_raw['datetime']).replace('Z', '+00:00')).timestamp()) < int(self.deadline):
            raise gl.vm.UserError('[EXPECTED] fixture entries still open')
        self.resolved = True

    @gl.public.view
    def get_round(self, round_id: str) -> str:
        if round_id != 'forecast-recovery-fixture':
            raise gl.vm.UserError('[EXPECTED] fixture round only')
        return json.dumps({'spec': {'mode': 'competitive', 'event': 'TEST ONLY: forecast payout recovery',
                'entry_deadline': int(self.deadline), 'ranges': [{'lower': 0, 'upper': 100000000},
                {'lower': 100000000, 'upper': 150000000}, {'lower': 150000000, 'upper': 200000000},
                {'lower': 200000000, 'upper': None}]},
            'status': 'resolved' if self.resolved else 'open', 'specification_hash': 'test-only-recovery-fixture-v1',
            'winner': 2 if self.resolved else None,
            'evidence': {'normalized_value': 162022044} if self.resolved else None}, sort_keys=True)
