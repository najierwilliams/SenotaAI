#!/usr/bin/env node

/**
 * Browser acceptance harness for the Luna Scientific Review Center.
 *
 * It uses Chrome DevTools Protocol to create an isolated, disposable browser
 * context. Review decisions are stored only in that isolated context and are
 * explicitly removed before the context is disposed. Canonical API records are
 * read and compared but never modified.
 */

const productionUrl = process.env.LUNA_REVIEW_URL
  ?? "https://senota-1cb0ehn36-senota-s-projects.vercel.app";
const debugEndpoint = process.env.CHROME_DEBUG_ENDPOINT ?? "http://127.0.0.1:9222";
const useIsolatedContext = process.env.LUNA_REVIEW_ISOLATED !== "false";

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

class CdpConnection {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(`${message.error.message} (${message.method ?? "unknown"})`));
        else pending.resolve(message.result);
        return;
      }
      this.events.push(message);
      if (this.events.length > 250) this.events.shift();
    });
  }

  static async connect(webSocketUrl) {
    const socket = new WebSocket(webSocketUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", () => reject(new Error("Unable to open Chrome DevTools connection.")), { once: true });
    });
    return new CdpConnection(socket);
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const message = { id, method, params };
    if (sessionId) message.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify(message));
    });
  }

  close() {
    this.socket.close();
  }
}

async function main() {
  const version = await fetch(`${debugEndpoint}/json/version`).then((response) => {
    if (!response.ok) throw new Error(`Chrome DevTools endpoint returned ${response.status}.`);
    return response.json();
  });
  const root = await CdpConnection.connect(version.webSocketDebuggerUrl);
  const report = {
    mode: useIsolatedContext ? "isolated-browser-context" : "authenticated-browser-context-with-overlay-restore",
    target: productionUrl,
    startedAt: new Date().toISOString(),
    checks: {},
    failures: [],
    browserConsoleErrors: [],
  };

  let browserContextId;
  let targetId;
  let sessionId;
  let originalReviewOverlay;

  const evaluate = async (expression) => {
    const result = await root.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    }, sessionId);
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? "Runtime evaluation failed.");
    }
    return result.result.value;
  };

  const waitFor = async (expression, description, timeout = 8_000) => {
    const deadline = Date.now() + timeout;
    let lastValue;
    while (Date.now() < deadline) {
      lastValue = await evaluate(expression);
      if (lastValue) return lastValue;
      await sleep(50);
    }
    throw new Error(`Timed out waiting for ${description}. Last observed value: ${JSON.stringify(lastValue)}`);
  };

  const clickExactText = async (text, scopeSelector = "document") => {
    const clicked = await evaluate(`(() => {
      const scope = ${JSON.stringify(scopeSelector)} === "document" ? document : document.querySelector(${JSON.stringify(scopeSelector)});
      if (!scope) return false;
      const button = Array.from(scope.querySelectorAll("button")).find((candidate) => candidate.innerText.trim() === ${JSON.stringify(text)});
      if (!button) return false;
      button.click();
      return true;
    })()`);
    if (!clicked) throw new Error(`Could not click button with exact text ${JSON.stringify(text)}.`);
  };

  const setInputValue = async (selector, value) => {
    const changed = await evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement)) return false;
      const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, ${JSON.stringify(value)});
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()`);
    if (!changed) throw new Error(`Could not set ${selector}.`);
  };

  const getMainBadge = () => evaluate(`document.querySelector('button[aria-label^="Scientific Review:"]')?.getAttribute("aria-label") ?? null`);

  const openReviewCenter = async () => {
    const opened = await evaluate(`(() => {
      const button = document.querySelector('button[aria-label^="Scientific Review:"]');
      if (!button) return false;
      button.click();
      return true;
    })()`);
    if (!opened) throw new Error("Scientific Review workspace button is unavailable.");
    await waitFor(`Boolean(document.querySelector('[aria-label="Scientific Review Center"]'))`, "Scientific Review Center");
  };

  const openWorkspacePanel = async (menuLabel, panelText) => {
    const menuOpened = await evaluate(`(() => {
      const menuButton = Array.from(document.querySelectorAll("button")).find((candidate) => candidate.innerText.trim().startsWith(${JSON.stringify(menuLabel)}));
      if (!menuButton) return false;
      menuButton.click();
      return true;
    })()`);
    if (!menuOpened) throw new Error(`Could not open ${menuLabel} workspace menu.`);

    const panelNeedle = menuLabel === "Nanobots" ? "Nanobot" : menuLabel;
    await waitFor(`Array.from(document.querySelectorAll("button")).some((candidate) => /^(Open|Restore).+|.+Open$/.test(candidate.innerText.trim()) && candidate.innerText.includes(${JSON.stringify(panelNeedle)}))`, `${menuLabel} panel action`);
    const panelOpened = await evaluate(`(() => {
      const panelButton = Array.from(document.querySelectorAll("button")).find((candidate) => /^(Open|Restore).+|.+Open$/.test(candidate.innerText.trim()) && candidate.innerText.includes(${JSON.stringify(panelNeedle)}));
      if (!panelButton) return false;
      panelButton.click();
      return true;
    })()`);
    if (!panelOpened) throw new Error(`Could not open ${menuLabel} panel through its workspace menu.`);
    await waitFor(`document.body.innerText.toUpperCase().includes(${JSON.stringify(panelText.toUpperCase())})`, `${menuLabel} panel`);
  };

  const reopenLunaInFreshPage = async () => {
    if (targetId) await root.send("Target.closeTarget", { targetId }).catch(() => {});
    targetId = (await root.send("Target.createTarget", {
      url: `${productionUrl}/luna/brain`,
      ...(browserContextId ? { browserContextId } : {}),
    })).targetId;
    sessionId = (await root.send("Target.attachToTarget", { targetId, flatten: true })).sessionId;
    await root.send("Page.enable", {}, sessionId);
    await root.send("Runtime.enable", {}, sessionId);
    await root.send("Log.enable", {}, sessionId);
    await root.send("Network.enable", {}, sessionId);
    await waitFor(`location.pathname === "/luna/brain" && Boolean(document.querySelector("#root"))`, "fresh Luna Brain page");
  };

  const verifyNavigatorReviewStatus = async (record, expectedStatus) => {
    await setInputValue('input[placeholder="Search structures..."]', record.lunaStructureName);
    return waitFor(`Array.from(document.querySelectorAll('button[data-scientific-review-structure-id=${JSON.stringify(record.lunaStructureId)}]')).some((button) => button.className.includes('flex w-full') && button.getAttribute('data-scientific-review-status') === ${JSON.stringify(expectedStatus)})`, `Navigator ${expectedStatus} state for ${record.lunaStructureName}`);
  };

  const selectNavigatorRecord = async (record) => {
    const selected = await evaluate(`(() => {
      const button = Array.from(document.querySelectorAll('button[data-scientific-review-structure-id=${JSON.stringify(record.lunaStructureId)}]')).find((candidate) => candidate.className.includes('flex w-full'));
      if (!button) return false;
      button.click();
      return true;
    })()`);
    if (!selected) throw new Error(`Could not select ${record.lunaStructureName} from the Navigator.`);
  };

  const selectReviewRecord = async (record) => {
    await setInputValue('[aria-label="Search scientific review records"]', record.uberonId);
    await waitFor(`(() => {
      const center = document.querySelector('[aria-label="Scientific Review Center"]');
      return Boolean(center && Array.from(center.querySelectorAll("button")).some((button) => button.innerText.split("\\n")[0].trim() === ${JSON.stringify(record.lunaStructureName)}));
    })()`, `review record ${record.lunaStructureName}`);
    const selected = await evaluate(`(() => {
      const center = document.querySelector('[aria-label="Scientific Review Center"]');
      const button = Array.from(center.querySelectorAll("button")).find((candidate) => candidate.innerText.split("\\n")[0].trim() === ${JSON.stringify(record.lunaStructureName)});
      if (!button) return false;
      button.click();
      return true;
    })()`);
    if (!selected) throw new Error(`Could not select ${record.lunaStructureName}.`);
    await waitFor(`document.querySelector('[aria-label="Scientific Review Center"] h3')?.textContent?.trim() === ${JSON.stringify(record.lunaStructureName)}`, `review detail for ${record.lunaStructureName}`);
  };

  try {
    if (useIsolatedContext) {
      browserContextId = (await root.send("Target.createBrowserContext", { disposeOnDetach: true })).browserContextId;
    }
    targetId = (await root.send("Target.createTarget", {
      url: "about:blank",
      ...(browserContextId ? { browserContextId } : {}),
    })).targetId;
    sessionId = (await root.send("Target.attachToTarget", { targetId, flatten: true })).sessionId;
    await root.send("Page.enable", {}, sessionId);
    await root.send("Runtime.enable", {}, sessionId);
    await root.send("Log.enable", {}, sessionId);
    await root.send("Network.enable", {}, sessionId);

    await root.send("Page.navigate", { url: productionUrl }, sessionId);
    await waitFor(`Boolean(document.querySelector("#root")) && location.pathname === "/"`, "production landing route");
    originalReviewOverlay = await evaluate(`localStorage.getItem("luna-scientific-identity-review-v1")`);
    if (!useIsolatedContext && originalReviewOverlay !== null) {
      throw new Error("The authenticated browser already contains local scientific review decisions; refusing to alter its review overlay.");
    }
    report.checks.productionRoute = true;

    await waitFor(`Array.from(document.querySelectorAll("button")).some((candidate) => candidate.innerText.trim() === "Luna Brain")`, "Luna Brain landing control");
    const navigatedThroughUi = await evaluate(`(() => {
      const button = Array.from(document.querySelectorAll("button")).find((candidate) => candidate.innerText.trim() === "Luna Brain");
      if (!button) return false;
      button.click();
      return true;
    })()`);
    if (!navigatedThroughUi) throw new Error("The production landing page has no Luna Brain button.");

    await waitFor(`location.pathname === "/luna/brain" && Boolean(document.querySelector("#root"))`, "Luna Brain client route");
    report.checks.lunaRoute = true;
    report.checks.brainCanvas = Boolean(await waitFor(`document.querySelectorAll("canvas").length > 0`, "Luna canvas"));
    report.checks.navigator = await waitFor(`document.body.innerText.includes("Anatomical Navigator")`, "Navigator");
    await openWorkspacePanel("Inspector", "ANATOMICAL INSPECTOR");
    report.checks.inspectorPanel = true;
    await openWorkspacePanel("Nanobots", "NANOBOT SYSTEM");
    report.checks.nanobotPanel = true;

    await waitFor(`(document.querySelector('button[aria-label^="Scientific Review:"]')?.getAttribute("aria-label") ?? "").includes("102 structures require review")`, "loaded 102-record review badge");
    report.checks.liveCountInitial = await getMainBadge();

    await openReviewCenter();
    const centerSelector = '[aria-label="Scientific Review Center"]';
    report.checks.reviewCenter = true;
    report.checks.reviewSummary = await evaluate(`(() => {
      const center = document.querySelector(${JSON.stringify(centerSelector)});
      const text = center?.innerText ?? "";
      return {
        remaining102: text.includes("102") && text.toUpperCase().includes("REMAINING"),
        highConfidence97: text.toUpperCase().includes("HIGH CONFIDENCE") && text.includes("97"),
        ambiguous5: text.toUpperCase().includes("AMBIGUOUS") && text.includes("5"),
      };
    })()`);

    await clickExactText("High Confidence", centerSelector);
    report.checks.highConfidenceFilter = await waitFor(`document.querySelector(${JSON.stringify(centerSelector)})?.innerText.toUpperCase().includes("HIGH CONFIDENCE · 97 RECORDS")`, "97 high-confidence records");
    await clickExactText("Ambiguous", centerSelector);
    report.checks.ambiguousFilter = await waitFor(`document.querySelector(${JSON.stringify(centerSelector)})?.innerText.toUpperCase().includes("AMBIGUOUS · 5 RECORDS")`, "5 ambiguous records");
    await clickExactText("Unmapped", centerSelector);
    report.checks.unmappedFilter = await waitFor(`document.querySelector(${JSON.stringify(centerSelector)})?.innerText.toUpperCase().includes("UNMAPPED · 181 RECORDS")`, "181 unmapped records");
    report.checks.unmappedNeutral = await waitFor(`(() => {
      const row = document.querySelector(${JSON.stringify(centerSelector)} + ' button[data-scientific-review-status="UNMAPPED"]');
      const statusBadge = row?.querySelector('span:last-child');
      return row?.getAttribute('data-scientific-review-status') === 'UNMAPPED' && Boolean(statusBadge?.className.includes('text-white/55'));
    })()`, "neutral unmapped review row");
    await clickExactText("High Confidence", centerSelector);

    const canonical = await evaluate(`fetch('/api/brain-science/canonical-identities').then((response) => response.json()).then((payload) => payload.identities)`);
    const reviewRecords = canonical.filter((record) => record.reviewStatus === "evidence-backed-requires-review");
    const isComposite = (record) => /(complex|region|matter|part_of|body)/i.test(record.lunaStructureName);
    const approvedRecord = reviewRecords.find((record) => !isComposite(record));
    const rejectedRecord = reviewRecords.find((record) => !isComposite(record) && record.lunaStructureId !== approvedRecord.lunaStructureId);
    if (!approvedRecord || !rejectedRecord) throw new Error("Could not identify two distinct high-confidence review records.");
    const immutableSnapshot = Object.fromEntries([approvedRecord, rejectedRecord].map((record) => [record.lunaStructureId, {
      uberonId: record.uberonId,
      hraEntityId: record.hraEntityId,
      sourceVersion: record.sourceVersion,
      sourceUrl: record.sourceUrl,
      evidence: record.evidence,
    }]));

    await selectReviewRecord(approvedRecord);
    report.checks.navigatorRequiresReview = await verifyNavigatorReviewStatus(approvedRecord, "REQUIRES_REVIEW");
    report.checks.sourceEvidence = await evaluate(`(() => {
      const text = document.querySelector(${JSON.stringify(centerSelector)})?.innerText ?? "";
      return text.includes("GLB node/path") && text.includes("HRA entity / version") && text.includes("UBERON identity") && text.includes("Evidence") && text.includes("does not establish Luna → MNI, Luna → Julich, a coordinate, or nanobot capability");
    })()`);

    await setInputValue('[aria-label="Reviewer name"]', "Isolated acceptance test");
    await clickExactText("Approve", centerSelector);
    await waitFor(`(document.querySelector('button[aria-label^="Scientific Review:"]')?.getAttribute("aria-label") ?? "").includes("101 structures require review")`, "count after approval");
    const approvalOverlay = await evaluate(`JSON.parse(localStorage.getItem("luna-scientific-identity-review-v1") || "{}")`);
    report.checks.approval = approvalOverlay[approvedRecord.lunaStructureId];
    report.checks.countAfterApproval = await getMainBadge();
    report.checks.navigatorApproved = await verifyNavigatorReviewStatus(approvedRecord, "APPROVED");
    report.checks.inspectorApprovalSafeguards = await waitFor(`document.body.innerText.toUpperCase().includes("SCIENTIFIC IDENTITY APPROVED") && document.body.innerText.includes("Luna → MNI: Not established") && document.body.innerText.includes("No authoritative crosswalk established") && document.body.innerText.includes("coordinate unavailable")`, "approved Inspector safeguards");
    report.checks.inspector = report.checks.inspectorApprovalSafeguards;

    await reopenLunaInFreshPage();
    await waitFor(`(document.querySelector('button[aria-label^="Scientific Review:"]')?.getAttribute("aria-label") ?? "").includes("101 structures require review")`, "persisted approval count on a fresh page");
    const persistedAfterReload = await evaluate(`JSON.parse(localStorage.getItem("luna-scientific-identity-review-v1") || "{}")`);
    report.checks.approvalPersistsAfterRefresh = persistedAfterReload[approvedRecord.lunaStructureId];

    await openReviewCenter();
    await clickExactText("Needs Review", centerSelector);
    await selectReviewRecord(rejectedRecord);
    await setInputValue('[aria-label="Reviewer name"]', "Isolated acceptance test");
    await clickExactText("Reject", centerSelector);
    report.checks.emptyRejectionBlocked = await waitFor(`document.querySelector(${JSON.stringify(centerSelector)})?.innerText.includes("A rejection reason is required.")`, "mandatory rejection reason message");
    const overlayAfterEmptyReject = await evaluate(`JSON.parse(localStorage.getItem("luna-scientific-identity-review-v1") || "{}")`);
    if (overlayAfterEmptyReject[rejectedRecord.lunaStructureId]) throw new Error("An empty rejection reason created a persisted decision.");

    const testReason = "Isolated acceptance test rejection; source evidence unchanged.";
    await setInputValue('[aria-label="Rejection reason"]', testReason);
    await clickExactText("Reject", centerSelector);
    await waitFor(`(document.querySelector('button[aria-label^="Scientific Review:"]')?.getAttribute("aria-label") ?? "").includes("100 structures require review")`, "count after rejection");
    const rejectionOverlay = await evaluate(`JSON.parse(localStorage.getItem("luna-scientific-identity-review-v1") || "{}")`);
    report.checks.rejection = rejectionOverlay[rejectedRecord.lunaStructureId];
    report.checks.countAfterRejection = await getMainBadge();
    report.checks.navigatorRejected = await verifyNavigatorReviewStatus(rejectedRecord, "REJECTED");
    await selectNavigatorRecord(rejectedRecord);
    report.checks.inspectorRejectionSafeguards = await waitFor(`document.body.innerText.toUpperCase().includes("SCIENTIFIC IDENTITY REJECTED") && document.body.innerText.includes("Luna → MNI: Not established") && document.body.innerText.includes("No authoritative crosswalk established") && document.body.innerText.includes("Structure identity is not a coordinate or mission target.")`, "rejected Inspector safeguards");

    await reopenLunaInFreshPage();
    await waitFor(`(document.querySelector('button[aria-label^="Scientific Review:"]')?.getAttribute("aria-label") ?? "").includes("100 structures require review")`, "persisted rejection count on a fresh page");
    const persistedRejection = await evaluate(`JSON.parse(localStorage.getItem("luna-scientific-identity-review-v1") || "{}")`);
    report.checks.rejectionPersistsAfterRefresh = persistedRejection[rejectedRecord.lunaStructureId];

    await openReviewCenter();
    await clickExactText("Rejected", centerSelector);
    await selectReviewRecord(rejectedRecord);
    await clickExactText("Keep for review", centerSelector);
    await waitFor(`(document.querySelector('button[aria-label^="Scientific Review:"]')?.getAttribute("aria-label") ?? "").includes("101 structures require review")`, "count after keeping rejected record in review");
    const overlayAfterKeep = await evaluate(`JSON.parse(localStorage.getItem("luna-scientific-identity-review-v1") || "{}")`);
    if (overlayAfterKeep[rejectedRecord.lunaStructureId]) throw new Error("Keep for review did not remove the rejection overlay.");
    report.checks.keepForReview = { count: await getMainBadge(), rejectionRemoved: true };

    await clickExactText("Approved", centerSelector);
    await selectReviewRecord(approvedRecord);
    await clickExactText("Keep for review", centerSelector);
    await waitFor(`(document.querySelector('button[aria-label^="Scientific Review:"]')?.getAttribute("aria-label") ?? "").includes("102 structures require review")`, "count after clearing temporary approval");

    const canonicalAfter = await evaluate(`fetch('/api/brain-science/canonical-identities').then((response) => response.json()).then((payload) => payload.identities)`);
    const immutableAfter = Object.fromEntries(canonicalAfter.filter((record) => immutableSnapshot[record.lunaStructureId]).map((record) => [record.lunaStructureId, {
      uberonId: record.uberonId,
      hraEntityId: record.hraEntityId,
      sourceVersion: record.sourceVersion,
      sourceUrl: record.sourceUrl,
      evidence: record.evidence,
    }]));
    report.checks.immutableCanonicalEvidence = JSON.stringify(immutableSnapshot) === JSON.stringify(immutableAfter);

    await evaluate(`localStorage.removeItem("luna-scientific-identity-review-v1")`);
    report.checks.testOverlayRemoved = await evaluate(`localStorage.getItem("luna-scientific-identity-review-v1") === null`);
    report.checks.finalCount = await getMainBadge();
    report.checks.noBlankNavigation = await evaluate(`location.href !== "about:blank" && Boolean(document.querySelector("#root")) && document.querySelectorAll("canvas").length > 0`);

    report.unexpectedHtmlScripts = root.events
      .filter((event) => event.sessionId === sessionId && event.method === "Network.responseReceived")
      .map((event) => event.params.response)
      .filter((response) => response.mimeType.includes("text/html") && /\\.(m?js)(?:$|[?#])/.test(response.url))
      .map((response) => ({ url: response.url, status: response.status, mimeType: response.mimeType }));

    report.browserConsoleErrors = root.events
      .filter((event) => event.sessionId === sessionId && (event.method === "Runtime.exceptionThrown" || (event.method === "Log.entryAdded" && ["error", "warning"].includes(event.params.entry.level))))
      .map((event) => {
        if (event.method !== "Runtime.exceptionThrown") {
          const entry = event.params.entry;
          return `${entry.level}: ${entry.text}${entry.url ? ` @ ${entry.url}:${entry.lineNumber}` : ""}`;
        }
        const details = event.params.exceptionDetails;
        const location = details.stackTrace?.callFrames?.[0];
        const description = details.exception?.description ?? details.text;
        return location
          ? `${description} @ ${location.url}:${location.lineNumber + 1}:${location.columnNumber + 1}`
          : `${description}${details.url ? ` @ ${details.url}:${details.lineNumber + 1}:${details.columnNumber + 1}` : ""}`;
      });

    report.passed = Object.entries(report.checks)
      .filter(([key]) => !["approval", "rejection", "approvalPersistsAfterRefresh", "rejectionPersistsAfterRefresh", "reviewSummary", "keepForReview"].includes(key))
      .every(([, value]) => value === true || (typeof value === "string" && value.length > 0));
  } catch (error) {
    report.failures.push(error instanceof Error ? error.message : String(error));
    report.locationAtFailure = sessionId ? await evaluate(`location.href`).catch(() => "unavailable") : "unavailable";
    report.domAtFailure = sessionId ? await evaluate(`({
      rootPresent: Boolean(document.querySelector("#root")),
      bodyText: document.body.innerText.slice(0, 3000),
      asides: Array.from(document.querySelectorAll("aside")).map((aside) => aside.innerText.slice(0, 240)),
      visibleButtons: Array.from(document.querySelectorAll("button")).map((button) => button.innerText.trim()).filter(Boolean).slice(0, 160),
    })`).catch(() => "unavailable") : "unavailable";
  } finally {
    if (sessionId && originalReviewOverlay !== undefined) {
      await evaluate(originalReviewOverlay === null
        ? `localStorage.removeItem("luna-scientific-identity-review-v1")`
        : `localStorage.setItem("luna-scientific-identity-review-v1", ${JSON.stringify(originalReviewOverlay)})`).catch(() => {});
    }
    report.finishedAt = new Date().toISOString();
    if (browserContextId) {
      await root.send("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
    } else if (targetId) {
      await root.send("Target.closeTarget", { targetId }).catch(() => {});
    }
    root.close();
  }

  console.log(JSON.stringify(report, null, 2));
  if (report.failures.length || !report.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
