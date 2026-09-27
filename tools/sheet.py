#!/usr/bin/env python3
# contact sheet: python3 tools/sheet.py out.png cols img1 img2 ...
import sys
from PIL import Image, ImageDraw
out, cols, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims = [Image.open(f).convert('RGB') for f in files]
w, h = ims[0].size
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w + (cols - 1) * 4, rows * h + (rows - 1) * 4), (60, 60, 60))
for i, (f, im) in enumerate(zip(files, ims)):
    x, y = (i % cols) * (w + 4), (i // cols) * (h + 4)
    sheet.paste(im, (x, y))
    ImageDraw.Draw(sheet).text((x + 4, y + 4), f.split('_')[-1].replace('.png', ''), fill=(0, 255, 0))
sheet.save(out)
