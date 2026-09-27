(function(root) {
  "use strict";

  const VERSION = "foundation-v1";

  function positiveNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  async function inspect(options) {
    options = options || {};

    const nav = options.navigator || root.navigator || {};
    const secureContext =
      typeof options.secureContext === "boolean"
        ? options.secureContext
        : root.isSecureContext === true;

    const report = {
      version: VERSION,
      secureContext: secureContext,
      webgpuAvailable: false,
      adapterAvailable: false,
      deviceMemoryGB: positiveNumber(nav.deviceMemory),
      hardwareConcurrency: positiveNumber(nav.hardwareConcurrency),
      storageQuotaBytes: null,
      storageFreeBytes: null,
      tier: "unsupported",
      eligible: false,
      reason: "unknown",
      automaticModelDownload: false
    };

    /*
     * Never auto-download a model.
     *
     * A later phase may offer an on-device model only after:
     * - capability has been verified,
     * - model size is known,
     * - the user explicitly chooses to download it.
     *
     * This keeps the core product lightweight and prevents weak devices from
     * accidentally attempting a large model download.
     */

    if (!secureContext) {
      report.reason = "secure-context-required";
      return Object.freeze(report);
    }

    if (!nav.gpu || typeof nav.gpu.requestAdapter !== "function") {
      report.reason = "webgpu-unavailable";
      return Object.freeze(report);
    }

    report.webgpuAvailable = true;

    let adapter = null;

    try {
      adapter = await nav.gpu.requestAdapter();
    } catch (_) {
      report.reason = "webgpu-adapter-error";
      return Object.freeze(report);
    }

    if (!adapter) {
      report.reason = "webgpu-adapter-unavailable";
      return Object.freeze(report);
    }

    report.adapterAvailable = true;

    if (nav.storage && typeof nav.storage.estimate === "function") {
      try {
        const estimate = await nav.storage.estimate();

        const quota = positiveNumber(estimate && estimate.quota);
        const usage = positiveNumber(estimate && estimate.usage) || 0;

        report.storageQuotaBytes = quota;

        if (quota !== null) {
          report.storageFreeBytes = Math.max(0, quota - usage);
        }
      } catch (_) {
        // Storage information is useful but not required.
      }
    }

    const memory = report.deviceMemoryGB;
    const cores = report.hardwareConcurrency;

    /*
     * We intentionally avoid rejecting devices merely because a browser does
     * not expose deviceMemory. Safari and other browsers may omit it.
     */
    const clearlyConstrained =
      (memory !== null && memory < 4) ||
      (cores !== null && cores < 4) ||
      (
        report.storageFreeBytes !== null &&
        report.storageFreeBytes < 512 * 1024 * 1024
      );

    if (clearlyConstrained) {
      report.tier = "constrained";
      report.reason = "device-resources-constrained";
      return Object.freeze(report);
    }

    const clearlyStrong =
      memory !== null &&
      memory >= 8 &&
      cores !== null &&
      cores >= 8;

    report.tier = clearlyStrong ? "strong" : "candidate";
    report.eligible = true;
    report.reason = "device-ai-candidate";

    return Object.freeze(report);
  }

  root.OneIntoOneDeviceAI = Object.freeze({
    version: VERSION,
    inspect: inspect
  });
})(
  typeof window !== "undefined"
    ? window
    : globalThis
);
