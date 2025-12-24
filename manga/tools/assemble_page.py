from PIL import Image, ImageOps
import os

def cm_to_px(cm, dpi=300):
    return int(cm * dpi / 2.54)

# A4 Ratio (roughly 3:4 for manga web viewing usually, strictly A4 is 1:1.41)
# User requested 3:4. Let's assume standard webtoon/comic width.
# Example: 1200px width, 1600px height.

CANVAS_WIDTH = 1200
CANVAS_HEIGHT = 1600
BG_COLOR = (255, 255, 255)
GUTTER = 20  # Space between panels

output_path = "/Users/suguruhirayama/Chrome_to_Medical/manga/comic/chapter1/page1_complete.png"
source_dir = "/Users/suguruhirayama/Chrome_to_Medical/manga/comic/chapter1"

# Panels
p1 = Image.open(os.path.join(source_dir, "page1_panel1.png"))
p2 = Image.open(os.path.join(source_dir, "page1_panel2.png"))
p3 = Image.open(os.path.join(source_dir, "page1_panel3.png"))
p4 = Image.open(os.path.join(source_dir, "page1_panel4.png"))
p5 = Image.open(os.path.join(source_dir, "page1_panel5.png"))

# Create Canvas
canvas = Image.new('RGB', (CANVAS_WIDTH, CANVAS_HEIGHT), BG_COLOR)

# Layout Calculation
# Row 1: Panel 1 (Wide intro)
# Row 2: Panel 2 (Left), Panel 3 (Right)
# Row 3: Panel 4 (Left), Panel 5 (Right)

# Helper to resize keeping aspect ratio to width/height constraints would be complex.
# For now, we crop/resize to fit the slots to ensure clean alignment.

def fit_to_box(img, target_w, target_h):
    return ImageOps.fit(img, (target_w, target_h), method=Image.Resampling.LANCZOS)

# Row 1 Height: 30%
h1 = int(CANVAS_HEIGHT * 0.3) - GUTTER
w1 = CANVAS_WIDTH - (GUTTER * 2)

# Row 2 Height: 35%
h2 = int(CANVAS_HEIGHT * 0.35) - GUTTER
w2_left = int((CANVAS_WIDTH - (GUTTER * 3)) / 2)
w2_right = w2_left

# Row 3 Height: 30% (balance)
h3 = CANVAS_HEIGHT - h1 - h2 - (GUTTER * 4) # Remaining space
w3_left = int((CANVAS_WIDTH - (GUTTER * 3)) / 2)
w3_right = w3_left

# Resize Images
i1 = fit_to_box(p1, w1, h1)
i2 = fit_to_box(p2, w2_left, h2)
i3 = fit_to_box(p3, w2_right, h2)
i4 = fit_to_box(p4, w3_left, h3)
i5 = fit_to_box(p5, w3_right, h3)

# Paste
current_y = GUTTER
# Row 1
canvas.paste(i1, (GUTTER, current_y))

current_y += h1 + GUTTER
# Row 2
canvas.paste(i2, (GUTTER, current_y))
canvas.paste(i3, (GUTTER + w2_left + GUTTER, current_y))

current_y += h2 + GUTTER
# Row 3
canvas.paste(i4, (GUTTER, current_y))
canvas.paste(i5, (GUTTER + w3_left + GUTTER, current_y))

# Save
canvas.save(output_path)
print(f"Saved composed page to {output_path}")
