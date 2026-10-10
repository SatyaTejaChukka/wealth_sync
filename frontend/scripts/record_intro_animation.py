"""
WealthSync Intro Animation Precision Recorder
Records pixel-perfect GIF and WebM video of the sequential mobile intro animation using Playwright and Pillow.
"""

import os
import time
import shutil
import io
from playwright.sync_api import sync_playwright
from PIL import Image

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARTIFACT_DIR = r"C:\Users\satya\.gemini\antigravity-ide\brain\092729f1-38cc-4c5c-926f-184e1fd714a6"
OUTPUT_GIF_ROOT = os.path.join(PROJECT_ROOT, "wealthsync_intro_animation.gif")
OUTPUT_VIDEO_ROOT = os.path.join(PROJECT_ROOT, "wealthsync_intro_animation.webm")
PUBLIC_GIF = os.path.join(PROJECT_ROOT, "frontend", "public", "wealthsync_intro_animation.gif")
TEMP_VIDEO_DIR = os.path.join(PROJECT_ROOT, "temp_video_rec")

def main():
    print("WealthSync Precision Media Recorder Starting (Sequential Reveal)...")
    os.makedirs(TEMP_VIDEO_DIR, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # 1. First Pass: Real-time WebM video
        print("Recording real-time WebM video...")
        vid_context = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2,
            record_video_dir=TEMP_VIDEO_DIR,
            record_video_size={"width": 390, "height": 844}
        )
        vid_page = vid_context.new_page()
        vid_page.goto("http://localhost:5173/preview-splash", wait_until="networkidle")
        time.sleep(3.2) # Let full sequential animation play out and hold
        vid_page.close()
        raw_video_path = vid_page.video.path() if vid_page.video else None
        vid_context.close()

        if raw_video_path and os.path.exists(raw_video_path):
            shutil.copyfile(raw_video_path, OUTPUT_VIDEO_ROOT)
            print(f"  [OK] Saved WebM Video: {OUTPUT_VIDEO_ROOT} ({os.path.getsize(OUTPUT_VIDEO_ROOT) // 1024} KB)")
            if os.path.exists(ARTIFACT_DIR):
                art_vid = os.path.join(ARTIFACT_DIR, "wealthsync_intro_animation.webm")
                shutil.copyfile(raw_video_path, art_vid)
                print(f"  [OK] Copied Video to Artifacts: {art_vid}")

        # 2. Second Pass: Sub-pixel synchronized GIF generation via Web Animations API
        print("Capturing precision-stepped frames for animated GIF...")
        page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)
        page.goto("http://localhost:5173/preview-splash", wait_until="networkidle")

        # Pause all CSS animations on page
        page.evaluate("""
            document.getAnimations().forEach(a => a.pause());
        """)

        frames = []
        # Step through 0ms to 2450ms in 35ms increments
        time_steps = list(range(0, 2450, 35))
        
        for t_ms in time_steps:
            page.evaluate(f"""
                document.getAnimations().forEach(a => {{
                    a.currentTime = {t_ms};
                }});
            """)
            buf = page.screenshot(type="png")
            img = Image.open(io.BytesIO(buf))
            # Convert to P-mode with adaptive palette for optimal compression & crisp rendering
            p_img = img.convert("RGB").convert("P", palette=Image.Palette.ADAPTIVE, colors=256)
            frames.append(p_img)

        # Hold the final assembled frame for ~1.2 seconds (approx 25 hold frames)
        if frames:
            last_frame = frames[-1]
            for _ in range(25):
                frames.append(last_frame)

        print(f"Captured {len(frames)} frames. Encoding animated GIF...")
        if frames:
            frame_duration_ms = 40 # 25 FPS
            frames[0].save(
                OUTPUT_GIF_ROOT,
                save_all=True,
                append_images=frames[1:],
                optimize=True,
                duration=frame_duration_ms,
                loop=0
            )
            print(f"  [OK] Saved Root GIF: {OUTPUT_GIF_ROOT} ({os.path.getsize(OUTPUT_GIF_ROOT) // 1024} KB)")

            # Save in frontend/public
            shutil.copyfile(OUTPUT_GIF_ROOT, PUBLIC_GIF)
            print(f"  [OK] Saved Public GIF: {PUBLIC_GIF}")

            # Save in artifacts directory
            if os.path.exists(ARTIFACT_DIR):
                art_gif = os.path.join(ARTIFACT_DIR, "wealthsync_intro_animation.gif")
                shutil.copyfile(OUTPUT_GIF_ROOT, art_gif)
                print(f"  [OK] Saved Artifacts GIF: {art_gif}")

        page.close()
        browser.close()

    if os.path.exists(TEMP_VIDEO_DIR):
        shutil.rmtree(TEMP_VIDEO_DIR, ignore_errors=True)

    print("Sequential media recording and encoding completed successfully!")

if __name__ == "__main__":
    main()
