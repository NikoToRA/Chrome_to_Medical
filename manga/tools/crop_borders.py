
from PIL import Image, ImageOps
import sys
import os

def crop_borders(input_path, output_path, target_ratio=(3, 4)):
    try:
        img = Image.open(input_path).convert("RGB")
        
        # 1. Detect content bounding box (remove white borders)
        # Invert -> Threshold -> GetBBox is a robust way for line art
        gray = ImageOps.grayscale(img)
        # Invert so content is white, background is black
        inverted = ImageOps.invert(gray)
        # Threshold to remove compression noise (treat near-white as black)
        threshold = 240
        binary = inverted.point(lambda p: 255 if p > (255 - threshold) else 0)
        
        bbox = binary.getbbox()
        
        if bbox:
            print(f"Original Size: {img.size}")
            print(f"Content BBox: {bbox}")
            
            # Add Padding
            padding = 50
            left = max(0, bbox[0] - padding)
            top = max(0, bbox[1] - padding)
            right = min(img.width, bbox[2] + padding)
            bottom = min(img.height, bbox[3] + padding)
            
            img_cropped = img.crop((left, top, right, bottom))
            
            # 2. Check Ratio
            w, h = img_cropped.size
            current_ratio = w / h
            target_ratio_val = target_ratio[0] / target_ratio[1] # 0.75
            
            print(f"Cropped Size: {w}x{h}")
            print(f"Current Ratio: {current_ratio:.3f}, Target Ratio: {target_ratio_val:.3f}")

            # User asked to "cut to 3:4". 
            # If image is too tall (e.g. B5 1:1.41 = 0.70), we need to crop top/bottom to make it 0.75?
            # Or if image is too wide, crop sides.
            # But user said "cut horizontal blank parts", implying it's currently too wide (has bars).
            # Let's save the content crop first.
            
            img_cropped.save(output_path)
            print(f"Saved cropped image to {output_path}")
        else:
            print("No content found!")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    input_file = "/Users/suguruhirayama/Chrome_to_Medical/manga/comic/chapter1/page1_full_v10.png"
    output_file = "/Users/suguruhirayama/Chrome_to_Medical/manga/comic/chapter1/page1_final.png"
    crop_borders(input_file, output_file)
