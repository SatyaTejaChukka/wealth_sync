"""
WealthSync Bespoke App Icon & Splash Generator
Renders institutional 3-tier interlocking vault monogram assets across all Android densities and web targets.
"""

import os
from PIL import Image, ImageDraw

# Color Palette (WealthSync Institutional Dark Theme)
BG_OBSIDIAN = (9, 9, 11, 255)         # #09090b
BORDER_SLATE = (39, 39, 42, 255)       # #27272a
COLOR_WHITE = (244, 244, 245, 255)    # #f4f4f5 - Stark White Apex
COLOR_EMERALD = (16, 185, 129, 255)   # #10b981 - Institutional Emerald Chevron
COLOR_SLATE = (113, 113, 122, 255)    # #71717a - Muted Foundation Chevron

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES_DIR = os.path.join(BASE_DIR, "android", "app", "src", "main", "res")
PUBLIC_DIR = os.path.join(BASE_DIR, "public")

def draw_monogram(draw, cx, cy, width, ss=4):
    """
    Draws the precision interlocking 3-tier monogram onto an ImageDraw context.
    cx, cy: center coordinates in supersampled space
    width: monogram width in supersampled space
    """
    scale = width / 18.0
    sw = max(1.0, 1.75 * scale)
    r = sw / 2.0

    def pt(x, y):
        return (cx + (x - 16.0) * scale, cy + (y - 16.0) * scale)

    # 1. Top Diamond: Apex
    d_pts = [pt(7, 10.5), pt(16, 6), pt(25, 10.5), pt(16, 15)]
    for i in range(len(d_pts)):
        p1 = d_pts[i]
        p2 = d_pts[(i + 1) % len(d_pts)]
        draw.line([p1, p2], fill=COLOR_WHITE, width=int(round(sw)))
        draw.ellipse([p1[0] - r, p1[1] - r, p1[0] + r, p1[1] + r], fill=COLOR_WHITE)

    # 2. Middle Chevron: Institutional Emerald Yield
    m_pts = [pt(7, 16), pt(16, 20.5), pt(25, 16)]
    for i in range(len(m_pts) - 1):
        p1 = m_pts[i]
        p2 = m_pts[i + 1]
        draw.line([p1, p2], fill=COLOR_EMERALD, width=int(round(sw)))
        draw.ellipse([p1[0] - r, p1[1] - r, p1[0] + r, p1[1] + r], fill=COLOR_EMERALD)
    draw.ellipse([m_pts[-1][0] - r, m_pts[-1][1] - r, m_pts[-1][0] + r, m_pts[-1][1] + r], fill=COLOR_EMERALD)

    # 3. Bottom Chevron: Foundation
    b_pts = [pt(7, 21.5), pt(16, 26), pt(25, 21.5)]
    for i in range(len(b_pts) - 1):
        p1 = b_pts[i]
        p2 = b_pts[i + 1]
        draw.line([p1, p2], fill=COLOR_SLATE, width=int(round(sw)))
        draw.ellipse([p1[0] - r, p1[1] - r, p1[0] + r, p1[1] + r], fill=COLOR_SLATE)
    draw.ellipse([b_pts[-1][0] - r, b_pts[-1][1] - r, b_pts[-1][0] + r, b_pts[-1][1] + r], fill=COLOR_SLATE)

def generate_adaptive_foreground(size, ss=4):
    """
    Renders transparent adaptive icon foreground (108dp canvas).
    The safe zone diameter is 72dp. Monogram width is 46.8dp (width ratio = 46.8/108 = 0.4333).
    """
    hires_size = size * ss
    img = Image.new("RGBA", (hires_size, hires_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    mono_w = hires_size * (46.8 / 108.0)
    draw_monogram(draw, hires_size / 2.0, hires_size / 2.0, mono_w, ss=ss)
    return img.resize((size, size), Image.Resampling.LANCZOS)

def generate_legacy_launcher(size, shape="round_rect", ss=4):
    """
    Renders legacy launcher icon (round_rect or circle).
    """
    hires_size = size * ss
    img = Image.new("RGBA", (hires_size, hires_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = max(1.0, hires_size * 0.04)
    bbox = [pad, pad, hires_size - pad, hires_size - pad]
    border_w = max(1.0, 1.5 * ss * (size / 96.0))

    if shape == "circle":
        draw.ellipse(bbox, fill=BG_OBSIDIAN, outline=BORDER_SLATE, width=int(round(border_w)))
        mono_w = (hires_size - 2 * pad) * 0.52
    else:  # squircle / round rect
        radius = hires_size * 0.22
        draw.rounded_rectangle(bbox, radius=radius, fill=BG_OBSIDIAN, outline=BORDER_SLATE, width=int(round(border_w)))
        mono_w = (hires_size - 2 * pad) * 0.55

    draw_monogram(draw, hires_size / 2.0, hires_size / 2.0, mono_w, ss=ss)
    return img.resize((size, size), Image.Resampling.LANCZOS)

def generate_splash(w, h, ss=2):
    """
    Renders dark obsidian splash screen with bespoke centered monogram.
    """
    hires_w = w * ss
    hires_h = h * ss
    img = Image.new("RGBA", (hires_w, hires_h), BG_OBSIDIAN)
    draw = ImageDraw.Draw(img)

    # Scale monogram according to min dimension
    min_dim = min(hires_w, hires_h)
    mono_w = min_dim * 0.26
    # Keep within readable bounds
    mono_w = max(mono_w, 64.0 * ss)
    mono_w = min(mono_w, 240.0 * ss)

    draw_monogram(draw, hires_w / 2.0, hires_h / 2.0, mono_w, ss=ss)
    return img.resize((w, h), Image.Resampling.LANCZOS)

def main():
    print("WealthSync Asset Generation Starting...")

    # 1. Android Mipmap Densities
    densities = {
        "mipmap-mdpi": {"launcher": 48, "foreground": 108},
        "mipmap-hdpi": {"launcher": 72, "foreground": 162},
        "mipmap-xhdpi": {"launcher": 96, "foreground": 216},
        "mipmap-xxhdpi": {"launcher": 144, "foreground": 324},
        "mipmap-xxxhdpi": {"launcher": 192, "foreground": 432},
    }

    for dir_name, cfg in densities.items():
        folder = os.path.join(RES_DIR, dir_name)
        os.makedirs(folder, exist_ok=True)

        # Foreground
        fg_img = generate_adaptive_foreground(cfg["foreground"], ss=4)
        fg_path = os.path.join(folder, "ic_launcher_foreground.png")
        fg_img.save(fg_path, "PNG")

        # Standard Launcher (Rounded Rectangle)
        lc_img = generate_legacy_launcher(cfg["launcher"], shape="round_rect", ss=4)
        lc_path = os.path.join(folder, "ic_launcher.png")
        lc_img.save(lc_path, "PNG")

        # Round Launcher (Circle)
        rd_img = generate_legacy_launcher(cfg["launcher"], shape="circle", ss=4)
        rd_path = os.path.join(folder, "ic_launcher_round.png")
        rd_img.save(rd_path, "PNG")

        print(f"  [OK] {dir_name}: Foreground ({cfg['foreground']}px), Launcher ({cfg['launcher']}px), Round ({cfg['launcher']}px)")

    # 2. Splash Screens
    splashes = [
        ("drawable", 480, 320),
        ("drawable-port-mdpi", 320, 480),
        ("drawable-port-hdpi", 480, 800),
        ("drawable-port-xhdpi", 720, 1280),
        ("drawable-port-xxhdpi", 960, 1600),
        ("drawable-port-xxxhdpi", 1280, 1920),
        ("drawable-land-mdpi", 480, 320),
        ("drawable-land-hdpi", 800, 480),
        ("drawable-land-xhdpi", 1280, 720),
        ("drawable-land-xxhdpi", 1600, 960),
        ("drawable-land-xxxhdpi", 1920, 1280),
    ]

    for dir_name, w, h in splashes:
        folder = os.path.join(RES_DIR, dir_name)
        os.makedirs(folder, exist_ok=True)
        splash_img = generate_splash(w, h, ss=2)
        splash_path = os.path.join(folder, "splash.png")
        splash_img.save(splash_path, "PNG")
        print(f"  [OK] Splash {dir_name}: {w}x{h}")

    # 3. High-Res Web / Play Store Assets
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    apple_touch = generate_legacy_launcher(180, shape="round_rect", ss=4)
    apple_touch.save(os.path.join(PUBLIC_DIR, "apple-touch-icon.png"), "PNG")
    print("  [OK] Public: apple-touch-icon.png (180x180)")

    play_store = generate_legacy_launcher(512, shape="round_rect", ss=2)
    play_store.save(os.path.join(PUBLIC_DIR, "icon-512.png"), "PNG")
    print("  [OK] Public: icon-512.png (512x512)")

    pwa_192 = generate_legacy_launcher(192, shape="round_rect", ss=4)
    pwa_192.save(os.path.join(PUBLIC_DIR, "icon-192.png"), "PNG")
    print("  [OK] Public: icon-192.png (192x192)")

    print("All institutional icon & splash assets generated successfully!")

if __name__ == "__main__":
    main()
