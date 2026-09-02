import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test("the evidence workspace replays prompts and authorization evidence", async ({
  page,
}) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Know what was asked. Know what was allowed. See what changed.",
    }),
  ).toBeVisible();
  await expect(page.locator(".timeline-item")).toHaveCount(3);
  await expect(page.locator("#blastScore")).toHaveText("92");
  await expect(page.locator("#mismatch")).toContainText("INTENT MISMATCH");
  await expect(page.locator(".authorization-section")).toContainText(
    "WHAT YOU AUTHORIZED",
  );
  await expect(page.locator(".authorization-section")).toContainText(
    "AUTHORIZATION DRIFT",
  );
  await expect(page.locator(".receipt-chip")).toContainText("EVIDENCE RECEIPT");

  await page.locator(".timeline-item").nth(1).click();
  await expect(page.locator("#evidence-title")).toContainText("cinematic");
  await expect(page.locator("#blastScore")).toHaveText("38");
  await expect(page.locator(".contract-status")).toHaveText("ALIGNED");
  await expect(page.locator(".authorization-section")).toContainText(
    "AUTHORIZED SCOPE HELD",
  );

  await page.locator('[data-view="diff"]').click();
  await expect(page.locator("#visualStage")).toHaveAttribute(
    "data-view",
    "diff",
  );
  await expect(page.locator("#diffFrame")).toBeVisible();

  await page.locator('[data-view="wipe"]').click();
  await page.locator("#compareSlider").fill("67");
  await expect(page.locator("#afterFrame")).toHaveAttribute("style", /67%/u);
  expect(consoleErrors).toEqual([]);
});

test("the mobile layout does not create page-level horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("#visualStage")).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/vibetrace-mobile.png",
    fullPage: true,
  });
});

test("capture the README dashboard at a real desktop viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.goto("/");
  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/vibetrace-dashboard.png",
    fullPage: true,
  });
});
