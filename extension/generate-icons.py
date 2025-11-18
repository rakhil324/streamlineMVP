#!/usr/bin/env python3
"""
Simple script to generate extension icons
Requires PIL/Pillow: pip install Pillow
"""

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Pillow not installed. Installing...")
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image, ImageDraw, ImageFont

import os

# Create icons directory if it doesn't exist
os.makedirs("icons", exist_ok=True)

# Color settings
bg_color = (99, 102, 241)  # #6366f1 (Simplify primary)
text_color = (255, 255, 255)  # White

def create_icon(size):
    """Create an icon of specified size"""
    # Create image with background color
    img = Image.new('RGB', (size, size), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Draw "S" letter in center
    try:
        # Try to use a font (adjust path if needed)
        font_size = int(size * 0.6)
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", font_size)
        except:
            # Fallback to default font
            font = ImageFont.load_default()
    
    # Get text size and center it
    bbox = draw.textbbox((0, 0), "S", font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    position = ((size - text_width) / 2, (size - text_height) / 2 - bbox[1])
    draw.text(position, "S", fill=text_color, font=font)
    
    # Save icon
    filename = f"icons/icon{size}.png"
    img.save(filename)
    print(f"Created: {filename}")

# Generate all required icon sizes
sizes = [16, 32, 48, 128]
for size in sizes:
    create_icon(size)

print("\n✓ All icons generated successfully!")
print("You can now load the extension in Chrome.")

