"""R00 结构与边界检查；不把文档检查当成产品用例通过。"""
import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path.cwd()
OUT = ROOT / 'output/r00/2026-11-08'
BASE = '8c5ba355b4b60708ea8210c238ebfd563b896bde'
checks = []

def git(*args):
    return subprocess.check_output(['git', *args], encoding='utf-8').strip()

def read(name):
    return (ROOT / name).read_text(encoding='utf-8')

def add(name, passed, **details):
    checks.append({'name': name, 'passed': bool(passed), **details})

tasks = read('docs/内测实施任务详表.md')
cards = re.findall(r'^### (R\d{2}-\d{2}) ([^\n]+)\n(.*?)(?=^### |^## |\Z)', tasks, re.M | re.S)
add('45_unique_tasks', len(cards) == 45 and len({c[0] for c in cards}) == 45)
statuses = {task: re.search(r'状态／负责\*\*：([^；]+)', body).group(1) for task, _, body in cards}
add('only_r00_accepted', all(value == ('已验收' if key.startswith('R00-') else '待开始') for key, value in statuses.items()), statuses=statuses)
add('task_fields_preserved', all(all(label in body for label in ['状态／负责', '前置输入', '目标与效果', '交付物', '验收', '异常／回退']) for _, _, body in cards))

old_rules = git('show', BASE + ':docs/一期产品规则与业务流程.md')
rules = read('docs/一期产品规则与业务流程.md')
rule_lines = lambda s: re.findall(r'^\| (?:C\d{2}|P\d{2}) \|[^\n]+', s, re.M)
add('39_historical_confirmations_unchanged', len(rule_lines(rules)) == 39 and rule_lines(rules) == rule_lines(old_rules))

scope = read('docs/R00内测范围与决策台账.md')
routes = set(re.findall(r'^\| `([a-z]+)` \|', scope, re.M))
title_literal = re.search(r'const titles=\{(.*?)\};', read('design/app.mjs'), re.S).group(1)
actual_routes = set(re.findall(r"(\w+):'[^']*'", title_literal)) | {'order'}
add('17_current_routes_scoped', len(routes) == 17 and routes == actual_routes, routes=sorted(routes))
decisions = scope.split('## D01—D09 执行台账')[1].split('## 责任、资源缺口')[0]
ids = re.findall(r'^\| (D\d{2}) ', decisions, re.M)
add('9_decisions_with_gates', ids == [f'D{i:02}' for i in range(1, 10)] and all('G' in line for line in decisions.splitlines() if re.match(r'^\| D\d{2} ', line)))
add('confirmed_wechat_and_mock_scope', 'D04 已确认' in rules and 'D05 已确认支持范围' in rules and '暂不真实收款' in scope and '不能' in scope and all(f'| M{i:02} |' in scope for i in range(1, 5)))

cases = re.findall(r'^\| ((?:PR|AU|AN|BZ|SY|MW|UX|OP|PI)\d{2}) \|', read('docs/内测验收用例与发布清单.md'), re.M)
add('61_case_ids_preserved', len(cases) == 61 and len(set(cases)) == 61)
selection = json.loads(read('reviews/2026-11-05-wardrobe/selected/selection.json'))
asset_ids = [slot['assetId'] for outfit in selection['outfits'] for slot in outfit['slots'].values()]
add('six_confirmed_outfits_24_unique_clothing_ids', [o['id'] for o in selection['outfits']] == ['A1', 'A2', 'C3', 'A4', 'B5', 'A6'] and len(set(asset_ids)) == 24)

inventory = json.loads((OUT / 'baseline-inventory.json').read_text(encoding='utf-8'))
changed = [item['path'] for item in inventory['assets'] + inventory['modules'] if hashlib.sha256((ROOT / item['path']).read_bytes()).hexdigest() != item['sha256']]
add('inventoried_inputs_unchanged', not changed, changed=changed, rasterCount=len(inventory['assets']), moduleCount=len(inventory['modules']))
protected_changes = git('diff', '--name-only', BASE, '--', 'design', 'research', 'reviews', 'output/planning', 'output/housekeeping')
add('application_original_art_history_unchanged', not protected_changes, changed=protected_changes.splitlines())

rebuilt = json.loads((OUT / 'rebuild-check.json').read_text(encoding='utf-8'))
add('static_rebuild_available_with_difference_recorded', len(rebuilt['records']) == 2 and len(rebuilt['pixelChecks']) == 10 and all(r['framesMatch'] for r in rebuilt['records']) and all(r['alphaPixelsEqual'] for r in rebuilt['pixelChecks']) and not rebuilt['allDecodedPixelsMatch'], exactPixelFiles=sum(r['decodedPixelsEqual'] for r in rebuilt['pixelChecks']), limitation='Not an exact-pixel or animation-production pass.')
demo = json.loads((OUT / 'demo-baseline-check.json').read_text(encoding='utf-8'))
add('existing_demo_baseline_passed', not demo['errors'] and len(demo['sizes']) == 6 and [m['balance'] for m in demo['marks']] == [0, 0, 2, 1, 3, 4, 6, 5, 15], limitation='Desktop Chrome and local demo only; no mobile/cloud/animation certification.')
branch = git('branch', '--show-current')
add('isolated_r00_branch', branch == 'codex/internal-alpha-r00-20261108', branch=branch, baseCommit=BASE)

result = {'date': '2026-11-08', 'scope': 'R00 preparation structural checks; G1-G6 not executed', 'checks': checks, 'passed': all(c['passed'] for c in checks)}
(OUT / 'acceptance-check.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'passed': result['passed'], 'checks': len(checks), 'failed': [c['name'] for c in checks if not c['passed']]}, ensure_ascii=False))
raise SystemExit(0 if result['passed'] else 1)
