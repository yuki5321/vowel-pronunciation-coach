# 🎤 Vowel Pronunciation Coach

**母音発音練習アプリ** - 英語の母音発音を楽しく練習できるWebアプリケーションです！

## 🌟 特徴

- **🎯 母音発音に特化**: æ, e, ɑ, ʌ の母音を重点的に練習
- **🎨 子ども向けデザイン**: カラフルで楽しいUI、大きなボタンで操作しやすい
- **🎵 音素レベル評価**: 発音記号（IPA）で詳細な評価を表示
- **💡 スマートアドバイス**: 音素レベルに基づいた具体的な改善アドバイス
- **🎮 インタラクティブ**: 楽しいアニメーションと視覚的フィードバック
- **📱 レスポンシブ**: スマートフォンやタブレットでも快適に使用

## 🎯 練習内容

### ミニマルペア練習
以下の母音の違いを練習できます：

#### æ vs e
- **had** /hæd/ vs **head** /hed/ (持っていた vs 頭)
- **pan** /pæn/ vs **pen** /pen/ (フライパン vs ペン)
- **bad** /bæd/ vs **bed** /bed/ (悪い vs ベッド)
- **man** /mæn/ vs **men** /men/ (男 vs 男性たち)
- **sad** /sæd/ vs **said** /sed/ (悲しい vs 言った)

#### æ vs ɑ
- **hat** /hæt/ vs **hot** /hɑt/ (帽子 vs 熱い)
- **cap** /kæp/ vs **cop** /kɑp/ (帽子 vs 警察官)
- **sang** /sæŋ/ vs **song** /sɑŋ/ (歌った vs 歌)

#### ʌ vs ɑ
- **hut** /hʌt/ vs **hot** /hɑt/ (小屋 vs 熱い)
- **luck** /lʌk/ vs **lock** /lɑk/ (運 vs 鍵)
- **sung** /sʌŋ/ vs **song** /sɑŋ/ (歌った vs 歌)

### 文章練習
- **"My boss often takes a bus to fish for bass in the pond."**
- 複数の母音を含む文章で総合的な練習ができます

## 🚀 使用方法

### 1. アプリの起動
```bash
npm run dev
```
ブラウザで `http://localhost:3000` を開きます。

### 2. 練習の流れ

#### ステップ1: 練習項目の選択
- 画面上部の「前へ」「次へ」ボタンで練習項目を切り替え
- 単語ペアまたは文章を選択

#### ステップ2: 録音
1. **マイクボタンをクリック**して録音開始
2. **お手本の単語/文章を発音**
3. **もう一度マイクボタンをクリック**して録音停止

#### ステップ3: 評価結果の確認
- **正確性スコア**: 0-100点で評価
- **認識されたテキスト**: システムが聞き取った内容
- **音素レベル評価**: 各音素の発音記号とスコア
- **アドバイス**: 改善点や褒め言葉

### 3. 評価の見方

#### スコア基準
- **80点以上**: 🎉 完璧！素晴らしい発音です
- **60-79点**: ✅ 合格！さらに練習しましょう
- **60点未満**: 🔄 もう一度練習しましょう

#### 音素の色分け
- **🟢 緑**: 完璧な発音 (80点以上)
- **🟡 黄**: 良い発音 (60-79点)
- **🔴 赤**: 改善が必要 (60点未満)

## 🛠️ セットアップ

### 必要な環境
- Node.js (v14以上)
- npm または yarn
- Azure Speech Service のAPIキー

### 1. リポジトリのクローン
```bash
git clone [repository-url]
cd hat-hut-hot-recognition-app
```

### 2. 依存関係のインストール
```bash
npm install
cd api
npm install
cd ..
```

### 3. 環境変数の設定
`api/local.settings.json` ファイルを作成し、Azure Speech Serviceの認証情報を設定：

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "SPEECH_KEY": "your-azure-speech-key",
    "SPEECH_REGION": "your-azure-speech-region"
  }
}
```

### 4. Azure Speech Serviceの設定
1. [Azure Portal](https://portal.azure.com) でSpeech Serviceを作成
2. リソースの「キーとエンドポイント」からキーとリージョンを取得
3. `local.settings.json` に設定

### 5. アプリの起動
```bash
npm run dev
```

これで、Reactアプリ（ポート3000）とAzure Functions（ポート7071）が同時に起動します。

## 📁 プロジェクト構造

```
hat-hut-hot-recognition-app/
├── src/
│   ├── App.js              # メインアプリケーション
│   ├── index.js            # エントリーポイント
│   └── index.css           # スタイルシート
├── api/
│   └── evaluatePronunciation/
│       ├── index.js        # Azure Function (発音評価API)
│       └── function.json   # Function設定
├── public/
│   ├── index.html          # HTMLテンプレート
│   ├── perfect.mp3         # 完璧音
│   ├── pass.mp3           # 合格音
│   └── fail.mp3           # 不合格音
├── package.json            # フロントエンド依存関係
├── host.json              # Azure Functions設定
└── README.md              # このファイル
```

## 🎨 デザインの特徴

### カラーパレット
- **背景**: 美しい紫→青のグラデーション
- **アクセント**: 明るいピンク・オレンジ
- **成功**: 爽やかなティール
- **エラー**: 優しいピンク

### インタラクション
- **ホバーエフェクト**: ボタンが浮き上がる
- **光沢アニメーション**: ボタンに光が流れる
- **バウンス効果**: 結果表示時の楽しいアニメーション
- **音素ホバー**: 音素にマウスオーバーで詳細表示

## 🔧 技術スタック

### フロントエンド
- **React.js**: UIフレームワーク
- **Recorder.js**: 音声録音
- **Axios**: HTTP通信

### バックエンド
- **Azure Functions**: サーバーレスAPI
- **Azure Speech Service**: 発音評価
- **Microsoft Cognitive Services**: 音声認識

### 開発ツール
- **Concurrently**: 並行実行
- **Azure Functions Core Tools**: ローカル開発

## 🐛 トラブルシューティング

### よくある問題

#### 1. マイクの許可が求められない
- ブラウザの設定でマイクの許可を確認
- HTTPS環境で実行（ローカル開発ではlocalhostでも可）

#### 2. APIエラー（404）
- Azure Functionsが起動しているか確認
- `npm run dev` で両方のサービスが起動しているか確認

#### 3. 発音評価が動作しない
- Azure Speech ServiceのAPIキーが正しく設定されているか確認
- インターネット接続を確認

#### 4. 音声ファイルが見つからない
- `public/` フォルダに音声ファイルが存在するか確認

## 🤝 貢献

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🙏 謝辞

- **Azure Speech Service**: 高精度な発音評価を提供
- **React.js**: 素晴らしいUIフレームワーク
- **Recorder.js**: 簡単な音声録音機能

---

**🎉 楽しい発音練習をお楽しみください！**
