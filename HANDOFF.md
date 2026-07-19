# scholarship-finder 引き継ぎ資料

留学奨学金診断Webサービスの開発・運用引き継ぎ資料です。ドメイン移管（サブドメイン化）を主な依頼としてお渡しします。

## 1. プロジェクト概要

日本人学生・社会人が、簡単な診断（6つの質問）に答えることで自分に合った留学奨学金を探せる静的Webサイトです。ビルドプロセスを持たない素のHTML/CSS/JSで、バックエンドはありません。

- 対象ユーザー: 留学を検討している日本人（高校生〜大学院生、一部社会人・研究者）
- 主な機能:
  1. 診断UI（質問に答えると該当する奨学金が一覧表示される）
  2. 奨学金データベース（JSON、現在71件）
  3. 奨学金サイトの変更監視（GitHub Actions + Pythonスクリプト、週1回）

## 2. リポジトリ

- GitHub: https://github.com/ryuniidome/scholarship-finder
- ブランチ: `main`（デプロイ対象。ブランチ保護等は未設定）

### ディレクトリ構成
```
scholarship-finder/
  index.html          # 診断UIのマークアップ
  style.css
  app.js               # 診断ロジック（質問定義・マッチング・結果表示すべてここ）
  data/
    scholarships.json  # 奨学金データベース（本体）
  scripts/
    monitor.py          # 奨学金サイトの変更検知スクリプト（後述）
    hashes.json          # 各奨学金URLのコンテンツハッシュ（monitor.pyが自動更新）
  .github/workflows/
    monitor.yml          # monitor.pyを毎週実行するGitHub Actions
  CLAUDE.md             # プロジェクトの設計メモ（AI開発補助ツール向けだが、経緯を把握する上で人間が読んでも有用）
```

ビルドコマンドは存在しません（Netlifyの設定でもBuild command・Publish directoryは空欄/ルートのまま）。

## 3. データ構造（`data/scholarships.json`）

`{ "scholarships": [ {...}, {...} ] }` という単純な配列。1件のスキーマ：

```jsonc
{
  "id": "kebab-case-slug",           // 一意なID
  "name": "奨学金名",
  "organization": "実施団体",
  "category": "government | private | destination", // 政府系 / 民間財団 / 留学先国・機関
  "amount": "給付額（自由記述）",
  "duration": "留学期間（自由記述・表示用）",
  "deadline": "締切（自由記述・表示用。日付が変動するため多くが概算表記）",
  "url": "公式サイトURL",
  "description": "説明文",
  "notes": "補足・注意事項（任意）",
  "num_recipients": "募集人数（任意）",
  "language_requirement": "語学要件（任意）",
  "combinable": "他奨学金との併給可否（任意）",
  "post_obligation": "卒業後の義務（任意）",
  "career_changer_status": "ok | caution | unconfirmed",  // 社会人が応募しやすいか（一部の主要奨学金にのみ付与、8件）
  "career_changer_note": "↑の根拠・補足（任意）",
  "eligibility": {
    "degree_levels": ["high_school","undergraduate","masters","phd"], // 診断の質問1に対応
    "regions": ["north_america","europe","asia","oceania","other","any"],
    "purposes": ["language","degree","research","career","any"],
    "duration_months": { "min": 0, "max": null }, // nullは制限なし
    "nationality": ["japanese","permanent_resident","other","any"],
    "fields": ["stem","humanities_social","medical","arts","any"]
  }
}
```

マッチングロジックは`app.js`の`matchesScholarship()`関数がすべて。フィールドを追加する場合はここも合わせて修正が必要です。

## 4. 現在のデプロイ状況（要確認）

現在Netlifyでホスティングしており、GitHubの`main`ブランチにpushすると自動デプロイされます（ビルド設定なし）。

**確認・整理をお願いしたい点**: Netlifyアカウント上に、このリポジトリからデプロイされているプロジェクトが2つ存在する可能性があります。
- `pitatobi-scholarship.netlify.app`（直近のセッションで作成）
- `fantastic-cascaron-41ac98.netlify.app`（別セッションで以前作成された可能性あり）

どちらが本番として使われているか、重複していないかをNetlifyダッシュボード（Raigateチーム）で確認し、不要な方があれば削除してください。

## 5. 今回の依頼: サブドメインへの移管

`pitatobi.com`は取得済み・稼働中です（お名前.com管理、DNSサーバー: `dns1/dns2.onamae.com`）。現在ルートドメイン（`pitatobi.com`）には別のサイト（Apache、既存の本体サイト）が乗っているため、**このドメイン直下ではなく、サブドメイン（例: `scholarship.pitatobi.com`）を切って本サイトを紐付ける**方針を想定しています。サブドメイン名は未確定のため、依頼側と相談の上で決めてください。

手順の想定（Netlifyの場合）:
1. Netlifyの対象プロジェクト → Domain settings → Add a domain で希望のサブドメインを追加
2. 表示される指示に従い、お名前.com側のDNS管理画面でサブドメインのCNAMEレコード（またはNetlify指定のALIAS/Aレコード）を追加
   - **注意**: ルートドメイン`pitatobi.com`自体のAレコード（既存サイト向け、`150.95.255.38`）には触れないこと
3. DNS反映後、Netlifyが自動でLet's Encrypt証明書を発行（HTTPS化）

## 6. 定期メンテナンス: 奨学金サイトの変更監視

`.github/workflows/monitor.yml`が毎週月曜0:00 UTC（日本時間9:00）に`scripts/monitor.py`を実行します。

- 動作: `data/scholarships.json`内の各奨学金の`url`にアクセスし、コンテンツのSHA256ハッシュを`scripts/hashes.json`と比較
- 変更を検知した奨学金があれば、その一覧をGitHubのIssueとして自動作成（担当者は`data/scholarships.json`の該当エントリを手動で確認・更新する運用）
- ハッシュ自体は毎回コミット・pushされる（変更有無に関わらず`scripts/hashes.json`は更新される想定）

この仕組み自体はメンテナンス不要ですが、Issueが作成された際にJSONを更新する運用フローは人間（現状は依頼者本人）が担っています。エンジニア側で自動化・引き取る場合は、GitHub Actionsのsecrets（`GITHUB_TOKEN`は組み込みのため追加設定不要）を確認してください。

## 7. 既知の制約・今後の課題

- `career_changer_status`は71件中8件のみに付与済み（主要な大学院向け奨学金のみ調査）。残りの奨学金への調査・付与は未着手
- 診断結果が0件のときのUI文言は簡素なまま（改善の余地あり）
- テストコードは存在しない（静的サイトのため手動確認が前提）
- ローカル未追跡ファイルとして`CLAUDE.md`が存在（プロジェクトの設計背景メモ、Git管理下に入れるかは依頼者判断）
