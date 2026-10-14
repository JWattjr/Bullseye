"""Failed native deposit recovery verifies finality, recipient and one-time credit."""
import base64
import json
from types import SimpleNamespace
import pytest
from test_bullseye import warp
from conftest import to_hex
from test_musicplus_challenges import RULES,DEPOSIT

@pytest.fixture
def failed_deposit(direct_vm,direct_owner,direct_deploy,monkeypatch):
    direct_vm.sender=direct_owner
    direct_vm._chain_id=61999
    warp(direct_vm,2000000000)
    contract=direct_deploy('contracts/music_challenges.py',RULES,json.dumps(['media.rhino.com']))
    from genlayer.py import calldata
    import genlayer.gl as sdk
    parent={'hash':'0x'+'ab'*32,'status':'FINALIZED','value_credited':True,'value':str(DEPOSIT),
      'from_address':to_hex(direct_owner),'to_address':to_hex(direct_vm._contract_address),
      'consensus_data':{'leader_receipt':[{'execution_result':'ERROR'}]},
      'data':{'calldata':base64.b64encode(calldata.encode({'method':'list_market','args':['invalid']})).decode()}}
    monkeypatch.setattr(sdk.nondet.web,'post',lambda *args,**kwargs:SimpleNamespace(status=200,body=json.dumps({'result':parent}).encode()))
    direct_vm.deal(direct_vm._contract_address,DEPOSIT)
    return contract,parent

def test_failed_deposit_is_pull_credit_for_original_sender_once(failed_deposit,direct_owner):
    contract,parent=failed_deposit
    contract.recover_failed_deposit(parent['hash'])
    contract.recover_failed_deposit(parent['hash'])
    assert json.loads(contract.get_credit(to_hex(direct_owner)))['available']==str(DEPOSIT)
    assert json.loads(contract.get_config())['total_deposited']==str(DEPOSIT)

@pytest.mark.parametrize('change,reason', [({'status':'ACCEPTED'},'finalized failed'),({'value_credited':None},'actual native'),({'to_address':'0x'+'99'*20},'recipient mismatch'),({'value':'1'},'exact failed')])
def test_unrelated_or_unconfirmed_failed_deposit_cannot_credit(failed_deposit,direct_vm,direct_owner,change,reason):
    contract,parent=failed_deposit
    parent.update(change)
    with direct_vm.expect_revert(reason):contract.recover_failed_deposit(parent['hash'])
    assert json.loads(contract.get_credit(to_hex(direct_owner)))['available']=='0'

def test_successful_deposit_cannot_be_reclaimed_as_a_failure(failed_deposit,direct_vm):
    contract,parent=failed_deposit
    parent['consensus_data']['leader_receipt'][0]['execution_result']='SUCCESS'
    with direct_vm.expect_revert('failed execution'):contract.recover_failed_deposit(parent['hash'])

def test_failed_deposit_needs_unaccounted_balance(failed_deposit,direct_vm):
    contract,parent=failed_deposit
    direct_vm.deal(direct_vm._contract_address,DEPOSIT-1)
    with direct_vm.expect_revert('backing required'):contract.recover_failed_deposit(parent['hash'])
