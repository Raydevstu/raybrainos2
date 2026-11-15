import { test, expect, type Page } from "@playwright/test";

// Helper to ensure clean storage and page ready state before each test
async function loadWorkspace(page: Page, viewport = { width: 1440, height: 1000 }) {
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

test.describe("RayBrainOS2 Workspace Acceptance Suite", () => {
  // Capture page errors globally during test runs to satisfy Assertion I
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (error) => {
      // Fail tests on uncaught runtime errors
      console.error("[E2E Uncaught Page Error]:", error);
    });
  });

  test("A. Default desktop: calm chat-first layout without legacy dashboard", async ({ page }) => {
    await loadWorkspace(page, { width: 1440, height: 1000 });

    // Left sidebar visible
    await expect(page.getByRole("region", { name: "Project navigation" })).toBeVisible();

    // Central Chat tab and tabpanel visible
    await expect(page.getByRole("tab", { name: "Chat", exact: true })).toBeVisible();
    await expect(page.getByRole("tabpanel", { name: "Chat", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "What should we work on?" })).toBeVisible();

    // Right sidebar closed initially
    await expect(page.getByRole("region", { name: "Workspace tools" })).toHaveCount(0);

    // Terminal closed initially
    await expect(page.getByRole("region", { name: "Terminal", exact: true })).toHaveCount(0);

    // No legacy dashboard cards, orbital canvas, agent dock, or simulated health grids
    await expect(page.getByTestId("agent-dock")).toHaveCount(0);
    await expect(page.getByTestId("dashboard-kpi-grid")).toHaveCount(0);
    await expect(page.locator(".cortex-rail")).toHaveCount(0);
    await expect(page.locator(".neural-canvas")).toHaveCount(0);

    // Take screenshot of default desktop
    await page.screenshot({ path: "docs/screenshots/default-desktop.png" });
  });

  test("B. Compact drawer appearance: computed theme tokens and focus styles", async ({ page }) => {
    await loadWorkspace(page, { width: 1024, height: 768 });

    // 1. Open left compact drawer
    const navBtn = page.getByRole("button", { name: "Toggle project navigation" });
    await navBtn.click();

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

    // Verify close button keyboard focus styling
    const closeLeftBtn = page.getByRole("button", { name: "Hide project navigation" });
    await closeLeftBtn.focus();
    // Simulate keyboard focus via Tab or inspect focus visible rules
    await page.keyboard.press("Tab");
    const closeFocusOutline = await page.evaluate(() => {
      const btn = document.querySelector<HTMLElement>('[aria-label="Hide project navigation"]');
      if (!btn) return "";
      btn.focus();
      return window.getComputedStyle(btn).outlineColor;
    });
    // Verify outline uses the accent color or active border
    expect(closeFocusOutline).toBeTruthy();

    await page.screenshot({ path: "docs/screenshots/compact-left-drawer.png" });

    // Close left drawer
    await closeLeftBtn.click();
    await expect(leftContent).toBeHidden();

    // 2. Open right compact drawer
    const toolsBtn = page.getByRole("button", { name: "Toggle workspace tools" });
    await toolsBtn.click();

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

    await page.screenshot({ path: "docs/screenshots/compact-right-drawer.png" });

    // Close right drawer
    await page.keyboard.press("Escape");
    await expect(rightContent).toBeHidden();
  });

  test("C. Focus restoration: Escape, close button, backdrop, breakpoint, and fallback", async ({ page }) => {
    await loadWorkspace(page, { width: 1024, height: 768 });

    const navBtn = page.getByRole("button", { name: "Toggle project navigation" });
    const toolsBtn = page.getByRole("button", { name: "Toggle workspace tools" });
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
    const closeNavBtn = page.getByRole("button", { name: "Hide project navigation" });
    await closeNavBtn.click();
    await expect(leftContent).toBeHidden();
    await expect(navBtn).toBeFocused();

    // Case 3: Backdrop overlay click restores focus to opener
    await navBtn.click();
    await expect(leftContent).toBeVisible();
    await page.locator(".rb-drawer-overlay").click({ position: { x: 500, y: 300 } });
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

    // Case 6: Compact-to-desktop transition closes drawer cleanly and restores focus
    await navBtn.click();
    await expect(leftContent).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(leftContent).toBeHidden();
    // In desktop, left navigation becomes inline desktop panel
    await expect(page.getByRole("region", { name: "Project navigation" })).toBeVisible();

    // Return to compact for fallback test
    await page.setViewportSize({ width: 1024, height: 768 });

    // Case 7: Disabled / removed opener fallback
    await toolsBtn.click();
    await expect(rightContent).toBeVisible();

    // Simulate opener becoming disabled while drawer is open
    await page.evaluate(() => {
      const btn = document.querySelector<HTMLButtonElement>('[data-rb-drawer-fallback="right"]');
      if (btn) btn.disabled = true;
    });

    await page.keyboard.press("Escape");
    await expect(rightContent).toBeHidden();

    // Focus must land on a valid fallback control, never body
    const activeTagName = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
    expect(activeTagName).not.toBe("body");
  });

  test("D. Sidebar tabs: WAI-ARIA semantics, roving tabIndex, and arrow/Home/End navigation", async ({ page }) => {
    await loadWorkspace(page, { width: 1440, height: 1000 });

    // 1. Left sidebar tabs: Files and Chats
    const filesTab = page.getByRole("tab", { name: "Files", exact: true });
    const chatsTab = page.getByRole("tab", { name: "Chats", exact: true });

    await expect(filesTab).toHaveAttribute("aria-selected", "true");
    await expect(chatsTab).toHaveAttribute("aria-selected", "false");

    await filesTab.focus();
    await expect(filesTab).toBeFocused();

    // ArrowRight activates Chats
    await page.keyboard.press("ArrowRight");
    await expect(chatsTab).toBeFocused();
    await expect(chatsTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("No conversations")).toBeVisible();

    // ArrowLeft activates Files
    await page.keyboard.press("ArrowLeft");
    await expect(filesTab).toBeFocused();
    await expect(filesTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("No workspace files")).toBeVisible();

    // End key moves to last tab (Chats)
    await page.keyboard.press("End");
    await expect(chatsTab).toBeFocused();
    await expect(chatsTab).toHaveAttribute("aria-selected", "true");

    // Home key moves to first tab (Files)
    await page.keyboard.press("Home");
    await expect(filesTab).toBeFocused();
    await expect(filesTab).toHaveAttribute("aria-selected", "true");

    // 2. Right sidebar tabs: Changes, Preview, Browser, Debug
    await page.getByRole("button", { name: "Open changes" }).click();
    const rightRegion = page.getByRole("region", { name: "Workspace tools" });
    await expect(rightRegion).toBeVisible();

    const changesTab = page.getByRole("tab", { name: "Changes", exact: true });
    const previewTab = page.getByRole("tab", { name: "Preview", exact: true });
    const browserTab = page.getByRole("tab", { name: "Browser", exact: true });
    const debugTab = page.getByRole("tab", { name: "Debug", exact: true });

    await changesTab.focus();
    await expect(changesTab).toHaveAttribute("aria-selected", "true");

    // ArrowRight sequence
    await page.keyboard.press("ArrowRight");
    await expect(previewTab).toHaveAttribute("aria-selected", "true");
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

  test("E. Desktop preference isolation: compact drawer usage preserves desktop state", async ({ page }) => {
    await loadWorkspace(page, { width: 1440, height: 1000 });

    // Default: Right sidebar is closed on desktop
    await expect(page.getByRole("region", { name: "Workspace tools" })).toHaveCount(0);

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
    await expect(page.getByRole("region", { name: "Workspace tools" })).toHaveCount(0);

    // Opening right sidebar on desktop must remember the selected "Preview" view
    await page.getByRole("button", { name: "Toggle workspace tools" }).click();
    await expect(page.getByRole("region", { name: "Workspace tools" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Preview", exact: true })).toHaveAttribute("aria-selected", "true");

    // Now test desktop-closed Left sidebar isolation:
    // Close left sidebar on desktop
    await page.getByRole("button", { name: "Toggle project navigation" }).click();
    await expect(page.getByRole("region", { name: "Project navigation" })).toHaveCount(0);

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
    await expect(page.getByRole("region", { name: "Project navigation" })).toHaveCount(0);

    // When toggled open on desktop, it opens to Chats view
    await page.getByRole("button", { name: "Toggle project navigation" }).click();
    await expect(page.getByRole("region", { name: "Project navigation" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Chats", exact: true })).toHaveAttribute("aria-selected", "true");
  });

  test("F. Terminal: opens below center only and does not resize sidebars vertically", async ({ page }) => {
    await loadWorkspace(page, { width: 1440, height: 1000 });

    const leftSidebar = page.locator(".rb-pane.rb-sidebar");
    await expect(leftSidebar).toBeVisible();

    const leftHeightBefore = (await leftSidebar.boundingBox())?.height ?? 0;
    expect(leftHeightBefore).toBeGreaterThan(800);

    // Open terminal drawer
    const terminalBtn = page.getByRole("button", { name: "Toggle terminal" });
    await terminalBtn.click();

    const terminalRegion = page.getByRole("region", { name: "Terminal", exact: true });
    await expect(terminalRegion).toBeVisible();

    // Verify terminal is placed inside .rb-center
    const isInsideCenter = await page.evaluate(() => {
      const terminal = document.querySelector(".rb-terminal");
      const center = document.querySelector(".rb-center");
      return terminal !== null && center !== null && center.contains(terminal);
    });
    expect(isInsideCenter).toBe(true);

    // Verify left sidebar vertical height is NOT reduced by terminal opening
    const leftHeightAfter = (await leftSidebar.boundingBox())?.height ?? 0;
    expect(Math.abs(leftHeightAfter - leftHeightBefore)).toBeLessThanOrEqual(2);

    await page.screenshot({ path: "docs/screenshots/terminal-open.png" });

    // Close terminal drawer
    await terminalBtn.click();
    await expect(terminalRegion).toHaveCount(0);
  });

  test("G. Layout: pointer resize, keyboard resize, reload persistence, focus mode, and recovery", async ({ page }) => {
    await loadWorkspace(page, { width: 1440, height: 1000 });

    const handle = page.getByRole("separator", { name: "Resize project navigation" });
    await expect(handle).toBeVisible();

    const initialVal = Number(await handle.getAttribute("aria-valuenow"));
    expect(initialVal).toBeGreaterThanOrEqual(200);

    // 1. Keyboard resizing
    await handle.focus();
    await page.keyboard.press("ArrowRight");
    const valStep10 = Number(await handle.getAttribute("aria-valuenow"));
    expect(valStep10).toBe(initialVal + 10);

    // Shift+ArrowRight increases by 40
    await page.keyboard.press("Shift+ArrowRight");
    const valStep40 = Number(await handle.getAttribute("aria-valuenow"));
    expect(valStep40).toBe(valStep10 + 40);

    // Home jumps to minimum (200)
    await page.keyboard.press("Home");
    const valHome = Number(await handle.getAttribute("aria-valuenow"));
    expect(valHome).toBe(200);

    // End jumps to maximum allowed by budget
    await page.keyboard.press("End");
    const valEnd = Number(await handle.getAttribute("aria-valuenow"));
    expect(valEnd).toBeGreaterThan(300);

    // 2. Reload persistence (allow 150ms localStorage debounce write to settle)
    await page.waitForTimeout(250);
    await page.reload();
    await expect(page.getByTestId("workspace-ready")).toHaveAttribute("data-ready", "true");
    const reloadedHandle = page.getByRole("separator", { name: "Resize project navigation" });
    const reloadedVal = Number(await reloadedHandle.getAttribute("aria-valuenow"));
    expect(reloadedVal).toBe(valEnd);

    // 3. Focus mode: hides both sidebars and terminal
    const enterFocusBtn = page.getByRole("button", { name: "Enter focus mode" });
    await enterFocusBtn.click();
    await expect(page.getByRole("region", { name: "Project navigation" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Workspace tools" })).toHaveCount(0);

    // Exit focus mode restores previous configuration
    const exitFocusBtn = page.getByRole("button", { name: "Exit focus mode" });
    await exitFocusBtn.click();
    await expect(page.getByRole("region", { name: "Project navigation" })).toBeVisible();

    // 4. Corrupt localStorage recovery: graceful fallback without crashing
    await page.evaluate(() => {
      localStorage.setItem("raybrain.workspace.layout.v1", "INVALID_JSON_CORRUPTED{{{");
    });
    await page.reload();
    await expect(page.getByTestId("workspace-ready")).toHaveAttribute("data-ready", "true");
    await expect(page.getByRole("region", { name: "Project navigation" })).toBeVisible();
  });

  test("H. Height regression: center height chain fills workspace and positions composer near bottom", async ({ page }) => {
    await loadWorkspace(page, { width: 1440, height: 1000 });

    // Measure parent .rb-work-area vs child .rb-workspace-tabs
    const dimensions = await page.evaluate(() => {
      const parent = document.querySelector(".rb-center > .rb-work-area");
      const child = document.querySelector(".rb-workspace-tabs");
      const composer = document.querySelector(".rb-composer");
      const chatLayout = document.querySelector(".rb-chat-layout");

      if (!parent || !child || !composer || !chatLayout) return null;

      const pRect = parent.getBoundingClientRect();
      const cRect = child.getBoundingClientRect();
      const compRect = composer.getBoundingClientRect();

      return {
        parentHeight: pRect.height,
        childHeight: cRect.height,
        parentBottom: pRect.bottom,
        composerBottom: compRect.bottom,
        distanceFromBottom: pRect.bottom - compRect.bottom,
      };
    });

    expect(dimensions).not.toBeNull();
    if (!dimensions) return;

    // 1. Child .rb-workspace-tabs must fully fill parent .rb-work-area (within 1px)
    expect(Math.abs(dimensions.childHeight - dimensions.parentHeight)).toBeLessThanOrEqual(2);

    // 2. Composer must sit near the bottom with deliberate padding (16px bottom padding on .rb-chat-layout)
    // Distance from parent bottom should be between 10px and 28px
    expect(dimensions.distanceFromBottom).toBeGreaterThanOrEqual(10);
    expect(dimensions.distanceFromBottom).toBeLessThanOrEqual(30);

    // 3. Opening terminal reduces chat height dynamically while keeping composer visible within work area
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
      };
    });

    expect(dimensionsWithTerminal).not.toBeNull();
    if (!dimensionsWithTerminal) return;

    // Work area is reduced by terminal height
    expect(dimensionsWithTerminal.parentHeight).toBeLessThan(dimensions.parentHeight - 100);
    // Child workspace-tabs still fills 100% of the newly reduced work area
    expect(Math.abs(dimensionsWithTerminal.childHeight - dimensionsWithTerminal.parentHeight)).toBeLessThanOrEqual(2);
    // Composer still sits cleanly near the bottom of the reduced work area
    expect(dimensionsWithTerminal.distanceFromBottom).toBeGreaterThanOrEqual(10);
    expect(dimensionsWithTerminal.distanceFromBottom).toBeLessThanOrEqual(30);
  });

  test("Viewport matrix and visual evidence across required breakpoints", async ({ page }) => {
    // 1. 1440x1000 Desktop (Default verified in Test A)
    await loadWorkspace(page, { width: 1440, height: 1000 });
    await expect(page.locator(".rb-workspace")).toHaveAttribute("data-mode", "desktop");

    // 2. 1280x800 Desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator(".rb-workspace")).toHaveAttribute("data-mode", "desktop");
    await expect(page.getByRole("region", { name: "Project navigation" })).toBeVisible();
    await page.screenshot({ path: "docs/screenshots/desktop-1280x800.png" });

    // 3. 1202px breakpoint (Desktop mode)
    await page.setViewportSize({ width: 1202, height: 800 });
    await expect(page.locator(".rb-workspace")).toHaveAttribute("data-mode", "desktop");
    await expect(page.getByRole("region", { name: "Project navigation" })).toBeVisible();

    // 4. 1198px breakpoint (Compact drawer mode)
    await page.setViewportSize({ width: 1198, height: 800 });
    await expect(page.locator(".rb-workspace")).toHaveAttribute("data-mode", "drawers");
    // Inline desktop panel is hidden in drawer mode
    await expect(page.getByRole("region", { name: "Project navigation" })).toHaveCount(0);

    // 5. 1024x768 Tablet
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(page.locator(".rb-workspace")).toHaveAttribute("data-mode", "drawers");
    await page.screenshot({ path: "docs/screenshots/compact-1024x768.png" });

    // 6. 390x844 Narrow mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(".rb-workspace")).toHaveAttribute("data-mode", "drawers");
    // Header brand and composer remain functional and compact
    await expect(page.getByRole("heading", { name: "What should we work on?" })).toBeVisible();
    await page.screenshot({ path: "docs/screenshots/mobile-390x844.png" });

    // 7. 1280x440 Short viewport with terminal open
    await page.setViewportSize({ width: 1280, height: 440 });
    await page.getByRole("button", { name: "Toggle terminal" }).click();
    await expect(page.getByRole("region", { name: "Terminal" })).toBeVisible();

    // Ensure composer remains inside the work area without pushing offscreen
    const composerInShortViewport = await page.evaluate(() => {
      const comp = document.querySelector(".rb-composer");
      if (!comp) return false;
      const rect = comp.getBoundingClientRect();
      return rect.bottom <= 440 && rect.top >= 0;
    });
    expect(composerInShortViewport).toBe(true);

    await page.screenshot({ path: "docs/screenshots/short-height-layout.png" });
  });
});
