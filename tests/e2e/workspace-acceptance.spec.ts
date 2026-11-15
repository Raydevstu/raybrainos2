import { test, expect, type Locator, type Page } from "@playwright/test";

// Helper to ensure clean storage and page ready state before each test
async function loadWorkspace(
  page: Page,
  viewport = { width: 1440, height: 1000 },
) {
  await page.setViewportSize(viewport);
  await page.goto("/");
  await page.evaluate(() => {
    try {
      localStorage.removeItem("raybrain.workspace.layout.v1");
    } catch {
      // ignore
    }
  });
  await page.reload();
  const ready = page.getByTestId("workspace-ready");
  await expect(ready).toHaveAttribute("data-ready", "true");
  return ready;
}

async function pointerDrag(
  page: Page,
  locator: Locator,
  deltaX: number,
  deltaY: number,
) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 6 });
  await page.mouse.up();
}

async function assertNoHorizontalOverflow(page: Page, label: string) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const root = document.querySelector(".rb-workspace");
    return {
      innerWidth: window.innerWidth,
      docScrollWidth: doc.scrollWidth,
      bodyScrollWidth: body.scrollWidth,
      rootScrollWidth: root ? root.scrollWidth : 0,
      rootClientWidth: root ? root.clientWidth : 0,
    };
  });
  expect(
    metrics.docScrollWidth,
    `Horizontal overflow on document at ${label}`,
  ).toBeLessThanOrEqual(metrics.innerWidth);
  expect(
    metrics.bodyScrollWidth,
    `Horizontal overflow on body at ${label}`,
  ).toBeLessThanOrEqual(metrics.innerWidth);
  expect(
    metrics.rootScrollWidth,
    `Horizontal overflow on .rb-workspace at ${label}`,
  ).toBeLessThanOrEqual(metrics.rootClientWidth);
}

test.describe("RayBrainOS2 Workspace Acceptance Suite", () => {
  let pageErrors: string[] = [];
  let consoleErrors: string[] = [];

  // Register listeners BEFORE any navigation and fail on unexpected runtime errors
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

  test("A. Default desktop: calm chat-first layout without legacy dashboard", async ({
    page,
  }) => {
    await loadWorkspace(page, { width: 1440, height: 1000 });
    await assertNoHorizontalOverflow(page, "1440x1000 default desktop");

    // Left sidebar visible
    await expect(
      page.getByRole("region", { name: "Project navigation" }),
    ).toBeVisible();

    // Central Chat tab and tabpanel visible
    await expect(
      page.getByRole("tab", { name: "Chat", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("tabpanel", { name: "Chat", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "What should we work on?" }),
    ).toBeVisible();

    // Right sidebar closed initially
    await expect(
      page.getByRole("region", { name: "Workspace tools" }),
    ).toHaveCount(0);

    // Terminal closed initially
    await expect(
      page.getByRole("region", { name: "Terminal", exact: true }),
    ).toHaveCount(0);

    // No legacy dashboard cards, orbital canvas, agent dock, or simulated health grids
    await expect(page.getByTestId("agent-dock")).toHaveCount(0);
    await expect(page.getByTestId("dashboard-kpi-grid")).toHaveCount(0);
    await expect(page.locator(".cortex-rail")).toHaveCount(0);
    await expect(page.locator(".neural-canvas")).toHaveCount(0);

    await page.screenshot({ path: "docs/screenshots/default-desktop.png" });
  });

  test("B. Compact drawer appearance: computed theme tokens and keyboard focus styles", async ({
    page,
  }) => {
    await loadWorkspace(page, { width: 1024, height: 768 });

    // 1. Open left compact drawer via keyboard interaction
    const navBtn = page.getByRole("button", {
      name: "Toggle project navigation",
    });
    await navBtn.focus();
    await page.keyboard.press("Enter");

    const leftContent = page.locator('.rb-drawer-content[data-side="left"]');
    await expect(leftContent).toBeVisible();

    // Verify computed theme styles on portaled drawer content
    const leftStyles = await leftContent.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        bg: computed.backgroundColor,
        color: computed.color,
        borderRightColor: computed.borderRightColor,
      };
    });

    // #191919 => rgb(25, 25, 25), #eeeeec => rgb(238, 238, 236), #363636 => rgb(54, 54, 54)
    expect(leftStyles.bg).toBe("rgb(25, 25, 25)");
    expect(leftStyles.color).toBe("rgb(238, 238, 236)");
    expect(leftStyles.borderRightColor).toBe("rgb(54, 54, 54)");

    // Navigate using Tab inside drawer so native :focus-visible matches
    const closeLeftBtn = page.getByRole("button", {
      name: "Hide project navigation",
    });
    for (let i = 0; i < 6; i += 1) {
      if (await closeLeftBtn.evaluate((el) => document.activeElement === el)) {
        break;
      }
      await page.keyboard.press("Tab");
    }
    await expect(closeLeftBtn).toBeFocused();

    const leftFocusStyles = await closeLeftBtn.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        outlineStyle: computed.outlineStyle,
        outlineWidth: computed.outlineWidth,
        outlineColor: computed.outlineColor,
        outlineOffset: computed.outlineOffset,
      };
    });
    expect(leftFocusStyles.outlineStyle).toBe("solid");
    expect(leftFocusStyles.outlineWidth).toBe("2px");
    expect(leftFocusStyles.outlineColor).toBe("rgb(212, 198, 179)");
    expect(leftFocusStyles.outlineOffset).toBe("1px");

    await page.screenshot({ path: "docs/screenshots/compact-left-drawer.png" });

    // Close left drawer via keyboard Enter on close button
    await page.keyboard.press("Enter");
    await expect(leftContent).toBeHidden();

    // 2. Open right compact drawer via keyboard interaction
    const toolsBtn = page.getByRole("button", {
      name: "Toggle workspace tools",
    });
    await toolsBtn.focus();
    await page.keyboard.press("Enter");

    const rightContent = page.locator('.rb-drawer-content[data-side="right"]');
    await expect(rightContent).toBeVisible();

    const rightStyles = await rightContent.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        bg: computed.backgroundColor,
        color: computed.color,
        borderLeftColor: computed.borderLeftColor,
      };
    });

    expect(rightStyles.bg).toBe("rgb(25, 25, 25)");
    expect(rightStyles.color).toBe("rgb(238, 238, 236)");
    expect(rightStyles.borderLeftColor).toBe("rgb(54, 54, 54)");

    // Navigate via Tab to Hide workspace tools button inside right drawer and verify :focus-visible
    const closeRightBtn = page.getByRole("button", {
      name: "Hide workspace tools",
    });
    for (let i = 0; i < 8; i += 1) {
      if (await closeRightBtn.evaluate((el) => document.activeElement === el)) {
        break;
      }
      await page.keyboard.press("Tab");
    }
    await expect(closeRightBtn).toBeFocused();

    const rightFocusStyles = await closeRightBtn.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        outlineStyle: computed.outlineStyle,
        outlineWidth: computed.outlineWidth,
        outlineColor: computed.outlineColor,
        outlineOffset: computed.outlineOffset,
      };
    });
    expect(rightFocusStyles.outlineStyle).toBe("solid");
    expect(rightFocusStyles.outlineWidth).toBe("2px");
    expect(rightFocusStyles.outlineColor).toBe("rgb(212, 198, 179)");
    expect(rightFocusStyles.outlineOffset).toBe("1px");

    await page.screenshot({
      path: "docs/screenshots/compact-right-drawer.png",
    });

    // Close right drawer
    await page.keyboard.press("Escape");
    await expect(rightContent).toBeHidden();
  });

  test("C. Focus restoration: Escape, close button, backdrop, breakpoint, disabled & removed opener fallbacks", async ({
    page,
  }) => {
    await loadWorkspace(page, { width: 1024, height: 768 });

    const navBtn = page.getByRole("button", {
      name: "Toggle project navigation",
    });
    const toolsBtn = page.getByRole("button", {
      name: "Toggle workspace tools",
    });
    const changesBtn = page.getByRole("button", { name: "Open changes" });

    // Case 1: Escape key restores focus to opener
    await navBtn.focus();
    await page.keyboard.press("Enter");
    const leftContent = page.locator('.rb-drawer-content[data-side="left"]');
    await expect(leftContent).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(leftContent).toBeHidden();
    await expect(navBtn).toBeFocused();

    // Case 2: Drawer close button restores focus to opener
    await navBtn.click();
    await expect(leftContent).toBeVisible();
    const closeNavBtn = page.getByRole("button", {
      name: "Hide project navigation",
    });
    await closeNavBtn.click();
    await expect(leftContent).toBeHidden();
    await expect(navBtn).toBeFocused();

    // Case 3: Backdrop overlay click restores focus to opener
    await navBtn.click();
    await expect(leftContent).toBeVisible();
    await page
      .locator(".rb-drawer-overlay")
      .click({ position: { x: 500, y: 300 } });
    await expect(leftContent).toBeHidden();
    await expect(navBtn).toBeFocused();

    // Case 4: Right drawer opened via "Open changes"
    await changesBtn.click();
    const rightContent = page.locator('.rb-drawer-content[data-side="right"]');
    await expect(rightContent).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(rightContent).toBeHidden();
    await expect(changesBtn).toBeFocused();

    // Case 5: Right drawer opened via "Toggle workspace tools"
    await toolsBtn.click();
    await expect(rightContent).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(rightContent).toBeHidden();
    await expect(toolsBtn).toBeFocused();

    // Case 6: Compact-to-desktop transition closes drawer cleanly and restores focus to opener
    await navBtn.focus();
    await page.keyboard.press("Enter");
    await expect(leftContent).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(leftContent).toBeHidden();
    await expect(
      page.getByRole("region", { name: "Project navigation" }),
    ).toBeVisible();
    await expect(navBtn).toBeVisible();
    await expect(navBtn).toBeEnabled();
    await expect(navBtn).toBeFocused();

    // Case 7a: Disabled opener fallback (open via changesBtn -> disable changesBtn -> fallback is toolsBtn)
    await page.setViewportSize({ width: 1024, height: 768 });
    await changesBtn.click();
    await expect(rightContent).toBeVisible();

    await page.evaluate(() => {
      const btn = document.querySelector<HTMLButtonElement>(
        'button[aria-label="Open changes"]',
      );
      if (btn) btn.disabled = true;
    });

    await page.keyboard.press("Escape");
    await expect(rightContent).toBeHidden();
    await expect(toolsBtn).toBeVisible();
    await expect(toolsBtn).toBeEnabled();
    await expect(toolsBtn).toBeFocused();
    const toolsInsideDrawer = await toolsBtn.evaluate(
      (el) => el.closest(".rb-drawer-content") !== null,
    );
    expect(toolsInsideDrawer).toBe(false);

    // Case 7b: Removed opener fallback (clean reload -> open via changesBtn -> remove changesBtn -> fallback is toolsBtn)
    await loadWorkspace(page, { width: 1024, height: 768 });
    const changesBtnReloaded = page.getByRole("button", {
      name: "Open changes",
    });
    const toolsBtnReloaded = page.getByRole("button", {
      name: "Toggle workspace tools",
    });
    await changesBtnReloaded.click();
    await expect(rightContent).toBeVisible();

    await page.evaluate(() => {
      const btn = document.querySelector<HTMLButtonElement>(
        'button[aria-label="Open changes"]',
      );
      btn?.remove();
    });

    await page.keyboard.press("Escape");
    await expect(rightContent).toBeHidden();
    await expect(toolsBtnReloaded).toBeVisible();
    await expect(toolsBtnReloaded).toBeEnabled();
    await expect(toolsBtnReloaded).toBeFocused();
    const reloadedToolsInsideDrawer = await toolsBtnReloaded.evaluate(
      (el) => el.closest(".rb-drawer-content") !== null,
    );
    expect(reloadedToolsInsideDrawer).toBe(false);
  });

  test("D. Sidebar tabs: WAI-ARIA semantics, one tab stop per tablist, and arrow/Home/End navigation", async ({
    page,
  }) => {
    await loadWorkspace(page, { width: 1440, height: 1000 });

    // 1. Left sidebar tabs: Files and Chats
    const leftRegion = page.getByRole("region", { name: "Project navigation" });
    const filesTab = page.getByRole("tab", { name: "Files", exact: true });
    const chatsTab = page.getByRole("tab", { name: "Chats", exact: true });
    const hideNavBtn = page.getByRole("button", {
      name: "Hide project navigation",
    });

    await expect(filesTab).toHaveAttribute("aria-selected", "true");
    await expect(chatsTab).toHaveAttribute("aria-selected", "false");

    // Enter tablist in a single tab stop from the following button via Shift+Tab
    await hideNavBtn.focus();
    await page.keyboard.press("Shift+Tab");
    await expect(filesTab).toBeFocused();
    await expect(filesTab).toHaveAttribute("tabindex", "0");
    await expect(chatsTab).toHaveAttribute("tabindex", "-1");
    expect(
      await leftRegion.locator('[role="tab"][tabindex="0"]').count(),
    ).toBe(1);

    // Pressing Tab once exits the tablist straight to Hide project navigation (1 tab stop)
    await page.keyboard.press("Tab");
    await expect(hideNavBtn).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(filesTab).toBeFocused();

    // ArrowRight activates Chats and shifts tabindex="0"
    await page.keyboard.press("ArrowRight");
    await expect(chatsTab).toBeFocused();
    await expect(chatsTab).toHaveAttribute("aria-selected", "true");
    await expect(chatsTab).toHaveAttribute("tabindex", "0");
    await expect(filesTab).toHaveAttribute("tabindex", "-1");
    await expect(page.getByText("No conversations")).toBeVisible();

    // ArrowLeft activates Files
    await page.keyboard.press("ArrowLeft");
    await expect(filesTab).toBeFocused();
    await expect(filesTab).toHaveAttribute("aria-selected", "true");
    await expect(filesTab).toHaveAttribute("tabindex", "0");
    await expect(chatsTab).toHaveAttribute("tabindex", "-1");
    await expect(page.getByText("No workspace files")).toBeVisible();

    // End key moves to last tab (Chats)
    await page.keyboard.press("End");
    await expect(chatsTab).toBeFocused();
    await expect(chatsTab).toHaveAttribute("aria-selected", "true");

    // Home key moves to first tab (Files)
    await page.keyboard.press("Home");
    await expect(filesTab).toBeFocused();
    await expect(filesTab).toHaveAttribute("aria-selected", "true");

    // 2. Right sidebar tabs: Changes, Preview, Browser, Debug (verify single tab stop)
    await page.getByRole("button", { name: "Open changes" }).click();
    const rightRegion = page.getByRole("region", { name: "Workspace tools" });
    await expect(rightRegion).toBeVisible();

    const changesTab = page.getByRole("tab", { name: "Changes", exact: true });
    const previewTab = page.getByRole("tab", { name: "Preview", exact: true });
    const browserTab = page.getByRole("tab", { name: "Browser", exact: true });
    const debugTab = page.getByRole("tab", { name: "Debug", exact: true });
    const hideToolsBtn = page.getByRole("button", {
      name: "Hide workspace tools",
    });

    await hideToolsBtn.focus();
    await page.keyboard.press("Shift+Tab");
    await expect(changesTab).toBeFocused();
    await expect(changesTab).toHaveAttribute("aria-selected", "true");
    expect(
      await rightRegion.locator('[role="tab"][tabindex="0"]').count(),
    ).toBe(1);

    // Pressing Tab once exits straight to Hide workspace tools (1 tab stop)
    await page.keyboard.press("Tab");
    await expect(hideToolsBtn).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(changesTab).toBeFocused();

    // ArrowRight sequence
    await page.keyboard.press("ArrowRight");
    await expect(previewTab).toHaveAttribute("aria-selected", "true");
    await expect(previewTab).toHaveAttribute("tabindex", "0");
    await expect(changesTab).toHaveAttribute("tabindex", "-1");
    await expect(page.getByText("Project preview unavailable")).toBeVisible();

    await page.keyboard.press("ArrowRight");
    await expect(browserTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Browser session unavailable")).toBeVisible();

    await page.keyboard.press("ArrowRight");
    await expect(debugTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Debug signals unavailable")).toBeVisible();

    // Home returns to Changes
    await page.keyboard.press("Home");
    await expect(changesTab).toHaveAttribute("aria-selected", "true");

    // End jumps to Debug
    await page.keyboard.press("End");
    await expect(debugTab).toHaveAttribute("aria-selected", "true");

    await page.screenshot({ path: "docs/screenshots/right-tools-open.png" });
  });

  test("E. Desktop preference isolation: compact drawer usage preserves desktop state", async ({
    page,
  }) => {
    await loadWorkspace(page, { width: 1440, height: 1000 });

    // Default: Right sidebar is closed on desktop
    await expect(
      page.getByRole("region", { name: "Workspace tools" }),
    ).toHaveCount(0);

    // Switch to compact viewport (< 1200px)
    await page.setViewportSize({ width: 1024, height: 768 });

    // Open right drawer via Open changes
    await page.getByRole("button", { name: "Open changes" }).click();
    const rightContent = page.locator('.rb-drawer-content[data-side="right"]');
    await expect(rightContent).toBeVisible();

    // Select Preview tool view
    await page.getByRole("tab", { name: "Preview", exact: true }).click();
    await expect(page.getByText("Project preview unavailable")).toBeVisible();

    // Close compact drawer
    await page.keyboard.press("Escape");
    await expect(rightContent).toBeHidden();

    // Return to desktop viewport (>= 1200px)
    await page.setViewportSize({ width: 1440, height: 1000 });

    // CRITICAL: Right sidebar must STILL be closed on desktop!
    await expect(
      page.getByRole("region", { name: "Workspace tools" }),
    ).toHaveCount(0);

    // Opening right sidebar on desktop must remember the selected "Preview" view
    await page.getByRole("button", { name: "Toggle workspace tools" }).click();
    await expect(
      page.getByRole("region", { name: "Workspace tools" }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Preview", exact: true }),
    ).toHaveAttribute("aria-selected", "true");

    // Now test desktop-closed Left sidebar isolation:
    await page.getByRole("button", { name: "Toggle project navigation" }).click();
    await expect(
      page.getByRole("region", { name: "Project navigation" }),
    ).toHaveCount(0);

    // Switch to compact
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.getByRole("button", { name: "Toggle project navigation" }).click();
    const leftContent = page.locator('.rb-drawer-content[data-side="left"]');
    await expect(leftContent).toBeVisible();

    // Switch view to Chats
    await page.getByRole("tab", { name: "Chats", exact: true }).click();
    await expect(page.getByText("No conversations")).toBeVisible();

    // Close compact drawer
    await page.keyboard.press("Escape");
    await expect(leftContent).toBeHidden();

    // Return to desktop
    await page.setViewportSize({ width: 1440, height: 1000 });

    // Left sidebar must remain closed on desktop
    await expect(
      page.getByRole("region", { name: "Project navigation" }),
    ).toHaveCount(0);

    // When toggled open on desktop, it opens to Chats view
    await page.getByRole("button", { name: "Toggle project navigation" }).click();
    await expect(
      page.getByRole("region", { name: "Project navigation" }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Chats", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
  });

  test("F. Terminal: opens below center only and leaves both sidebar heights unchanged", async ({
    page,
  }) => {
    await loadWorkspace(page, { width: 1440, height: 1000 });

    // Open right sidebar so both sidebars are visible during terminal toggle
    await page.getByRole("button", { name: "Toggle workspace tools" }).click();

    const leftPane = page.locator("#rb-left-pane");
    const rightPane = page.locator("#rb-right-pane");
    await expect(leftPane).toBeVisible();
    await expect(rightPane).toBeVisible();

    const leftHeightBefore = (await leftPane.boundingBox())?.height ?? 0;
    const rightHeightBefore = (await rightPane.boundingBox())?.height ?? 0;
    expect(leftHeightBefore).toBeGreaterThan(800);
    expect(rightHeightBefore).toBeGreaterThan(800);

    // Open terminal drawer
    const terminalBtn = page.getByRole("button", { name: "Toggle terminal" });
    await terminalBtn.click();

    const terminalPane = page.locator("#rb-terminal-pane");
    await expect(terminalPane).toBeVisible();

    // Verify terminal is placed strictly inside .rb-center and does not overlap sidebars
    const layoutGeometry = await page.evaluate(() => {
      const terminal = document.querySelector("#rb-terminal-pane");
      const center = document.querySelector(".rb-center");
      const workArea = document.querySelector(".rb-center > .rb-work-area");
      const left = document.querySelector("#rb-left-pane");
      const right = document.querySelector("#rb-right-pane");
      if (!terminal || !center || !workArea || !left || !right) return null;

      const tRect = terminal.getBoundingClientRect();
      const wRect = workArea.getBoundingClientRect();
      const lRect = left.getBoundingClientRect();
      const rRect = right.getBoundingClientRect();
      return {
        insideCenter: center.contains(terminal),
        belowWorkArea: tRect.top >= wRect.bottom,
        leftClear: tRect.left >= lRect.right,
        rightClear: tRect.right <= rRect.left + 1,
        leftHeightAfter: lRect.height,
        rightHeightAfter: rRect.height,
      };
    });

    expect(layoutGeometry).not.toBeNull();
    if (!layoutGeometry) return;
    expect(layoutGeometry.insideCenter).toBe(true);
    expect(layoutGeometry.belowWorkArea).toBe(true);
    expect(layoutGeometry.leftClear).toBe(true);
    expect(layoutGeometry.rightClear).toBe(true);

    // Verify BOTH sidebar vertical heights are NOT reduced by terminal opening
    expect(
      Math.abs(layoutGeometry.leftHeightAfter - leftHeightBefore),
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs(layoutGeometry.rightHeightAfter - rightHeightBefore),
    ).toBeLessThanOrEqual(2);

    await page.screenshot({ path: "docs/screenshots/terminal-open.png" });

    // Close terminal drawer
    await terminalBtn.click();
    await expect(terminalPane).toHaveCount(0);
  });

  test("G. Layout: pointer-drag geometry, keyboard resize, focus mode with all panes, reload persistence & recovery", async ({
    page,
  }) => {
    await loadWorkspace(page, { width: 1440, height: 1000 });

    // Open right sidebar and terminal so we verify pointer-drag geometry on ALL 3 handles
    await page.getByRole("button", { name: "Toggle workspace tools" }).click();
    await page.getByRole("button", { name: "Toggle terminal" }).click();

    const leftPane = page.locator("#rb-left-pane");
    const rightPane = page.locator("#rb-right-pane");
    const terminalPane = page.locator("#rb-terminal-pane");
    const leftHandle = page.getByRole("separator", {
      name: "Resize project navigation",
    });
    const rightHandle = page.getByRole("separator", {
      name: "Resize workspace tools",
    });
    const terminalHandle = page.getByRole("separator", {
      name: "Resize terminal",
    });

    await expect(leftHandle).toBeVisible();
    await expect(rightHandle).toBeVisible();
    await expect(terminalHandle).toBeVisible();

    // 1a. Pointer-drag Left sidebar (+60px right -> wider)
    const leftWidth0 = (await leftPane.boundingBox())!.width;
    await pointerDrag(page, leftHandle, 60, 0);
    await expect
      .poll(async () => (await leftPane.boundingBox())!.width)
      .toBeGreaterThan(leftWidth0 + 45);
    const leftAriaAfterDrag = Number(
      await leftHandle.getAttribute("aria-valuenow"),
    );
    const leftWidthAfterDrag = (await leftPane.boundingBox())!.width;
    expect(Math.abs(leftWidthAfterDrag - leftAriaAfterDrag)).toBeLessThanOrEqual(
      2,
    );

    // 1b. Pointer-drag Right sidebar (-70px left -> wider)
    const rightWidth0 = (await rightPane.boundingBox())!.width;
    await pointerDrag(page, rightHandle, -70, 0);
    await expect
      .poll(async () => (await rightPane.boundingBox())!.width)
      .toBeGreaterThan(rightWidth0 + 55);
    const rightAriaAfterDrag = Number(
      await rightHandle.getAttribute("aria-valuenow"),
    );
    const rightWidthAfterDrag = (await rightPane.boundingBox())!.width;
    expect(
      Math.abs(rightWidthAfterDrag - rightAriaAfterDrag),
    ).toBeLessThanOrEqual(2);

    // 1c. Pointer-drag Terminal (-55px up -> taller)
    const termHeight0 = (await terminalPane.boundingBox())!.height;
    await pointerDrag(page, terminalHandle, 0, -55);
    await expect
      .poll(async () => (await terminalPane.boundingBox())!.height)
      .toBeGreaterThan(termHeight0 + 40);
    const termAriaAfterDrag = Number(
      await terminalHandle.getAttribute("aria-valuenow"),
    );
    const termHeightAfterDrag = (await terminalPane.boundingBox())!.height;
    expect(
      Math.abs(termHeightAfterDrag - termAriaAfterDrag),
    ).toBeLessThanOrEqual(2);

    // Select specific sidebar views before testing Focus Mode restoration
    await page.getByRole("tab", { name: "Chats", exact: true }).click();
    await page.getByRole("tab", { name: "Preview", exact: true }).click();
    await expect(
      page.getByRole("tab", { name: "Chats", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByRole("tab", { name: "Preview", exact: true }),
    ).toHaveAttribute("aria-selected", "true");

    // 2. Focus mode restoration with BOTH desktop sidebars and terminal open
    const enterFocusBtn = page.getByRole("button", {
      name: "Enter focus mode",
    });
    await enterFocusBtn.click();
    await expect(page.getByTestId("workspace-ready")).toHaveAttribute(
      "data-focus",
      "true",
    );
    await expect(
      page.getByRole("region", { name: "Project navigation" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Workspace tools" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Terminal", exact: true }),
    ).toHaveCount(0);

    const exitFocusBtn = page.getByRole("button", { name: "Exit focus mode" });
    await exitFocusBtn.click();
    await expect(page.getByTestId("workspace-ready")).toHaveAttribute(
      "data-focus",
      "false",
    );

    // Verify all 3 panes, selected views, and exact dimensions restored
    await expect(leftPane).toBeVisible();
    await expect(rightPane).toBeVisible();
    await expect(terminalPane).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Chats", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByRole("tab", { name: "Preview", exact: true }),
    ).toHaveAttribute("aria-selected", "true");

    expect(
      Math.abs((await leftPane.boundingBox())!.width - leftWidthAfterDrag),
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs((await rightPane.boundingBox())!.width - rightWidthAfterDrag),
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs((await terminalPane.boundingBox())!.height - termHeightAfterDrag),
    ).toBeLessThanOrEqual(2);

    // 3. Keyboard resizing + condition-based persistence check across reload
    await leftHandle.focus();
    await page.keyboard.press("Home");
    const valHome = Number(await leftHandle.getAttribute("aria-valuenow"));
    expect(valHome).toBe(200);
    expect(
      Math.abs((await leftPane.boundingBox())!.width - 200),
    ).toBeLessThanOrEqual(2);

    await page.keyboard.press("ArrowRight");
    expect(Number(await leftHandle.getAttribute("aria-valuenow"))).toBe(210);

    await page.keyboard.press("Shift+ArrowRight");
    expect(Number(await leftHandle.getAttribute("aria-valuenow"))).toBe(250);

    await page.keyboard.press("End");
    const valEnd = Number(await leftHandle.getAttribute("aria-valuenow"));
    expect(valEnd).toBeGreaterThan(300);

    // Condition-based wait for debounced localStorage persistence (no arbitrary sleep)
    await expect
      .poll(async () =>
        page.evaluate(() => {
          try {
            const raw = localStorage.getItem("raybrain.workspace.layout.v1");
            return raw ? JSON.parse(raw).leftWidth : null;
          } catch {
            return null;
          }
        }),
      )
      .toBe(valEnd);

    await page.reload();
    await expect(page.getByTestId("workspace-ready")).toHaveAttribute(
      "data-ready",
      "true",
    );
    const reloadedHandle = page.getByRole("separator", {
      name: "Resize project navigation",
    });
    expect(Number(await reloadedHandle.getAttribute("aria-valuenow"))).toBe(
      valEnd,
    );
    expect(
      Math.abs((await leftPane.boundingBox())!.width - valEnd),
    ).toBeLessThanOrEqual(2);

    // 4. Corrupt localStorage recovery: graceful fallback without crashing or console errors
    await page.evaluate(() => {
      localStorage.setItem(
        "raybrain.workspace.layout.v1",
        "INVALID_JSON_CORRUPTED{{{",
      );
    });
    await page.reload();
    await expect(page.getByTestId("workspace-ready")).toHaveAttribute(
      "data-ready",
      "true",
    );
    await expect(
      page.getByRole("region", { name: "Project navigation" }),
    ).toBeVisible();
  });

  test("H. Height regression: center height chain fills workspace and positions composer near bottom", async ({
    page,
  }) => {
    await loadWorkspace(page, { width: 1440, height: 1000 });

    const dimensions = await page.evaluate(() => {
      const parent = document.querySelector(".rb-center > .rb-work-area");
      const child = document.querySelector(".rb-workspace-tabs");
      const composer = document.querySelector(".rb-composer");

      if (!parent || !child || !composer) return null;

      const pRect = parent.getBoundingClientRect();
      const cRect = child.getBoundingClientRect();
      const compRect = composer.getBoundingClientRect();

      return {
        parentHeight: pRect.height,
        childHeight: cRect.height,
        distanceFromBottom: pRect.bottom - compRect.bottom,
      };
    });

    expect(dimensions).not.toBeNull();
    if (!dimensions) return;

    expect(
      Math.abs(dimensions.childHeight - dimensions.parentHeight),
    ).toBeLessThanOrEqual(2);
    expect(dimensions.distanceFromBottom).toBeGreaterThanOrEqual(10);
    expect(dimensions.distanceFromBottom).toBeLessThanOrEqual(30);

    // Opening terminal reduces chat height dynamically while keeping composer visible within work area
    await page.getByRole("button", { name: "Toggle terminal" }).click();
    const terminalRegion = page.getByRole("region", { name: "Terminal" });
    await expect(terminalRegion).toBeVisible();

    const dimensionsWithTerminal = await page.evaluate(() => {
      const parent = document.querySelector(".rb-center > .rb-work-area");
      const child = document.querySelector(".rb-workspace-tabs");
      const composer = document.querySelector(".rb-composer");

      if (!parent || !child || !composer) return null;

      const pRect = parent.getBoundingClientRect();
      const cRect = child.getBoundingClientRect();
      const compRect = composer.getBoundingClientRect();

      return {
        parentHeight: pRect.height,
        childHeight: cRect.height,
        distanceFromBottom: pRect.bottom - compRect.bottom,
        composerTop: compRect.top,
        parentTop: pRect.top,
      };
    });

    expect(dimensionsWithTerminal).not.toBeNull();
    if (!dimensionsWithTerminal) return;

    expect(dimensionsWithTerminal.parentHeight).toBeLessThan(
      dimensions.parentHeight - 100,
    );
    expect(
      Math.abs(
        dimensionsWithTerminal.childHeight -
          dimensionsWithTerminal.parentHeight,
      ),
    ).toBeLessThanOrEqual(2);
    expect(dimensionsWithTerminal.composerTop).toBeGreaterThanOrEqual(
      dimensionsWithTerminal.parentTop,
    );
    expect(dimensionsWithTerminal.distanceFromBottom).toBeGreaterThanOrEqual(
      10,
    );
    expect(dimensionsWithTerminal.distanceFromBottom).toBeLessThanOrEqual(30);
  });

  test("Viewport matrix and no-horizontal-overflow across all required breakpoints", async ({
    page,
  }) => {
    // 1. 1440x1000 Desktop
    await loadWorkspace(page, { width: 1440, height: 1000 });
    await expect(page.locator(".rb-workspace")).toHaveAttribute(
      "data-mode",
      "desktop",
    );
    await assertNoHorizontalOverflow(page, "1440x1000");

    // 2. 1280x800 Desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator(".rb-workspace")).toHaveAttribute(
      "data-mode",
      "desktop",
    );
    await expect(
      page.getByRole("region", { name: "Project navigation" }),
    ).toBeVisible();
    await assertNoHorizontalOverflow(page, "1280x800");
    await page.screenshot({ path: "docs/screenshots/desktop-1280x800.png" });

    // 3. 1202px breakpoint (Desktop mode)
    await page.setViewportSize({ width: 1202, height: 800 });
    await expect(page.locator(".rb-workspace")).toHaveAttribute(
      "data-mode",
      "desktop",
    );
    await expect(
      page.getByRole("region", { name: "Project navigation" }),
    ).toBeVisible();
    await assertNoHorizontalOverflow(page, "1202x800");

    // 4. 1198px breakpoint (Compact drawer mode)
    await page.setViewportSize({ width: 1198, height: 800 });
    await expect(page.locator(".rb-workspace")).toHaveAttribute(
      "data-mode",
      "drawers",
    );
    await expect(
      page.getByRole("region", { name: "Project navigation" }),
    ).toHaveCount(0);
    await assertNoHorizontalOverflow(page, "1198x800");

    // 5. 1024x768 Tablet
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(page.locator(".rb-workspace")).toHaveAttribute(
      "data-mode",
      "drawers",
    );
    await assertNoHorizontalOverflow(page, "1024x768");
    await page.screenshot({ path: "docs/screenshots/compact-1024x768.png" });

    // 6. 390x844 Narrow mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(".rb-workspace")).toHaveAttribute(
      "data-mode",
      "drawers",
    );
    await expect(
      page.getByRole("heading", { name: "What should we work on?" }),
    ).toBeVisible();
    await assertNoHorizontalOverflow(page, "390x844");
    await page.screenshot({ path: "docs/screenshots/mobile-390x844.png" });

    // 7. 1280x440 Short viewport with terminal open
    await page.setViewportSize({ width: 1280, height: 440 });
    await page.getByRole("button", { name: "Toggle terminal" }).click();
    await expect(page.getByRole("region", { name: "Terminal" })).toBeVisible();
    await assertNoHorizontalOverflow(page, "1280x440 with terminal");

    const composerInShortViewport = await page.evaluate(() => {
      const workArea = document.querySelector(".rb-center > .rb-work-area");
      const comp = document.querySelector(".rb-composer");
      if (!workArea || !comp) return false;
      const wRect = workArea.getBoundingClientRect();
      const cRect = comp.getBoundingClientRect();
      return cRect.top >= wRect.top && cRect.bottom <= wRect.bottom;
    });
    expect(composerInShortViewport).toBe(true);

    await page.screenshot({ path: "docs/screenshots/short-height-layout.png" });
  });
});
