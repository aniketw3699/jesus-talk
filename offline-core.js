(() => {
  "use strict";

  const DATA = window.ONEINTOONE_SCRIPTURE_DATA;
  const MEMORY_KEY = "oneintoone_local_memory_v1";
  const MAX_MEMORY_ITEMS = 18;
  const DAY_MS = 86400000;

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[’]/g, "'")
      .replace(/[^a-z0-9\s'-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeRegex(value) {
    return value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  }

  function hasTerm(clean, rawTerm) {
    const term = normalize(rawTerm);
    if (!term) return false;
    if (term.includes(" ")) return clean.includes(term);
    return new RegExp("(?:^|\\s)" + escapeRegex(term) + "(?:$|\\s)", "i").test(clean);
  }

  function stableHash(text) {
    let h = 2166136261;
    const input = String(text || "");
    for (let i = 0; i < input.length; i += 1) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function pick(items, seed, offset) {
    if (!Array.isArray(items) || items.length === 0) return "";
    return items[(seed + (offset || 0)) % items.length];
  }

  function safeJsonParse(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed == null ? fallback : parsed;
    } catch (_) {
      return fallback;
    }
  }

  function loadMemory() {
    try {
      const items = safeJsonParse(localStorage.getItem(MEMORY_KEY), []);
      return Array.isArray(items) ? items : [];
    } catch (_) {
      return [];
    }
  }

  function saveMemory(items) {
    try {
      localStorage.setItem(MEMORY_KEY, JSON.stringify(items.slice(-MAX_MEMORY_ITEMS)));
    } catch (_) {}
  }

  function detectSafety(text) {
    if (!DATA || !DATA.safetyPatterns) return null;
    for (const entry of Object.entries(DATA.safetyPatterns)) {
      const type = entry[0];
      const patterns = entry[1];
      if (patterns.some(function(pattern) { return pattern.test(text); })) return type;
    }
    return null;
  }

  function safetyResponse(type) {
    if (type === "selfHarm") {
      return [
        "Your immediate safety matters more than continuing a prayer exercise right now.",
        "If you might act on thoughts of harming yourself, contact local emergency services or a crisis service now, or go to the nearest emergency department. If possible, stay with someone you trust and move away from anything you could use to hurt yourself.",
        "Prayer can stay beside that support, but it should not replace immediate human help."
      ].join("\n\n");
    }
    if (type === "violence") {
      return [
        "Do not act on an urge to hurt someone.",
        "Create distance from the person and from any weapon or object you could use to cause harm. If someone may be in immediate danger, contact local emergency services or another responsible person who can intervene now.",
        "You can return to prayer after immediate safety is protected."
      ].join("\n\n");
    }
    return [
      "If someone is hurting, threatening, or controlling you, your safety comes first.",
      "Move to a safer place if you can, contact someone you trust, and use local emergency or domestic-violence support if there is immediate danger.",
      "Prayer can support you, but you do not have to remain in danger to prove faith, patience, or forgiveness."
    ].join("\n\n");
  }

  function scoreTopics(clean) {
    if (!DATA || !Array.isArray(DATA.topics)) return [];
    return DATA.topics
      .map(function(topic) {
        let score = 0;
        const matched = [];
        for (const term of topic.terms || []) {
          if (hasTerm(clean, term)) {
            const weight = normalize(term).includes(" ") ? 3 : 1;
            score += weight;
            matched.push(term);
          }
        }
        return { topic: topic, score: score, matched: matched };
      })
      .filter(function(item) { return item.score > 0; })
      .sort(function(a, b) { return b.score - a.score; });
  }

  function detectEmotion(clean) {
    if (!DATA || !DATA.emotionLexicon) return { id:"unspecified", score:0 };
    let best = { id:"unspecified", score:0 };
    for (const entry of Object.entries(DATA.emotionLexicon)) {
      const emotion = entry[0];
      const terms = entry[1];
      let score = 0;
      for (const term of terms) {
        if (hasTerm(clean, term)) score += normalize(term).includes(" ") ? 2 : 1;
      }
      if (score > best.score) best = { id:emotion, score:score };
    }
    return best;
  }

  function detectIntensity(clean) {
    const highTerms = DATA && DATA.intensityTerms ? (DATA.intensityTerms.high || []) : [];
    const mediumTerms = DATA && DATA.intensityTerms ? (DATA.intensityTerms.medium || []) : [];
    const high = highTerms.filter(function(term) { return hasTerm(clean, term); });
    if (high.length) return { level:"high", matches:high };
    const medium = mediumTerms.filter(function(term) { return hasTerm(clean, term); });
    if (medium.length) return { level:"medium", matches:medium };
    return { level:"normal", matches:[] };
  }

  function fallbackTopic() {
    return (DATA && DATA.defaultTopic) || {
      id:"general",
      label:"Prayer & reflection",
      verses:["Matthew 11:28"],
      need:["peace"],
      acknowledgements:["You do not need perfect words to begin."],
      reflections:["Take the next faithful step that is actually within your control."],
      prayers:["God, give me wisdom and peace for the next step."],
      steps:["Name the next action within your control."],
      journey:""
    };
  }

  function analyze(text) {
    const clean = normalize(text);
    const safety = detectSafety(text);
    const scored = scoreTopics(clean);
    const primary = scored[0] ? scored[0].topic : fallbackTopic();
    const secondScore = scored[1] ? scored[1].score : 0;
    const firstScore = scored[0] ? scored[0].score : 1;
    const secondary = scored[1] && secondScore >= Math.max(1, firstScore * 0.55)
      ? scored[1].topic
      : null;
    const emotion = detectEmotion(clean);
    const intensity = detectIntensity(clean);
    const confidence = scored.length ? Math.min(1, firstScore / 4) : 0.15;

    return {
      safety:safety,
      clean:clean,
      primary:primary,
      secondary:secondary,
      emotion:emotion.id,
      intensity:intensity.level,
      confidence:confidence,
      matchedTerms:scored[0] ? scored[0].matched : [],
      needs:[].concat(primary.need || [])
    };
  }

  function buildCasualExperience(text) {
    const clean = normalize(text);
    let reply = "";

    if (/^(hi|hello|hey|hiya|good morning|good afternoon|good evening|shalom|peace)( there)?$/.test(clean)) {
      reply = "Hello. I’m here with you. We can talk, pray, or open Scripture together—whatever feels most helpful right now.";
    } else if (/^(how are you|how are you doing|how is it going|hows it going|how have you been)$/.test(clean)) {
      reply = "I’m here and ready to listen. What’s on your mind today?";
    } else if (/^(who are you|what are you|what is this|what can you do|tell me about yourself)$/.test(clean)) {
      reply = "I’m 1into1 with Jesus, a Scripture-guided Christian companion—not Jesus himself. I can listen, help you pray, explore the Bible, or talk through what you’re carrying.";
    } else if (/^(thanks|thank you|thank you so much|thanks a lot|appreciate it)$/.test(clean)) {
      reply = "You’re welcome. I’m here whenever you want to talk, pray, or look at Scripture together.";
    } else if (/^(bye|goodbye|good night|see you|see you later|talk later)$/.test(clean)) {
      reply = "Take care. When you come back, we can continue from here.";
    } else if (/^(can we talk|i want to talk|i just want to talk|talk to me|can i talk to you)$/.test(clean)) {
      reply = "Of course. You don’t have to turn everything into a prayer immediately. Tell me what’s on your mind, and we can take it from there.";
    } else {
      return null;
    }

    return {
      route:"local-conversation",
      reply:reply,
      analysis:{
        topic:"conversation",
        topicLabel:"Conversation",
        secondaryTopic:"",
        emotion:"unspecified",
        intensity:"normal",
        confidence:1,
        needs:[]
      },
      scriptureRefs:[],
      journey:"",
      privacy:"local"
    };
  }

  function getContinuityNote(analysis) {
    if (!analysis || analysis.confidence < 0.25 || !Array.isArray(analysis.matchedTerms) || analysis.matchedTerms.length === 0) return "";
    const now = Date.now();
    const recent = loadMemory().filter(function(item) { return now - item.at < 7 * DAY_MS; });
    const repeats = recent.filter(function(item) { return item.topic === analysis.primary.id; });
    if (repeats.length >= 2) {
      return "This theme has come up more than once recently. You do not have to restart from zero—notice what has changed, what has not, and what one step is still available now.";
    }
    if (repeats.length === 1) {
      return "This seems connected to something you have brought here recently. You can build on the last small step instead of trying to solve the whole situation again.";
    }
    return "";
  }

  function remember(analysis) {
    if (analysis.safety) return;
    if (analysis.confidence < 0.25 || !Array.isArray(analysis.matchedTerms) || analysis.matchedTerms.length === 0) return;
    const memory = loadMemory();
    memory.push({
      at:Date.now(),
      topic:analysis.primary.id,
      secondary:analysis.secondary ? analysis.secondary.id : "",
      emotion:analysis.emotion,
      intensity:analysis.intensity,
      needs:analysis.needs.slice(0, 3)
    });
    saveMemory(memory);
  }

  function scriptureLine(analysis) {
    const refs = [].concat(analysis.primary.verses || []);
    if (analysis.secondary && Array.isArray(analysis.secondary.verses)) {
      for (const ref of analysis.secondary.verses) {
        if (!refs.includes(ref)) refs.push(ref);
      }
    }
    return refs.slice(0, 3).join(" · ");
  }

  function modeHeading(mode) {
    if (mode === "prayer") return "A prayer you can use";
    if (mode === "guidance") return "A grounded way forward";
    if (mode === "study") return "Scripture anchors";
    return "A place to begin";
  }

  function buildNormalExperience(text, mode, analysis) {
    const seed = stableHash(normalize(text) + "|" + String(mode || "comfort"));
    const topic = analysis.primary;
    const acknowledgment = pick(topic.acknowledgements, seed, 0);
    const reflection = pick(topic.reflections, seed, 1);
    const prayer = pick(topic.prayers, seed, 2);
    const step = pick(topic.steps, seed, 3);
    const continuity = getContinuityNote(analysis);
    const refs = scriptureLine(analysis);
    let paragraphs;

    if (mode === "prayer") {
      paragraphs = [
        modeHeading(mode),
        prayer,
        "Scripture anchors: " + refs,
        "After the prayer: " + step
      ];
    } else if (mode === "guidance") {
      paragraphs = [
        modeHeading(mode),
        acknowledgment,
        "Next step: " + step,
        "Scripture anchors: " + refs,
        reflection,
        "Prayer: " + prayer
      ];
    } else if (mode === "study") {
      paragraphs = [
        modeHeading(mode),
        "Related passages: " + refs,
        reflection,
        "Offline study mode uses curated Scripture references rather than open-ended theological generation. Reconnect for Ask Deeper when you want historical, linguistic, or verse-by-verse analysis."
      ];
    } else {
      paragraphs = [
        modeHeading(mode),
        acknowledgment,
        "Scripture anchors: " + refs,
        reflection,
        "Prayer: " + prayer,
        "One small step: " + step
      ];
    }

    if (continuity) paragraphs.splice(Math.min(3, paragraphs.length), 0, continuity);

    if (analysis.intensity === "high" && mode !== "study") {
      paragraphs.push("Because this feels especially intense, keep the next action small and concrete. If you are in immediate danger or need urgent medical help, seek local emergency support rather than relying on this app.");
    }

    remember(analysis);

    return {
      route:"local",
      reply:paragraphs.filter(Boolean).join("\n\n"),
      analysis:{
        topic:topic.id,
        topicLabel:topic.label,
        secondaryTopic:analysis.secondary ? analysis.secondary.id : "",
        emotion:analysis.emotion,
        intensity:analysis.intensity,
        confidence:analysis.confidence,
        needs:analysis.needs
      },
      scriptureRefs:[].concat(topic.verses || []).slice(0, 3),
      journey:topic.journey || "",
      privacy:"local"
    };
  }

  function buildExperience(text, mode) {
    const selectedMode = mode || "comfort";
    const analysis = analyze(text);
    if (analysis.safety) {
      return {
        route:"local-safety",
        reply:safetyResponse(analysis.safety),
        analysis:{ safety:analysis.safety, topic:"safety", intensity:"high" },
        scriptureRefs:[],
        journey:"",
        privacy:"local"
      };
    }
    const casual = buildCasualExperience(text);
    if (casual) return casual;
    return buildNormalExperience(text, selectedMode, analysis);
  }

  function containsPremiumDeepQuestion(text) {
    const value = String(text || "");
    const patterns = [
      /\b(greek|hebrew|aramaic|manuscript|textual variant|canon formation)\b/i,
      /\b(theology|theological|doctrine|doctrinal|trinity|trinitarian|predestination|eschatology|soteriology|christology)\b/i,
      /\b(historical context|literary context|original language|verse[- ]by[- ]verse|exegesis|hermeneutic|hermeneutics)\b/i,
      /\b(compare|difference between|catholic|orthodox|protestant|reformed|pentecostal)\b.*\b(view|views|teaching|teachings|interpretation|interpretations)\b/i,
      /\b(contradiction|contradictions|contradict)\b/i,
      /\bwhy did (jesus|paul|god|moses|peter)\b/i
    ];
    if (patterns.some(function(pattern) { return pattern.test(value); })) return true;
    return value.length > 700 && /\?/.test(value);
  }

  function looksLikeExplicitPrayerRequest(text) {
    const clean = normalize(text);
    return /\b(pray|prayer|pray for|help me pray|write a prayer|say a prayer|bless|blessing)\b/.test(clean);
  }

  function looksLikeGuidanceRequest(text) {
    const clean = normalize(text);
    return /\b(what should i do|help me decide|need guidance|guide me|next step|discern|decision|choose|choice)\b/.test(clean);
  }

  function looksLikeKnowledgeQuestion(text) {
    const clean = normalize(text);
    if (!clean) return false;
    if (/^(who|what|when|where|why|how|which)\b/.test(clean)) return true;
    if (/\b(tell me about|explain|define|meaning of|what is|who is|who was|where is|when did|why did|how did|how many)\b/.test(clean)) return true;
    if (/\b(ten commandments|commandments|apostles|disciples|mother mary|virgin mary|mary magdalene|baptism|eucharist|communion|resurrection|crucifixion|old testament|new testament|gospel|psalm|proverb)\b/.test(clean)) return true;
    return /\?$/.test(String(text || "").trim()) && clean.split(" ").length <= 16;
  }

  function looksLikeSeriousPersonalSituation(text) {
    const clean = normalize(text);
    return /\b(dying|terminal|cancer|hospital|icu|surgery|doctor said|medical emergency|lost my job|fired|death|died|funeral|abused|abuse|violence)\b/.test(clean);
  }

  function decideRoute(text, mode, online) {
    const selectedMode = mode || "comfort";
    const isOnline = online !== false;
    const analysis = analyze(text);

    if (analysis.safety) return { route:"local", reason:"safety", analysis:analysis };
    if (buildCasualExperience(text)) {
      return { route:"local", reason:"casual-conversation", analysis:{ topic:"conversation", confidence:1, matchedTerms:[] } };
    }
    if (!isOnline) return { route:"local", reason:"offline", analysis:analysis };

    if (selectedMode === "prayer" || looksLikeExplicitPrayerRequest(text)) {
      return { route:"local", reason:"prayer-request", analysis:analysis };
    }
    if (selectedMode === "guidance" || looksLikeGuidanceRequest(text)) {
      return { route:"local", reason:"guidance-request", analysis:analysis };
    }

    if (selectedMode === "study" || containsPremiumDeepQuestion(text)) {
      return { route:"cloud-deep", cloudMode:"study", reason:selectedMode === "study" ? "study-mode" : "deep-question", analysis:analysis };
    }

    if (looksLikeKnowledgeQuestion(text) || looksLikeSeriousPersonalSituation(text)) {
      return { route:"cloud-standard", cloudMode:"conversation", reason:"open-conversation", analysis:analysis };
    }

    if (analysis.confidence >= 0.25 && Array.isArray(analysis.matchedTerms) && analysis.matchedTerms.length > 0) {
      return { route:"local", reason:"matched-local-topic", analysis:analysis };
    }

    return { route:"cloud-standard", cloudMode:"conversation", reason:"general-conversation", analysis:analysis };
  }

  function shouldHandleLocally(text, mode, online) {
    return decideRoute(text, mode, online).route === "local";
  }

  function clearLocalMemory() {
    try { localStorage.removeItem(MEMORY_KEY); } catch (_) {}
  }

  function getLocalMemorySummary() {
    const memory = loadMemory();
    const counts = {};
    for (const item of memory) counts[item.topic] = (counts[item.topic] || 0) + 1;
    return {
      count:memory.length,
      themes:Object.entries(counts)
        .sort(function(a,b) { return b[1] - a[1]; })
        .map(function(entry) { return { topic:entry[0], count:entry[1] }; })
    };
  }

  window.OneIntoOneOffline = {
    version:"2.1.0",
    analyze:analyze,
    buildExperience:buildExperience,
    buildResponse:function(text, mode) { return buildExperience(text, mode).reply; },
    decideRoute:decideRoute,
    shouldHandleLocally:shouldHandleLocally,
    clearLocalMemory:clearLocalMemory,
    getLocalMemorySummary:getLocalMemorySummary
  };
})();