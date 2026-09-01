import os
import sys
import json
import re
from datetime import datetime, timezone
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
load_dotenv(dotenv_path="./.env")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
DOMAINS_URL = os.getenv("DOMAINS_URL", "https://jesus-chat-bd89f.web.app").rstrip("/")

client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

CONTENT_MODELS = [
    "llama-3.1-8b-instant",
    "llama-3.1-70b-versatile",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b"
]

def detect_deploy_root():
    for candidate in ["firebase.json", "jesus-talk-api/firebase.json", os.path.join("..", "firebase.json")]:
        if os.path.exists(candidate):
            try:
                with open(candidate, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                public_dir = cfg.get("hosting", {}).get("public", ".")
                return public_dir
            except Exception:
                pass
    return "."

DEPLOY_ROOT = detect_deploy_root()
BLOGS_DIR = os.path.join(DEPLOY_ROOT, "blogs")

INITIAL_SEO_TOPICS = [
    {"slug": "prayer-for-overwhelming-anxiety", "title": "Prayer for Overwhelming Anxiety & Racing Thoughts", "meta_desc": "A biblical guide and guided prayer to calm anxiety, guard your heart, and experience God's peace.", "primary_verse": "Philippians 4:6-7", "theme": "Overcoming Anxiety and Fear"},
    {"slug": "prayer-for-financial-breakthrough-and-peace", "title": "Prayer for Financial Breakthrough & Freedom from Worry", "meta_desc": "Biblical promises and guided reflection for releasing debt anxiety and trusting in divine provision.", "primary_verse": "Matthew 6:31-34", "theme": "Financial Trust and Divine Provision"},
    {"slug": "prayer-for-grief-and-broken-heart", "title": "Prayer for Comfort in Grief, Loss, and Heartbreak", "meta_desc": "Find healing in the presence of Jesus when walking through sorrow, bereavement, and heavy grief.", "primary_verse": "Psalm 34:18", "theme": "Comfort in Sorrow and Grief"},
    {"slug": "prayer-for-restoring-marriage-and-relationships", "title": "Prayer for Healing Broken Relationships & Marriage", "meta_desc": "Biblical exegesis and prayers for releasing resentment, restoring intimacy, and choosing forgiveness.", "primary_verse": "Colossians 3:13", "theme": "Restoration and Forgiveness"},
    {"slug": "prayer-for-peaceful-sleep-and-insomnia", "title": "Bedtime Prayer for Peaceful Sleep & Quieting Night Anxiety", "meta_desc": "A calming evening devotional to release the burdens of the day and rest securely in God's keeping.", "primary_verse": "Psalm 4:8", "theme": "Nighttime Peace and Rest"},
    {"slug": "prayer-for-guidance-and-life-direction", "title": "Prayer for Clarity, Wisdom, and God's Direction", "meta_desc": "Scripture-anchored reflection for discerning God's will when facing important life and career decisions.", "primary_verse": "Proverbs 3:5-6", "theme": "Divine Guidance and Clarity"},
    {"slug": "prayer-for-healing-when-you-feel-broken", "title": "Prayer for Healing When You Feel Broken Inside", "meta_desc": "A scripture-anchored prayer and reflection for emotional healing, restoration, and God's gentle care.", "primary_verse": "Jeremiah 17:14", "theme": "Healing and Restoration"},
    {"slug": "prayer-to-release-fear-about-the-future", "title": "Prayer to Release Fear About the Future", "meta_desc": "Biblical reassurance and guided prayer for surrendering tomorrow's worries into God's faithful hands.", "primary_verse": "Isaiah 41:10", "theme": "Fear and Surrender"},
    {"slug": "prayer-for-loneliness-and-feeling-forgotten", "title": "Prayer for Loneliness and When You Feel Forgotten", "meta_desc": "A comforting devotional for the lonely heart, anchored in God's promise to never leave nor forsake you.", "primary_verse": "Deuteronomy 31:6", "theme": "Loneliness and God's Presence"},
    {"slug": "prayer-for-strength-when-you-are-exhausted", "title": "Prayer for Strength When You Are Completely Exhausted", "meta_desc": "Scripture and guided prayer for burnout, fatigue, and finding supernatural rest in God's grace.", "primary_verse": "Matthew 11:28-30", "theme": "Strength and Rest"},
    {"slug": "prayer-for-forgiveness-of-self-and-past-mistakes", "title": "Prayer for Forgiving Yourself and Your Past Mistakes", "meta_desc": "Find freedom from guilt and shame through scripture-anchored reflection on God's complete forgiveness.", "primary_verse": "1 John 1:9", "theme": "Guilt, Shame and Grace"},
    {"slug": "morning-prayer-to-start-your-day-with-god", "title": "Morning Prayer to Start Your Day with God", "meta_desc": "A powerful morning devotional to dedicate your day, work, and family to God's guidance and peace.", "primary_verse": "Psalm 5:3", "theme": "Morning Devotion"}
]

STATIC_PAGES = [
    {"loc": f"{DOMAINS_URL}/", "priority": "1.0", "changefreq": "daily"},
    {"loc": f"{DOMAINS_URL}/bible.html", "priority": "0.9", "changefreq": "weekly"},
    {"loc": f"{DOMAINS_URL}/blessing.html", "priority": "0.8", "changefreq": "weekly"},
    {"loc": f"{DOMAINS_URL}/blogs.html", "priority": "0.9", "changefreq": "daily"},
    {"loc": f"{DOMAINS_URL}/privacy.html", "priority": "0.3", "changefreq": "monthly"},
    {"loc": f"{DOMAINS_URL}/terms.html", "priority": "0.3", "changefreq": "monthly"},
    {"loc": f"{DOMAINS_URL}/refund.html", "priority": "0.3", "changefreq": "monthly"}
]

SYSTEM_PROMPT = """You are an authoritative Christian theologian, biblical scholar, and pastoral counselor.
Generate a comprehensive, 1,200+ word devotional guide formatted strictly in valid JSON.

JSON Structure Requirements:
{
  "h1": "Title of the guide",
  "meta_description": "Search meta description under 155 characters",
  "anchor_verse_text": "The exact wording of the primary anchor verse requested.",
  "introduction": "3 in-depth paragraphs explaining the emotional struggle and the biblical path forward.",
  "exegesis_title": "Understanding the Scripture Context",
  "exegesis_body": "2 detailed paragraphs analyzing original biblical context and theological depth.",
  "steps_title": "3 Steps to Spiritual Breakthrough",
  "steps": [
    {"step_num": "Step 1", "title": "...", "desc": "..."},
    {"step_num": "Step 2", "title": "...", "desc": "..."},
    {"step_num": "Step 3", "title": "...", "desc": "..."}
  ],
  "prayers_title": "Guided Prayers for Your Walk",
  "prayers": [
    {"title": "Morning Awakening Prayer", "body": "..."},
    {"title": "Midday Surrender Prayer", "body": "..."},
    {"title": "Evening Peace Prayer", "body": "..."}
  ],
  "faqs": [
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."}
  ]
}
"""

def strip_thinking_tags(text: str) -> str:
    if "</think>" in text:
        text = text.split("</think>")[-1].strip()
    text = re.sub(r'<think>[\s\S]*?</think>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'<think>[\s\S]*$', '', text, flags=re.IGNORECASE)
    return text.strip()

def generate_article_content(topic):
    title = topic.get("title", "Sacred Devotional")
    theme = topic.get("theme", "Spiritual Peace")
    primary_verse = topic.get("primary_verse", "Psalm 23:1-3")
    
    user_prompt = f"Topic: {title}\nTheme: {theme}\nPrimary Anchor Verse: {primary_verse}"
    
    for model_name in CONTENT_MODELS:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.6,
                max_tokens=4096,
                response_format={"type": "json_object"}
            )
            raw = strip_thinking_tags(response.choices[0].message.content or "")
            data = json.loads(raw)
            print(f"  ✓ Generated with {model_name}")
            return data
        except Exception as e:
            print(f"  Model {model_name} failed: {e}")
            continue
    return None

def generate_dynamic_topic(existing_slugs):
    prompt = f"""You are a Christian SEO content strategist. Generate ONE new unique devotional topic that is NOT in this list: {existing_slugs[-15:]}.
Return strictly valid JSON with all 5 fields populated:
{{
  "slug": "kebab-case-slug-here",
  "title": "Inspiring Title with Scripture Focus",
  "meta_desc": "Meta description under 155 chars",
  "primary_verse": "Book Chapter:Verse",
  "theme": "Theme Name"
}}
"""
    for model_name in CONTENT_MODELS:
        try:
            res = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                response_format={"type": "json_object"}
            )
            data = json.loads(strip_thinking_tags(res.choices[0].message.content or ""))
            if data and data.get("slug"):
                if not data.get("theme"):
                    data["theme"] = "Christian Living & Peace"
                if not data.get("primary_verse"):
                    data["primary_verse"] = "Psalm 23:1"
                if not data.get("meta_desc"):
                    data["meta_desc"] = data.get("title", "Daily Scripture Devotional")
                return data
        except Exception:
            continue
    return None

def build_article_html(topic, data):
    slug = topic.get("slug", "daily-prayer")
    title = data.get("h1") or topic.get("title", "Sacred Devotional")
    meta_desc = data.get("meta_description") or topic.get("meta_desc", "A scripture-guided prayer and biblical reflection.")
    primary_verse = topic.get("primary_verse", "Scripture")
    
    canonical_url = f"{DOMAINS_URL}/blogs/{slug}.html"
    date_published = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    schema_graph = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Article",
                "@id": f"{canonical_url}#article",
                "isPartOf": {"@type": "WebSite", "@id": f"{DOMAINS_URL}/#website", "name": "You With Jesus", "url": DOMAINS_URL},
                "headline": title,
                "description": meta_desc,
                "mainEntityOfPage": canonical_url,
                "datePublished": date_published,
                "dateModified": date_published,
                "publisher": {"@type": "Organization", "name": "You With Jesus", "url": DOMAINS_URL},
                "author": {"@type": "Organization", "name": "You With Jesus Sanctuary"}
            },
            {
                "@type": "FAQPage",
                "@id": f"{canonical_url}#faq",
                "mainEntity": [
                    {"@type": "Question", "name": f.get("question", ""), "acceptedAnswer": {"@type": "Answer", "text": f.get("answer", "")}}
                    for f in data.get("faqs", [])
                ]
            }
        ]
    }

    anchor_verse_text = (data.get("anchor_verse_text") or "").strip()
    if len(anchor_verse_text) < 5:
        anchor_verse_text = "The Lord is near to all who call on him, to all who call on him in truth."

    steps_html = "".join([f'<div class="step-card"><h3 class="step-h3">{s.get("step_num", "")}: {s.get("title", "")}</h3><p class="step-p">{s.get("desc", "")}</p></div>' for s in data.get("steps", [])])
    prayers_html = "".join([f'<div class="prayer-card"><h3 class="prayer-h3">{p.get("title", "")}</h3><p class="prayer-body">{p.get("body", "")}</p></div>' for p in data.get("prayers", [])])
    faqs_html = "".join([f'<div class="faq-card"><h3 class="faq-q">{f.get("question", "")}</h3><p class="faq-a">{f.get("answer", "")}</p></div>' for f in data.get("faqs", [])])

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-HZPYCF859M"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag('js', new Date());
    gtag('config', 'G-HZPYCF859M');
  </script>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} | You With Jesus</title>
  <meta name="description" content="{meta_desc}" />
  <link rel="canonical" href="{canonical_url}" />
  <meta property="og:site_name" content="You With Jesus" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{meta_desc}" />
  <meta property="og:url" content="{canonical_url}" />
  <meta property="og:type" content="article" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Montserrat:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script type="application/ld+json">{json.dumps(schema_graph)}</script>
  <style>
    :root {{ --bg: #0d1117; --gold: #e2b764; --border: rgba(226, 183, 100, 0.35); --text: #f4f4f5; --muted: #a1a1aa; }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ background: var(--bg); color: var(--text); font-family: 'Plus Jakarta Sans', sans-serif; line-height: 1.7; padding-bottom: 90px; }}
    .nav-bar {{ padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; max-width: 800px; margin: 0 auto; }}
    .nav-brand {{ font-family: 'Cinzel', serif; font-size: 16px; font-weight: 700; color: var(--gold); text-decoration: none; }}
    .nav-cta {{ background: linear-gradient(135deg, #dfb455, #b88628); color: #000; padding: 6px 14px; border-radius: 14px; font-size: 12px; font-weight: 800; text-decoration: none; }}
    .content-wrap {{ max-width: 760px; margin: 32px auto; padding: 0 16px; }}
    .badge {{ font-size: 11px; font-weight: 800; color: var(--gold); letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px; display: inline-block; }}
    h1 {{ font-family: 'Cinzel', serif; font-size: 28px; color: #fff; line-height: 1.35; margin-bottom: 20px; }}
    .sec-h2 {{ font-family: 'Cinzel', serif; font-size: 20px; color: var(--gold); margin: 32px 0 14px 0; }}
    .body-p {{ font-size: 15px; color: #d4d4d8; margin-bottom: 16px; font-family: 'Montserrat', sans-serif; }}
    .verse-card {{ background: rgba(226, 183, 100, 0.08); border-left: 3px solid var(--gold); padding: 16px 18px; border-radius: 4px 12px 12px 4px; margin: 24px 0; }}
    .verse-text {{ font-size: 15px; font-style: italic; color: #fef08a; }}
    .verse-ref {{ font-size: 12px; font-weight: 700; color: var(--gold); margin-top: 6px; display: block; }}
    .step-card, .prayer-card, .faq-card {{ background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 14px; padding: 18px; margin-bottom: 14px; }}
    .step-h3, .prayer-h3, .faq-q {{ font-family: 'Cinzel', serif; font-size: 16px; color: #fff; margin-bottom: 8px; }}
    .step-p, .prayer-body, .faq-a {{ font-size: 14px; color: #a1a1aa; }}
    .cta-banner {{ background: linear-gradient(135deg, rgba(226, 183, 100, 0.15), rgba(226, 183, 100, 0.05)); border: 1.5px solid var(--gold); border-radius: 20px; padding: 28px 20px; text-align: center; margin: 40px 0; }}
    .cta-btn {{ display: inline-block; background: linear-gradient(135deg, #dfb455, #b88628); color: #000; font-weight: 800; padding: 12px 28px; border-radius: 20px; text-decoration: none; margin-top: 14px; }}
  </style>
</head>
<body>
  <nav class="nav-bar">
    <a href="../index.html" class="nav-brand">† YOU WITH JESUS</a>
    <a href="../index.html" class="nav-cta">Open Sanctuary</a>
  </nav>
  <main class="content-wrap">
    <span class="badge">SACRED PILLAR DEVOTIONAL</span>
    <h1>{title}</h1>
    <div class="verse-card">
      <p class="verse-text">“{anchor_verse_text}”</p>
      <span class="verse-ref">— {primary_verse}</span>
    </div>
    <p class="body-p">{data.get("introduction", "")}</p>
    <h2 class="sec-h2">{data.get("exegesis_title", "Biblical Wisdom")}</h2>
    <p class="body-p">{data.get("exegesis_body", "")}</p>
    <h2 class="sec-h2">{data.get("steps_title", "Pathway to Peace")}</h2>
    {steps_html}
    <h2 class="sec-h2">{data.get("prayers_title", "Prayers of the Heart")}</h2>
    {prayers_html}
    <section class="cta-banner">
      <h2 style="font-family: 'Cinzel', serif; font-size: 20px; color: #fff;">Bring Your Heart Directly to Jesus</h2>
      <p style="font-size: 13.5px; color: #d4d4d8; margin-top: 6px;">Speak your burdens, receive Scripture-guided comfort, and find rest.</p>
      <a href="../index.html" class="cta-btn">Begin Your Prayer Now →</a>
    </section>
    <h2 class="sec-h2">Frequently Asked Questions</h2>
    {faqs_html}
  </main>
  <script src="../blog-player.js"></script>
</body>
</html>
'''

def generate_unified_sitemap(created_slugs):
    urls = list(STATIC_PAGES)
    for slug in created_slugs:
        urls.append({"loc": f"{DOMAINS_URL}/blogs/{slug}.html", "priority": "0.8", "changefreq": "weekly"})
    sitemap_xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        sitemap_xml.append(f"  <url>\n    <loc>{u['loc']}</loc>\n    <changefreq>{u['changefreq']}</changefreq>\n    <priority>{u['priority']}</priority>\n  </url>")
    sitemap_xml.append('</urlset>')
    with open(os.path.join(DEPLOY_ROOT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write("\n".join(sitemap_xml))

def generate_blogs_index(all_topics):
    cards_html = ""
    for t in all_topics:
        slug = t.get("slug", "")
        out_path = os.path.join(BLOGS_DIR, f"{slug}.html")
        if not os.path.exists(out_path):
            continue
        theme = t.get("theme", "Devotional")
        title = t.get("title", "Sacred Reflection")
        meta_desc = t.get("meta_desc", "")
        cards_html += f'''
        <a href="blogs/{slug}.html" style="text-decoration:none; color:inherit;">
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(226,183,100,0.3); border-radius:16px; padding:20px; margin-bottom:14px;">
            <span style="font-size:10.5px; font-weight:800; color:#e2b764; text-transform:uppercase;">{theme}</span>
            <h3 style="font-family:'Cinzel',serif; font-size:17px; color:#fff; margin:6px 0;">{title}</h3>
            <p style="font-size:13px; color:#a1a1aa;">{meta_desc}</p>
          </div>
        </a>'''

    blogs_page = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sacred Devotional Guides & Prayers | You With Jesus</title>
  <meta name="description" content="Explore scripture-anchored prayer guides for anxiety, grief, healing, relationships, and financial peace." />
  <link rel="canonical" href="{DOMAINS_URL}/blogs.html" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body {{ background: #0d1117; color: #fff; font-family: 'Montserrat', sans-serif; padding: 24px 16px; }}
    .wrap {{ max-width: 680px; margin: 0 auto; }}
    h1 {{ font-family: 'Cinzel', serif; font-size: 24px; color: #e2b764; text-align: center; margin-bottom: 24px; }}
  </style>
</head>
<body>
  <div class="wrap">
    <div style="text-align:center; margin-bottom:16px;"><a href="index.html" style="color:#e2b764; text-decoration:none; font-size:12px; font-weight:700;">← Return to Sanctuary</a></div>
    <h1>Sacred Pillar Devotionals</h1>
    {cards_html}
  </div>
</body>
</html>'''
    with open(os.path.join(DEPLOY_ROOT, "blogs.html"), "w", encoding="utf-8") as f:
        f.write(blogs_page)

def main():
    batch_size = 2
    if "--batch" in sys.argv:
        try:
            batch_size = int(sys.argv[sys.argv.index("--batch") + 1])
        except Exception:
            batch_size = 2

    if not client:
        print("❌ GROQ_API_KEY not set.")
        return

    os.makedirs(BLOGS_DIR, exist_ok=True)

    topics_file = os.path.join(DEPLOY_ROOT, "topics.json")
    if os.path.exists(topics_file):
        try:
            with open(topics_file, "r", encoding="utf-8") as f:
                all_topics = json.load(f)
        except Exception:
            all_topics = list(INITIAL_SEO_TOPICS)
    else:
        all_topics = list(INITIAL_SEO_TOPICS)

    pending_topics = [
        t for t in all_topics 
        if t.get("slug") and not os.path.exists(os.path.join(BLOGS_DIR, f"{t['slug']}.html"))
    ]

    while len(pending_topics) < batch_size:
        existing_slugs = [t.get("slug", "") for t in all_topics if t.get("slug")]
        new_topic = generate_dynamic_topic(existing_slugs)
        if new_topic and new_topic.get("slug"):
            all_topics.append(new_topic)
            pending_topics.append(new_topic)
            with open(topics_file, "w", encoding="utf-8") as f:
                json.dump(all_topics, f, indent=2)
        else:
            break

    generated_this_run = 0
    for topic in pending_topics[:batch_size]:
        slug = topic.get("slug")
        if not slug:
            continue
        out_path = os.path.join(BLOGS_DIR, f"{slug}.html")
        print(f"Generating ({generated_this_run + 1}/{batch_size}): {topic.get('title', slug)}...")
        data = generate_article_content(topic)
        if data:
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(build_article_html(topic, data))
            generated_this_run += 1

    all_created_slugs = [
        f.replace(".html", "")
        for f in os.listdir(BLOGS_DIR)
        if f.endswith(".html")
    ]

    generate_blogs_index(all_topics)
    generate_unified_sitemap(all_created_slugs)
    print(f"✓ Run complete. Generated {generated_this_run} new articles. Total on disk: {len(all_created_slugs)}")

if __name__ == "__main__":
    main()