import { writeFileSync } from "node:fs";

const productionUrl =
  process.env.LUNA_P33_URL ??
  "https://senota-o2bednx8k-senota-s-projects.vercel.app";
const debugEndpoint =
  process.env.CHROME_DEBUG_ENDPOINT ?? "http://127.0.0.1:9222";
const outputPath =
  process.env.LUNA_P33_REPORT ?? "/tmp/luna-p33-production-acceptance.json";
const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

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
      if (this.events.length > 250) this.events.shift();
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener(
        "error",
        () => reject(new Error("Unable to open Chrome DevTools connection.")),
        { once: true },
      );
    });
    return new CdpConnection(socket);
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(
        JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }),
      );
    });
  }

  close() {
    this.socket.close();
  }
}

async function main() {
  const version = await fetch(`${debugEndpoint}/json/version`).then((response) =>
    response.json(),
  );
  const root = await CdpConnection.connect(version.webSocketDebuggerUrl);
  const report = {
    target: productionUrl,
    startedAt: new Date().toISOString(),
    checks: {},
    failures: [],
    runtimeExceptions: [],
  };
  let targetId;
  let sessionId;

  const evaluate = async (expression) => {
    const response = await root.send(
      "Runtime.evaluate",
      { expression, awaitPromise: true, returnByValue: true },
      sessionId,
    );
    if (response.exceptionDetails) {
      throw new Error(
        response.exceptionDetails.exception?.description ??
          response.exceptionDetails.text,
      );
    }
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
    sessionId = (await root.send("Target.attachToTarget", { targetId, flatten: true }))
      .sessionId;
    await root.send("Page.enable", {}, sessionId);
    await root.send("Runtime.enable", {}, sessionId);
    await root.send("Log.enable", {}, sessionId);
    await root.send("Page.navigate", { url: productionUrl }, sessionId);

    await waitFor(
      'location.pathname === "/" && Boolean(document.querySelector("#root"))',
      "production landing page",
    );
    report.checks.productionLanding = true;

    await waitFor(
      'Array.from(document.querySelectorAll("button")).some((button) => button.innerText.trim() === "Luna Brain")',
      "Luna Brain navigation control",
    );
    report.checks.normalUiNavigation = await evaluate(`(() => {
      const button = Array.from(document.querySelectorAll("button")).find((item) => item.innerText.trim() === "Luna Brain");
      if (!button) return false;
      button.click();
      return true;
    })()`);
    await waitFor(
      'location.pathname === "/luna/brain" && Boolean(document.querySelector("#root"))',
      "Luna route",
    );
    report.checks.lunaRoute = true;
    report.checks.canvas = Boolean(
      await waitFor('document.querySelector("canvas")', "Luna canvas"),
    );

    const manifest = await evaluate(
      'fetch("/api/brain-science/manifest").then((response) => response.json())',
    );
    const registration = manifest?.lunaReferenceRegistration;
    if (!registration) throw new Error("Production manifest omitted Luna registration.");
    if (
      registration.qualityGate?.status !== "NOT_ESTABLISHED" ||
      registration.qualityGate?.transformEnabled !== false ||
      registration.transformArtifact !== null
    ) {
      throw new Error("Production manifest did not enforce P33 NOT_ESTABLISHED non-transformability.");
    }
    if (
      registration.sourceAsset?.sha256 !==
      "c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc"
    ) {
      throw new Error("Production manifest did not preserve the immutable GLB checksum.");
    }
    if (
      registration.targetSpaceId !== "ebrains-mni-icbm-152-2009c" ||
      !manifest.referenceSpaces?.some(
        (space) =>
          space.id === "ebrains-mni-icbm-152-2009c" &&
          space.version === "2009c nonlinear asymmetric",
      )
    ) {
      throw new Error("Production registration target is not exact MNI ICBM 152 2009c Nonlinear Asymmetric.");
    }
    const rawToMni = manifest.coordinateTransforms?.find(
      (transform) =>
        transform.id ===
        "luna-raw-hra-v11-allen-brain-glb-to-ebrains-mni-icbm-152-2009c",
    );
    const mniToRaw = manifest.coordinateTransforms?.find(
      (transform) =>
        transform.id ===
        "ebrains-mni-icbm-152-2009c-to-luna-raw-hra-v11-allen-brain-glb",
    );
    if (rawToMni?.status !== "unavailable" || mniToRaw?.status !== "unavailable") {
      throw new Error("Production manifest exposed a raw-GLB/MNI transform direction.");
    }
    report.checks.registrationManifest = {
      legacyStatus: registration.status,
      qualityStatus: registration.qualityGate.status,
      transformEnabled: registration.qualityGate.transformEnabled,
      sourceSha256: registration.sourceAsset.sha256,
      targetSpaceId: registration.targetSpaceId,
      rawToMniStatus: rawToMni.status,
      mniToRawStatus: mniToRaw.status,
    };

    const registrationEndpoint = await evaluate(
      'fetch("/api/brain-science/registration").then((response) => response.json())',
    );
    if (
      registrationEndpoint.status !== "not-established" ||
      registrationEndpoint.registration?.qualityGate?.status !== "NOT_ESTABLISHED"
    ) {
      throw new Error("Production registration endpoint did not preserve NOT_ESTABLISHED status.");
    }
    report.checks.registrationEndpoint = {
      status: registrationEndpoint.status,
      qualityStatus: registrationEndpoint.registration.qualityGate.status,
    };

    const reviewBadge = await waitFor(
      'document.querySelector(\'button[aria-label^="Scientific Review complete:"]\')?.getAttribute("aria-label")',
      "completed review badge",
    );
    report.checks.reviewBadge = reviewBadge;
    if (!reviewBadge.includes("102 approved identities")) {
      throw new Error("Production review badge did not preserve approved identity population.");
    }

    const selected = await evaluate(
      'fetch("/api/brain-science/canonical-identities").then((response) => response.json()).then((payload) => payload.identities.find((record) => record.lunaStructureId === "allen_hypothalamus_l"))',
    );
    if (!selected || selected.reviewStatus !== "approved") {
      throw new Error("Expected server-approved hypothalamus identity was not returned.");
    }
    await setValue('input[placeholder="Search structures..."]', selected.lunaStructureName);
    const navigatorStatus = await waitFor(
      `document.querySelector('[data-scientific-review-structure-id=${JSON.stringify(selected.lunaStructureId)}]')?.getAttribute("data-scientific-review-status")`,
      "approved Navigator status",
    );
    if (navigatorStatus !== "APPROVED") {
      throw new Error(`Navigator reported ${navigatorStatus}, expected APPROVED.`);
    }
    report.checks.navigatorStatus = navigatorStatus;
    report.checks.navigatorSelection = await evaluate(`(() => {
      const row = document.querySelector('[data-scientific-review-structure-id=${JSON.stringify(selected.lunaStructureId)}]');
      if (!(row instanceof HTMLButtonElement)) return false;
      row.click();
      return true;
    })()`);
    if (!report.checks.navigatorSelection) {
      throw new Error("Could not select the approved Navigator record for Inspector validation.");
    }

    await waitFor(
      'document.body.innerText.includes("MNI REGISTRATION") && document.body.innerText.includes("NOT ESTABLISHED") && document.body.innerText.includes("No Luna-native or reverse-MNI coordinate is emitted")',
      "P33 Inspector registration disclosure",
    );
    report.checks.inspectorQualityDisclosure = true;

    const structureEvidence = await evaluate(
      'fetch("/api/brain-science/structure/allen_hypothalamus_l").then((response) => response.json())',
    );
    const mappingSummary = await evaluate(
      'fetch("/api/brain-science/julich-mapping-summary").then((response) => response.json()).then((payload) => payload.summary)',
    );
    if (
      structureEvidence.scientificTarget?.coordinate !== null ||
      structureEvidence.registrationStatus?.lunaToMni !== "not-established" ||
      mappingSummary.authoritative !== 0 ||
      mappingSummary.probabilistic !== 0 ||
      mappingSummary.unmapped !== 102
    ) {
      throw new Error("Production structure/Julich safeguards were altered by P33.");
    }
    report.checks.structureAndJulichSafety = {
      coordinate: structureEvidence.scientificTarget.coordinate,
      lunaToMni: structureEvidence.registrationStatus.lunaToMni,
      julich: mappingSummary,
    };

    const tissueObservation = await evaluate(
      'fetch("/api/brain-science/observation?scale=tissue&structureId=allen_hypothalamus_l&structureName=Hypothalamus").then((response) => response.json())',
    );
    if (
      tissueObservation.spatialTarget?.coordinate !== null ||
      tissueObservation.spatialCapability?.operationEnabled !== false
    ) {
      throw new Error("Production Tissue observation exposed a coordinate or operation after P33.");
    }
    report.checks.macroOnlyCapability = {
      tissueCoordinate: tissueObservation.spatialTarget.coordinate,
      tissueOperationEnabled: tissueObservation.spatialCapability.operationEnabled,
    };

    const mniForm = await evaluate(`(() => {
      const inputs = Array.from(document.querySelectorAll('input[aria-label^="MNI "]'));
      if (inputs.length !== 3) return false;
      ["0", "0", "0"].forEach((value, index) => {
        const input = inputs[index];
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
      const form = inputs[0].closest("form");
      if (!form) return false;
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      return true;
    })()`);
    if (!mniForm) throw new Error("Direct MNI provider form was not rendered.");
    await waitFor(
      'document.body.innerText.includes("Provider result:") || document.body.innerText.includes("Unable to query the Julich provider")',
      "direct MNI provider result",
    );
    report.checks.directMniProviderGuard = true;

    const bodyText = await evaluate("document.body.innerText");
    report.checks.preservedUi = {
      navigator: bodyText.includes("Anatomical Navigator"),
      inspector:
        bodyText.includes("MNI REGISTRATION") ||
        bodyText.includes("MNI registration"),
      nanobot: bodyText.includes("Nanobot"),
    };
    if (!Object.values(report.checks.preservedUi).every(Boolean)) {
      throw new Error("A released Luna panel was not rendered in production.");
    }

    report.runtimeExceptions = root.events
      .filter((event) => event.method === "Runtime.exceptionThrown")
      .map((event) => event.params?.exceptionDetails?.text ?? "Runtime exception");
    if (report.runtimeExceptions.length) {
      throw new Error(`Runtime exceptions: ${report.runtimeExceptions.join("; ")}`);
    }
  } catch (error) {
    report.failures.push(
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { message: String(error) },
    );
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
