import os
import json
import re
from datetime import datetime
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("Missing GROQ_API_KEY environment variable.")

client = Groq(api_key=GROQ_API_KEY)

DOMAINS_URL = "https://jesus-chat-bd89f.web.app"
SLUGS_FILE = "published_slugs.json"
BLOGS_HUB_FILE = "blogs.html"
SITEMAP_FILE = "sitemap.xml"
PRAYERS_DIR = "prayers"

TOPIC_POOL = [
    {
        "keyword": "Prayer for peace of mind and clarity in chaos",
        "slug": "prayer-for-peace-of-mind-and-clarity-in-chaos",
        "category": "Inner Peace",
        "primary_verse": "Philippians 4:6-7"
    },
    {
        "keyword": "How to overcome overwhelming anxiety through scripture",
        "slug": "how-to-overcome-overwhelming-anxiety-through-scripture",
        "category": "Anxiety & Healing",
        "primary_verse": "1 Peter 5:7"
    },
    {
        "keyword": "What to pray when feeling completely exhausted and burned out",
        "slug": "prayer-for-deep-rest-when-completely-exhausted-and-burned-out",
        "category": "Restoration",
        "primary_verse": "Matthew 11:28-30"
    },
    {
        "keyword": "Finding divine purpose when feeling lost and uncertain about life",
        "slug": "finding-divine-purpose-when-feeling-lost-and-uncertain",
        "category": "Purpose & Direction",
        "primary_verse": "Jeremiah 29:11"
    },
    {
        "keyword": "A powerful prayer for financial breakthrough and release from debt anxiety",
        "slug": "prayer-for-financial-breakthrough-and-release-from-debt-anxiety",
        "category": "Financial Peace",
        "primary_verse": "Philippians 4:19"
    },
    {
        "keyword": "How to forgive someone who deeply hurt you when it feels impossible",
        "slug": "how-to-forgive-someone-who-deeply-hurt-you",
        "category": "Forgiveness & Freedom",
        "primary_verse": "Colossians 3:13"
    },
    {
        "keyword": "Night prayer for restful sleep and releasing heavy thoughts",
        "slug": "night-prayer-for-restful-sleep-and-releasing-heavy-thoughts",
        "category": "Night Prayers",
        "primary_verse": "Psalm 4:8"
    },
    {
        "keyword": "How to hear God's voice when everything feels quiet and distant",
        "slug": "how-to-hear-gods-voice-when-everything-feels-quiet",
        "category": "Spiritual Growth",
        "primary_verse": "1 Kings 19:11-12"
    },
    {
        "keyword": "Prayer for physical healing and emotional restoration",
        "slug": "prayer-for-physical-healing-and-emotional-restoration",
        "category": "Healing & Grace",
        "primary_verse": "Jeremiah 17:14"
    },
    {
        "keyword": "How to rebuild trust and love in broken relationships",
        "slug": "prayer-and-biblical-guide-to-rebuilding-broken-relationships",
        "category": "Love & Relationships",
        "primary_verse": "1 Corinthians 13:4-7"
    }
]

def load_published_slugs():
    if os.path.exists(SLUGS_FILE):
        try:
            with open(SLUGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_published_slugs(slugs):
    with open(SLUGS_FILE, "w", encoding="utf-8") as f:
        json.dump(slugs, f, indent=2)

def select_next_topic(published):
    for topic in TOPIC_POOL:
        if topic["slug"] not in published:
            return topic
    # If all published, create a timestamped fresh angle
    date_str = datetime.now().strftime("%Y-%m-%d")
    base = TOPIC_POOL[len(published) % len(TOPIC_POOL)]
    return {
        "keyword": f"{base['keyword']} (Spiritual Reflection {date_str})",
        "slug": f"{base['slug']}-{datetime.now().strftime('%m%d%H%M')}",
        "category": base["category"],
        "primary_verse": base["primary_verse"]
    }

def generate_full_article(topic):
    prompt = f"""
Write an exhaustive, deeply empathetic, comprehensive 1,200+ word Christian spiritual guide and prayer breakdown.

TOPIC: "{topic['keyword']}"
CATEGORY: "{topic['category']}"
ANCHOR SCRIPTURE: "{topic['primary_verse']}"

FORMAT INSTRUCTIONS:
Return STRICTLY raw valid JSON without markdown wrapping. Format:
{{
  "meta_title": "SEO Title (55-60 chars, compelling)",
  "meta_description": "Search snippet meta description (145-155 chars)",
  "h1": "Main Title",
  "read_time": "6 min read",
  "excerpt": "Compelling 2-sentence summary.",
  "sections": [
    {{
      "h2": "Conversational Question H2 (e.g. Why Does Anxiety Overwhelm the Spirit?)",
      "content": "Deep 250-word theological and practical exploration in multiple paragraphs."
    }},
    {{
      "h2": "Scriptural Anchor & Biblical Exegesis",
      "verse_quote": "Full text of {topic['primary_verse']}",
      "verse_ref": "{topic['primary_verse']}",
      "content": "Deep 250-word verse breakdown explaining the Hebrew/Greek context and modern application."
    }},
    {{
      "h2": "3-Step Spiritual Framework for Daily Practice",
      "steps": [
        {{"title": "Step 1: Surrender the Heavy Weight", "description": "100-word concrete spiritual discipline."}},
        {{"title": "Step 2: Anchor Your Thoughts in Truth", "description": "100-word scripture alignment practice."}},
        {{"title": "Step 3: Breathe in Divine Grace", "description": "100-word daily prayer habit."}}
      ]
    }},
    {{
      "h2": "3 Direct, Heartfelt Prayers for This Exact Struggle",
      "prayers": [
        {{"name": "1. The Morning Surrender Prayer", "text": "Deep 120-word heartfelt conversational prayer."}},
        {{"name": "2. The Midday Peace Restoration Prayer", "text": "Deep 120-word centering prayer."}},
        {{"name": "3. The Nighttime Release & Rest Prayer", "text": "Deep 120-word prayer to release worry into God's hands."}}
      ]
    }}
  ],
  "faq": [
    {{
      "question": "Conversational search query 1 regarding {topic['keyword']}?",
      "answer": "Detailed 75-word direct answer formatted for Google featured snippets."
    }},
    {{
      "question": "Conversational search query 2 regarding {topic['keyword']}?",
      "answer": "Detailed 75-word direct answer formatted for Google featured snippets."
    }},
    {{
      "question": "Conversational search query 3 regarding {topic['keyword']}?",
      "answer": "Detailed 75-word direct answer formatted for Google featured snippets."
    }},
    {{
      "question": "Conversational search query 4 regarding {topic['keyword']}?",
      "answer": "Detailed 75-word direct answer formatted for Google featured snippets."
    }}
  ]
}}
"""
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You are an expert theologian, spiritual mentor, and master SEO content strategist. You write thorough, compassionate, 1200+ word guides rich in practical wisdom and biblical depth."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=4096,
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)

def render_html_page(data, topic):
    now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    page_url = f"{DOMAINS_URL}/prayers/{topic['slug']}.html"

    # Build FAQ Schema
    faq_entities = []
    for item in data.get("faq", []):
        faq_entities.append({
            "@type": "Question",
            "name": item["question"],
            "acceptedAnswer": {
                "@type": "Answer",
                "text": item["answer"]
            }
        })

    schema_json = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Article",
                "@id": f"{page_url}#article",
                "headline": data.get("h1", topic["keyword"]),
                "description": data.get("meta_description"),
                "datePublished": now_iso,
                "dateModified": now_iso,
                "author": {
                    "@type": "Organization",
                    "name": "Jesus Talk Sanctuary"
                },
                "publisher": {
                    "@type": "Organization",
                    "name": "Jesus Talk",
                    "logo": {
                        "@type": "ImageObject",
                        "url": f"{DOMAINS_URL}/BG1.png"
                    }
                },
                "mainEntityOfPage": page_url
            },
            {
                "@type": "FAQPage",
                "@id": f"{page_url}#faq",
                "mainEntity": faq_entities
            }
        ]
    }

    # Render Sections HTML
    sections_html = ""
    for sec in data.get("sections", []):
        sections_html += f"<section class='article-sec'>\n<h2 class='sec-h2'>{sec.get('h2')}</h2>\n"
        if sec.get("verse_quote"):
            sections_html += f"""
            <div class='verse-box'>
                <p class='verse-text'>"{sec.get('verse_quote')}"</p>
                <span class='verse-ref'>— {sec.get('verse_ref')}</span>
            </div>
            """
        if sec.get("content"):
            paragraphs = sec.get("content").split("\n\n")
            for p in paragraphs:
                if p.strip():
                    sections_html += f"<p class='body-p'>{p.strip()}</p>\n"
        if sec.get("steps"):
            sections_html += "<div class='steps-grid'>\n"
            for st in sec.get("steps"):
                sections_html += f"""
                <div class='step-card'>
                    <h3 class='step-h3'>{st.get('title')}</h3>
                    <p class='step-p'>{st.get('description')}</p>
                </div>
                """
            sections_html += "</div>\n"
        if sec.get("prayers"):
            sections_html += "<div class='prayers-container'>\n"
            for pr in sec.get("prayers"):
                sections_html += f"""
                <div class='prayer-card'>
                    <h3 class='prayer-h3'>{pr.get('name')}</h3>
                    <p class='prayer-body'>{pr.get('text')}</p>
                </div>
                """
            sections_html += "</div>\n"
        sections_html += "</section>\n"

    # Render FAQ HTML
    faq_html = "<section class='article-sec faq-sec'>\n<h2 class='sec-h2'>Frequently Asked Questions</h2>\n"
    for faq_item in data.get("faq", []):
        faq_html += f"""
        <div class='faq-card'>
            <h3 class='faq-q'>{faq_item.get('question')}</h3>
            <p class='faq-a'>{faq_item.get('answer')}</p>
        </div>
        """
    faq_html += "</section>\n"

    template = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{data.get('meta_title', topic['keyword'])} | Jesus Talk</title>
    <meta name="description" content="{data.get('meta_description')}">
    <link rel="canonical" href="{page_url}">
    <meta property="og:title" content="{data.get('meta_title')}">
    <meta property="og:description" content="{data.get('meta_description')}">
    <meta property="og:url" content="{page_url}">
    <meta property="og:type" content="article">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
    <script type="application/ld+json">
    {json.dumps(schema_json, indent=2)}
    </script>
    <style>
        :root {{
            --bg: #09090b;
            --card-bg: rgba(255, 255, 255, 0.03);
            --border: rgba(255, 255, 255, 0.08);
            --gold: #e2b764;
            --gold-glow: rgba(226, 183, 100, 0.15);
            --text-primary: #f4f4f5;
            --text-secondary: #a1a1aa;
        }}
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            background-color: var(--bg);
            color: var(--text-primary);
            font-family: 'Plus Jakarta Sans', sans-serif;
            line-height: 1.8;
            padding: 24px 16px 80px;
        }}
        .container {{ max-width: 800px; margin: 0 auto; }}
        .nav-back {{ display: inline-flex; align-items: center; gap: 8px; color: var(--gold); text-decoration: none; font-size: 14px; margin-bottom: 32px; font-weight: 500; }}
        .badge {{ display: inline-block; padding: 4px 12px; border-radius: 999px; background: var(--gold-glow); color: var(--gold); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid rgba(226, 183, 100, 0.3); margin-bottom: 16px; }}
        h1 {{ font-family: 'Cinzel', serif; font-size: clamp(28px, 4vw, 40px); line-height: 1.25; margin-bottom: 16px; color: #fff; }}
        .meta-bar {{ display: flex; gap: 16px; color: var(--text-secondary); font-size: 13px; margin-bottom: 32px; border-bottom: 1px solid var(--border); padding-bottom: 16px; }}
        .article-sec {{ margin-bottom: 40px; }}
        .sec-h2 {{ font-family: 'Cinzel', serif; font-size: clamp(20px, 3vw, 26px); color: var(--gold); margin: 36px 0 16px; }}
        .body-p {{ font-size: 16px; color: var(--text-secondary); margin-bottom: 16px; }}
        .verse-box {{ background: var(--card-bg); border-left: 3px solid var(--gold); border-radius: 0 12px 12px 0; padding: 24px; margin: 24px 0; }}
        .verse-text {{ font-family: 'Cinzel', serif; font-size: 18px; color: #fff; font-style: italic; margin-bottom: 8px; }}
        .verse-ref {{ color: var(--gold); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }}
        .step-card, .prayer-card, .faq-card {{ background: var(--card-bg); border: 1px solid var(--border); border-radius: 14px; padding: 24px; margin-bottom: 16px; }}
        .step-h3, .prayer-h3, .faq-q {{ font-size: 18px; color: #fff; margin-bottom: 10px; }}
        .step-p, .prayer-body, .faq-a {{ font-size: 15px; color: var(--text-secondary); }}
        .cta-banner {{ background: linear-gradient(135deg, rgba(226,183,100,0.1) 0%, rgba(226,183,100,0.02) 100%); border: 1px solid rgba(226,183,100,0.3); border-radius: 16px; padding: 36px 24px; text-align: center; margin-top: 48px; }}
        .cta-h3 {{ font-family: 'Cinzel', serif; font-size: 24px; color: var(--gold); margin-bottom: 10px; }}
        .cta-p {{ color: var(--text-secondary); font-size: 15px; margin-bottom: 24px; max-width: 500px; margin-left: auto; margin-right: auto; }}
        .cta-btn {{ display: inline-flex; align-items: center; justify-content: center; padding: 14px 32px; background: var(--gold); color: #000; font-weight: 600; text-decoration: none; border-radius: 999px; transition: transform 0.2s; }}
        .cta-btn:hover {{ transform: scale(1.02); }}
    </style>
</head>
<body>
    <div class="container">
        <a href="../blogs.html" class="nav-back">← Sacred Archive</a>
        <span class="badge">{topic['category']}</span>
        <h1>{data.get('h1', topic['keyword'])}</h1>
        <div class="meta-bar">
            <span>Published on {datetime.now().strftime('%B %d, %Y')}</span>
            <span>•</span>
            <span>{data.get('read_time', '6 min read')}</span>
        </div>

        {sections_html}
        {faq_html}

        <div class="cta-banner">
            <h3 class="cta-h3">Speak With Jesus in Real-Time</h3>
            <p class="cta-p">Enter the sacred sanctuary and receive comforting, biblical guidance tailored directly to what weighs on your soul today.</p>
            <a href="../index.html" class="cta-btn">Enter Sacred Sanctuary</a>
        </div>
    </div>
</body>
</html>
"""
    return template

def update_blogs_hub(published_list):
    os.makedirs(PRAYERS_DIR, exist_ok=True)
    cards_html = ""
    for item in reversed(published_list):
        cards_html += f"""
        <article class="blog-card">
            <span class="blog-badge">{item.get('category', 'Devotional')}</span>
            <h2 class="blog-title"><a href="prayers/{item['slug']}.html">{item['title']}</a></h2>
            <p class="blog-excerpt">{item.get('excerpt', 'A biblical prayer guide and spiritual reflection.')}</p>
            <div class="blog-meta">
                <span>{item.get('date', 'Recent')}</span>
                <span>•</span>
                <span>{item.get('read_time', '6 min read')}</span>
            </div>
        </article>
        """

    hub_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sacred Blog Archive & Daily Prayer Guides | Jesus Talk</title>
    <meta name="description" content="Explore comprehensive Christian prayer guides, spiritual reflections, and biblical answers to life's deepest struggles.">
    <link rel="canonical" href="{DOMAINS_URL}/blogs.html">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
        :root {{
            --bg: #09090b;
            --card-bg: rgba(255, 255, 255, 0.03);
            --border: rgba(255, 255, 255, 0.08);
            --gold: #e2b764;
            --gold-glow: rgba(226, 183, 100, 0.15);
            --text-primary: #f4f4f5;
            --text-secondary: #a1a1aa;
        }}
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            background-color: var(--bg);
            color: var(--text-primary);
            font-family: 'Plus Jakarta Sans', sans-serif;
            line-height: 1.6;
            padding: 40px 16px 80px;
        }}
        .container {{ max-width: 900px; margin: 0 auto; }}
        .header {{ text-align: center; margin-bottom: 56px; }}
        .header h1 {{ font-family: 'Cinzel', serif; font-size: clamp(32px, 5vw, 44px); color: #fff; margin-bottom: 12px; }}
        .header p {{ color: var(--text-secondary); font-size: 16px; max-width: 540px; margin: 0 auto; }}
        .back-home {{ display: inline-flex; align-items: center; gap: 8px; color: var(--gold); text-decoration: none; font-size: 14px; margin-bottom: 32px; font-weight: 500; }}
        .blogs-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 24px; }}
        @media (max-width: 600px) {{ .blogs-grid {{ grid-template-columns: 1fr; }} }}
        .blog-card {{ background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 28px; transition: transform 0.2s, border-color 0.2s; display: flex; flex-direction: column; }}
        .blog-card:hover {{ transform: translateY(-3px); border-color: rgba(226, 183, 100, 0.4); }}
        .blog-badge {{ display: inline-block; align-self: flex-start; padding: 4px 10px; border-radius: 999px; background: var(--gold-glow); color: var(--gold); font-size: 11px; font-weight: 600; text-transform: uppercase; margin-bottom: 16px; border: 1px solid rgba(226, 183, 100, 0.2); }}
        .blog-title {{ font-family: 'Cinzel', serif; font-size: 20px; line-height: 1.35; margin-bottom: 12px; }}
        .blog-title a {{ color: #fff; text-decoration: none; transition: color 0.2s; }}
        .blog-title a:hover {{ color: var(--gold); }}
        .blog-excerpt {{ color: var(--text-secondary); font-size: 14px; line-height: 1.6; margin-bottom: 20px; flex-grow: 1; }}
        .blog-meta {{ display: flex; gap: 12px; color: #71717a; font-size: 12px; border-top: 1px solid var(--border); padding-top: 16px; }}
    </style>
</head>
<body>
    <div class="container">
        <a href="index.html" class="back-home">← Return to Sacred Sanctuary</a>
        <header class="header">
            <h1>Sacred Prayer Archive</h1>
            <p>Biblical reflections, heartfelt prayers, and scripture wisdom for life's deepest trials.</p>
        </header>
        <div class="blogs-grid">
            {cards_html}
        </div>
    </div>
</body>
</html>
"""
    with open(BLOGS_HUB_FILE, "w", encoding="utf-8") as f:
        f.write(hub_template)

def update_sitemap(published_list):
    urls = [
        f"""  <url>
    <loc>{DOMAINS_URL}/</loc>
    <lastmod>{datetime.utcnow().strftime('%Y-%m-%d')}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>""",
        f"""  <url>
    <loc>{DOMAINS_URL}/blogs.html</loc>
    <lastmod>{datetime.utcnow().strftime('%Y-%m-%d')}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>"""
    ]
    for item in published_list:
        urls.append(f"""  <url>
    <loc>{DOMAINS_URL}/prayers/{item['slug']}.html</loc>
    <lastmod>{datetime.utcnow().strftime('%Y-%m-%d')}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>""")

    sitemap_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{chr(10).join(urls)}
</urlset>
"""
    with open(SITEMAP_FILE, "w", encoding="utf-8") as f:
        f.write(sitemap_content)

def main():
    published = load_published_slugs()
    # Normalize existing format
    published_slug_list = [p['slug'] if isinstance(p, dict) else p for p in published]
    
    topic = select_next_topic(published_slug_list)
    print(f"Generating 1,200+ word SEO Prayer Guide for: '{topic['keyword']}'...")

    article_data = generate_full_article(topic)
    os.makedirs(PRAYERS_DIR, exist_ok=True)
    article_path = os.path.join(PRAYERS_DIR, f"{topic['slug']}.html")

    html_content = render_html_page(article_data, topic)
    with open(article_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    new_entry = {
        "slug": topic["slug"],
        "title": article_data.get("h1", topic["keyword"]),
        "excerpt": article_data.get("excerpt", topic["keyword"]),
        "category": topic["category"],
        "read_time": article_data.get("read_time", "6 min read"),
        "date": datetime.now().strftime("%B %d, %Y")
    }

    # Save as rich dictionary entries
    updated_published = [p for p in published if isinstance(p, dict)]
    updated_published.append(new_entry)
    save_published_slugs(updated_published)

    update_blogs_hub(updated_published)
    update_sitemap(updated_published)

    print(f"Successfully created: {article_path}")
    print("Updated blogs.html and sitemap.xml with FAQ Schema & Rich Subheadings.")

if __name__ == "__main__":
    main()