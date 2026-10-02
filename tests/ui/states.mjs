import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
const BASE = process.env.REVIEW_BASE_URL || "http://localhost:3000";
fs.mkdirSync(process.env.REVIEW_OUTPUT || "/tmp/knowverse-review", {
  recursive: true,
});
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  args: ["--no-sandbox"],
});
const results = [];
for (const state of [
  "empty",
  "loading",
  "error",
  "failed",
  "processing",
  "not-found",
  "signed-out",
]) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  if (state !== "signed-out")
    await context.addInitScript(() =>
      localStorage.setItem("knowverse-token", "fixture"),
    );
  await context.route("http://localhost:3999/**", async (r) => {
    let body = {};
    const p = new URL(r.request().url()).pathname;
    if (state === "loading") {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      body = { notebooks: [] };
    } else if (state === "error")
      return r.fulfill({
        status: 503,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: "SQL_FAIL confidential internal detail",
        }),
      });
    else if (p === "/notebooks") body = { notebooks: [] };
    else if (p.endsWith("/videos"))
      body = {
        videos: [
          {
            id: "v1",
            title: "Video lesson",
            status: state === "failed" ? "failed" : "generating",
            source_type: "upload",
            timestamps_verified: false,
            error: "SQL_FAIL confidential internal detail",
          },
        ],
      };
    else if (p.endsWith("/status"))
      body = {
        status: state === "failed" ? "failed" : "generating",
        error: "SQL_FAIL confidential internal detail",
        timestamps_verified: false,
        progress: { percent: 33, completed: 2, total: 6 },
      };
    else
      return r.fulfill({
        status: 404,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Artifact not ready" }),
      });
    return r.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(body),
    });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    BASE +
      "/" +
      (["failed", "processing"].includes(state)
        ? "study?notebook=n1&video=v1"
        : state === "not-found"
          ? "does-not-exist"
          : "dashboard"),
  );
  if (state === "empty")
    await page.getByText("Start your first notebook").waitFor();
  if (state === "loading")
    await page.getByLabel("Loading your workspace").waitFor();
  if (state === "error") await page.getByRole("alert").first().waitFor();
  if (state === "failed")
    await page.getByText("Video processing could not be completed.").waitFor();
  if (state === "processing")
    await page
      .getByText(
        "Status and milestone progress come from the backend. Unreported steps remain unknown.",
      )
      .waitFor();
  if (state === "not-found")
    await page.getByText("This page is not here.").waitFor();
  if (state === "signed-out")
    await page.getByRole("heading", { name: "Welcome back" }).waitFor();
  assert(!(await page.getByText("SQL_FAIL", { exact: false }).count()));
  assert.deepEqual(errors, []);
  await page.screenshot({
    path: `${process.env.REVIEW_OUTPUT || "/tmp/knowverse-review"}/phase-14-${state}-mobile.png`,
    fullPage: true,
    animations: "disabled",
  });
  results.push(state);
  await context.close();
}
await browser.close();
fs.writeFileSync(
  (process.env.REVIEW_OUTPUT || "/tmp/knowverse-review") + "/state-qa.json",
  JSON.stringify(
    {
      passed: results,
      scope: "isolated error/empty/loading/status response fixtures",
    },
    null,
    2,
  ),
);
console.log("State checks passed: " + results.join(", "));
