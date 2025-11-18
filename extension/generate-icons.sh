#!/bin/bash
# Simple icon generator script
# Requires ImageMagick or convert command

echo "Generating extension icons..."

# Create icons directory if it doesn't exist
mkdir -p icons

# Check if ImageMagick is installed
if command -v convert &> /dev/null; then
    echo "Using ImageMagick to generate icons..."
    
    # Color settings (Simplify primary: #6366f1)
    bg_color="#6366f1"
    
    # Generate each size
    for size in 16 32 48 128; do
        convert -size ${size}x${size} xc:$bg_color \
                -pointsize $(($size * 3 / 5)) \
                -fill white \
                -gravity center \
                -annotate +0+0 "S" \
                icons/icon${size}.png
        echo "Created: icons/icon${size}.png"
    done
    
    echo ""
    echo "✓ All icons generated successfully!"
else
    echo "ImageMagick not found. Please:"
    echo "1. Install ImageMagick: sudo apt-get install imagemagick (Linux) or brew install imagemagick (Mac)"
    echo "2. Or open create-icons.html in your browser and save the icons manually"
    echo "3. Or run: python3 generate-icons.py (requires Pillow)"
    exit 1
fi

