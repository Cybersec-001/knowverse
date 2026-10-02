/* Isolated response fixtures for UI regression and screenshot review only.
   No fixture is imported by the application or sent to the production API. */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
const output = process.env.REVIEW_OUTPUT || "/tmp/knowverse-review";
fs.mkdirSync(output, { recursive: true });
const BASE = process.env.REVIEW_BASE_URL || "http://localhost:3000";
const API = "http://localhost:3999";
const source = {
  c1: { start_ts: 48, end_ts: 100 },
  c2: { start_ts: 140, end_ts: 190 },
};
const content = [
  {
    heading: "The essential idea",
    bullets: [
      {
        text: "Cells are the basic living units. Each structure has a role, and the parts work together as one system.",
        source_chunk_id: "c1",
      },
    ],
  },
  {
    heading: "Structure supports function",
    bullets: [
      {
        text: "The membrane controls exchange. The nucleus stores information. Mitochondria release energy for cellular work.",
        source_chunk_id: "c2",
      },
    ],
  },
];
const notebooks = [
  {
    id: "n1",
    title: "Biology foundations",
    video_count: 2,
    updated_at: "2026-10-01T10:00:00Z",
  },
  {
    id: "n2",
    title: "Mathematics, one idea at a time",
    video_count: 0,
    updated_at: null,
  },
];
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox"],
  });
  let checks = 0;
  const errors = [];
  const writes = [];
  const context = await browser.newContext();
  await context.addInitScript(() =>
    localStorage.setItem("knowverse-token", "ui-fixture-token"),
  );
  await context.route(API + "/**", async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    let data = {};
    if (req.method() === "OPTIONS") {
      return route.fulfill({
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE",
        },
      });
    }
    if (req.method() !== "GET")
      writes.push({ path, method: req.method(), body: req.postData() });
    if (path === "/notebooks")
      data =
        req.method() === "POST"
          ? { notebook: { id: "n3", title: JSON.parse(req.postData()).title } }
          : { notebooks };
    else if (path.endsWith("/videos") && req.method() === "GET")
      data = {
        videos: [
          {
            id: "v1",
            title: "The cell: structure and function",
            source_type: "upload",
            status: "ready",
            duration: 1122,
            timestamps_verified: true,
            progress: { percent: 100, completed: 6, total: 6 },
          },
          {
            id: "v2",
            title: "How cells exchange energy",
            source_type: "upload",
            status: "generating",
            duration: 860,
            progress: { percent: 50, completed: 3, total: 6 },
          },
        ],
      };
    else if (path.endsWith("/status"))
      data = {
        status: "ready",
        timestamps_verified: true,
        progress: { percent: 100, completed: 6, total: 6 },
      };
    else if (path.endsWith("/extractive-summary"))
      data = {
        extractive: { content, covered_chunks: 2, total_chunks: 2 },
        sources: source,
      };
    else if (path.endsWith("/preliminary-summary"))
      data = {
        preliminary: { content, covered_chunks: 2, total_chunks: 2 },
        sources: source,
      };
    else if (path.endsWith("/summary-edit"))
      data = {
        edit: {
          content:
            "<h2>The cell, in context</h2><p>Cells are the basic units of life. Their structures work together to sustain living organisms.</p><h2>What to remember</h2><p>The membrane controls exchange; the nucleus stores genetic information; mitochondria release energy.</p>",
        },
      };
    else if (path.includes("/artifacts/"))
      data = {
        artifact: {
          content: path.endsWith("/mcq")
            ? [
                {
                  question:
                    "Which structure controls what enters and leaves a cell?",
                  options: [
                    "Cell membrane",
                    "Nucleus",
                    "Mitochondrion",
                    "Ribosome",
                  ],
                  correct_index: 0,
                  explanation:
                    "The cell membrane controls exchange with the surroundings.",
                  source_chunk_id: "c1",
                },
              ]
            : content,
        },
        sources: source,
      };
    else if (path.includes("/notes/")) {
      if (req.method() === "DELETE")
        return route.fulfill({
          status: 204,
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      data = {
        note: {
          id: "note1",
          text: JSON.parse(req.postData()).text,
          source_chunk_id: "c1",
        },
      };
    } else if (path === "/videos" && req.method() === "POST")
      data = { video: { id: "v3", title: "Added source", status: "queued" } };
    else if (path.startsWith("/auth/")) data = { token: "ui-fixture-token" };
    else if (path.endsWith("/notes"))
      data =
        req.method() === "POST"
          ? {
              note: {
                id: "note2",
                text: JSON.parse(req.postData()).text,
                source_chunk_id: null,
              },
            }
          : {
              notes: [
                {
                  id: "note1",
                  text: "Remember to compare plant and animal cells.",
                  source_chunk_id: "c1",
                },
              ],
            };
    else if (path.endsWith("/search"))
      data = {
        results: [
          {
            id: "c1",
            text: content[0].bullets[0].text,
            start_ts: 48,
            end_ts: 100,
            similarity: 0.85,
          },
        ],
      };
    else if (path.endsWith("/tutor/chat"))
      data = {
        answer:
          "The cell membrane controls exchange with the surroundings. This helps the cell keep a stable internal environment.",
        grounding: "grounded_in_video",
        citations: [{ chunk_id: "c1", start_ts: 48 }],
      };
    else if (path.endsWith("/export"))
      return route.fulfill({
        status: 200,
        contentType: "application/pdf",
        body: Buffer.from("%PDF-1.4\nUI fixture only"),
      });
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data),
    });
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  async function check() {
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      "Horizontal overflow",
    );
    checks++;
  }
  async function shot(name) {
    if (!name.includes("search"))
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement)
          document.activeElement.blur();
      });
    await page.screenshot({
      path: `${output}/${name}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await check();
  }
  for (const [size, width, height] of [
    ["desktop", 1440, 1000],
    ["laptop", 1024, 900],
    ["tablet", 768, 1024],
    ["mobile", 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(BASE + "/");
    await page.getByRole("heading", { name: /Turn videos/ }).waitFor();
    await shot(`phase-04-home-${size}`);
    for (const route of [
      "login",
      "signup",
      "dashboard",
      "notebook?id=n1",
      "study?notebook=n1&video=v1",
      "settings",
      "profile",
      "privacy",
      "terms",
    ]) {
      await page.goto(BASE + "/" + route);
      await page.locator("h1").first().waitFor();
      if (route === "dashboard")
        await page
          .getByText("Biology foundations", { exact: true })
          .first()
          .waitFor();
      if (route.startsWith("study")) await page.locator(".tiptap").waitFor();
      await shot(
        `phase-${route.startsWith("study") ? "06-workspace" : route.startsWith("notebook") ? "05-notebook" : route === "dashboard" ? "05-dashboard" : route === "settings" || route === "profile" ? "10-" + route : route}-${size}`,
      );
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(BASE + "/dashboard");
  await page
    .getByText("Biology foundations", { exact: true })
    .first()
    .waitFor();
  await page.keyboard.press("Control+k");
  await page.getByRole("dialog").waitFor();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Biology foundations" })
    .waitFor();
  await page.getByLabel("Search notebooks").fill("Biology");
  await page.keyboard.press("ArrowDown");
  assert.match(
    await page.evaluate(() => document.activeElement.textContent),
    /Biology/,
  );
  checks++;
  await shot("phase-03-search-desktop");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "New notebook" }).first().click();
  await page.getByLabel("Notebook name").fill("Review collection");
  await page
    .getByRole("button", { name: "Create notebook", exact: true })
    .click();
  await page.waitForURL(/notebook/);
  assert(writes.find((w) => w.path === "/notebooks"));
  checks++;
  await page.goto(BASE + "/notebook?id=n1");
  await page.getByRole("button", { name: "Paste a video link" }).click();
  await page
    .getByLabel("YouTube URL")
    .fill("https://www.youtube.com/watch?v=test");
  await shot("phase-05-input-desktop");
  await page
    .getByRole("button", { name: "Generate knowledge", exact: true })
    .click();
  await page.getByText("Video added.", { exact: true }).waitFor();
  assert(writes.find((w) => w.path === "/videos" && w.method === "POST"));
  checks++;
  await page.goto(BASE + "/study?notebook=n1&video=v1");
  await page.locator(".tiptap").waitFor();
  await page.getByRole("tab", { name: "Ask KNOWVERSE" }).click();
  await page
    .getByRole("button", { name: "Explain this topic simply." })
    .click();
  await page.getByRole("button", { name: "Send question" }).click();
  await page
    .getByText(
      "The cell membrane controls exchange with the surroundings. This helps the cell keep a stable internal environment.",
      { exact: true },
    )
    .waitFor();
  await shot("phase-08-tutor-desktop");
  checks++;
  await page.getByRole("tab", { name: "Practice", exact: true }).click();
  await page.getByRole("button", { name: /Cell membrane/ }).click();
  await page.getByText("Why this answer?").waitFor();
  await shot("phase-09-practice-desktop");
  checks++;
  await page.getByRole("tab", { name: "Notes", exact: true }).click();
  await shot("phase-09-notes-desktop");
  await page.getByLabel("Add your own point").fill("A note to remember");
  await page
    .getByRole("button", { name: "Save personal note", exact: true })
    .click();
  await page.getByLabel("Your saved note").last().waitFor();
  await page.getByLabel("Your saved note").first().fill("Edited personal note");
  await page
    .getByRole("button", { name: "Save changes", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Delete", exact: true })
    .first()
    .click();
  assert(
    writes.find((w) => w.path === "/videos/v1/notes" && w.method === "POST"),
  );
  assert(
    writes.find(
      (w) => w.path === "/videos/v1/notes/note1" && w.method === "PATCH",
    ),
  );
  assert(
    writes.find(
      (w) => w.path === "/videos/v1/notes/note1" && w.method === "DELETE",
    ),
  );
  checks += 3;
  await page.getByRole("tab", { name: "Exam notes", exact: true }).click();
  await shot("phase-09-exam-desktop");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await shot("phase-09-export-desktop");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  await download;
  checks++;
  await page.keyboard.press("Escape");
  await page.getByLabel("Search video transcript").fill("cells");
  await page
    .locator(".workspace-footer button")
    .filter({ hasText: "00:48" })
    .waitFor();
  await shot("phase-07-source-search-desktop");
  checks++;
  await page.goto(BASE + "/settings");
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  checks++;
  await shot("phase-10-settings-dark-desktop");
  await page.goto(BASE + "/study?notebook=n1&video=v1");
  await page.locator(".tiptap").waitFor();
  await shot("phase-06-workspace-dark-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("phase-06-workspace-dark-mobile");
  await page.goto(BASE + "/settings");
  await page.getByRole("button", { name: "Light", exact: true }).click();
  await page.goto(BASE + "/study?notebook=n1&video=v1");
  await page.locator(".tiptap").waitFor();
  await page.getByRole("tab", { name: "Ask KNOWVERSE" }).click();
  await shot("phase-08-tutor-mobile");
  await page.getByRole("tab", { name: "Practice", exact: true }).click();
  await shot("phase-09-practice-mobile");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "/");
  assert.equal(
    await page
      .locator(".workspace-preview")
      .evaluate((el) => getComputedStyle(el).transform),
    "none",
  );
  checks++;
  await page.goto(BASE + "/login");
  await page.getByLabel("Email address").fill("fixture@example.invalid");
  await page.getByLabel("Password").fill("test-fixture-password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL(/dashboard/);
  assert(writes.find((w) => w.path === "/auth/login"));
  checks++;
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    `${output}/qa.json`,
    JSON.stringify(
      {
        checks,
        errors,
        writes,
        fixtureScope:
          "isolated API response fixtures only; no live mutation or real AI/video-processing test",
      },
      null,
      2,
    ),
  );
  await browser.close();
  console.log(`Passed ${checks} checks; screenshots saved to ${output}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
