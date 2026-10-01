# PNG-скриншоты → WebP (меньше в 5–10 раз). Запуск: python3 scripts/webp.py
import glob, os
from PIL import Image
for p in glob.glob(os.path.join(os.path.dirname(__file__), "../public/screens/*/*.png")):
    im = Image.open(p).convert("RGB")
    if im.width > 2000: im = im.resize((im.width * 2 // 3, im.height * 2 // 3), Image.LANCZOS)
    im.save(p[:-4] + ".webp", "WEBP", quality=82, method=6)
    os.remove(p)
