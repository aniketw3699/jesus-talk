import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.env.QA_BASE_URL || "http://127.0.0.1:4173";
const OUT = process.env.QA_OUT || "visual-qa";
await fs.mkdir(OUT, { recursive:true });

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok:Boolean(ok), detail:String(detail || "") });
  console.log((ok ? "PASS" : "FAIL") + " " + name + (detail ? " — " + detail : ""));
}
function shotName(device, name) {
  return path.join(OUT, device + "-" + name + ".png");
}

const browser = await chromium.launch({ headless:true });

async function inspectViewport(device, viewport) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor:1,
    isMobile:viewport.width <= 500,
    hasTouch:viewport.width <= 500,
  });

  // Keep analytics/cloud traffic from polluting QA. Core local flows should not need them.
  await context.route("**/g/collect**", route => route.abort());
  await context.route("**/google-analytics.com/**", route => route.abort());
  await context.route("**/googletagmanager.com/**", route => route.abort());

  const page = await context.newPage();
  const consoleErrors = [];
  const failedResources = [];
  page.on("console", msg => {
    if (msg.type() === "error" && !/Failed to load resource/i.test(msg.text())) {
      consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", err => consoleErrors.push("PAGEERROR: " + err.message));
  page.on("response", response => {
    if (response.status() >= 400) {
      failedResources.push({ status:response.status(), url:response.url() });
    }
  });

  const response = await page.goto(BASE + "/", { waitUntil:"domcontentloaded", timeout:30000 });
  record(device + " homepage HTTP", response && response.status() === 200, response ? response.status() : "no response");
  await page.waitForTimeout(1200);

  // First-time onboarding is part of the real guest experience. Test it
  // separately, then enter the sanctuary before capturing other screens.
  const onboardingVisible = await page.evaluate(() => {
    const modal = document.getElementById("blessingModal");
    return !!modal && getComputedStyle(modal).display !== "none" &&
      /WHAT WEIGHS ON YOUR HEART/i.test(modal.innerText || "");
  });
  record(device + " onboarding step 1 visible", onboardingVisible);
  if (onboardingVisible) {
    const burdenVisibility = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll(".quiz-opt-btn"));
      const last = buttons[buttons.length - 1];
      const card = document.querySelector(".blessing-modal-card");
      if (!last || !card) return { count:buttons.length, visible:false };
      const r = last.getBoundingClientRect();
      const c = card.getBoundingClientRect();
      return {
        count:buttons.length,
        visible:r.top >= c.top && r.bottom <= c.bottom && r.bottom <= window.innerHeight
      };
    });
    record(device + " all 6 onboarding burdens are discoverable",
      burdenVisibility.count === 6 && burdenVisibility.visible,
      JSON.stringify(burdenVisibility));
  }
  await page.screenshot({ path:shotName(device,"onboarding-step1"), fullPage:true });

  if (onboardingVisible) {
    await page.evaluate(() => selectQuizBurden("Overwhelming Anxiety & Fear"));
    await page.waitForTimeout(100);
    const step2 = await page.evaluate(() => document.getElementById("blessingModal")?.innerText || "");
    record(device + " onboarding step 2 renders", /WHEN IS IT HEAVIEST/i.test(step2));
    await page.screenshot({ path:shotName(device,"onboarding-step2"), fullPage:true });

    await page.evaluate(() => selectQuizTime("late night racing thoughts"));
    await page.waitForTimeout(100);
    const step3 = await page.evaluate(() => document.getElementById("blessingModal")?.innerText || "");
    record(device + " onboarding step 3 renders", /WHAT DO YOU SEEK/i.test(step3));
    await page.screenshot({ path:shotName(device,"onboarding-step3"), fullPage:true });

    await page.evaluate(() => selectQuizNeed("Deep Peace & Stillness"));
    await page.waitForTimeout(100);
    const resultCard = await page.evaluate(() => document.getElementById("blessingModal")?.innerText || "");
    record(device + " onboarding result renders", /YOUR PROMISED REST/i.test(resultCard) && /anxiety/i.test(resultCard));
    await page.screenshot({ path:shotName(device,"onboarding-result"), fullPage:true });

    await page.evaluate(() => enterSanctuaryFromBlessing());
    await page.waitForTimeout(120);
  } else {
    await page.evaluate(() => closeBlessingModal && closeBlessingModal()).catch(()=>{});
  }

  const onboardingClosed = await page.evaluate(() => {
    const modal = document.getElementById("blessingModal");
    return !modal || getComputedStyle(modal).display === "none";
  });
  record(device + " onboarding closes before sanctuary use", onboardingClosed);

  const metrics = await page.evaluate(() => ({
    viewportWidth:window.innerWidth,
    bodyWidth:document.body.scrollWidth,
    docWidth:document.documentElement.scrollWidth,
    viewportHeight:window.innerHeight,
    docHeight:document.documentElement.scrollHeight,
    mobileHomeVisible:!!document.querySelector(".mobile-home-panel"),
    bottomNavVisible:!!document.querySelector(".mobile-bottom-nav"),
    localLabels:[
      document.getElementById("modeComfort")?.textContent || "",
      document.getElementById("modePrayer")?.textContent || "",
      document.getElementById("modeGuidance")?.textContent || "",
      document.getElementById("modeStudy")?.textContent || "",
    ],
  }));
  record(device + " no horizontal overflow", Math.max(metrics.bodyWidth, metrics.docWidth) <= metrics.viewportWidth + 2,
    JSON.stringify({viewport:metrics.viewportWidth,body:metrics.bodyWidth,doc:metrics.docWidth}));
  if (viewport.width <= 500) {
    record(device + " mobile home present", metrics.mobileHomeVisible);
    record(device + " bottom nav present", metrics.bottomNavVisible);
  }
  record(device + " Local/Cloud labels visible",
    metrics.localLabels.some(x => x.includes("Local")) && metrics.localLabels.some(x => x.includes("Cloud")),
    metrics.localLabels.join(" | "));

  await page.screenshot({ path:shotName(device,"home"), fullPage:true });

  // Local prayer flow.
  await page.evaluate(() => {
    const input = document.getElementById("messageInput");
    if (input) input.value = "I feel anxious about work and money and I do not know what to pray.";
    setPastoralMode("comfort");
    handleUserSubmit(new Event("submit"));
  });
  await page.waitForTimeout(800);
  const localPrayer = await page.evaluate(() => ({
    botCount:document.querySelectorAll(".msg-group.bot").length,
    status:document.getElementById("connectionStatus")?.textContent || document.body.innerText,
    text:Array.from(document.querySelectorAll(".bubble-bot")).slice(-1)[0]?.textContent || ""
  }));
  record(device + " local prayer renders", localPrayer.botCount > 0 && localPrayer.text.length > 20, localPrayer.text.slice(0,120));
  await page.screenshot({ path:shotName(device,"local-prayer"), fullPage:true });

  // Journal opens without auth.
  await page.evaluate(() => openJournalModal());
  await page.waitForTimeout(150);
  const journalState = await page.evaluate(() => ({
    display:getComputedStyle(document.getElementById("journalModal")).display,
    text:document.getElementById("journalModal")?.innerText || ""
  }));
  record(device + " journal opens without sign-in", journalState.display !== "none");
  record(device + " journal copy says local", /local journal|journal entries|local/i.test(journalState.text));
  await page.screenshot({ path:shotName(device,"journal"), fullPage:true });
  await page.evaluate(() => closeJournalModal());

  // Lay It Down before and after surrender.
  await page.evaluate(() => openConfessionalModal());
  await page.waitForTimeout(150);
  await page.fill("#confessionInput", "I am carrying a private fear about tomorrow.");
  await page.screenshot({ path:shotName(device,"lay-it-down-entry"), fullPage:true });
  await page.evaluate(() => executeSacredSurrender());
  await page.waitForTimeout(3300);
  const surrender = await page.evaluate(() => ({
    value:document.getElementById("confessionInput")?.value || "",
    peaceVisible:getComputedStyle(document.getElementById("surrenderedPeaceCard")).display !== "none",
    body:document.getElementById("confessionalModal")?.innerText || ""
  }));
  record(device + " Lay It Down clears text", surrender.value === "");
  record(device + " Lay It Down result renders", surrender.peaceVisible);
  await page.screenshot({ path:shotName(device,"lay-it-down-result"), fullPage:true });
  await page.evaluate(() => closeConfessionalModal());

  // Pray for someone.
  await page.evaluate(() => openIntercessoryModal());
  await page.fill("#lovedOneName", "Maria");
  await page.selectOption("#lovedOneNeed", "Physical Healing & Restoration");
  await page.fill("#lovedOneNote", "Surgery tomorrow");
  await page.evaluate(() => submitIntercessoryPrayer());
  await page.waitForTimeout(250);
  const intercessory = await page.evaluate(() => Array.from(document.querySelectorAll(".bubble-bot")).slice(-1)[0]?.textContent || "");
  record(device + " Pray for Someone renders locally", /Maria|Scripture anchor/i.test(intercessory), intercessory.slice(0,120));
  await page.screenshot({ path:shotName(device,"pray-for-someone"), fullPage:true });

  // Journeys.
  await page.evaluate(() => openJourneysModal());
  await page.waitForTimeout(120);
  await page.screenshot({ path:shotName(device,"journeys"), fullPage:true });
  const journeyText = await page.evaluate(() => document.getElementById("journeysModal")?.innerText || "");
  record(device + " journey choices render", /Anxiety|Forgiveness|Financial/i.test(journeyText));
  await page.evaluate(() => closeJourneysModal());

  // Pricing stays safely gated.
  await page.evaluate(() => openPlansModal());
  await page.waitForTimeout(120);
  const pricing = await page.evaluate(() => ({
    text:document.getElementById("plansModal")?.innerText || "",
    checkoutDisabled:document.getElementById("billingCheckoutBtn")?.disabled || false,
    checkoutText:document.getElementById("billingCheckoutBtn")?.textContent || ""
  }));
  record(device + " pricing shows Free Forever", /FREE FOREVER/i.test(pricing.text));
  record(device + " prelaunch checkout is unavailable", /coming soon|not live|unavailable|setup/i.test(pricing.text + " " + pricing.checkoutText) || pricing.checkoutDisabled,
    pricing.checkoutText);
  await page.screenshot({ path:shotName(device,"pricing"), fullPage:true });
  await page.evaluate(() => closePlansModal());

  // Bible page visual.
  const bibleResponse = await page.goto(BASE + "/bible.html", { waitUntil:"domcontentloaded", timeout:30000 });
  record(device + " Bible HTTP", bibleResponse && bibleResponse.status() === 200, bibleResponse ? bibleResponse.status() : "no response");
  await page.waitForTimeout(700);
  const bibleOverflow = await page.evaluate(() => ({
    vw:innerWidth,
    bw:document.body.scrollWidth,
    dw:document.documentElement.scrollWidth,
    text:document.body.innerText.slice(0,500)
  }));
  record(device + " Bible no horizontal overflow", Math.max(bibleOverflow.bw,bibleOverflow.dw) <= bibleOverflow.vw + 2,
    JSON.stringify({vw:bibleOverflow.vw,bw:bibleOverflow.bw,dw:bibleOverflow.dw}));
  record(device + " Bible identifies WEB/local reading", /World English Bible|WEB|offline/i.test(bibleOverflow.text), bibleOverflow.text.slice(0,150));
  await page.screenshot({ path:shotName(device,"bible"), fullPage:true });

  // Service worker + offline reload on localhost.
  await page.goto(BASE + "/", { waitUntil:"domcontentloaded", timeout:15000 }).catch(()=>{});
  await page.waitForTimeout(1200);
  const swReady = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return false;
    try {
      const ready = navigator.serviceWorker.ready.then(() => true).catch(() => false);
      const timeout = new Promise(resolve => setTimeout(() => resolve(false), 5000));
      return await Promise.race([ready, timeout]);
    } catch (_) { return false; }
  });
  record(device + " service worker ready", swReady);

  if (swReady) {
    await page.reload({ waitUntil:"domcontentloaded", timeout:15000 }).catch(()=>{});
    await page.waitForTimeout(500);
    await context.setOffline(true);
    const offlineReloadWorked = await page.reload({ waitUntil:"domcontentloaded", timeout:15000 })
      .then(() => true)
      .catch(() => false);
    await page.waitForTimeout(500);
    const offlineText = await page.evaluate(() => document.body.innerText.slice(0,1200)).catch(()=>"");
    record(device + " offline reload works", offlineReloadWorked);
    record(device + " offline state is understandable", /offline|local/i.test(offlineText), offlineText.slice(0,160));
    await page.screenshot({ path:shotName(device,"offline"), fullPage:true }).catch(()=>{});
    await context.setOffline(false);
  }

  const seriousErrors = consoleErrors.filter(x =>
    !/favicon|Firebase|Google|analytics|net::ERR|blocked/i.test(x)
  );
  const unexpectedFailedResources = failedResources.filter(item => {
    const url = item.url || "";
    return !(
      /\/__\/firebase\//i.test(url) ||
      /favicon\.ico/i.test(url) ||
      /google-analytics\.com|googletagmanager\.com/i.test(url)
    );
  });
  record(device + " no serious browser console errors", seriousErrors.length === 0, seriousErrors.join(" | ").slice(0,500));
  record(device + " no missing product resources", unexpectedFailedResources.length === 0,
    JSON.stringify(unexpectedFailedResources.slice(0,8)));

  await context.close();
}

await inspectViewport("iphone-390x844", { width:390, height:844 });
await inspectViewport("android-360x800", { width:360, height:800 });
await inspectViewport("large-mobile-412x915", { width:412, height:915 });
await inspectViewport("desktop-1366x768", { width:1366, height:768 });

const failed = results.filter(r => !r.ok);
await fs.writeFile(path.join(OUT,"report.json"), JSON.stringify({
  generatedAt:new Date().toISOString(),
  base:BASE,
  total:results.length,
  passed:results.length-failed.length,
  failed:failed.length,
  results
}, null, 2));

console.log("VISUAL_QA_SUMMARY", JSON.stringify({
  total:results.length,
  passed:results.length-failed.length,
  failed:failed.length
}));

await browser.close();

if (failed.length) {
  console.error("Visual/browser QA failures:");
  for (const item of failed) console.error(" -", item.name, item.detail || "");
  process.exit(1);
}
