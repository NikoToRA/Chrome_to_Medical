# Chapter 1 Image Prompts

## 🎨 Consistency Tips (重要：一貫性を保つコツ)
1ページずつ（1コマずつ）生成してもデザインを崩さないためのポイントです。
1.  **モデル固定**: 必ず同じCheckPointモデル（例: `anime_flat_color.ckpt` 等）を使い続けてください。
2.  **プロンプト固定**: キャラクターの描写タグ（`30s male doctor`, `glasses`など）は一言一句変えないでください。
3.  **ControlNet推奨**: もし使えるなら、`Reference Only` や `IP-Adapter` にキャラクター設定画（`manga/charactor/doctor_flat_color.png`）をセットすると、顔や服装が完全に固定されます。
4.  **Seed値**: 同じ構図で微調整したいときはSeedを固定しますが、基本的にはランダムでOKです。

## Common Settings
- **Style Prompt**: `Simple Flat Color Manga Style, clean lines, anime coloring, minimal shading, white background`
- **Negative Prompts**: `photorealistic, 3d render, detailed shading, gradient, messy lines, text, speech bubble, blurry`

## Page 1 (The Pain)
- **Panel 1**: `Japanese clinic waiting room at night, small reception counter, slippers rack, posters on wall, dark atmosphere, wall clock showing 11:00 PM (23:00), lonely silence, simple flat color manga style`
- **Panel 2**: `30s-40s male doctor with glasses and white coat, sitting at desk, back view or side view, typing on computer, stacks of paper on desk, tired atmosphere, simple flat color manga style`
- **Panel 3**: `POV of doctor looking at desk. Left: Unfinished medical record on computer screen (text lines). Right: A formal referral letter (envelope or document) on the desk. Overwhelming workload atmosphere. Simple flat color manga style`
- **Panel 4**: `Doctor looking at smartphone held in hand, sighing, tired expression, glasses, white coat, simple flat color manga style`
- **Panel 5**: `Doctor surprised face ("Whoa!?"), face illuminated by bright light from computer screen, high contrast, reaction to flash, simple flat color manga style`

## Page 2 (The Encounter)
- **Panel 1**: `Cute sci-fi robot agent popping out of computer screen, doctor falling backward from chair in shock, comical surprise, dynamic angle, simple flat color manga style`
- **Panel 2**: `Extreme close-up of Cute sci-fi robot agent, winking or confident smile, simple round body, single eye, white body, simple flat color manga style`
- **Panel 3**: `Doctor with cold dead eyes moving mouse cursor to "DELETE" button, Robot agent panicking/sweating/waving hands "No wait!", comic style, simple flat color`
- **Panel 4**: `Robot agent clinging to the edge of the screen frame, desperate face, explaining, doctor looking skeptical, simple flat color manga style`

## Page 3 (Skepticism)
- **Panel 1**: `Doctor waving hand dismissively, annoyed expression, "Vendor coordination is hard", white coat, glasses, simple flat color manga style`
- **Panel 2**: `Robot agent making a big "X" sign with arms (or body), rejecting the idea of servers/construction, minimalist background, simple flat color manga style`
- **Panel 3**: `Doctor looking suspicious/aggressive, "It must be expensive", glaring, white coat, simple flat color manga style`
- **Panel 4**: `Robot agent showing a calculator with "0" or "Free" sign, triumphant pose, Doctor looking shocked/stunned, simple flat color manga style`

## Page 4 (The Decision)
- **Panel 1**: `Doctor gulping (swallowing saliva), nervous but interested expression, sweat drop, close up face, simple flat color manga style`
- **Panel 2**: `Doctor's hand reaching for a computer mouse, focus on hand and mouse, anticipation, simple flat color manga style`
- **Panel 3**: `Sound effect visualization "Click", Robot agent showing thumbs up, happy, sparkles, simple flat color manga style`
- **Panel 4**: `Doctor's face illuminated with hope, smiling gently, looking at screen, "Magic" atmosphere, bright background, simple flat color manga style`
## Page 1 (Single Shot Experiment V6 - Vertical Japanese Manga Style)
- **Prompt**: `A single VERTICAL manga page (Aspect Ratio 2:3). Japanese Comic Style. Use heavy black ink, screen tones, and white speed lines (koka-sen).
Layout (Read Right-to-Left):
1. **Top Right**: Japanese clinic waiting room. Quiet night.
2. **Middle Right**: Close up of hands typing furiously on a PHYSICAL KEYBOARD. Add "Speed Lines" to show speed. Sound text: "Kacha Kacha".
3. **Middle Left**: Back view of doctor at desk. Gloomy atmosphere with vertical depression lines.
4. **Bottom Right**: Doctor sighing. Small panel.
5. **Bottom Left (Big)**: Doctor's face SHOCKED by blinding light from monitor. Intense "Sunburst" effect lines / Flash lines. High contrast.
Character: Male doctor, 40s, glasses, white coat. Desktop PC only (No tablets).`
- **Negative Prompt**: `horizontal, landscape, square, tablet, color, photorealistic, american comic`
- **Reference**: Use `manga/charactor/doctor_flat_color.png` for character consistency.

## Page 1 (Single Shot Experiment V7 - B&W 3:4 Vertical)
- **Prompt**: `A single VERTICAL manga page (Aspect Ratio 3:4). Black and White Japanese Manga Style. No Color. Ink and Screentones only.
Layout (Read Right-to-Left, Zigzag):
1. **Top Right**: Japanese clinic waiting room. Quiet night.
2. **Middle Right**: Close up of hands typing furiously on a PHYSICAL KEYBOARD. "Speed Lines". Sound: "Kacha Kacha".
3. **Middle Left**: Back view of doctor at desk. Gloomy atmosphere.
4. **Bottom Right**: Doctor sighing. Small panel.
5. **Bottom Left (Big)**: Doctor's face SHOCKED by blinding white light from monitor. Intense "Flash" effect lines.
Character: Male doctor, 40s, glasses, white coat. Desktop PC.`
- **Negative Prompt**: `color, polychromatic, horizontal, square, tablet, photorealistic`
- **Reference**: Use `manga/charactor/doctor_flat_color.png` for character consistency.

## Page 1 (Single Shot Experiment V9 - Isolation)
- **Prompt**: `A single VERTICAL manga page (Aspect Ratio 1:1.41, B5 Paper Size). Black and White Japanese Manga Style. Ink and Screentones.
Layout (Read Right-to-Left, Zigzag):
1. **Top Right**: Japanese clinic waiting room. Simple, quiet night.
2. **Middle Right**: Close up of hands typing furiously on a PHYSICAL KEYBOARD. "Speed Lines". Sound: "Kacha Kacha".
3. **Middle Left**: Back view of doctor at desk. **He is surrounded by tall BOOKSHELVES filled with heavy medical files.** He looks small, isolated, and lonely in the narrow space. Gloomy atmosphere.
4. **Bottom Right**: Doctor sighing. Small panel.
5. **Bottom Left (Big)**: Doctor's face SHOCKED by blinding white light from monitor. Intense "Flash" effect lines.
Character: Male doctor, 40s, glasses, white coat. Desktop PC.`
- **Negative Prompt**: `color, polychromatic, horizontal, square, tablet, detailed background in other panels`
- **Reference**: Use `manga/charactor/doctor_flat_color.png` for character consistency.
## Page 1 (Single Shot Experiment V10 - Strict Character & Isolation)
- **Prompt**: `A single VERTICAL manga page (Aspect Ratio 1:1.41, B5 Paper Size). Black and White Japanese Manga Style. Ink and Screentones.
Layout (Read Right-to-Left, Zigzag):
1. **Top Right**: Japanese clinic waiting room. Simple, quiet night.
2. **Middle Right**: Close up of hands typing furiously on a PHYSICAL KEYBOARD. "Speed Lines". Sound: "Kacha Kacha".
3. **Middle Left**: Back view of doctor at desk. **Surrounded by tall BOOKSHELVES filled with files.** Isolated/Lonely.
4. **Bottom Right**: Doctor sighing. Small panel.
5. **Bottom Left (Big)**: Doctor's face SHOCKED by blinding white light from monitor. Intense "Flash" effect lines.
**CHARACTER STRICT**: Male doctor, 40s, short grey hair, round/oval glasses, white coat. Must look EXACTLY like the reference character.`
- **Negative Prompt**: `color, polychromatic, horizontal, square, tablet, detailed background in other panels, wrong character features, young doctor, long hair`
- **Reference**: Use `manga/charactor/doctor_flat_color.png` for character consistency.

## Page 1 (Single Shot Experiment V11 - Reduced Books & Margin)
- **Prompt**: `A single VERTICAL manga page (Aspect Ratio 1:1.41, B5 Paper Size). Black and White Japanese Manga Style. Ink and Screentones.
Layout (Read Right-to-Left, Zigzag):
1. **Top Right**: Japanese clinic waiting room. Simple, quiet night.
2. **Middle Right**: Close up of hands typing furiously on a PHYSICAL KEYBOARD. "Speed Lines". Sound: "Kacha Kacha".
3. **Middle Left**: Back view of doctor at desk. Background shows a single bookshelf with some files (about half the previous amount). Not distinctively crowded. Gloomy atmosphere.
4. **Bottom Right**: Doctor sighing. Small panel.
5. **Bottom Left (Big)**: Doctor's face SHOCKED by blinding white light from monitor. Intense "Flash" effect lines.
**CHARACTER STRICT**: Male doctor, 40s, short grey hair, round/oval glasses, white coat. Must look EXACTLY like the reference character.`
- **Negative Prompt**: `color, polychromatic, horizontal, square, tablet, detailed background in other panels, wrong character features, too many books, messy room`
- **Reference**: Use `manga/charactor/doctor_flat_color.png` for character consistency.

## Page 1 (Single Shot Experiment V12 - Sparse & Airy)
- **Prompt**: `A single VERTICAL manga page (Aspect Ratio 1:1.41, B5 Paper Size). Black and White Japanese Manga Style. Ink and Screentones.
**CRITICAL**: Use extensive WHITE SPACE (Negative Space). The page should feel OPEN and AIRY, not dense.
Layout (Read Right-to-Left, Zigzag):
1. **Top Right**: Japanese clinic waiting room. **Wide shot with lots of ceiling space.** Minimalist.
2. **Middle Right**: Close up of hands typing on a PHYSICAL KEYBOARD. "Speed Lines". Sound: "Kacha Kacha".
3. **Middle Left**: Back view of doctor at desk. **Background is SPARSE. Only ONE bookshelf with FEW files. Mostly empty space.** Not crowded.
4. **Bottom Right**: Doctor sighing. Small panel with white background.
5. **Bottom Left (Big)**: Doctor's face SHOCKED by blinding white light from monitor. Intense "Flash" effect lines.
**CHARACTER STRICT**: Male doctor, 40s, short grey hair, round/oval glasses, white coat. Must look EXACTLY like the reference character.`
- **Negative Prompt**: `color, polychromatic, horizontal, square, tablet, detailed background, crowded, messy, dense, dark, heavy ink`
- **Reference**: Use `manga/charactor/doctor_flat_color.png` for character consistency.
