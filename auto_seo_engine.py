import os
import json
import re
import datetime
from groq import Groq
from dotenv import load_dotenv

load_dotenv(dotenv_path="./jesus-talk-api/.env")
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
DOMAINS_URL = os.getenv("DOMAINS_URL", "[https://jesus-chat-bd89f.web.app](https://jesus-chat-bd89f.web.app)")

client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# Authoritative Pillar & Cluster Topics (High Search Intent)
SEO_TOPICS = [
    {
        "slug": "prayer-for-overwhelming-anxiety",
        "title": "Prayer for Overwhelming Anxiety & Racing Thoughts",
        "meta_desc": "A biblical guide and guided prayer to calm anxiety, guard your heart, and experience God's supernatural peace.",
        "primary_verse": "Philippians 4:6-7",
        "theme": "Overcoming Anxiety and Fear"
    },
    {
        "slug": "prayer-for-financial-breakthrough-and-peace",
        "title": "Prayer for Financial Breakthrough & Freedom from Worry",
        "meta_desc": "Biblical promises and guided reflection for releasing debt anxiety and trusting in divine provision.",
        "primary_verse": "Matthew 6:31-34",
        "theme": "Financial Trust and Divine Provision"
    },
    {
        "slug": "prayer-for-grief-and-broken-heart",
        "title": "Prayer for Comfort in Grief, Loss, and Heartbreak",
        "meta_desc": "Find healing in the presence of Jesus when walking through sorrow, bereavement, and heavy grief.",
        "primary_verse": "Psalm 34:18",
        "theme": "Comfort in Sorrow and Grief"
    },
    {
        "slug": "prayer-for-restoring-marriage-and-relationships",
        "title": "Prayer for Healing Broken Relationships & Marriage",
        "meta_desc": "Biblical exegesis and prayers for releasing resentment, restoring intimacy, and choosing forgiveness.",
        "primary_verse": "Colossians 3:13",
        "theme": "Restoration and Forgiveness"
    },
    {
        "slug": "prayer-for-peaceful-sleep-and-insomnia",
        "title": "Bedtime Prayer for Peaceful Sleep & Quieting Night Anxiety",
        "meta_desc": "A calming evening devotional to release the burdens of the day and rest securely in God's keeping.",
        "primary_verse": "Psalm 4:8",
        "theme": "Nighttime Peace and Rest"
    },
    {
        "slug": "prayer-for-guidance-and-life-direction",
        "title": "Prayer for Clarity, Wisdom, and God's Direction",
        "meta_desc": "Scripture-anchored reflection for discerning God's will when facing important life and career decisions.",
        "primary_verse": "Proverbs 3:5-6",
        "theme": "Divine Guidance and Clarity"
    }
]

STATIC_PAGES = [
    {"loc": f"{DOMAINS_URL}/", "priority": "1.0", "changefreq": "daily"},
    {"loc": f"{DOMAINS_URL}/index.html", "priority": "1.0", "changefreq": "daily"},
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
  "introduction": "3 in-depth paragraphs explaining the struggle and the biblical path forward.",
  "exegesis_title": "Understanding the Scripture Context",
  "exegesis_body": "2 detailed paragraphs analyzing original context and theological depth.",
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

def generate_article_content(topic):
    user_prompt = f"Topic: {topic['title']}\nTheme: {topic['theme']}\nPrimary Anchor Verse: {topic['primary_verse']}"
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.6,
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Error generating content for {topic['slug']}: {e}")
        return None

def build_article_html(topic, data):
    canonical_url = f"{DOMAINS_URL}/blogs/{topic['slug']}.html"
    
    # FAQ Schema Generation
    faq_schema = {
        "@context": "[https://schema.org](https://schema.org)",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": faq["question"],
                "acceptedAnswer": {"@type": "Answer", "text": faq["answer"]}
            } for faq in data.get("faqs", [])
        ]
    }

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <script async src="[https://www.googletagmanager.com/gtag/js?id=G-HZPYCF859M](https://www.googletagmanager.com/gtag/js?id=G-HZPYCF859M)"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag('js', new Date());
    gtag('config', 'G-HZPYCF859M');
  </script>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>{data.get('h1', topic['title'])} | You With Jesus</title>
  <meta name="description" content="{data.get('meta_description', topic['meta_desc'])}" />
  <link rel="canonical" href="{canonical_url}" />
  <meta property="og:title" content="{data.get('h1', topic['title'])}" />
  <meta property="og:description" content="{data.get('meta_description', topic['meta_desc'])}" />
  <meta property="og:url" content="{canonical_url}" />
  <meta property="og:type" content="article" />
  <link rel="preconnect" href="[https://fonts.googleapis.com](https://fonts.googleapis.com)">
  <link rel="preconnect" href="[https://fonts.gstatic.com](https://fonts.gstatic.com)">
  <link href="[https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Montserrat:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap](https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Montserrat:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap)" rel="stylesheet">
  <script type="application/ld+json">{json.dumps(faq_schema)}</script>
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
    <h1>{data.get('h1', topic['title'])}</h1>

    <div class="verse-card">
      <p class="verse-text">“Come to me, all who labor and are heavy laden, and I will give you rest.”</p>
      <span class="verse-ref">— {topic['primary_verse']}</span>
    </div>

    <p class="body-p">{data.get('introduction', '')}</p>

    <h2 class="sec-h2">{data.get('exegesis_title', 'Biblical Wisdom')}</h2>
    <p class="body-p">{data.get('exegesis_body', '')}</p>

    <h2 class="sec-h2">{data.get('steps_title', 'Pathway to Peace')}</h2>
    {''.join([f'''<div class="step-card"><h3 class="step-h3">{s["step_num"]}: {s["title"]}</h3><p class="step-p">{s["desc"]}</p></div>''' for s in data.get('steps', [])])}

    <h2 class="sec-h2">{data.get('prayers_title', 'Prayers of the Heart')}</h2>
    {''.join([f'''<div class="prayer-card"><h3 class="prayer-h3">{p["title"]}</h3><p class="prayer-body">{p["body"]}</p></div>''' for p in data.get('prayers', [])])}

    <section class="cta-banner">
      <h2 style="font-family: 'Cinzel', serif; font-size: 20px; color: #fff;">Bring Your Heart Directly to Jesus</h2>
      <p style="font-size: 13.5px; color: #d4d4d8; margin-top: 6px;">Speak your burdens, receive Scripture-guided comfort, and find rest.</p>
      <a href="../index.html" class="cta-btn">Begin Your Prayer Now →</a>
    </section>

    <h2 class="sec-h2">Frequently Asked Questions</h2>
    {''.join([f'''<div class="faq-card"><h3 class="faq-q">{f["question"]}</h3><p class="faq-a">{f["answer"]}</p></div>''' for f in data.get('faqs', [])])}
  </main>

  <script src="../blog-player.js"></script>
</body>
</html>
"""
    return html

def generate_unified_sitemap(created_slugs):
    urls = list(STATIC_PAGES)
    for slug in created_slugs:
        urls.append({
            "loc": f"{DOMAINS_URL}/blogs/{slug}.html",
            "priority": "0.8",
            "changefreq": "weekly"
        })

    sitemap_xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="[http://www.sitemaps.org/schemas/sitemap/0.9](http://www.sitemaps.org/schemas/sitemap/0.9)">']
    for u in urls:
        sitemap_xml.append(f"  <url>\n    <loc>{u['loc']}</loc>\n    <changefreq>{u['changefreq']}</changefreq>\n    <priority>{u['priority']}</priority>\n  </url>")
    sitemap_xml.append('</urlset>')

    with open("sitemap.xml", "w", encoding="utf-8") as f:
        f.write("\n".join(sitemap_xml))
    print("Unified sitemap.xml generated.")

def generate_blogs_index(topics):
    cards_html = []
    for t in topics:
        cards_html.append(f"""
        <a href="blogs/{t['slug']}.html" style="text-decoration:none; color:inherit;">
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(226,183,100,0.3); border-radius:16px; padding:20px; margin-bottom:14px; transition:transform 0.2s;">
            <span style="font-size:10.5px; font-weight:800; color:#e2b764; text-transform:uppercase;">{t['theme']}</span>
            <h3 style="font-family:'Cinzel',serif; font-size:17px; color:#fff; margin:6px 0;">{t['title']}</h3>
            <p style="font-size:13px; color:#a1a1aa;">{t['meta_desc']}</p>
          </div>
        </a>
        """)

    blogs_page = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sacred Devotional Guides & Prayers | You With Jesus</title>
  <meta name="description" content="Explore scripture-anchored prayer guides for anxiety, grief, healing, relationships, and financial peace." />
  <link rel="canonical" href="{DOMAINS_URL}/blogs.html" />
  <link href="[https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Montserrat:wght@400;500;600&display=swap](https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Montserrat:wght@400;500;600&display=swap)" rel="stylesheet">
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
    {''.join(cards_html)}
  </div>
</body>
</html>
"""
    with open("blogs.html", "w", encoding="utf-8") as f:
        f.write(blogs_page)
    print("blogs.html index generated.")

def main():
    if not os.path.exists("blogs"):
        os.makedirs("blogs")

    created = []
    for topic in SEO_TOPICS:
        file_path = f"blogs/{topic['slug']}.html"
        print(f"Generating pillar guide: {topic['title']}...")
        content_json = generate_article_content(topic)
        if content_json:
            html = build_article_html(topic, content_json)
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(html)
            created.append(topic['slug'])

    generate_blogs_index(SEO_TOPICS)
    generate_unified_sitemap(created)
    print("Pillar SEO generation complete.")

if __name__ == "__main__":
    main()