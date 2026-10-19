"""Check documentation references and its correspondence to the local prototype.

Run from any directory: python docs/check_docs.py
Only the report in output/docs is written; application state is never touched.
"""

from datetime import datetime, timezone
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs'
REPORT = ROOT / 'output' / 'docs' / '文档自动检查.json'


def main():
    files = [ROOT / 'AGENTS.md', ROOT / 'design' / 'README.md']
    files += sorted(DOCS.glob('*.md'))
    archive = DOCS / 'history' / '2026-10-19-structure-v0.1' / '页面模块与初始化范围.md'
    files.append(archive)
    checks = []

    def add(name, errors, **details):
        checks.append({'name': name, 'passed': not errors, 'errors': errors, **details})

    missing = [str(p.relative_to(ROOT)) for p in files if not p.is_file()]
    add('document_files_exist', missing, count=len(files))
    if missing:
        texts = {}
    else:
        texts = {p: p.read_text(encoding='utf-8') for p in files}

    broken, count = [], 0
    for path, text in texts.items():
        for match in re.finditer(r'\]\(([^)]+)\)', text):
            target = match.group(1).strip().strip('<>')
            parsed = urlsplit(target)
            if parsed.scheme or not parsed.path:
                continue
            count += 1
            resolved = (path.parent / unquote(parsed.path)).resolve()
            # This run creates REPORT after all checks, including on first use.
            if resolved != REPORT.resolve() and not resolved.exists():
                broken.append({'file': path.relative_to(ROOT).as_posix(), 'target': target})
    add('local_markdown_links', broken, count=count,
        scope='Current root documents and the newly archived structure. No remote URL or legacy-history audit.')

    format_errors = []
    for path, text in texts.items():
        problems = []
        if '\ufffd' in text:
            problems.append('Unicode replacement character')
        if len(re.findall(r'^```', text, re.M)) % 2:
            problems.append('Unclosed fenced code block')
        if not re.search(r'^# .+', text, re.M):
            problems.append('Missing document title')
        if any(line.rstrip() != line for line in text.splitlines()):
            problems.append('Trailing whitespace')
        if problems:
            format_errors.append({'file': path.relative_to(ROOT).as_posix(), 'problems': problems})
    add('markdown_and_encoding_basics', format_errors)

    rules = texts.get(DOCS / '一期产品规则与业务流程.md', '')
    ids = re.findall(r'^\| (C\d{2}) \|', rules, re.M)
    expected = [f'C{i:02d}' for i in range(1, 37)]
    add('confirmed_rule_ids', [] if ids == expected else [{'actual': ids, 'expected': expected}], count=len(ids))

    app = (ROOT / 'design' / 'app.mjs').read_text(encoding='utf-8')
    title_match = re.search(r'const titles=\{(.*?)\};', app, re.S)
    code_routes = set(re.findall(r"(\w+):'[^']*'", title_match.group(1))) if title_match else set()
    catalog = texts.get(DOCS / '页面模块与初始化范围.md', '')
    rows = re.findall(r'^\| (P\d{2}) \| ([^\n]+)', catalog, re.M)
    doc_routes = set()
    for _, row in rows:
        doc_routes.update(re.findall(r'#([a-z]+)', row))
    route_errors = []
    if len(rows) != 16 or len({i for i, _ in rows}) != 16:
        route_errors.append({'expected_page_count': 16, 'actual': len(rows)})
    if code_routes != doc_routes:
        route_errors.append({'missing_in_docs': sorted(code_routes - doc_routes),
                             'not_in_code': sorted(doc_routes - code_routes)})
    add('page_catalog_matches_route_names', route_errors, routes=sorted(code_routes))

    pkg = json.loads((ROOT / 'design' / 'package.json').read_text(encoding='utf-8'))
    run_text = texts.get(ROOT / 'design' / 'README.md', '')
    script_names = re.findall(r'npm --prefix design (?:run )?(\w+)', run_text)
    script_errors = [name for name in script_names if name not in pkg['scripts']]
    if pkg['version'] != '0.3.1' or 'v0.3.1' not in run_text:
        script_errors.append('Application version must be reviewed and matched')
    add('documented_npm_commands', script_errors, scripts=sorted(set(script_names)), version=pkg['version'])

    contract = texts.get(DOCS / '数据模型与业务接口契约.md', '')
    store = (ROOT / 'design' / 'store.mjs').read_text(encoding='utf-8')
    exports = re.findall(r'export function (\w+)\(', store)
    required = ['readDB', 'initialize', 'gift', 'checkin', 'activity', 'eligible', 'draw',
                'createOrder', 'pay', 'saveLook', 'saveWork']
    absent = [name for name in required if name not in exports or f'`{name}`' not in contract]
    add('current_domain_functions_mapped', absent, functions=required)

    test_text = texts.get(DOCS / '测试与发布验收.md', '')
    scripts = sorted(set(re.findall(r'`([a-z][\w.-]*\.(?:js|mjs))`', test_text)))
    add('referenced_test_scripts_exist',
        [name for name in scripts if not (ROOT / 'design' / 'tests' / name).is_file()], scripts=scripts)

    old_wording = []
    for path, text in texts.items():
        if 'history' in path.relative_to(ROOT).parts:
            continue
        for marker in ['产品规则 v0.7', '完整体验与验收标准 v0.3]', '下一步统一划分游客端模块',
                       '具体交互与素材规格采用下述实现方案待后续整体审核']:
            if marker in text:
                old_wording.append({'file': path.relative_to(ROOT).as_posix(), 'text': marker})
    add('superseded_active_wording', old_wording)

    result = {
        'checkedAt': datetime.now(timezone.utc).isoformat(),
        'applicationVersion': pkg['version'],
        'passed': all(c['passed'] for c in checks),
        'checks': checks,
        'limits': ['No application tests were rerun.', 'Semantic and implementation review is recorded separately.',
                   'Hash parameters, remote URLs and Mermaid rendering are not executed by this checker.'],
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'passed': result['passed'], 'checks': len(checks), 'documents': len(files),
                      'report': REPORT.relative_to(ROOT).as_posix()}, ensure_ascii=True))
    for check in checks:
        if not check['passed']:
            print(json.dumps(check, ensure_ascii=True))
    return 0 if result['passed'] else 1


if __name__ == '__main__':
    sys.exit(main())
