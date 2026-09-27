(() => {
  "use strict";

  const topic = (id, label, terms, verses, need, acknowledgements, reflections, prayers, steps, journey = "") => ({
    id, label, terms, verses, need, acknowledgements, reflections, prayers, steps, journey
  });

  const topics = [
    topic(
      "anxiety","Anxiety & fear",
      ["anxious","anxiety","panic","panicking","afraid","fear","fearful","scared","terrified","worried","worry","overwhelmed","racing thoughts","stress","stressed","nervous"],
      ["Philippians 4:6–7","1 Peter 5:7","Psalm 56:3–4","John 14:27"],
      ["peace","trust","steadiness"],
      [
        "What you are carrying sounds heavy enough to make the future feel louder than the present.",
        "Fear can make several possible problems feel as though they are all happening at once.",
        "You do not have to solve every possibility before you can take one faithful step."
      ],
      [
        "Separate what needs action today from what belongs to tomorrow. Prayer can hold both without pretending the fear is not real.",
        "Name the part you can influence, the part you cannot control, and one small next step. That keeps fear from becoming the only voice in the room.",
        "Let the goal for this moment be steadiness rather than certainty. You can move forward without having every answer."
      ],
      [
        "God, meet me in this fear. Quiet what is racing inside me, give me wisdom for what I can do today, and help me entrust what I cannot control to You.",
        "Father, I bring You the thoughts I keep replaying. Give me peace, clear judgment, and courage for the next right step.",
        "God, hold me steady while I face what I cannot yet predict. Help me act with wisdom and rest what I cannot carry in Your hands."
      ],
      [
        "Write down the single thing that needs attention today; leave the rest for later.",
        "Take one slow minute, then choose the smallest practical action that would reduce uncertainty.",
        "If the fear is looping, move it into Lay It Down before making your next decision."
      ],
      "anxiety"
    ),
    topic(
      "work_finance","Work & financial pressure",
      ["job","work","manager","boss","career","salary","income","money","rent","loan","debt","emi","mortgage","financial","business","fired","fire me","laid off","layoff","unemployed","promotion","interview"],
      ["Matthew 6:31–34","Proverbs 3:5–6","Philippians 4:19","James 1:5"],
      ["provision","wisdom","courage"],
      [
        "Work and money pressure can make every decision feel like a threat to your future.",
        "When income, debt, or job security is uncertain, it is natural for your mind to jump several months ahead.",
        "You are facing a practical concern, not just an abstract feeling, so prayer and a concrete next step belong together."
      ],
      [
        "Do not confuse planning with predicting. Work with the facts you have today, identify the next financial or career action, and refuse to solve an imaginary future all at once.",
        "Provision can include wisdom, restraint, conversations, applications, budgeting, and help from other people—not only a sudden change in circumstances.",
        "A calm inventory of what is due, what is available, and who needs to be contacted can turn a vague fear into a set of manageable actions."
      ],
      [
        "God, give me wisdom for my work and provision for what I need. Help me act responsibly today without being consumed by tomorrow.",
        "Father, I bring You my work and financial pressure. Give me clarity, open the right doors, and help me make disciplined decisions without fear ruling me.",
        "God, guide my choices around work and money. Give me courage for necessary conversations and peace while I do what is mine to do."
      ],
      [
        "List the next three practical money or work actions in order of urgency.",
        "Choose one conversation, application, payment plan, or decision you can move forward today.",
        "If the pressure feels too large, use Lay It Down first, then return to the numbers with a calmer mind."
      ],
      "surrender"
    ),
    topic(
      "grief","Grief & loss",
      ["grief","grieving","bereavement","loss","lost someone","died","death","funeral","passed away","miss him","miss her","heartbroken","mourning","widow","widower"],
      ["Psalm 34:18","Psalm 147:3","John 11:35","Revelation 21:4"],
      ["comfort","presence","patience"],
      [
        "Grief is not a problem that has to be solved on a schedule.",
        "Missing someone can arrive in waves, and prayer does not require you to hide that pain.",
        "There are moments when faith looks less like having an answer and more like bringing the sorrow honestly."
      ],
      [
        "Give yourself permission to name the loss instead of rushing toward a lesson from it.",
        "A day of grief can be measured in very small acts: eating, resting, speaking to someone safe, remembering, and praying one honest sentence.",
        "You can hold gratitude for a person and sorrow over their absence at the same time."
      ],
      [
        "God, stay near to me in this loss. Hold what hurts, give me strength for this day, and receive the words I do not know how to say.",
        "Father, I miss what I have lost. Give me comfort without asking me to pretend I am fine, and surround me with people who can sit with me in this season.",
        "God, carry me through this grief one day at a time. Keep love, memory, and hope alive even while my heart is hurting."
      ],
      [
        "Tell one trusted person what today feels like rather than carrying it alone.",
        "Write one memory you want to keep, without forcing yourself to turn it into a lesson.",
        "Choose gentleness today: food, rest, a short walk, prayer, or quiet company."
      ],
      "grief"
    ),
    topic(
      "relationships","Relationships & conflict",
      ["relationship","marriage","husband","wife","partner","boyfriend","girlfriend","breakup","betrayal","betrayed","friend","friendship","family","fight","argument","arguing","divorce","separation","trust issue","cheated","cheating"],
      ["James 1:19","Ephesians 4:15","Colossians 3:13","Proverbs 15:1"],
      ["wisdom","truth","peace"],
      [
        "Relationship pain often mixes hurt, fear, anger, and the desire to be understood.",
        "When trust or communication is strained, reacting quickly can make an already painful situation harder to read clearly.",
        "You can pursue peace without pretending that harmful or dishonest behaviour is acceptable."
      ],
      [
        "Before the next conversation, separate facts from assumptions and decide what truth needs to be said calmly.",
        "Forgiveness, reconciliation, and trust are related but not identical. Trust may require evidence and time to rebuild.",
        "A healthy next step may be a conversation, a boundary, time to cool down, counsel, or simply refusing to retaliate."
      ],
      [
        "God, give me patience, honesty, and wisdom in this relationship. Help me speak truth with grace and choose what leads toward peace and integrity.",
        "Father, guard me from reacting only from hurt. Show me what to say, what not to say, and where healthy boundaries are needed.",
        "God, bring clarity into this relationship. Help me forgive what I can, confront what I must, and avoid confusing peace with denial."
      ],
      [
        "Write the one thing you need the other person to understand, in one calm sentence.",
        "If the conversation is heated, delay the response until you can speak without attacking.",
        "Decide whether the next need is repair, a boundary, clarification, or time."
      ],
      "forgiveness"
    ),
    topic(
      "guilt_forgiveness","Guilt, regret & forgiveness",
      ["guilt","guilty","ashamed","shame","sin","sinned","failed","failure","regret","forgive me","forgiveness","mistake","messed up","wrong thing"],
      ["1 John 1:9","Psalm 51:10","Romans 8:1","Ephesians 4:32"],
      ["confession","repair","grace"],
      [
        "Regret can become useful when it leads to honesty and repair; it becomes destructive when it only keeps repeating condemnation.",
        "You can acknowledge wrongdoing without making your worst action your entire identity.",
        "Confession is clearest when it names what happened, accepts responsibility, and turns toward change."
      ],
      [
        "Ask three questions: What was mine to own? Who was affected? What repair or changed behaviour is possible now?",
        "Receiving forgiveness does not erase responsibility; it can give you the courage to take responsibility without hiding.",
        "If another person was harmed, prayer should accompany—not replace—honest repair where repair is safe and appropriate."
      ],
      [
        "God, I bring You what I regret. Give me honesty to own what is mine, courage to make amends where I can, and grace to begin again.",
        "Father, keep me from hiding behind shame. Show me the truth about what I did and the next faithful act of repair.",
        "God, I ask for forgiveness and a changed heart. Help me choose actions that match the repentance I am praying for."
      ],
      [
        "Name the action you regret without adding excuses.",
        "Write one repair step you can take, if doing so is safe and appropriate.",
        "Use Lay It Down after you have identified what responsibility still remains."
      ],
      "forgiveness"
    ),
    topic(
      "loneliness","Loneliness & belonging",
      ["alone","lonely","loneliness","isolated","nobody cares","no friends","left out","abandoned","unwanted","empty"],
      ["Psalm 23:4","Psalm 68:6","Hebrews 13:5","Isaiah 41:10"],
      ["presence","connection","belonging"],
      [
        "Loneliness can make silence feel like evidence that you do not matter, even when that conclusion is not true.",
        "Feeling disconnected is painful precisely because connection matters.",
        "Prayer can be one place to be honest about loneliness, but you also deserve real human connection."
      ],
      [
        "Do not wait until you feel social enough to reach out. A small message to one safe person can be more realistic than trying to solve loneliness all at once.",
        "Notice whether you need company, understanding, practical help, or simply to be around other people; those needs can require different actions.",
        "Repeated loneliness often improves through consistent places and relationships rather than one dramatic conversation."
      ],
      [
        "God, meet me in this loneliness. Remind me that my life has value, and give me courage to reach toward healthy connection.",
        "Father, stay close in this quiet place. Lead me toward people and communities where I can both receive and give care.",
        "God, when I feel forgotten, help me resist withdrawing completely. Give me one safe connection for today."
      ],
      [
        "Send one simple message to someone safe: 'Could we talk sometime today?'",
        "Choose one recurring community or activity where connection can grow over time.",
        "If you have been withdrawing, spend a little time in a safe public or communal place rather than remaining completely isolated."
      ]
    ),
    topic(
      "health","Health, illness & caregiving",
      ["sick","ill","illness","disease","diagnosis","new diagnosis","hospital","in hospital","surgery","has surgery","having surgery","surgery tomorrow","operation","doctor","medical","pain","cancer","cancer treatment","treatment","health","healing","caregiver","caregiving"],
      ["Psalm 41:3","James 5:14–15","Isaiah 41:10","Psalm 121:1–2"],
      ["strength","healing","wisdom"],
      [
        "Health uncertainty can make even ordinary hours feel heavy.",
        "When illness affects you or someone you love, prayer can sit alongside medical care rather than competing with it.",
        "It is possible to pray for healing while also asking for wisdom, endurance, good clinicians, and support."
      ],
      [
        "Write down the questions that need to be asked at the next appointment so fear does not have to hold all the details in your head.",
        "If you are caring for someone else, your own rest and support are part of sustainable care.",
        "Do not use spiritual language to silence symptoms or medical concerns that need professional attention."
      ],
      [
        "God, bring strength, wisdom, and healing into this health situation. Guide the medical decisions, sustain the people involved, and give peace for the next step.",
        "Father, I bring You this illness and the fear around it. Give endurance, wise care, and people who can help carry the practical load.",
        "God, be near in this body and in this uncertainty. Help us seek good care, make clear decisions, and hold hope without denying reality."
      ],
      [
        "Write the next medical question or practical task that needs attention.",
        "Ask one person for a specific kind of help rather than carrying every responsibility alone.",
        "Keep prayer beside appropriate professional care, not in place of it."
      ]
    ),
    topic(
      "sleep","Sleep & restless nights",
      ["sleep","cant sleep","can't sleep","insomnia","awake at night","night anxiety","nightmare","restless","bedtime"],
      ["Psalm 4:8","Psalm 23:2","Matthew 11:28","Proverbs 3:24"],
      ["rest","release","calm"],
      [
        "Night can make unfinished thoughts feel more urgent than they are.",
        "A tired mind is often a poor place to solve tomorrow.",
        "You can end the day without finishing every problem."
      ],
      [
        "Write down what you are afraid you will forget, then give yourself permission to postpone solving it until daylight.",
        "Reduce stimulation, slow your breathing, and let the goal be rest rather than forcing sleep.",
        "If sleep problems are persistent or severe, practical and medical support can belong alongside prayer."
      ],
      [
        "God, I release this day to You. Quiet what keeps replaying, help my body rest, and give me enough peace for this night.",
        "Father, I cannot solve tomorrow from this bed. Help me set down the unfinished things and receive rest.",
        "God, calm my mind and body. Keep watch over what I cannot manage tonight and let me rest without fear."
      ],
      [
        "Write tomorrow's first task on paper, then stop planning.",
        "Put the phone down for a few minutes and slow your breathing before trying again.",
        "If this has been happening repeatedly, consider speaking with a healthcare professional about persistent sleep difficulty."
      ]
    ),
    topic(
      "purpose_decisions","Purpose & decisions",
      ["purpose","direction","decision","choose","choice","confused","what should i do","dont know what to do","don't know what to do","calling","future","next step","guidance"],
      ["James 1:5","Proverbs 3:5–6","Psalm 119:105","Romans 12:2"],
      ["wisdom","discernment","patience"],
      [
        "Not knowing the entire path does not mean you have no direction at all.",
        "Big decisions become clearer when you separate values, facts, fears, and trade-offs.",
        "Discernment often looks less like receiving one dramatic sign and more like becoming clearer about the next faithful step."
      ],
      [
        "List the options, what each option requires, and what values each one protects or compromises.",
        "Pay attention to facts and wise counsel, not only the strongest emotion of the day.",
        "Ask whether you need more information, more courage, or simply a deadline for deciding."
      ],
      [
        "God, give me wisdom without panic. Help me see the facts clearly, listen to wise counsel, and choose with integrity.",
        "Father, guide my next step. Close what should be closed, clarify what needs more information, and keep fear from making the decision for me.",
        "God, help me discern patiently. Give me enough light for the next step even if the whole path is not visible."
      ],
      [
        "Write the decision in one sentence and list the two or three real options.",
        "Ask one wise person for input on the facts, not merely reassurance.",
        "Choose what information is still missing and set a time to gather it."
      ]
    ),
    topic(
      "family","Family concerns",
      ["mother","mom","father","dad","parents","parent","son","daughter","child","children","brother","sister","family"],
      ["Joshua 24:15","Colossians 3:13–14","Proverbs 17:17","Psalm 133:1"],
      ["care","wisdom","patience"],
      [
        "Family concerns can feel especially heavy because love and responsibility are closely connected.",
        "You can care deeply without being able to control another person's choices.",
        "Sometimes the faithful family response is help; sometimes it is a boundary; often it requires patience."
      ],
      [
        "Clarify what support you can realistically offer and what is outside your control.",
        "If conflict is involved, decide what needs to be said directly and what only needs time.",
        "Specific help is often more sustainable than vague promises to fix everything."
      ],
      [
        "God, watch over my family. Give us wisdom, patience, protection, and the courage to love one another truthfully.",
        "Father, help me care without trying to control what I cannot control. Show me the next useful act of love.",
        "God, bring peace and wisdom into my family. Help us speak clearly, repair what can be repaired, and carry one another wisely."
      ],
      [
        "Decide what concrete help you can offer today.",
        "If conflict is involved, write the calmest true sentence you need to say.",
        "Do not take responsibility for choices that belong to another adult."
      ]
    ),
    topic(
      "anger","Anger & resentment",
      ["angry","anger","furious","rage","resent","resentment","hate","revenge","revengeful","mad at"],
      ["Ephesians 4:26","James 1:19–20","Proverbs 15:1","Romans 12:19"],
      ["self-control","truth","release"],
      [
        "Anger can contain useful information, but it becomes dangerous when it chooses the action for you.",
        "You do not have to deny anger in order to refuse retaliation.",
        "Strong anger is a good reason to slow the next action down."
      ],
      [
        "Identify what boundary, injustice, fear, or hurt is underneath the anger before deciding how to respond.",
        "A delayed response is often stronger than a reactive one.",
        "If you need to confront something, prepare the facts and the boundary without adding threats or humiliation."
      ],
      [
        "God, help me tell the truth about my anger without letting it control me. Give me restraint, clarity, and courage to respond without causing more harm.",
        "Father, show me what is underneath this anger. Help me release revenge and choose a response I will not regret.",
        "God, give me self-control while I decide what needs to be confronted and what needs to be released."
      ],
      [
        "Do not send the message while your body is still highly activated.",
        "Write what happened and what boundary you need before speaking to the person.",
        "If there is risk of violence, create physical distance and get help rather than continuing the confrontation."
      ]
    ),
    topic(
      "habit_temptation","Habits & temptation",
      ["temptation","tempted","addiction","habit","keep doing","cant stop","can't stop","porn","gambling","drinking","smoking","relapse","compulsion"],
      ["1 Corinthians 10:13","Galatians 5:16","2 Timothy 2:22","James 4:7–8"],
      ["self-control","support","change"],
      [
        "Repeated habits usually have triggers, routines, and rewards—not only a shortage of willpower.",
        "Shame often makes a destructive habit more secret, while change usually becomes easier with structure and support.",
        "A relapse or setback can be examined without turning it into permission to give up."
      ],
      [
        "Identify the trigger that usually appears before the behaviour and change the environment around that trigger.",
        "Make the unwanted action harder and the healthier alternative easier before the next vulnerable moment.",
        "Serious addictions may need professional or peer support alongside prayer."
      ],
      [
        "God, give me honesty about this pattern and strength for the next decision. Help me remove what feeds it and seek the support I need.",
        "Father, help me resist secrecy and discouragement. Give me practical wisdom, self-control, and people who can support real change.",
        "God, meet me before the next trigger. Help me choose a different action and keep moving even after setbacks."
      ],
      [
        "Name the most common trigger and change one part of the environment around it.",
        "Tell one trustworthy person if secrecy is keeping the pattern strong.",
        "For serious addiction or withdrawal risk, seek qualified professional support rather than trying to manage it alone."
      ]
    ),
    topic(
      "faith_doubt","Faith & doubt",
      ["doubt","doubting","faith","dont believe","don't believe","is god real","god real","why god","angry with god","church hurt","lost faith","question god"],
      ["Mark 9:24","Psalm 13:1–2","James 1:5","John 20:24–29"],
      ["honesty","understanding","patience"],
      [
        "Questions and faith are not always opposites. Scripture itself contains people asking difficult questions.",
        "Doubt can come from intellectual questions, disappointment, suffering, church experiences, or several of these at once.",
        "You do not have to pretend certainty in order to investigate a question seriously."
      ],
      [
        "Try to identify the exact question underneath the general feeling of doubt.",
        "Separate a question about God from a harmful experience with a person or institution; both matter, but they may need different kinds of answers.",
        "For theological or historical questions, deeper study is more useful than a generic reassurance."
      ],
      [
        "God, I bring You my questions without pretending. Give me courage to seek truth carefully and patience with what I do not yet understand.",
        "Father, meet me in the gap between what I hoped for and what I have experienced. Help me ask honest questions without fear.",
        "God, if my faith is weak, help me seek truth with humility, wisdom, and honesty."
      ],
      [
        "Write the single hardest question you actually want answered.",
        "Use Ask Deeper for the theological or historical part instead of settling for a vague answer.",
        "If church hurt is involved, consider speaking with someone trustworthy outside the situation as well."
      ]
    ),
    topic(
      "gratitude","Gratitude & thanksgiving",
      ["thankful","grateful","gratitude","blessed","good news","answered prayer","celebrate","happy","joy"],
      ["1 Thessalonians 5:18","Psalm 100:4","James 1:17","Philippians 4:4"],
      ["gratitude","joy","generosity"],
      [
        "It is worth slowing down long enough to notice good news instead of immediately moving to the next problem.",
        "Gratitude becomes more concrete when you name exactly what you received or experienced.",
        "Joy can be received without needing to feel guilty that other parts of life are still unfinished."
      ],
      [
        "Name what happened, who contributed, and what you want to remember from this moment.",
        "Consider whether gratitude can become generosity, encouragement, or a thank-you to another person.",
        "Store this moment in your journal so difficult days do not become the only days you remember."
      ],
      [
        "God, thank You for this good gift. Help me receive it with humility, remember it with gratitude, and let it make me more generous toward others.",
        "Father, I am grateful for this moment. Keep me from rushing past it, and help me use what I have received well.",
        "God, thank You for the good I can see today. Let gratitude deepen my trust and my care for other people."
      ],
      [
        "Write one sentence in your journal about what you are grateful for.",
        "Thank the person who helped make this moment possible, if someone did.",
        "Choose one way to pass some of this good forward."
      ]
    )
  ];

  const emotionLexicon = {
    fear:["afraid","fear","scared","terrified","panic","worried","anxious","nervous"],
    sadness:["sad","crying","grief","grieving","heartbroken","down","empty"],
    anger:["angry","furious","rage","resentment","hate"],
    guilt:["guilty","shame","ashamed","regret","sorry"],
    loneliness:["lonely","alone","isolated","abandoned"],
    confusion:["confused","uncertain","dont know","don't know","lost","direction"],
    hope:["hope","hopeful","better","trust"],
    gratitude:["grateful","thankful","blessed","joy","happy"]
  };

  const intensityTerms = {
    high:["terrified","panic","desperate","overwhelmed","cant cope","can't cope","cant take","can't take","emergency","urgent","tonight","tomorrow","surgery","fired today","lost my job"],
    medium:["very","really","constantly","every day","all day","keep thinking","cant sleep","can't sleep","stressed","worried"]
  };

  const deepQuestionPatterns = [
    /\b(explain|interpret|context|historical|history|theology|theological|doctrine|doctrinal)\b/i,
    /\b(greek|hebrew|aramaic|manuscript|canon|trinity|trinitarian|predestination|eschatology)\b/i,
    /\bwho wrote\b/i,
    /\bwhen was .* written\b/i,
    /\bwhat does .* mean\b/i,
    /\bwhy did (jesus|paul|god|moses|peter)\b/i,
    /\bcompare .* (gospel|verse|passage|translation|testament)\b/i,
    /\bcontradict(ion|s)?\b/i
  ];

  const safetyPatterns = {
    selfHarm:[
      /\b(kill myself|end my life|take my life|want to die|wish i was dead|suicide|suicidal|hurt myself|self[- ]?harm)\b/i
    ],
    violence:[
      /\b(kill (him|her|them|someone)|hurt (him|her|them|someone)|attack (him|her|them|someone))\b/i
    ],
    abuse:[
      /\b(being abused|abusing me|hits me|hit me|hurts me|threatening me|unsafe at home|domestic violence)\b/i
    ]
  };

  window.ONEINTOONE_SCRIPTURE_DATA = {
    version: 1,
    topics,
    emotionLexicon,
    intensityTerms,
    deepQuestionPatterns,
    safetyPatterns,
    defaultTopic: {
      id:"general",
      label:"Prayer & reflection",
      verses:["Matthew 11:28","James 1:5","Psalm 55:22"],
      need:["peace","wisdom"],
      acknowledgements:[
        "You do not need perfect words to begin.",
        "What matters first is naming what is actually happening rather than trying to sound spiritual.",
        "You can bring this honestly into prayer and still take practical next steps."
      ],
      reflections:[
        "Separate what you know, what you feel, and what you need next. That can make a complicated burden easier to hold.",
        "Prayer can create enough space to respond deliberately instead of reacting only from pressure.",
        "You do not have to solve everything in one moment. Look for the next faithful and practical step."
      ],
      prayers:[
        "God, You know what I am carrying. Give me honesty, wisdom, and enough peace for the next step.",
        "Father, meet me in this situation. Help me see clearly, act responsibly, and entrust what I cannot control to You.",
        "God, receive what I do not know how to say. Give me wisdom for what belongs to me and peace about what does not."
      ],
      steps:[
        "Write the next action that is actually within your control.",
        "Name the biggest uncertainty in one sentence, then decide whether it needs action, information, or surrender.",
        "If the burden still feels tangled, use Lay It Down before returning to the decision."
      ],
      journey:""
    }
  };
})();