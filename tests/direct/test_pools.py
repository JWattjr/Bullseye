import json
import pytest
from test_bullseye import warp
from conftest import to_hex

@pytest.fixture
def pool(direct_vm,direct_deploy,direct_owner):
    direct_vm._chain_id=61999
    direct_vm.sender=direct_owner
    warp(direct_vm,2000000000)
    contract=direct_deploy('contracts/pool_rehearsal.py')
    contract.start_demo()
    return contract

@pytest.mark.parametrize('amount',[0,10**18,101*10**18])
def test_minimum_and_maximum(pool,direct_vm,amount):
    direct_vm.value=amount
    with direct_vm.expect_revert('stake between'):pool.stake('pool-1',1)
    assert json.loads(pool.get_round('pool-1'))['total']=='0'

def test_closed_duplicate_and_pending_claim(pool,direct_vm,direct_alice):
    direct_vm.sender=direct_alice;direct_vm.value=2*10**18
    pool.stake('pool-1',1)
    with direct_vm.expect_revert('one immutable'):pool.stake('pool-1',0)
    with direct_vm.expect_revert('wait for successful'):pool.claim('pool-1')
    warp(direct_vm,2000000120)
    with direct_vm.expect_revert('entries closed'):pool.stake('pool-1',2)
    direct_vm.value=0;warp(direct_vm,2000000123);pool.resolve('pool-1')
    assert pool.get_claimable('pool-1',to_hex(direct_alice))=='0'
    with direct_vm.expect_revert('self callback'):pool.finalize('pool-1')
    direct_vm.sender=direct_vm._contract_address;pool.finalize('pool-1')
    assert json.loads(pool.get_round('pool-1'))['status']=='resolved'
    assert pool.get_claimable('pool-1',to_hex(direct_alice))==str(2*10**18)

@pytest.mark.parametrize('voided',[False,True])
def test_refunds_wait_for_callback(pool,direct_vm,direct_alice,voided):
    direct_vm.sender=direct_alice;direct_vm.value=2*10**18;pool.stake('pool-1',0)
    direct_vm.value=0
    with direct_vm.expect_revert('void only after'):pool.void('pool-1')
    warp(direct_vm,2000000600 if voided else 2000000123)
    if voided:pool.void('pool-1')
    else:pool.resolve('pool-1')
    assert pool.get_claimable('pool-1',to_hex(direct_alice))=='0'
    direct_vm.sender=direct_vm._contract_address;pool.finalize('pool-1')
    assert pool.get_claimable('pool-1',to_hex(direct_alice))==str(2*10**18)

def test_allocation_conserves_dust_and_empty_winner_refunds():
    # Extract the pure function without importing a second GenVM SDK instance.
    import ast
    source=open('contracts/pool_rehearsal.py',encoding='utf8').read()
    node=next(n for n in ast.parse(source).body if isinstance(n,ast.FunctionDef) and n.name=='allocation')
    namespace={};exec(compile(ast.Module(body=[node],type_ignores=[]),'allocation','exec'),namespace)
    allocate=namespace['allocation']
    record={'status':'resolved','entries':{'a':{'range':1,'stake':2},'b':{'range':1,'stake':3},'c':{'range':0,'stake':2}},'participants':['a','b','c'],'pools':[2,5,0],'total':7}
    assert [allocate(record,x) for x in record['participants']]==[2,5,0]
    assert sum(allocate(record,x) for x in record['participants'])==7
    record['status']='void'
    assert [allocate(record,x) for x in record['participants']]==[2,3,2]
    record['status']='resolved';record['pools'][1]=0
    assert allocate(record,'c')==2
