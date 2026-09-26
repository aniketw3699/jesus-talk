(() => {
  "use strict";

  const TOPICS = [
    {
      id:"anxiety",
      terms:["anxious","anxiety","afraid","fear","panic","worried","worry","overwhelmed","scared","stress","stressed"],
      verse:"Philippians 4:6–7",
      thought:"Bring the fear into the open rather than carrying it alone. Name what is outside your control, then focus on the next faithful step you can take today.",
      prayer:"God, meet me in this fear. Steady my thoughts, give me wisdom for the next step, and help me entrust what I cannot control to You."
    },
    {
      id:"work",
      terms:["job","work","manager","boss","career","money","rent","loan","debt","emi","salary","financial","business"],
      verse:"Matthew 6:31–34",
      thought:"Financial and work pressure can make tomorrow feel larger than today. Separate the immediate decision in front of you from the future you cannot yet solve.",
      prayer:"God, give me wisdom for my work and provision for what I need. Help me act responsibly today without being consumed by tomorrow."
    },
    {
      id:"grief",
      terms:["grief","grieving","loss","lost","died","death","funeral","miss","heartbroken","heartbreak"],
      verse:"Psalm 34:18",
      thought:"Grief does not need to be rushed. You can bring sorrow honestly into prayer without forcing yourself to feel better before you are ready.",
      prayer:"God, stay near to me in this loss. Hold what hurts, give me strength for this day, and help me remember that sorrow can be spoken honestly before You."
    },
    {
      id:"relationship",
      terms:["relationship","marriage","husband","wife","partner","breakup","betray","friend","family","fight","argument","forgive"],
      verse:"James 1:19",
      thought:"Before deciding what to say or do, slow the moment down. Clarify what happened, what you need, and what response would be truthful without becoming destructive.",
      prayer:"God, give me patience, honesty, and wisdom in this relationship. Help me speak truth with grace and choose what leads toward peace and integrity."
    },
    {
      id:"guilt",
      terms:["guilt","guilty","ashamed","shame","sin","failed","failure","regret","forgiveness"],
      verse:"1 John 1:9",
      thought:"Honest confession is different from endless self-condemnation. Name what happened clearly, take responsibility where needed, and decide what repair or change is possible now.",
      prayer:"God, I bring You what I regret. Give me honesty to own what is mine, courage to make amends where I can, and grace to begin again."
    },
    {
      id:"lonely",
      terms:["alone","lonely","loneliness","lost","direction","purpose","empty","hopeless","confused"],
      verse:"Psalm 23:4",
      thought:"When direction is unclear, do not demand an entire life plan from one difficult moment. Look for the next small action that is consistent with your values and faith.",
      prayer:"God, meet me in this loneliness and uncertainty. Give me companionship, clarity, and enough light for the next step."
    }
  ];

  const DEFAULT = {
    verse:"Matthew 11:28",
    thought:"You do not need perfect words to pray. Start by naming what happened, what you feel, and what you need for the next step.",
    prayer:"God, You know what I am carrying. Help me speak honestly, receive wisdom from Scripture, and take the next step with courage and peace."
  };

  function normalize(text) {
    return String(text || "").toLowerCase().replace(/[^a-z0-9\s'-]/g," ");
  }

  function chooseTopic(text) {
    const clean = normalize(text);
    let best = null;
    let bestScore = 0;
    for (const topic of TOPICS) {
      let score = 0;
      for (const term of topic.terms) {
        if (clean.includes(term)) score += term.includes(" ") ? 3 : 1;
      }
      if (score > bestScore) {
        bestScore = score;
        best = topic;
      }
    }
    return best || DEFAULT;
  }

  function safeExcerpt(text) {
    const value = String(text || "").trim().replace(/\s+/g," ");
    if (!value) return "";
    return value.length > 120 ? value.slice(0,117) + "…" : value;
  }

  function buildResponse(text, mode) {
    const topic = chooseTopic(text);
    const excerpt = safeExcerpt(text);
    const intro = excerpt ? `You wrote: “${excerpt}”\n\n` : "";
    const heading = mode === "study"
      ? "A Scripture anchor"
      : mode === "guidance"
      ? "A grounded next step"
      : mode === "prayer"
      ? "A prayer you can use"
      : "A place to begin";

    return [
      intro + heading,
      `Scripture: ${topic.verse}`,
      topic.thought,
      `Prayer: ${topic.prayer}`,
      "This response was created privately on your device. For deeper interpretation or open-ended Bible questions, reconnect for cloud guidance."
    ].join("\n\n");
  }

  window.OneIntoOneOffline = { buildResponse };
})();