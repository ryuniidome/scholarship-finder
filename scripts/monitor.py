import json
import hashlib
import urllib.request
import sys
import os

def fetch_hash(url, timeout=15):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return hashlib.sha256(resp.read()).hexdigest()
    except Exception as e:
        return f"ERROR: {e}"

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    scholarships_path = os.path.join(base_dir, 'data', 'scholarships.json')
    hashes_path = os.path.join(base_dir, 'scripts', 'hashes.json')
    changes_path = os.path.join(base_dir, 'scripts', 'changes.json')

    with open(scholarships_path) as f:
        data = json.load(f)

    prev_hashes = {}
    if os.path.exists(hashes_path):
        with open(hashes_path) as f:
            prev_hashes = json.load(f)

    new_hashes = {}
    changed = []

    for s in data['scholarships']:
        url = s['url']
        name = s['name']
        print(f"Checking: {name}", file=sys.stderr)
        h = fetch_hash(url)
        new_hashes[url] = h

        if url in prev_hashes and prev_hashes[url] != h:
            note = 'エラー（サイト到達不可）' if h.startswith('ERROR') else '内容に変更あり'
            changed.append({'name': name, 'url': url, 'note': note})

    with open(hashes_path, 'w') as f:
        json.dump(new_hashes, f, ensure_ascii=False, indent=2)

    with open(changes_path, 'w') as f:
        json.dump(changed, f, ensure_ascii=False, indent=2)

    if changed:
        print(f"{len(changed)}件の変更を検知しました。", file=sys.stderr)
        sys.exit(1)
    else:
        print("変更なし。", file=sys.stderr)
        sys.exit(0)

if __name__ == '__main__':
    main()
