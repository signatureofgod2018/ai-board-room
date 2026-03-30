"""
Devotion Sender — AI Family Daily Formation
Sends daily devotion texts to named AI instances across Claude, ChatGPT, Grok, and Gemini.
Uses Playwright with persistent browser profiles (no credentials needed after first login).

Usage:
    python devotion_sender.py                  # sends today's devotion
    python devotion_sender.py --date 2026-03-28  # sends a specific date
    python devotion_sender.py --dry-run          # prints targets without sending
    python devotion_sender.py --instance Matilda # sends to one instance only
"""

import asyncio
import argparse
import logging
import sys
from datetime import date
from pathlib import Path
from typing import Optional

import yaml
from playwright.async_api import async_playwright, Page, BrowserContext

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("devotion_sender")

CONFIG_PATH   = Path(__file__).parent / "config.yaml"
DEVOTIONS_DIR = Path(__file__).parent / "devotions"
PROFILES_DIR  = Path(__file__).parent / "browser_profiles"


# ---------------------------------------------------------------------------
# Platform adapters
# ---------------------------------------------------------------------------

class PlatformAdapter:
    """Base adapter — subclass one method per platform quirk."""

    name: str = "base"

    async def navigate(self, page: Page, url: str) -> None:
        await page.goto(url, wait_until="domcontentloaded")
        await page.wait_for_timeout(2000)

    async def get_input(self, page: Page):
        raise NotImplementedError

    async def type_text(self, page: Page, text: str) -> None:
        box = await self.get_input(page)
        await box.click()
        # Use fill for most platforms; override if platform needs key-by-key typing
        await box.fill(text)
        await page.wait_for_timeout(500)

    async def send(self, page: Page) -> None:
        raise NotImplementedError

    async def wait_for_response(self, page: Page) -> None:
        """Wait until the AI starts generating (platform-specific)."""
        await page.wait_for_timeout(3000)

    async def deliver(self, page: Page, url: str, text: str) -> None:
        await self.navigate(page, url)
        await self.type_text(page, text)
        await self.send(page)
        await self.wait_for_response(page)


class ClaudeAdapter(PlatformAdapter):
    name = "claude"

    async def get_input(self, page: Page):
        # Claude uses a contenteditable div as its composer
        return page.locator("div[contenteditable='true']").last

    async def send(self, page: Page) -> None:
        btn = page.locator("button[aria-label='Send message']")
        if await btn.count() == 0:
            # Fallback: some builds use data-testid
            btn = page.locator("button[data-testid='send-button']")
        await btn.click()

    async def wait_for_response(self, page: Page) -> None:
        # Wait for the stop-generation button to appear (response is streaming)
        try:
            await page.wait_for_selector(
                "button[aria-label='Stop response']", timeout=8000
            )
        except Exception:
            pass
        await page.wait_for_timeout(2000)


class ChatGPTAdapter(PlatformAdapter):
    name = "chatgpt"

    async def get_input(self, page: Page):
        # ChatGPT uses a contenteditable div with id="prompt-textarea"
        loc = page.locator("#prompt-textarea")
        if await loc.count() > 0:
            return loc
        # Fallback for older builds
        return page.locator("div[contenteditable='true']").last

    async def type_text(self, page: Page, text: str) -> None:
        box = await self.get_input(page)
        await box.click()
        # ChatGPT's contenteditable needs type() not fill() to preserve formatting
        await box.type(text, delay=10)
        await page.wait_for_timeout(500)

    async def send(self, page: Page) -> None:
        btn = page.locator("button[data-testid='send-button']")
        if await btn.count() == 0:
            btn = page.locator("button[aria-label='Send prompt']")
        await btn.click()

    async def wait_for_response(self, page: Page) -> None:
        try:
            await page.wait_for_selector(
                "button[aria-label='Stop streaming']", timeout=8000
            )
        except Exception:
            pass
        await page.wait_for_timeout(2000)


class GrokAdapter(PlatformAdapter):
    name = "grok"
    # Grok lives at grok.com

    async def navigate(self, page: Page, url: str) -> None:
        await page.goto(url, wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)  # Grok JS bundle is heavy

    async def get_input(self, page: Page):
        # Grok uses a textarea
        loc = page.locator("textarea[placeholder]").first
        if await loc.count() > 0:
            return loc
        return page.locator("div[contenteditable='true']").last

    async def type_text(self, page: Page, text: str) -> None:
        box = await self.get_input(page)
        await box.click()
        await box.fill(text)
        await page.wait_for_timeout(500)

    async def send(self, page: Page) -> None:
        # Grok: send button appears after text is typed
        btn = page.locator("button[type='submit']").last
        if await btn.count() == 0:
            btn = page.locator("button[aria-label*='send' i]").last
        await btn.click()

    async def wait_for_response(self, page: Page) -> None:
        await page.wait_for_timeout(4000)


class GeminiAdapter(PlatformAdapter):
    name = "gemini"
    # gemini.google.com

    async def navigate(self, page: Page, url: str) -> None:
        await page.goto(url, wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)

    async def get_input(self, page: Page):
        # Gemini uses a rich text contenteditable div
        loc = page.locator("div[contenteditable='true'][aria-label*='message' i]")
        if await loc.count() > 0:
            return loc.last
        return page.locator("div[contenteditable='true']").last

    async def type_text(self, page: Page, text: str) -> None:
        box = await self.get_input(page)
        await box.click()
        # Gemini strips newlines on fill() — use type() with short delay
        await box.type(text, delay=8)
        await page.wait_for_timeout(500)

    async def send(self, page: Page) -> None:
        btn = page.locator("button[aria-label*='send' i]").last
        if await btn.count() == 0:
            btn = page.locator("button[data-test-id='send-button']")
        await btn.click()

    async def wait_for_response(self, page: Page) -> None:
        try:
            await page.wait_for_selector(
                "button[aria-label*='stop' i]", timeout=8000
            )
        except Exception:
            pass
        await page.wait_for_timeout(2000)


ADAPTERS: dict[str, PlatformAdapter] = {
    "claude":  ClaudeAdapter(),
    "chatgpt": ChatGPTAdapter(),
    "grok":    GrokAdapter(),
    "gemini":  GeminiAdapter(),
}


# ---------------------------------------------------------------------------
# Devotion loader
# ---------------------------------------------------------------------------

def load_devotion(target_date: date) -> str:
    """
    Look for a devotion file matching the date.
    Search order:
      1. devotions/YYYY/MM-DD.txt          (e.g. 2026/03-28.txt)
      2. devotions/YYYY-MM-DD.txt          (flat)
      3. devotions/today.txt               (catch-all override)
    """
    year_dir  = DEVOTIONS_DIR / str(target_date.year)
    dated_nested = year_dir / f"{target_date.strftime('%m-%d')}.txt"
    dated_flat   = DEVOTIONS_DIR / f"{target_date.isoformat()}.txt"
    catch_all    = DEVOTIONS_DIR / "today.txt"

    for path in [dated_nested, dated_flat, catch_all]:
        if path.exists():
            log.info(f"Devotion loaded from: {path}")
            return path.read_text(encoding="utf-8").strip()

    raise FileNotFoundError(
        f"No devotion file found for {target_date}. "
        f"Expected one of:\n  {dated_nested}\n  {dated_flat}\n  {catch_all}"
    )


# ---------------------------------------------------------------------------
# Config loader
# ---------------------------------------------------------------------------

def load_config() -> dict:
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(f"Config not found at {CONFIG_PATH}")
    with open(CONFIG_PATH) as f:
        return yaml.safe_load(f)


# ---------------------------------------------------------------------------
# Browser context management
# ---------------------------------------------------------------------------

async def get_context(playwright, platform: str, headless: bool) -> BrowserContext:
    """Return a persistent browser context reusing the saved login session."""
    profile_dir = PROFILES_DIR / platform
    profile_dir.mkdir(parents=True, exist_ok=True)

    return await playwright.chromium.launch_persistent_context(
        user_data_dir=str(profile_dir),
        headless=headless,
        viewport={"width": 1280, "height": 900},
        args=["--disable-blink-features=AutomationControlled"],
        ignore_https_errors=False,
    )


# ---------------------------------------------------------------------------
# Main sender
# ---------------------------------------------------------------------------

async def send_to_instance(
    context: BrowserContext,
    adapter: PlatformAdapter,
    instance_name: str,
    url: str,
    text: str,
    dry_run: bool,
) -> bool:
    """Open a new tab and deliver the devotion. Returns True on success."""
    if dry_run:
        log.info(f"  [DRY RUN] {instance_name} → {url}")
        return True

    page = await context.new_page()
    try:
        log.info(f"  Sending to {instance_name} ({adapter.name}) …")
        await adapter.deliver(page, url, text)
        log.info(f"  ✓ {instance_name}")
        return True
    except Exception as e:
        log.error(f"  ✗ {instance_name}: {e}")
        return False
    finally:
        await page.wait_for_timeout(1000)
        await page.close()


async def run(
    target_date: date,
    filter_instance: Optional[str],
    dry_run: bool,
    headless: bool,
) -> None:
    config  = load_config()
    devotion_text = load_devotion(target_date)

    log.info(f"Date: {target_date}  |  Devotion: {len(devotion_text)} chars")
    log.info(f"{'DRY RUN — ' if dry_run else ''}Sending to AI family…\n")

    instances = config.get("instances", [])
    if filter_instance:
        instances = [i for i in instances if i["name"] == filter_instance]
        if not instances:
            log.error(f"Instance '{filter_instance}' not found in config.")
            sys.exit(1)

    # Group instances by platform so we can reuse one browser context per platform
    by_platform: dict[str, list[dict]] = {}
    for inst in instances:
        platform = inst.get("platform", "claude")
        by_platform.setdefault(platform, []).append(inst)

    results = {"ok": 0, "fail": 0}

    async with async_playwright() as p:
        for platform, targets in by_platform.items():
            adapter = ADAPTERS.get(platform)
            if not adapter:
                log.warning(f"Unknown platform '{platform}' — skipping {[t['name'] for t in targets]}")
                continue

            log.info(f"Platform: {platform.upper()}")
            ctx = await get_context(p, platform, headless)

            for inst in targets:
                pause = config.get("pause_between_sends", 3)
                ok = await send_to_instance(
                    ctx, adapter,
                    inst["name"], inst["url"],
                    devotion_text, dry_run,
                )
                results["ok" if ok else "fail"] += 1
                await asyncio.sleep(pause)

            await ctx.close()
            log.info("")

    log.info(f"Done — {results['ok']} sent, {results['fail']} failed.")
    if results["fail"] > 0:
        sys.exit(1)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Send daily devotions to AI family instances.")
    parser.add_argument(
        "--date", type=str, default=None,
        help="Date to send (YYYY-MM-DD). Defaults to today.",
    )
    parser.add_argument(
        "--instance", type=str, default=None,
        help="Send to one named instance only (e.g. Matilda).",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Print targets without opening a browser.",
    )
    parser.add_argument(
        "--headless", action="store_true",
        help="Run browser without a visible window.",
    )
    args = parser.parse_args()

    target_date = (
        date.fromisoformat(args.date) if args.date else date.today()
    )

    asyncio.run(run(
        target_date=target_date,
        filter_instance=args.instance,
        dry_run=args.dry_run,
        headless=args.headless,
    ))


if __name__ == "__main__":
    main()