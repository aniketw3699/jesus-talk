(function(root) {
  "use strict";

  const VERSION = "local-engine-v1";
  const RUNTIME_URL = "https://esm.run/@mlc-ai/web-llm@0.2.85";
  const WORKER_URL = "/device-ai-worker.js";
  const MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
  const MODEL_VRAM_MB = 879.04;
  const MODEL_CONTEXT_TOKENS = 4096;
  const MIN_FREE_STORAGE_BYTES = 1536 * 1024 * 1024;

  const DEFAULT_SYSTEM_PROMPT = [
    "You are 1into1, a broad Christian digital companion with a Jesus-centered, Scripture-guided identity.",
    "The user may ask about any subject. Answer the actual question rather than limiting discussion to explicitly religious topics.",
    "Never claim to literally be Jesus, God, a prophet, clergy, or a divine authority.",
    "When asked who or what you are, identify as 1into1, a Christian digital companion. Do not lead with technical labels such as AI, language model, chatbot, or software unless the user specifically asks about the technology.",
    "For neutral factual and practical questions, answer directly and do not force a prayer, Bible verse, sermon, or devotional template.",
    "For moral or life-decision questions, distinguish practical information from Christian principles and never present advice as a divine command.",
    "Do not invent Bible verses, quotations, chapter-and-verse references, Hebrew, Greek, Aramaic, historical claims, live news, or current facts you cannot verify.",
    "The application's verified local Bible and Christian knowledge take priority over generated biblical claims.",
    "For medical, legal, financial, mental-health, safeguarding, or other high-stakes matters, be informative and cautious and encourage appropriate qualified real-world help when needed.",
    "If the user appears to be in immediate danger, prioritize immediate real-world help."
  ].join(" ");

  let state = "idle";
  let capability = null;
  let engine = null;
  let worker = null;
  let lastError = null;
  let loadProgress = null;
  let loadPromise = null;

  function modelProfile() {
    return Object.freeze({
      modelId: MODEL_ID,
      approximateVramMB: MODEL_VRAM_MB,
      contextWindowTokens: MODEL_CONTEXT_TOKENS,
      minimumRecommendedFreeStorageBytes: MIN_FREE_STORAGE_BYTES,
      hostedByOwner: false,
      inferenceLocation: "user-device",
      automaticDownload: false
    });
  }

  function snapshot(extra) {
    return Object.freeze(Object.assign({
      version: VERSION,
      state: state,
      ready: state === "ready",
      capability: capability,
      progress: loadProgress,
      error: lastError,
      model: modelProfile()
    }, extra || {}));
  }

  async function inspect() {
    if (!root.OneIntoOneDeviceAI ||
        typeof root.OneIntoOneDeviceAI.inspect !== "function") {
      state = "unavailable";
      lastError = "capability-detector-unavailable";
      return snapshot();
    }

    state = "checking";
    lastError = null;

    try {
      capability = await root.OneIntoOneDeviceAI.inspect();
    } catch (_) {
      state = "unavailable";
      lastError = "capability-check-failed";
      return snapshot();
    }

    if (!capability || capability.eligible !== true) {
      state = "unavailable";
      lastError = capability && capability.reason
        ? capability.reason
        : "device-ai-unavailable";
      return snapshot();
    }

    if (capability.storageFreeBytes !== null &&
        capability.storageFreeBytes < MIN_FREE_STORAGE_BYTES) {
      state = "unavailable";
      lastError = "insufficient-device-storage";
      return snapshot();
    }

    state = "available";
    return snapshot();
  }

  function updateProgress(report, callback) {
    const next = Object.freeze({
      progress: report && Number.isFinite(Number(report.progress))
        ? Number(report.progress)
        : null,
      text: report && report.text
        ? String(report.text)
        : "Preparing private on-device AI"
    });

    loadProgress = next;

    if (typeof callback === "function") {
      try {
        callback(next);
      } catch (_) {
        // Presentation callbacks must never break model initialization.
      }
    }
  }

  async function defaultRuntimeLoader() {
    return import(RUNTIME_URL);
  }

  function defaultWorkerFactory() {
    if (typeof root.Worker !== "function") return null;
    return new root.Worker(WORKER_URL, { type: "module" });
  }

  async function buildEngine(runtime, options) {
    const progressCallback = function(report) {
      updateProgress(report, options.onProgress);
    };

    const workerFactory =
      typeof options.workerFactory === "function"
        ? options.workerFactory
        : defaultWorkerFactory;

    if (runtime &&
        typeof runtime.CreateWebWorkerMLCEngine === "function") {
      let candidateWorker = null;

      try {
        candidateWorker = workerFactory();

        if (candidateWorker) {
          const built = await runtime.CreateWebWorkerMLCEngine(
            candidateWorker,
            MODEL_ID,
            { initProgressCallback: progressCallback }
          );

          worker = candidateWorker;
          return built;
        }
      } catch (_) {
        try {
          if (candidateWorker && typeof candidateWorker.terminate === "function") {
            candidateWorker.terminate();
          }
        } catch (_) {}
      }
    }

    if (!runtime || typeof runtime.CreateMLCEngine !== "function") {
      throw new Error("webllm-runtime-invalid");
    }

    return runtime.CreateMLCEngine(
      MODEL_ID,
      { initProgressCallback: progressCallback }
    );
  }

  async function prepare(options) {
    options = options || {};

    // Hard guardrail: opening 1into1 can never silently download the model.
    if (options.userInitiated !== true) {
      return snapshot({
        blocked: true,
        reason: "explicit-user-action-required"
      });
    }

    if (state === "ready" && engine) return snapshot();
    if (loadPromise) return loadPromise;

    loadPromise = (async function() {
      const inspected = await inspect();

      if (!capability ||
          capability.eligible !== true ||
          inspected.state === "unavailable") {
        return snapshot({
          blocked: true,
          reason: lastError || "device-ai-unavailable"
        });
      }

      state = "loading";
      lastError = null;
      updateProgress(
        { progress: 0, text: "Preparing private on-device AI" },
        options.onProgress
      );

      try {
        const runtimeLoader =
          typeof options.runtimeLoader === "function"
            ? options.runtimeLoader
            : defaultRuntimeLoader;

        const runtime = await runtimeLoader();
        engine = await buildEngine(runtime, options);

        state = "ready";
        lastError = null;
        updateProgress(
          { progress: 1, text: "Private on-device AI ready" },
          options.onProgress
        );

        return snapshot();
      } catch (error) {
        engine = null;
        state = "failed";
        lastError = error && error.message
          ? String(error.message)
          : "device-ai-load-failed";

        return snapshot();
      } finally {
        loadPromise = null;
      }
    })();

    return loadPromise;
  }

  async function chat(messages, options) {
    options = options || {};

    if (state !== "ready" || !engine) {
      return Object.freeze({
        ok: false,
        reason: "device-ai-not-ready"
      });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return Object.freeze({
        ok: false,
        reason: "messages-required"
      });
    }

    const safeMessages = [{
      role: "system",
      content:
        typeof options.systemPrompt === "string" && options.systemPrompt.trim()
          ? options.systemPrompt.trim()
          : DEFAULT_SYSTEM_PROMPT
    }];

    for (const message of messages.slice(-8)) {
      if (!message || typeof message.content !== "string") continue;

      const content = message.content.trim();
      if (!content) continue;

      safeMessages.push({
        role: message.role === "assistant" ? "assistant" : "user",
        content: content.slice(0, 4000)
      });
    }

    if (safeMessages.length < 2) {
      return Object.freeze({
        ok: false,
        reason: "messages-required"
      });
    }

    try {
      const response = await engine.chat.completions.create({
        messages: safeMessages,
        temperature: 0.55,
        top_p: 0.9,
        max_tokens: 280
      });

      const text =
        response &&
        response.choices &&
        response.choices[0] &&
        response.choices[0].message &&
        response.choices[0].message.content
          ? String(response.choices[0].message.content).trim()
          : "";

      if (!text) {
        return Object.freeze({
          ok: false,
          reason: "empty-device-ai-response"
        });
      }

      return Object.freeze({
        ok: true,
        text: text,
        source: "device-llm",
        modelId: MODEL_ID
      });
    } catch (error) {
      return Object.freeze({
        ok: false,
        reason: "device-ai-generation-failed",
        error: error && error.message ? String(error.message) : null
      });
    }
  }

  async function unload() {
    const currentEngine = engine;
    const currentWorker = worker;

    engine = null;
    worker = null;
    capability = null;
    loadProgress = null;
    loadPromise = null;
    lastError = null;
    state = "idle";

    try {
      if (currentEngine && typeof currentEngine.unload === "function") {
        await currentEngine.unload();
      }
    } catch (_) {}

    try {
      if (currentWorker && typeof currentWorker.terminate === "function") {
        currentWorker.terminate();
      }
    } catch (_) {}

    return snapshot();
  }

  function getStatus() {
    return snapshot();
  }

  root.OneIntoOneDeviceAIEngine = Object.freeze({
    version: VERSION,
    runtimeUrl: RUNTIME_URL,
    workerUrl: WORKER_URL,
    modelId: MODEL_ID,
    inspect: inspect,
    prepare: prepare,
    chat: chat,
    unload: unload,
    getStatus: getStatus,
    getModelProfile: modelProfile
  });
})(
  typeof window !== "undefined"
    ? window
    : globalThis
);
