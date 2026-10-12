"""Produce the standalone GenVM contract from shared deterministic extraction."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
logic = (ROOT / 'contracts/music_market_logic.py').read_text(encoding='utf-8')
header, body = logic.split('\n', 1)
parser = (ROOT / 'contracts/music_rows.py').read_text(encoding='utf-8')
(ROOT / 'contracts/music_markets.py').write_text(header + '\n' + parser + '\n' + body, encoding='utf-8')
