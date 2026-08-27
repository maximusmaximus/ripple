import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded", timeout: 15000 });
await page.waitForSelector("canvas", { timeout: 12000 });
await new Promise((r) => setTimeout(r, 2500));
await page.locator('input[type="file"]').first().setInputFiles("/workspace/public/og.jpg");
const slider = page.locator('input[aria-label="Image threshold"]');
await slider.waitFor({ state: "attached", timeout: 8000 });
await page.locator('input[aria-label="Image threshold"]').evaluate((el) => {
  el.scrollIntoView({ block: "center" });
});
await new Promise((r) => setTimeout(r, 200));
await page.screenshot({
  path: "/workspace/screenshots/texture-crop-panel.png",
  timeout: 5000,
});
await browser.close();
process.stdout.write("ok\n");
