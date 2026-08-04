import os
import subprocess
import shutil
from PIL import Image

def generate_icons():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    logo_svg = os.path.join(repo_root, "assets", "branding", "logo.svg")
    branding_png = os.path.join(repo_root, "assets", "branding", "logo.png")
    icons_dir = os.path.join(repo_root, "assets", "icons")
    tray_dir = os.path.join(repo_root, "src", "assets", "tray")

    os.makedirs(icons_dir, exist_ok=True)
    os.makedirs(tray_dir, exist_ok=True)

    print("[Icon Generator] Rendering 1024x1024 master PNG from SVG...")
    master_png = os.path.join(icons_dir, "icon_master.png")
    subprocess.run([
        "qlmanage", "-t", "-s", "1024", "-o", icons_dir, logo_svg
    ], check=True)
    
    generated_thumb = os.path.join(icons_dir, "logo.svg.png")
    if os.path.exists(generated_thumb):
        os.rename(generated_thumb, master_png)
    else:
        master_png = branding_png

    img_master = Image.open(master_png).convert("RGBA")

    # 1. assets/icons/icon.png (Linux / General master icon 512x512)
    linux_png = os.path.join(icons_dir, "icon.png")
    img_512 = img_master.resize((512, 512), Image.Resampling.LANCZOS)
    img_512.save(linux_png, format="PNG")
    print(f"[Icon Generator] Saved {linux_png}")

    # 2. assets/icons/icon.ico (Windows multi-resolution ICO)
    win_ico = os.path.join(icons_dir, "icon.ico")
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    img_master.save(win_ico, format="ICO", sizes=ico_sizes)
    print(f"[Icon Generator] Saved {win_ico}")

    # 3. assets/icons/icon.icns (macOS ICNS via iconutil)
    iconset_dir = os.path.join(icons_dir, "icon.iconset")
    os.makedirs(iconset_dir, exist_ok=True)

    icon_specs = [
        ("icon_16x16.png", 16),
        ("icon_16x16@2x.png", 32),
        ("icon_32x32.png", 32),
        ("icon_32x32@2x.png", 64),
        ("icon_128x128.png", 128),
        ("icon_128x128@2x.png", 256),
        ("icon_256x256.png", 256),
        ("icon_256x256@2x.png", 512),
        ("icon_512x512.png", 512),
        ("icon_512x512@2x.png", 1024),
    ]

    for fname, size in icon_specs:
        resized = img_master.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(os.path.join(iconset_dir, fname), format="PNG")

    mac_icns = os.path.join(icons_dir, "icon.icns")
    subprocess.run(["iconutil", "-c", "icns", iconset_dir, "-o", mac_icns], check=True)
    shutil.rmtree(iconset_dir)
    print(f"[Icon Generator] Saved {mac_icns}")

    # 4. src/assets/tray/icon.png & icon@2x.png (System tray icons)
    tray_16 = os.path.join(tray_dir, "icon.png")
    tray_32 = os.path.join(tray_dir, "icon@2x.png")
    
    img_16 = img_master.resize((16, 16), Image.Resampling.LANCZOS)
    img_16.save(tray_16, format="PNG")
    
    img_32 = img_master.resize((32, 32), Image.Resampling.LANCZOS)
    img_32.save(tray_32, format="PNG")

    print(f"[Icon Generator] Saved {tray_16} and {tray_32}")

    if os.path.exists(os.path.join(icons_dir, "icon_master.png")):
        os.remove(os.path.join(icons_dir, "icon_master.png"))

    print("[Icon Generator] All platform icons successfully generated!")

if __name__ == "__main__":
    generate_icons()
