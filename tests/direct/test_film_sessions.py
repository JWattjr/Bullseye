import json
import pytest
from test_bullseye import warp,spec
from conftest import to_hex
GEN=10**18
MARKET='0x'+'11'*20

@pytest.fixture
def films(direct_vm,direct_deploy,direct_owner,monkeypatch):
    direct_vm._chain_id=61999;direct_vm.sender=direct_owner;warp(direct_vm,2000000000)
    pools=direct_deploy('contracts/film_pools.py',MARKET)
    import genlayer.gl as sdk
    sources={key:{'spec':spec(),'status':'resolved','specification_hash':key,'winner':2,'evidence':{'normalized_value':value}} for key,value in [('barbie',162022044),('oppenheimer',82455420),('dune',82505391)]}
    class Source:
        def view(self):return self
        def get_round(self,identifier):return json.dumps(sources[identifier])
    original=sdk.get_contract_at
    monkeypatch.setattr(sdk,'get_contract_at',lambda address:Source() if address.as_hex.lower()==MARKET else original(address))
    return pools,sources

@pytest.mark.parametrize('movie',['barbie','oppenheimer','dune'])
def test_first_movie_stake_starts_shared_pool_and_finality_gates_claim(films,direct_vm,direct_alice,direct_bob,movie):
    pools,sources=films
    direct_vm.sender=direct_alice;direct_vm.value=2*GEN
    identifier=pools.stake(movie,2)
    direct_vm.sender=direct_bob;direct_vm.value=3*GEN
    assert pools.stake(movie,0)==identifier
    assert json.loads(pools.get_pool(identifier))['total']==str(5*GEN)
    direct_vm.value=0
    with direct_vm.expect_revert('entries still open'):pools.settle(identifier)
    warp(direct_vm,2000000120);pools.settle(identifier)
    assert pools.get_claimable(identifier,to_hex(direct_alice))=='0'
    with direct_vm.expect_revert('self callback'):pools.finalize(identifier)
    direct_vm.sender=direct_vm._contract_address;pools.finalize(identifier)
    record=json.loads(pools.get_pool(identifier))
    assert record['value']==sources[movie]['evidence']['normalized_value'] and record['winner']==2
    assert pools.get_claimable(identifier,to_hex(direct_alice))==str(5*GEN)
    assert pools.get_claimable(identifier,to_hex(direct_bob))=='0'

def test_rollover_and_separate_movies_preserve_old_claims(films,direct_vm,direct_alice):
    pools,_=films;direct_vm.sender=direct_alice;direct_vm.value=2*GEN
    first=pools.stake('barbie',2);other=pools.stake('dune',2)
    with direct_vm.expect_revert('one immutable'):pools.stake('barbie',3)
    warp(direct_vm,2000000120);second=pools.stake('barbie',0)
    assert len({first,second,other})==3
    assert pools.get_source_pool_ids('barbie')==[first,second]
    direct_vm.value=0;pools.settle(first);direct_vm.sender=direct_vm._contract_address;pools.finalize(first)
    assert pools.get_claimable(first,to_hex(direct_alice))==str(2*GEN)

@pytest.mark.parametrize('status',['open','resolved_pending_finality','void'])
def test_source_must_already_have_validator_result(films,direct_vm,status):
    pools,sources=films;sources['barbie']['status']=status;direct_vm.value=2*GEN
    with direct_vm.expect_revert('validator result'):pools.stake('barbie',2)
    assert pools.get_pool_ids()==[]

def test_no_winner_refunds_and_changed_spec_blocks_settlement(films,direct_vm,direct_alice):
    pools,sources=films;direct_vm.sender=direct_alice;direct_vm.value=2*GEN;identifier=pools.stake('barbie',0)
    direct_vm.value=0;warp(direct_vm,2000000120);sources['barbie']['specification_hash']='changed'
    with direct_vm.expect_revert('specification changed'):pools.settle(identifier)
    sources['barbie']['specification_hash']='barbie';pools.settle(identifier);direct_vm.sender=direct_vm._contract_address;pools.finalize(identifier)
    assert pools.get_claimable(identifier,to_hex(direct_alice))==str(2*GEN)
