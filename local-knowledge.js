(() => {
  "use strict";

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[’]/g, "'")
      .replace(/[^a-z0-9:'\-\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function response(reply, refs, kind) {
    return {
      route:"local-knowledge",
      privacy:"local",
      kind:kind || "bible-knowledge",
      reply:reply,
      scriptureRefs:Array.isArray(refs) ? refs : []
    };
  }

  const FACTS = [
    {
      id:"ten-commandments",
      match:function(clean) {
        return /\b(ten|10) commandments\b/.test(clean) || /\bwhat are the commandments\b/.test(clean);
      },
      build:function() {
        return response(
          [
            "The Ten Commandments are given in Exodus 20:1–17 and repeated in Deuteronomy 5:6–21.",
            "",
            "In brief:",
            "1. Worship no other gods.",
            "2. Do not make or worship idols.",
            "3. Do not misuse God's name.",
            "4. Remember the Sabbath and keep it holy.",
            "5. Honor your father and mother.",
            "6. Do not murder.",
            "7. Do not commit adultery.",
            "8. Do not steal.",
            "9. Do not give false testimony.",
            "10. Do not covet what belongs to another person.",
            "",
            "These are concise paraphrases rather than direct quotations from the World English Bible."
          ].join("\n"),
          ["Exodus 20:1-17", "Deuteronomy 5:6-21"],
          "bible-list"
        );
      }
    },
    {
      id:"lords-prayer",
      match:function(clean) {
        return /\b(lord'?s prayer|our father prayer|prayer jesus taught)\b/.test(clean);
      },
      build:function() {
        return response(
          [
            "Jesus teaches the model commonly called the Lord's Prayer in Matthew 6:9–13, with a parallel form in Luke 11:2–4.",
            "",
            "Its movement is: honor God's name, seek His kingdom and will, ask for daily provision, ask for forgiveness while forgiving others, and ask for help against temptation and evil.",
            "",
            "Open Matthew 6:9–13 in the Bible reader for the World English Bible wording."
          ].join("\n"),
          ["Matthew 6:9-13", "Luke 11:2-4"],
          "bible-summary"
        );
      }
    },
    {
      id:"beatitudes",
      match:function(clean) {
        return /\b(beatitudes|what are the beatitudes)\b/.test(clean);
      },
      build:function() {
        return response(
          "The Beatitudes open Jesus' Sermon on the Mount in Matthew 5:3–12. They bless the poor in spirit, those who mourn, the gentle, those who hunger and thirst for righteousness, the merciful, the pure in heart, peacemakers, and those persecuted for righteousness. Open Matthew 5:3–12 for the full World English Bible text.",
          ["Matthew 5:3-12"],
          "bible-summary"
        );
      }
    },
    {
      id:"fruit-spirit",
      match:function(clean) {
        return /\b(fruit of the spirit|fruits of the spirit)\b/.test(clean);
      },
      build:function() {
        return response(
          "Galatians 5:22–23 lists the fruit of the Spirit as love, joy, peace, patience, kindness, goodness, faith, gentleness, and self-control. Open the passage in the Bible reader for the full World English Bible context.",
          ["Galatians 5:22-23"],
          "bible-list"
        );
      }
    },
    {
      id:"greatest-commandment",
      match:function(clean) {
        return /\b(greatest commandment|most important commandment)\b/.test(clean);
      },
      build:function() {
        return response(
          "Jesus summarizes the greatest commandments as wholehearted love for God and love for your neighbor as yourself. See Matthew 22:34–40 and Mark 12:28–31 for the full context.",
          ["Matthew 22:34-40", "Mark 12:28-31"],
          "bible-summary"
        );
      }
    },
    {
      id:"mother-mary",
      match:function(clean) {
        return /^(who (is|was) )?(mother |virgin )?mary( of nazareth)?\??$/.test(clean);
      },
      build:function() {
        return response(
          [
            "Mary of Nazareth is the mother of Jesus in the New Testament. Luke 1–2 describes the annunciation and Jesus' birth; John 2 places her at the wedding in Cana; John 19:25–27 places Jesus' mother near the cross; and Acts 1:14 includes Mary with the believers after Jesus' ascension.",
            "",
            "Christians agree on her importance in Jesus' earthly life, while Catholic, Orthodox, and Protestant traditions differ on later doctrines and devotional practices concerning Mary."
          ].join("\n"),
          ["Luke 1:26-38", "Luke 2:1-20", "John 2:1-12", "John 19:25-27", "Acts 1:14"],
          "christian-knowledge"
        );
      }
    }
  ];

  function escapeRegex(value) {
    return String(value || "").replace(/[.*+?^$\{\}()|[\]\\]/g, "\\  function extractReference(text) {
    const source = String(text || "");
    const match = source.match(/\b((?:[1-3]\s*)?[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)\s+(\d+):(\d+)(?:\s*[-–—]\s*(\d+))?/);
    if (!match) return "";
    return match[1] + " " + match[2] + ":" + match[3] + (match[4] ? "-" + match[4] : "");
  }");
  }

  function extractReference(text) {
    const source = String(text || "");
    const manifest = window.ONEINTOONE_BIBLE_MANIFEST;
    const books = manifest && Array.isArray(manifest.books)
      ? manifest.books.map(function(book) { return book.name; }).sort(function(a,b) { return b.length - a.length; })
      : [];

    const aliases = [];
    books.forEach(function(name) {
      aliases.push({ typed:name, canonical:name });
      if (name === "Psalms") aliases.push({ typed:"Psalm", canonical:"Psalms" });
    });

    for (const alias of aliases) {
      const pattern = new RegExp("\\b" + escapeRegex(alias.typed) + "\\s+(\\d+):(\\d+)(?:\\s*[-–—]\\s*(\\d+))?", "i");
      const match = source.match(pattern);
      if (!match) continue;
      return alias.canonical + " " + match[1] + ":" + match[2] + (match[3] ? "-" + match[3] : "");
    }
    return "";
  }

  async function answerDirectReference(text) {
    const bible = window.ONEINTOONE_BIBLE;
    if (!bible || typeof bible.getReference !== "function") return null;
    const ref = extractReference(text);
    if (!ref) return null;
    try {
      const hit = await bible.getReference(ref);
      if (!hit || !hit.text) return null;
      return response(
        hit.reference + " — World English Bible\n\n" + hit.text,
        [hit.reference],
        "direct-scripture"
      );
    } catch (_) {
      return null;
    }
  }

  function canAnswer(text) {
    const clean = normalize(text);
    if (!clean) return false;
    if (extractReference(text)) return true;
    return FACTS.some(function(item) { return item.match(clean); });
  }

  async function answer(text) {
    const direct = await answerDirectReference(text);
    if (direct) return direct;

    const clean = normalize(text);
    for (const item of FACTS) {
      if (item.match(clean)) return item.build();
    }
    return null;
  }

  window.ONEINTOONE_LOCAL_KNOWLEDGE = Object.freeze({
    version:"1.0.0",
    canAnswer:canAnswer,
    answer:answer,
    extractReference:extractReference
  });
})();