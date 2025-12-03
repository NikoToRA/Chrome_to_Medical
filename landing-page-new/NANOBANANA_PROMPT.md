# Nanobanana画像生成プロンプト

## ヒーロー画像用プロンプト

### 英語版（推奨）
```
A professional photograph of a friendly Asian male doctor in a white coat sitting at a modern desk in a bright, clean medical examination room. The doctor is warmly explaining something to a patient (partially visible, out of focus in foreground). On the desk is a large computer monitor displaying an electronic medical record (EMR) system interface. 

Overlaid on the computer screen is a cute, cartoon-style AI character mascot in bright blue and cyan colors with a prominent "AI+" logo. The AI character has a friendly, helpful appearance - like a cheerful robot assistant with a glowing plus symbol. The cartoon AI should contrast with the realistic photo style, appearing as a digital overlay on the screen.

Natural lighting from a window, warm and inviting atmosphere, professional medical office setting. The scene should clearly show: doctor + patient interaction + computer with EMR + anime-style AI+ logo overlay.

Photorealistic style for the room and people, anime/cartoon style only for the AI character on the screen. High quality, professional medical photography, 16:9 aspect ratio, 1920x1080px.
```

### 日本語版
```
明るく清潔な診察室で、白衣を着た親しみやすいアジア人男性医師が、モダンなデスクに座っている様子。医師は患者（前景にぼやけて一部見える）に温かく説明をしている。

デスクには大型のコンピューターモニターがあり、電子カルテ（EMR）システムのインターフェースが表示されている。

コンピューター画面には、明るいブルーとシアン色のかわいいアニメ調AIキャラクターマスコットが重ねて表示されており、目立つ「AI+」ロゴが付いている。AIキャラクターは親しみやすく、役立つ外観で、プラス記号が光る陽気なロボットアシスタントのよう。アニメ調AIは、リアルな写真スタイルとコントラストをなし、画面上のデジタルオーバーレイとして表示される。

窓からの自然光、温かく居心地の良い雰囲気、プロフェッショナルな医療オフィス設定。シーンには明確に表示される必要がある：医師+患者のやり取り+EMRを表示したコンピューター+アニメスタイルのAI+ロゴオーバーレイ。

部屋と人物はフォトリアリスティックスタイル、画面上のAIキャラクターのみアニメ/漫画スタイル。高品質、プロフェッショナルな医療写真、16:9アスペクト比、1920x1080px。
```

## 画像仕様

- **サイズ**: 1920x1080px (16:9)
- **フォーマット**: PNG または JPG
- **配置場所**: `/Users/suguruhirayama/Chrome_to_Medical/landing-page-new/public/hero-image.jpg`

## 画像の使用方法

生成された画像を取得したら、以下の手順で配置:

1. 画像を `public/` ディレクトリに保存
   ```bash
   # 例
   cp /path/to/generated-image.jpg /Users/suguruhirayama/Chrome_to_Medical/landing-page-new/public/hero-image.jpg
   ```

2. `HeroSection.jsx` の `.hero-image-placeholder` を置き換え:
   ```jsx
   <div className="hero-image-overlay">
     <img 
       src="/hero-image.jpg" 
       alt="診察室で患者と話す医師とAI+システム"
       className="hero-image"
     />
   </div>
   ```

3. CSS追加 (`HeroSection.css`):
   ```css
   .hero-image {
     width: 100%;
     height: 100%;
     object-fit: cover;
     opacity: 0.7;
   }
   ```

## 代替案

もしNanobananaで生成が難しい場合:

1. **リアル写真のみ**: 医師と患者の写真を使用
2. **AI+ロゴを別途追加**: CSS/HTMLで画像の上にロゴをオーバーレイ
3. **ストック写真**: Unsplash等から医療関連の写真を使用し、AI+ロゴを追加
