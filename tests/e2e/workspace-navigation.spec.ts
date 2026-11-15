import { test, expect, type Page } from "@playwright/test";

async function loadCleanHome(page: Page, viewport = { width: 1440, height: 1000 }) {
  await page.setViewportSize(viewport);
  await page.goto("/");
  await page.evaluate(() => {
    try {
      localStorage.removeItem("raybrain.workspace.layout.v1");
      localStorage.removeItem("raybrain.workspace.draft.v1");
    } catch {
      // ignore
    }
  });
  await page.reload();
  await expect(page.getByTestId("workspace-ready")).toHaveAttribute(
    "data-ready",
    "true",
  );
}

async function assertNoOverflow(page: Page, label: string) {
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    docScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  expect(metrics.docScrollWidth, `Document overflow on ${label}`).toBeLessThanOrEqual(
    metrics.innerWidth,
  );
  expect(metrics.bodyScrollWidth, `Body overflow on ${label}`).toBeLessThanOrEqual(
    metrics.innerWidth,
  );
}

test.describe("Batch 2: Navigation & Secondary Pages", () => {
  let pageErrors: string[] = [];
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.stack || error.message);
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
  });

  test.afterEach(async () => {
    expect(pageErrors, "Uncaught browser page errors detected").toEqual([]);
    expect(consoleErrors, "Unexpected browser console errors detected").toEqual(
      [],
    );
  });

  test("1. Command palette (keyboard + button) runs workspace actions and navigates cleanly", async ({
    page,
  }) => {
    await loadCleanHome(page, { width: 1440, height: 1000 });

    const cmdBtn = page.getByRole("button", { name: "Open command palette" });
    await cmdBtn.focus();

    // Keyboard open via Ctrl+K, Escape closes & restores focus
    await page.keyboard.press("Control+k");
    const searchInput = page.getByLabel("Search commands and pages");
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(searchInput).toBeHidden();
    await expect(cmdBtn).toBeFocused();

    // Open via header button and execute a workspace tool command
    await cmdBtn.click();
    await expect(searchInput).toBeVisible();
    await page.screenshot({ path: "docs/screenshots/command-palette.png" });

    await searchInput.fill("Open Debug");
    const debugOption = page.getByRole("option", { name: "Open Debug" });
    await expect(debugOption).toBeVisible();
    await debugOption.click();

    await expect(searchInput).toBeHidden();
    await expect(
      page.getByRole("region", { name: "Workspace tools" }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Debug", exact: true }),
    ).toHaveAttribute("aria-selected", "true");

    // Open palette again and navigate to Providers settings
    await cmdBtn.click();
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Providers");
    await page
      .getByRole("option", { name: /Providers/i })
      .first()
      .click();

    await page.waitForURL("**/settings/providers");
    await expect(
      page.getByRole("heading", { name: "Settings · Providers", level: 1 }),
    ).toBeVisible();
  });

  test("2. Compact app menu navigates cleanly and / stays calm without side rails", async ({
    page,
  }) => {
    await loadCleanHome(page, { width: 1440, height: 1000 });

    // No secondary sidebar rail on /
    await expect(
      page.getByRole("navigation", { name: "Secondary sections" }),
    ).toHaveCount(0);

    const menuTrigger = page.getByRole("button", {
      name: "Open application menu",
    });
    await menuTrigger.click();

    const knowledgeItem = page.getByRole("menuitem", { name: "Knowledge" });
    await expect(knowledgeItem).toBeVisible();
    await knowledgeItem.click();

    await page.waitForURL("**/knowledge");
    await expect(
      page.getByRole("heading", { name: "Knowledge", level: 1 }),
    ).toBeVisible();

    // Switch Knowledge tabs cleanly
    await page.getByRole("button", { name: /Sources \(/ }).click();
    await expect(page.getByText("Interview — Installer Ian")).toBeVisible();

    await page.getByRole("button", { name: /Audit \(/ }).click();
    await expect(page.getByText("OAuth Provider Decision").first()).toBeVisible();

    await page.getByRole("link", { name: "Back to workspace" }).click();
    await page.waitForURL("**/");
    await expect(page.getByTestId("workspace-ready")).toHaveAttribute(
      "data-ready",
      "true",
    );
  });

  test("3. Layout and unsent composer draft persist across secondary route navigation", async ({
    page,
  }) => {
    await loadCleanHome(page, { width: 1440, height: 1000 });

    // Modify layout: resize left sidebar, open Changes + Terminal, type draft
    const leftHandle = page.getByRole("separator", {
      name: "Resize project navigation",
    });
    await leftHandle.focus();
    await page.keyboard.press("Shift+ArrowRight"); // +40px => 288px

    await page.getByRole("button", { name: "Open changes" }).click();
    await page.getByRole("button", { name: "Toggle terminal" }).click();

    const draftBox = page.getByLabel("Message draft");
    await draftBox.fill("Review Solar CRM quote API draft before approval");

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const layout = localStorage.getItem("raybrain.workspace.layout.v1");
          const draft = localStorage.getItem("raybrain.workspace.draft.v1");
          if (!layout || !draft) return null;
          const parsed = JSON.parse(layout) as {
            leftWidth: number;
            rightOpen: boolean;
            terminalOpen: boolean;
          };
          return {
            leftWidth: parsed.leftWidth,
            rightOpen: parsed.rightOpen,
            terminalOpen: parsed.terminalOpen,
            draft,
          };
        }),
      )
      .toEqual({
        leftWidth: 288,
        rightOpen: true,
        terminalOpen: true,
        draft: "Review Solar CRM quote API draft before approval",
      });

    // Navigate away via app menu -> Projects
    await page.getByRole("button", { name: "Open application menu" }).click();
    await page.getByRole("menuitem", { name: "Projects" }).click();
    await page.waitForURL("**/projects");
    await expect(
      page.getByRole("heading", { name: "Projects", level: 1 }),
    ).toBeVisible();

    // Return via Back to workspace
    await page.getByRole("link", { name: "Back to workspace" }).click();
    await page.waitForURL("**/");
    await expect(page.getByTestId("workspace-ready")).toHaveAttribute(
      "data-ready",
      "true",
    );

    // Assert layout AND draft restored
    await expect(
      page.getByRole("region", { name: "Workspace tools" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Terminal", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("separator", { name: "Resize project navigation" }),
    ).toHaveAttribute("aria-valuenow", "288");
    await expect(page.getByLabel("Message draft")).toHaveValue(
      "Review Solar CRM quote API draft before approval",
    );
  });

  test("4. All secondary routes render cleanly with honest status, zero errors, and no mobile overflow", async ({
    page,
  }) => {
    const routes = [
      { path: "/projects", heading: "Projects", navLabel: "Projects" },
      { path: "/agents", heading: "Agents", navLabel: "Agents" },
      { path: "/automations", heading: "Automations", navLabel: "Automations" },
      { path: "/knowledge", heading: "Knowledge", navLabel: "Knowledge" },
      { path: "/runs", heading: "Runs", navLabel: "Runs" },
      { path: "/governance", heading: "Governance", navLabel: "Governance" },
      {
        path: "/settings/general",
        heading: "Settings · General",
        navLabel: "General",
      },
      {
        path: "/settings/providers",
        heading: "Settings · Providers",
        navLabel: "Providers",
      },
      {
        path: "/settings/integrations",
        heading: "Settings · Integrations",
        navLabel: "Integrations",
      },
      {
        path: "/settings/security",
        heading: "Settings · Security",
        navLabel: "Security",
      },
    ];

    // Desktop verification across every route
    await page.setViewportSize({ width: 1280, height: 800 });

    // Verify /settings redirects to /settings/general
    await page.goto("/settings");
    await page.waitForURL("**/settings/general");
    await expect(
      page.getByRole("heading", { name: "Settings · General", level: 1 }),
    ).toBeVisible();

    for (const route of routes) {
      await page.goto(route.path);
      await expect(
        page.getByRole("heading", { name: route.heading, level: 1 }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Back to workspace" }),
      ).toBeVisible();
      const activeNav = page
        .getByRole("navigation", { name: "Secondary sections" })
        .getByRole("link", { name: route.navLabel, exact: true });
      await expect(activeNav).toHaveAttribute("aria-current", "page");
      await expect(page.getByText("Demo-only seeded state")).toBeVisible();
      await assertNoOverflow(page, `1280x800 ${route.path}`);
    }

    // Specific honesty check on Providers settings (never claims Online)
    await page.goto("/settings/providers");
    await expect(page.getByText("Unverified (Demo config)").first()).toBeVisible();
    await page.screenshot({ path: "docs/screenshots/secondary-providers.png" });

    // Mobile 390x844 overflow check across key secondary pages
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ["/projects", "/agents", "/knowledge", "/settings/providers"]) {
      await page.goto(route);
      await assertNoOverflow(page, `390x844 ${route}`);
    }
  });
});
