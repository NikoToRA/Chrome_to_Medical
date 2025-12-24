# 漫画制作スタイルガイド (Manga Style Guide)

画像生成AIやイラストレーターに渡すための統一ルールです。

## 1. 画風設定 (Art Style)
- **全体**: シンプルアニメ塗り・フラットカラー漫画スタイル (Simple Flat Color Manga Style).
- **ライン**: 黒の細くきれいな線画 (Clean, thin black outlines).
- **カラー**:
    - 陰影は最小限 (Minimal shading/Cel shading).
    - 清潔感のある配色 (Clean, medical aesthetic).
    - 白背景、またはシンプルな背景 (Simple backgrounds).

## 2. キャラクタープロンプト (Character Prompts)

### 医師 (Doctor)
- **Common Tags**: `30s male doctor`, `short gray hair`, `glasses`, `white medical coat`, `blue scrubs underneath`, `friendly face`, `clean shaven`.
- **Reference**: `manga/charactor/doctor_flat_color.png`
- **特徴**: 40代男性、開業医、眼鏡必須、白衣＋青スクラブ。少し疲れ気味だが真面目。

### エージェント (A.I. Agent)
- **Common Tags**: `cute sci-fi robot`, `simple round body`, `single large eye`, `antenna`, `white body`, `friendly mascot`, `floating`.
- **Reference**: `manga/charactor/agent_lineart.png`
- **特徴**: 3頭身くらいの可愛いロボット。丸いフォルム。

## 3. シチュエーション用プロンプト (Context Prompts)
- **深夜のクリニック**: `night time`, `dark clinic waiting room`, `lonely atmosphere`, `clock showing 11 PM`.
- **診察室**: `consultation room`, `desk`, `computer screen`, `medical records`, `cluttered desk`.
- **PC画面発光**: `glowing computer screen`, `bright light from monitor`, `surprised face`, `face illuminated by screen light`.

## 生成時のルール
1. 常に「Simple Flat Color Manga Style」を指定すること。
2. キャラクターの固有特徴（眼鏡、ロボットの形）を維持すること。
3. 吹き出し（Speech bubbles）は後から追加するため、画像内には不要。
