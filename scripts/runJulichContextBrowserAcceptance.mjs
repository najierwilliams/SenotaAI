import { writeFileSync } from "node:fs";

const productionUrl = process.env.LUNA_JULICH_URL ?? "https://senota-9ziso4sdq-senota-s-projects.vercel.app";
const debugEndpoint = process.env.CHROME_DEBUG_ENDPOINT ?? "http://127.0.0.1:9222";
const outputPath = process.env.LUNA_JULICH_REPORT ?? "/tmp/luna-julich-production-acceptance.json";
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
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      this.events.push(message);
      if (this.events.length > 200) this.events.shift();
    });
  }
  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", () => reject(new Error("Unable to open Chrome DevTools connection.")), { once: true });
    });
    return new CdpConnection(socket);
  }
  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  close() { this.socket.close(); }
}

async function main() {
  const version = await fetch(`${debugEndpoint}/json/version`).then((response) => response.json());
  const root = await CdpConnection.connect(version.webSocketDebuggerUrl);
  const report = { target: productionUrl, startedAt: new Date().toISOString(), checks: {}, failures: [], runtimeExceptions: [] };
  let targetId;
  let sessionId;
  const evaluate = async (expression) => {
    const response = await root.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, sessionId);
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
    return response.result.value;
  };
  const waitFor = async (expression, label, timeout = 12_000) => {
    const deadline = Date.now() + timeout;
    let last;
    while (Date.now() < deadline) {
      last = await evaluate(expression);
      if (last) return last;
      await sleep(75);
    }
    throw new Error(`Timed out waiting for ${label}: ${JSON.stringify(last)}`);
  };
  const setValue = async (selector, value) => {
    const changed = await evaluate(`(() => {
      const input = document.querySelector(${JSON.stringify(selector)});
      if (!(input instanceof HTMLInputElement)) return false;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()`);
    if (!changed) throw new Error(`Could not set ${selector}.`);
  };
  try {
    targetId = (await root.send("Target.createTarget", { url: "about:blank" })).targetId;
    sessionId = (await root.send("Target.attachToTarget", { targetId, flatten: true })).sessionId;
    await root.send("Page.enable", {}, sessionId);
    await root.send("Runtime.enable", {}, sessionId);
    await root.send("Log.enable", {}, sessionId);
    await root.send("Page.navigate", { url: productionUrl }, sessionId);
    await waitFor(`location.pathname === "/" && Boolean(document.querySelector("#root"))`, "production landing page");
    report.checks.productionLanding = true;

    await waitFor(`Array.from(document.querySelectorAll("button")).some((button) => button.innerText.trim() === "Luna Brain")`, "Luna Brain navigation control");
    report.checks.normalUiNavigation = await evaluate(`(() => {
      const button = Array.from(document.querySelectorAll("button")).find((item) => item.innerText.trim() === "Luna Brain");
      if (!button) return false;
      button.click();
      return true;
    })()`);
    await waitFor(`location.pathname === "/luna/brain" && Boolean(document.querySelector("#root"))`, "Luna route");
    report.checks.lunaRoute = true;
    report.checks.canvas = Boolean(await waitFor(`document.querySelector("canvas")`, "Luna canvas"));

    const reviewBadge = await waitFor(`document.querySelector('button[aria-label^="Scientific Review complete:"]')?.getAttribute("aria-label")`, "completed review badge");
    report.checks.reviewBadge = reviewBadge;
    report.checks.completedReview = reviewBadge.includes("102 approved identities");

    report.checks.reviewCenterOpened = await evaluate(`(() => {
      const button = document.querySelector('button[aria-label^="Scientific Review complete:"]');
      if (!button) return false;
      button.click();
      return true;
    })()`);
    await waitFor(`Boolean(document.querySelector('[aria-label="Scientific Review Center"]'))`, "Scientific Review Center");
    const center = '[aria-label="Scientific Review Center"]';
    const reviewText = await evaluate(`document.querySelector(${JSON.stringify(center)})?.innerText ?? ""`);
    report.checks.reviewSummary = {
      progress102: reviewText.includes("102 / 102"),
      highConfidence97: reviewText.toUpperCase().includes("HIGH CONFIDENCE") && reviewText.includes("97"),
      ambiguous5: reviewText.toUpperCase().includes("AMBIGUOUS") && reviewText.includes("5"),
    };

    const selected = await evaluate(`fetch("/api/brain-science/canonical-identities").then((response) => response.json()).then((payload) => payload.identities.find((record) => record.lunaStructureId === "allen_hypothalamus_l"))`);
    if (!selected || selected.reviewStatus !== "approved") throw new Error("Expected server-approved hypothalamus identity was not returned.");
    report.checks.canonicalApproval = { reviewStatus: selected.reviewStatus, reviewedAt: selected.reviewedAt, reviewMethod: selected.reviewMethod };

    await setValue('[aria-label="Search scientific review records"]', selected.uberonId);
    await waitFor(`document.querySelector(${JSON.stringify(center)})?.innerText.includes(${JSON.stringify(selected.lunaStructureName)})`, "approved review record");
    report.checks.reviewRecordSelected = await evaluate(`(() => {
      const row = Array.from(document.querySelector(${JSON.stringify(center)}).querySelectorAll("button")).find((button) => button.getAttribute("data-scientific-review-structure-id") === ${JSON.stringify(selected.lunaStructureId)});
      if (!row) return false;
      row.click();
      return true;
    })()`);
    await waitFor(`document.querySelector(${JSON.stringify(center)})?.innerText.includes("Browser-local controls cannot supersede this source-preserving server state.")`, "authoritative approval detail");
    report.checks.authoritativeReviewDetail = true;

    await setValue('input[placeholder="Search structures..."]', selected.lunaStructureName);
    const navigatorStatus = await waitFor(`document.querySelector('[data-scientific-review-structure-id=${JSON.stringify(selected.lunaStructureId)}]')?.getAttribute("data-scientific-review-status")`, "approved Navigator status");
    report.checks.navigatorStatus = navigatorStatus;
    if (navigatorStatus !== "APPROVED") throw new Error(`Navigator reported ${navigatorStatus}, expected APPROVED.`);

    await waitFor(`document.body.innerText.includes("JULICH-BRAIN V3.1 CONTEXT") && document.body.innerText.includes("Mapping status: UNMAPPED") && document.body.innerText.includes("Luna → MNI: Not established")`, "Inspector Julich safeguards");
    report.checks.inspectorJulichContext = true;

    const mniForm = await evaluate(`(() => {
      const inputs = Array.from(document.querySelectorAll('input[aria-label^="MNI "]'));
      if (inputs.length !== 3) return false;
      const values = ["0", "0", "0"];
      inputs.forEach((input, index) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, values[index]);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
      const form = inputs[0].closest("form");
      if (!form) return false;
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      return true;
    })()`);
    if (!mniForm) throw new Error("Direct MNI provider form was not rendered.");
    await waitFor(`document.body.innerText.includes("Provider result:") || document.body.innerText.includes("Unable to query the Julich provider")`, "direct MNI provider form result");
    report.checks.directMniForm = true;

    const structureEvidence = await evaluate(`fetch("/api/brain-science/structure/allen_hypothalamus_l").then((response) => response.json())`);
    report.checks.structureEvidence = {
      canonicalStatus: structureEvidence.canonicalIdentity?.status,
      julichStatus: structureEvidence.julichObservation?.status,
      julichRegionId: structureEvidence.julichObservation?.mapping?.julichRegionId,
      coordinate: structureEvidence.scientificTarget?.coordinate,
      lunaToMni: structureEvidence.registrationStatus?.lunaToMni,
    };
    const mappingSummary = await evaluate(`fetch("/api/brain-science/julich-mapping-summary").then((response) => response.json()).then((payload) => payload.summary)`);
    report.checks.mappingSummary = mappingSummary;
    if (mappingSummary.authoritative !== 0 || mappingSummary.probabilistic !== 0 || mappingSummary.unmapped !== 102) throw new Error("Production mapping summary did not preserve the expected no-fabrication counts.");
    if (structureEvidence.scientificTarget?.coordinate !== null || structureEvidence.registrationStatus?.lunaToMni !== "not-established") throw new Error("Production structure evidence exposed a Luna coordinate or registration.");

    report.runtimeExceptions = root.events
      .filter((event) => event.method === "Runtime.exceptionThrown")
      .map((event) => event.params?.exceptionDetails?.text ?? "Runtime exception");
    if (report.runtimeExceptions.length) throw new Error(`Runtime exceptions: ${report.runtimeExceptions.join("; ")}`);
  } catch (error) {
    report.failures.push(error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) });
  } finally {
    report.finishedAt = new Date().toISOString();
    writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    if (targetId) await root.send("Target.closeTarget", { targetId }).catch(() => {});
    root.close();
  }
  if (report.failures.length) process.exitCode = 1;
  console.log(JSON.stringify(report, null, 2));
}

await main();
