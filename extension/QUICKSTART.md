# Quick Start Guide

## Generate Icons (Required First Step!)

The extension **requires** icon files before it can be loaded. Follow these steps:

### Method 1: HTML Generator (Easiest - Works in Any Browser)

1. Open `create-icons.html` in your browser
2. Icons will be automatically generated and displayed
3. Right-click each icon and select "Save image as..."
4. Save them in the `icons/` folder with these exact names:
   - `icon16.png`
   - `icon32.png`
   - `icon48.png`
   - `icon128.png`

### Method 2: Python Script

```bash
# Install Pillow if needed
pip install Pillow

# Run the script
python generate-icons.py
```

### Method 3: ImageMagick (Linux/Mac)

```bash
chmod +x generate-icons.sh
./generate-icons.sh
```

## After Creating Icons

1. **Verify icons exist:**
   - Check that `icons/` folder contains all 4 icon files
   - Files should be named exactly: `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`

2. **Load Extension in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `extension/` folder

3. **Test the Extension:**
   - Visit any Greenhouse, Lever, or Workday job application page
   - Click the Simplify extension icon
   - You should see the popup UI

## Troubleshooting

### "Could not load icon" Error

This means the icon files are missing or incorrectly named. Make sure:
- ✅ `icons/` folder exists
- ✅ All 4 icon files exist (`icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`)
- ✅ File names match exactly (case-sensitive)
- ✅ Files are actual PNG images

### Extension Still Won't Load

- Check the Chrome extensions error page for specific errors
- Make sure all files from the extension are present
- Verify `manifest.json` is valid JSON

## Need Help?

If you're having trouble generating icons, the HTML method (`create-icons.html`) is the easiest and works on any platform without installing anything!

