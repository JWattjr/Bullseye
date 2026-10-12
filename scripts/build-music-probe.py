"""Bundle the exact parser into a single-file, pinned zero-value diagnostic."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
source = (ROOT / 'tests/fixtures/music_access_probe.py').read_text()
parser = (ROOT / 'contracts/music_rows.py').read_text()
source = source.replace('class MusicAccessProbe', parser + '\n\nclass MusicArchiveRowsProbe')
source = source.replace("return {'status': response.status", """row_count = body.count('o-chart-results-list-row-container')
            digest = ''
            error = ''
            first_row = {}
            last_row = {}
            if chart:
                try:
                    extracted = extract_rows(body)
                    digest = rows_digest(extracted)
                    first_row, last_row = extracted[0], extracted[-1]
                except ValueError as failure:
                    error = str(failure)
            return {'row_containers': row_count, 'rows_digest': digest,
                    'extraction_error': error, 'first_row': first_row, 'last_row': last_row,
                    'status': response.status""")
source = source.replace("'capture_count', 'first_capture'))",
                        "'capture_count', 'first_capture', 'rows_digest', 'extraction_error', 'row_containers'))")
(ROOT / 'tests/fixtures/music_archive_rows_probe.py').write_text(source, encoding='utf-8')
