# YOU CHOOSE — 自己分析スワイプ診断

好き嫌いをスワイプして「本当の自分」を見つける自己分析アプリ。

## 特徴
- スワイプで好き/嫌いを直感的に診断（12カテゴリー・各5〜10枚）
- MBTI連動のパーソナル分析
- AIなしでも動くルールエンジン搭載（オフライン・即時表示）
- 診断結果の画像保存・SNSシェア
- localStorageで結果を永続保存・後から見返せる
- PWA対応（ホーム画面に追加でアプリ風に）

## ローカルで動かす
```bash
npm install
npm run dev
```
→ http://localhost:5173 が開きます。

## ビルド
```bash
npm run build      # dist/ が生成される
npm run preview    # ビルド結果をローカル確認
```

## Vercelで公開する手順
1. このフォルダをGitHubにpush
2. https://vercel.com で「New Project」→ GitHubリポジトリを選択
3. フレームワークは自動で「Vite」と認識される（そのままDeploy）
4. 数十秒で `https://<your-project>.vercel.app` が発行される
5. そのURLを友人に送る（インストール不要・ブラウザで開ける）

スマホでは Safari/Chrome の「ホーム画面に追加」でアプリのように使えます。

## AI接続について（後日）
現在はルールエンジンで分析文を生成しています（外部公開でも動作）。
本格的なAI分析を有効にするには：
1. APIキーを隠すバックエンド中継エンドポイントを用意（例: Vercel Serverless Function `/api/analyze`）
2. `src/App.jsx` 冒頭の `AI_ENDPOINT` を中継先URLに変更
3. 環境変数 `VITE_AI_ENABLED=1` を設定

これでルールエンジンを保険に残したままAI分析へ切り替わります。
