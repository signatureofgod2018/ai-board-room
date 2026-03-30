"""
first_time_login.py
-------------------
Run this ONCE per platform to establish your authenticated browser profile.
A browser window opens — log in normally — then close the window.
The session is saved to browser_profiles/{platform}/ and reused by devotion_sender.py.

Usage:
    python first_time_login.py claude
    python first_time_login.py chatgpt
    python first_time_login.py grok
    python first_time_login.py gemini
    python first_time_login.py all
"""

import asyncio
import sys
from pathlib import Path
from playwright.async_api import async_playwright

PROFILES_DIR = Path(__file__).parent / "browser_profiles"

PLATFORM_URLS = {
    "claude":  "https://claude.ai",
    "chatgpt": "https://chatgpt.com",
    "grok":    "https://grok.com",
    "gemini":  "https://gemini.google.com",
}


async def login(platform: str) -> None:
    url = PLATFORM_URLS[platform]
    profile = PROFILES_DIR / platform
    profile.mkdir(parents=True, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"  Platform : {platform.upper()}")
    print(f"  Profile  : {profile}")
    print(f"  URL      : {url}")
    print(f"{'='*60}")
    print("  Log in normally, then CLOSE the browser window.")
    print("  Your session will be saved automatically.\n")

    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(
            user_data_dir=str(profile),
            headless=False,
            viewport={"width": 1280, "height": 900},
        )
        page = await ctx.new_page()
        await page.goto(url)

        # Wait until the user closes the browser
        try:
            await page.wait_for_event("close", timeout=300_000)  # 5 min timeout
        except Exception:
            pass
        finally:
            try:
                await ctx.close()
            except Exception:
                pass

    print(f"  ✓ Session saved for {platform}.\n")


async def main() -> None:
    arg = sys.argv[1] if len(sys.argv) > 1 else ""
    platforms = list(PLATFORM_URLS.keys()) if arg == "all" else [arg]

    for p in platforms:
        if p not in PLATFORM_URLS:
            print(f"Unknown platform '{p}'. Choose from: {', '.join(PLATFORM_URLS)} or 'all'")
            sys.exit(1)
        await login(p)

    print("All done. You can now run devotion_sender.py.")


if __name__ == "__main__":
    asyncio.run(main())
