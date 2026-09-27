(() => {
  "use strict";

  const WORDLESS = [
    {
      scripture:"Romans 8:26",
      prayer:"God, I do not have the right words today. Receive the sighs, fears, and unfinished thoughts I cannot organize. Give me enough peace for this moment and enough light for the next step.",
      reflection:"You do not need to explain everything before you can pray."
    },
    {
      scripture:"Psalm 46:10",
      prayer:"God, I am here. Quiet what is noisy inside me. Help me stop solving everything for a moment and simply be present before You.",
      reflection:"Stillness is not the absence of problems; it is a pause before choosing the next response."
    },
    {
      scripture:"Matthew 11:28",
      prayer:"God, I am tired of carrying this alone. I bring You what I understand and what I cannot explain. Let me rest before I decide what comes next.",
      reflection:"You can pause without giving up."
    },
    {
      scripture:"Psalm 62:8",
      prayer:"God, You already know what is in my heart. Help me pour it out honestly, without editing myself, and receive wisdom for what belongs to me today.",
      reflection:"An honest prayer can begin with one sentence: This is what hurts."
    },
    {
      scripture:"Isaiah 41:10",
      prayer:"God, when I cannot form a proper prayer, stay near. Give me steadiness, courage, and one small action I can take without fear deciding for me.",
      reflection:"One small faithful step is enough for now."
    },
    {
      scripture:"Psalm 23:4",
      prayer:"God, walk with me through this difficult moment. I do not need the whole path—only enough courage for the part directly in front of me.",
      reflection:"You do not need the whole map before taking the next step."
    }
  ];

  const JOURNEYS = {
    anxiety: {
      title:"Overcoming Overwhelming Anxiety",
      total:7,
      icon:"🕊️",
      days:[
        ["Name the fear","Philippians 4:6–7","Anxiety becomes harder to work with when it stays vague. Name the exact fear instead of carrying a cloud of possibilities.","God, help me name what I am afraid of without letting fear become the whole story.","Write the fear in one sentence, then write one fact you know for certain."],
        ["Separate today from tomorrow","Matthew 6:34","Tomorrow may need planning, but it does not need to be emotionally lived twice.","God, give me wisdom for today and keep tomorrow from swallowing the present.","Choose the one task that actually belongs to today."],
        ["Release what you cannot control","1 Peter 5:7","Control has limits. Peace often begins when responsibility and control are separated.","God, show me what belongs to my responsibility and what I need to release.","Make two columns: mine to act on / not mine to control."],
        ["Calm the body","Psalm 46:10","A frightened body can keep telling the mind that danger is still happening. Slow the body before making important decisions.","God, bring steadiness to my body and mind so I can respond clearly.","Take ten slow breaths and delay non-urgent decisions until your body settles."],
        ["Choose wise counsel","Proverbs 12:15","Anxiety narrows perspective. A trustworthy person can help you see facts you are missing.","God, lead me toward wise, calm counsel rather than panic-driven reassurance.","Ask one trustworthy person for input on the facts, not just comfort."],
        ["Practice enough for today","Lamentations 3:22–23","Peace can be practiced in small portions. You do not need to feel completely fearless to move forward.","God, give me enough strength for this day rather than demanding certainty about every day ahead.","Notice one thing that went better than your fear predicted."],
        ["Carry forward what worked","Psalm 56:3–4","The goal is not never feeling fear again. It is learning what helps you respond differently when fear returns.","God, help me remember the practices that brought steadiness and use them again when fear returns.","Write your three most useful practices from this week and keep them visible."]
      ]
    },
    surrender: {
      title:"Surrendering Financial Anxiety",
      total:7,
      icon:"💼",
      days:[
        ["Face the real numbers","Luke 14:28","Financial fear grows when numbers stay hidden. Clarity is often less frightening than imagination.","God, give me courage to look honestly at what I have, owe, and need.","List current cash, essential monthly costs, and urgent obligations."],
        ["Separate essentials from pressure","Matthew 6:31–32","Not every expense has the same urgency. Wise stewardship begins with priorities.","God, give me wisdom to distinguish needs, commitments, and things that can wait.","Mark each expense essential / negotiable / optional."],
        ["Take one practical action","James 2:17","Prayer and responsible action can belong together.","God, show me the next practical step and give me courage to take it.","Make one call, application, payment-plan request, or budget change today."],
        ["Challenge scarcity panic","Philippians 4:19","Scarcity fear can make every decision feel final. Slow down before reacting.","God, keep fear from making expensive or desperate decisions for me.","Delay any non-essential high-pressure financial decision for 24 hours."],
        ["Ask for help wisely","Proverbs 15:22","Support can include advice, negotiation, work opportunities, and practical assistance.","God, give me humility to ask for the right help from the right people.","Contact one person who can offer information, opportunity, or practical guidance."],
        ["Plan without predicting","Proverbs 16:9","A plan is useful; pretending to know the future is not.","God, help me plan responsibly while accepting what I cannot predict.","Create a simple 30-day plan using only facts you know today."],
        ["Build a calmer money practice","Proverbs 21:5","Financial peace is often built through repeated small habits, not one dramatic breakthrough.","God, help me continue with discipline, patience, and hope.","Choose one weekly money habit to continue after this journey."]
      ]
    },
    forgiveness: {
      title:"Healing & The Freedom of Forgiveness",
      total:14,
      icon:"🤝",
      days:[
        ["Name what happened","Psalm 55:12–14","Forgiveness does not require pretending the wound was small.","God, help me tell the truth about what happened without becoming consumed by it.","Write what happened in factual language, without minimizing or exaggerating."],
        ["Name what it cost","Psalm 147:3","Hurt often includes a loss of trust, safety, expectation, or dignity.","God, meet me in what this cost me and help me grieve honestly.","Name the specific thing you lost or that changed because of the hurt."],
        ["Separate forgiveness from denial","Ephesians 4:15","Truth and grace can exist together.","God, keep me from confusing forgiveness with pretending nothing happened.","Write one truth that still needs to be acknowledged."],
        ["Release revenge","Romans 12:19","Letting go of revenge is different from saying there should be no consequences.","God, free me from the need to make the other person suffer in order for me to heal.","Notice any revenge fantasy and replace it with one boundary or constructive action."],
        ["Allow boundaries","Proverbs 4:23","Forgiveness does not automatically restore access or trust.","God, give me wisdom to know what boundary protects peace and integrity.","Write the boundary you need in one calm sentence."],
        ["Examine your own part","Matthew 7:5","Some conflicts include responsibility on more than one side; others do not. Honest self-examination should never become false blame.","God, show me clearly what belongs to me and what does not.","Name only the part you can honestly own, if there is one."],
        ["Choose the next conversation","James 1:19","Not every wound requires confrontation, and not every confrontation should happen immediately.","God, give me wisdom about whether to speak, wait, write, or stay silent.","Decide whether a conversation is needed now, later, or not at all."],
        ["Practice compassionate distance","Colossians 3:13","Compassion does not require closeness.","God, help me release hatred without abandoning wisdom.","Pray one sentence for the other person's good without removing necessary boundaries."],
        ["Rebuild trust carefully","Luke 16:10","Trust is usually rebuilt through consistent behaviour over time.","God, help me evaluate actions rather than promises alone.","If reconciliation is possible, define one small behaviour that would demonstrate reliability."],
        ["Forgive repeated memories","Philippians 3:13–14","A decision to forgive may need to be revisited when memories return.","God, when the memory returns, help me refuse to rehearse revenge and return to peace.","When the story loops today, say: I do not need to retry this case in my mind right now."],
        ["Protect your future","Isaiah 43:18–19","Healing includes making space for a future not organized around the wound.","God, help me build a life larger than what happened to me.","Do one activity today that has nothing to do with the conflict."],
        ["Receive forgiveness too","Romans 8:1","Sometimes resentment toward others and condemnation toward ourselves are intertwined.","God, help me receive grace for what I regret while still learning from it.","Name one thing you need to stop using as evidence that you are beyond grace."],
        ["Choose peace where possible","Romans 12:18","Peace is a goal, but it is not always fully within your control.","God, help me do what is mine to do without taking responsibility for the other person's response.","Identify the peaceful action that is actually within your control."],
        ["Carry the lesson, not the poison","Genesis 50:20","Healing does not erase history; it changes what history controls.","God, help me keep the wisdom this experience taught me without carrying bitterness forward.","Write one lesson, one boundary, and one hope you want to carry beyond this journey."]
      ]
    }
  };

  const NEED_MAP = {
    "Physical Healing & Restoration":{
      query:"health illness surgery healing strength",
      scripture:"Isaiah 41:10",
      blessings:[
        "May God give {name} strength for the body, calm for the mind, wisdom for every medical decision, and people who can carry the practical load with them.",
        "May {name} be surrounded by wise care, steady hope, and enough strength for each next step."
      ]
    },
    "Peace of Mind & Releasing Anxiety":{
      query:"anxiety fear worried peace",
      scripture:"Philippians 4:6–7",
      blessings:[
        "May God quiet what is racing inside {name}, give them clear judgment, and help them take the next step without fear controlling the whole day.",
        "May {name} receive steadiness for today and freedom from carrying tomorrow before it arrives."
      ]
    },
    "Financial Breakthrough & Debt Relief":{
      query:"financial money debt work provision",
      scripture:"Matthew 6:31–34",
      blessings:[
        "May God give {name} wise opportunities, disciplined decisions, practical help, and peace while they work through financial pressure.",
        "May {name} receive provision, clarity, and courage for every practical money decision ahead."
      ]
    },
    "Comfort in Grief & Loss":{
      query:"grief loss mourning comfort",
      scripture:"Psalm 34:18",
      blessings:[
        "May God stay near to {name} in this grief, give them permission to mourn honestly, and surround them with gentle people who do not rush their healing.",
        "May {name} be carried through this season one day at a time, with comfort, memory, and hope held together."
      ]
    },
    "Clarity, Exams & Life Direction":{
      query:"purpose decision direction exams wisdom",
      scripture:"James 1:5",
      blessings:[
        "May God give {name} a clear mind, wise counsel, disciplined preparation, and enough light for the next decision.",
        "May {name} receive calm focus, discernment, and courage to take the next right step."
      ]
    },
    "Marriage & Relationship Restoration":{
      query:"relationship marriage family conflict forgiveness",
      scripture:"James 1:19",
      blessings:[
        "May God give {name} patience, truthful communication, healthy boundaries, and wisdom about what can be repaired.",
        "May {name} have courage to pursue peace without denying what still needs honesty, change, or time."
      ]
    }
  };

  const SURRENDER_TOPIC_MAP = {
    anxiety:["1 Peter 5:7","John 14:27"],
    work_finance:["Psalm 55:22","Matthew 11:28"],
    grief:["Matthew 11:28","Psalm 55:22"],
    relationships:["Psalm 55:22","John 14:27"],
    guilt_forgiveness:["Psalm 103:12","Isaiah 1:18"],
    lonely:["Matthew 11:28","Psalm 46:10"],
    health:["Psalm 55:22","John 14:27"],
    sleep:["Matthew 11:28","Psalm 46:10"],
    purpose_decisions:["Psalm 46:10","Matthew 11:28"],
    family:["Psalm 55:22","John 14:27"],
    anger:["Psalm 46:10","John 14:27"],
    habit_temptation:["Psalm 55:22","Matthew 11:28"],
    faith_doubt:["Psalm 46:10","Matthew 11:28"],
    gratitude:["Psalm 46:10"]
  };

  function hash(text) {
    let h = 0;
    const value = String(text || "");
    for (let i = 0; i < value.length; i += 1) h = ((h << 5) - h + value.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function fillName(text, name) {
    return String(text || "").replace(/\{name\}/g, name || "your loved one");
  }

  function getWordless(seedText) {
    const item = WORDLESS[hash(seedText || String(Date.now()).slice(0, -4)) % WORDLESS.length];
    return {
      reply:["A prayer when words are hard",item.prayer,"Scripture anchor: "+item.scripture,item.reflection].join("\n\n"),
      scripture:item.scripture
    };
  }

  function getJourney(track) {
    return JOURNEYS[track] || null;
  }

  function getJourneyDay(track, dayNum) {
    const journey=getJourney(track);
    if (!journey) return null;
    const day=Math.max(1,Math.min(journey.total,Number(dayNum)||1));
    const raw=journey.days[day-1];
    if (!raw) return null;
    return {
      track,day,total:journey.total,title:journey.title,icon:journey.icon,
      theme:raw[0],scripture:raw[1],reflection:raw[2],prayer:raw[3],action:raw[4],
      reply:[
        journey.icon+" Day "+day+" of "+journey.total+" — "+raw[0],
        "Scripture anchor: "+raw[1],
        raw[2],
        "Prayer: "+raw[3],
        "Practice for today: "+raw[4]
      ].join("\n\n")
    };
  }

  function buildIntercessory(name,need,note,engine) {
    const safeName=(String(name||"").trim()||"your loved one").slice(0,60);
    const mapped=NEED_MAP[need] || NEED_MAP["Peace of Mind & Releasing Anxiety"];
    const detail=String(note||"").trim().slice(0,180);
    const analysis=engine && typeof engine.analyze==="function" ? engine.analyze(mapped.query+" "+detail) : null;
    const seed=hash(safeName+"|"+need+"|"+detail);
    const blessing=fillName(mapped.blessings[seed % mapped.blessings.length],safeName);
    const prayer=[
      "God, I bring "+safeName+" before You today.",
      blessing,
      detail ? "Be especially near in this situation: "+detail+"." : "",
      "Give them what is wise and good for the next step, and surround them with the right people and support.",
      "Amen."
    ].filter(Boolean).join(" ");
    const card=blessing+" Scripture: "+mapped.scripture;
    return {
      reply:["A prayer for "+safeName,prayer,"Scripture anchor: "+mapped.scripture].join("\n\n"),
      cardText:card,
      topic:analysis && analysis.primary ? analysis.primary.id : "general",
      scripture:mapped.scripture
    };
  }

  function selectSurrenderScripture(analysis, scriptureList) {
    const topic=analysis && analysis.primary ? analysis.primary.id : "general";
    const preferred=SURRENDER_TOPIC_MAP[topic] || ["Matthew 11:28"];
    for (const ref of preferred) {
      const hit=(scriptureList||[]).find(item => String(item.ref||"").includes(ref));
      if (hit) return hit;
    }
    return (scriptureList||[])[0] || {quote:"You do not have to carry everything at once.",ref:""};
  }

  function surrenderReflection(analysis) {
    const label=analysis && analysis.primary && analysis.primary.label ? analysis.primary.label.toLowerCase() : "this burden";
    return "You have named "+label+". What disappears here does not erase practical responsibilities; it marks the point where you stop carrying every part of it alone.";
  }

  window.ONEINTOONE_EXPERIENCES={
    version:"1.0.0",
    getWordless,
    getJourney,
    getJourneyDay,
    buildIntercessory,
    selectSurrenderScripture,
    surrenderReflection
  };
})();