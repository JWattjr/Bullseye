"""The direct VM bypasses entry dispatch: check the actual public SDK metadata."""
import ast
from pathlib import Path

def test_deposits_are_explicitly_payable_and_other_writes_are_not():
    tree=ast.parse(Path('contracts/music_challenges.py').read_text(encoding='utf-8'))
    cls=next(node for node in tree.body if isinstance(node,ast.ClassDef) and node.name=='BullseyeMusicChallenges')
    payable={node.name for node in cls.body if isinstance(node,ast.FunctionDef) and any(ast.unparse(item)=='gl.public.write.payable' for item in node.decorator_list)}
    assert payable=={'list_market','challenge'}
