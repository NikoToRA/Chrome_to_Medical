# Manga Generation Skill (Proven Workflow)

This document records the successful workflow and prompt engineering techniques for generating high-quality manga pages for the "Chrome to Medical" project.

## 1. Core Concept & Style
- **Format**: Single Page, Vertical Layout (Aspect Ratio 1:1.41 / B5 Size).
- **Style**: Japanese Manga Style (Black & White, Ink, Screentones).
- **Reading Direction**: Right-to-Left (Zigzag flow).
- **Key Elements**: Speed lines (Koka-sen), Flash/Sunburst effects, Sound FX text (e.g., "Kacha Kacha").

## 2. Prompt Template (THE BEST PRACTICE)
Use this structure for future pages to ensure consistency.

```markdown
**Prompt**:
A single VERTICAL manga page (Aspect Ratio 1:1.41, B5 Paper Size). Black and White Japanese Manga Style. Ink and Screentones.
**CRITICAL**: Use extensive WHITE SPACE (Negative Space). The page should feel OPEN and AIRY, not dense.

Layout (Read Right-to-Left, Zigzag):
1. **Top Right**: [Scene Description]
2. **Middle Right**: [Action/Detail] + "Speed Lines" + Sound: "SFX"
3. **Middle Left**: [Character Reaction/Back View]
4. **Bottom Right**: [Transition/Small Panel]
5. **Bottom Left (Big)**: [Climax/Impact] + Intense "Flash" effect lines.

**CHARACTER STRICT**: [Character Description, e.g., Male doctor, 40s, short grey hair, round/oval glasses, white coat]. Must look EXACTLY like the reference character.
```

**Negative Prompt**:
`color, polychromatic, horizontal, square, tablet, detailed background, crowded, messy, dense, dark, heavy ink, photorealistic, 3d render`

**Reference Image**:
Always attach: `manga/charactor/doctor_flat_color.png` (or relevant character sheet).

## 3. Post-Processing (The "Cut" Technique)
Generated images often have unnecessary side margins or aspect ratio deviations. Use the custom crop tool to fix this.

**Tool**: `manga/tools/crop_borders.py`
**Feature**: Automatically detects content and crops with a **50px padding** (configurable) to maintain a professional comic look without cutting off ink lines.

### Usage:
```bash
source .venv/bin/activate
python3 manga/tools/crop_borders.py
```
*(Ensure input/output paths are set in the script or via arguments)*

## 4. Lesson Learned (The "Isolation" layout)
For scenes depicting the Doctor's late-night work:
- **Bookshelves**: Placing a bookshelf in the background of a back-view shot effectively communicates "Isolation" and "Overwork".
- **Lighting**: High contrast (Dark room vs. Bright Monitor) works best for the "Flash/Shock" effect.
