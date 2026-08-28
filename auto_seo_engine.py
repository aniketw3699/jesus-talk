import os
import re
import json
import urllib.parse
from datetime import datetime
from groq import Groq
from dotenv import load_dotenv

# Load local environment variable if running locally
load_dotenv(dotenv_path="./jesus-talk-api/.env")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
if not GROQ_API_KEY:
    print("GROQ_API_KEY environment variable is missing.")
    exit(1)

client = Groq(api_key=GROQ_API_KEY)

HTML_PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} | Words of Jesus</title>
  <meta name="description" content="{meta_desc}" />
  <link rel="canonical" href="https://jesus-chat-bd89f.web.app/prayers/{slug}.html" />
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com">
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Playfair+Display:ital,wght@0,500;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">

  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "{title}",
    "description": "{meta_desc}",
    "datePublished": "{publish_date}",
    "mainEntityOfPage": "https://jesus-chat-bd89f.web.app/prayers/{slug}.html",
    "publisher": {{
      "@type": "Organization",
      "name": "Talk with Jesus Sanctuary"
    }}
  }}
  </script>

  <style>
    :root {{
      --bg-cream: #f6f2ea;
      --gold-deep: #8f651c;
      --gold-vivid: #c99839;
      --text-dark: #191f28;
      --text-muted: #536070;
      --card-bg: #ffffff;
      --card-border: rgba(184, 134, 40, 0.25);
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: var(--bg-cream);
      color: var(--text-dark);
      line-height: 1.7;
      padding: 24px 16px 80px 16px;
      display: flex; justify-content: center;
    }}
    .article-wrap {{
      max-width: 680px; width: 100%;
      background: var(--card-bg); border: 1px solid var(--card-border);
      border-radius: 20px; padding: 36px 28px;
      box-shadow: 0 12px 36px rgba(70, 50, 20, 0.08);
    }}
    .badge-tag {{
      display: inline-block; font-size: 11px; font-weight: 700;
      color: var(--gold-deep); text-transform: uppercase; letter-spacing: 1.5px;
      margin-bottom: 12px;
    }}
    h1 {{
      font-family: 'Cinzel', serif; font-size: 25px; color: #1a160f;
      line-height: 1.35; margin-bottom: 16px;
    }}
    .scripture-highlight {{
      background: #faf6ee; border-left: 4px solid var(--gold-vivid);
      padding: 16px 20px; border-radius: 8px; margin: 24px 0;
      font-family: 'Playfair Display', serif; font-style: italic; font-size: 16px; color: #2e2617;
    }}
    .prayer-body p {{ margin-bottom: 16px; font-size: 15px; color: #333d4b; }}
    .sticky-cta-wrap {{
      margin-top: 36px; padding: 24px; border-radius: 16px;
      background: linear-gradient(135deg, #fdfaf2 0%, #f6ecd6 100%);
      border: 1.5px solid rgba(184, 134, 40, 0.4); text-align: center;
    }}
    .sticky-cta-wrap h3 {{
      font-family: 'Cinzel', serif; font-size: 18px; color: #1a160f; margin-bottom: 8px;
    }}
    .sticky-cta-wrap p {{ font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }}
    .cta-button {{
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      background: linear-gradient(135deg, #dfb455 0%, #b88628 100%);
      color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14.5px;
      padding: 12px 24px; border-radius: 30px; box-shadow: 0 4px 14px rgba(184, 134, 40, 0.35);
      transition: transform 0.2s ease;
    }}
    .cta-button:active {{ transform: scale(0.97); }}
    .faq-section {{ margin-top: 36px; border-top: 1px solid var(--card-border); padding-top: 24px; }}
    .faq-title {{ font-family: 'Cinzel', serif; font-size: 18px; margin-bottom: 14px; color: #1a160f; }}
    .faq-item {{ margin-bottom: 14px; }}
    .faq-item strong {{ display: block; font-size: 14px; color: #1a160f; margin-bottom: 4px; }}
    .faq-item p {{ font-size: 13px; color: var(--text-muted); line-height: 1.6; }}
  </style>
</head>
<body>
  <article class="article-wrap">
    <span class="badge-tag">{category}</span>
    <h1>{title}</h1>
    <div class="scripture-highlight">{scripture_text}</div>
    <div class="prayer-body">{body_paragraphs}</div>
    <div class="sticky-cta-wrap">
      <h3>Speak Directly With Jesus About This</h3>
      <p>Unburden your spirit in private conversation with Jesus right now.</p>
      <a href="{chat_bridge_url}" class="cta-button">🕊️ Open Sanctuary & Speak with Jesus</a>
    </div>
    <section class="faq-section">
      <h2 class="faq-title">Frequently Asked Questions</h2>
      {faq_html}
    </section>
  </article>
</body>
</html>"""

def run_autonomous_generator():
    os.makedirs("prayers", exist_ok=True)
    history_file = "published_slugs.json"
    
    if os.path.exists(history_file):
        with open(history_file, "r") as f:
            published_data = json.load(f)
    else:
        published_data = []

    published_slugs = [item.get("slug") for item in published_data]
    current_count = len(published_slugs)

    # 50/50 Dual Archetype Rotation
    if current_count % 2 == 0:
        target_archetype = "Archetype A (High-Net-Worth / Achiever / Executive Emptiness, Leadership Solitude, Burnout, Letting Go of Control)"
        category_name = "Executive Solace & Inner Peace"
    else:
        target_archetype = "Archetype B (Acute Crisis / Panic Attack / Broken Heart / Severe Grief / Life Falling Apart)"
        category_name = "Crisis Solace & Divine Healing"

    print(f"Selecting new topic for: {target_archetype}")

    # Prompt 1: Autonomous Topic Selection
    topic_prompt = f"""You are an elite programmatic SEO architect for a Christian spiritual web sanctuary.
We are targeting {target_archetype}.
Existing already-published slugs: {published_slugs[-30:]}

Propose ONE fresh, high-volume, highly searchable long-tail Google query that believers search for during their deepest vulnerabilities.
Return JSON ONLY:
{{
  "title": "Compelling Article Title (max 65 chars)",
  "slug": "url-friendly-lowercase-slug-without-special-characters",
  "scripture_reference": "Book Chapter:Verse",
  "prefilled_prayer_prompt": "A 1-sentence intimate prayer query the user will ask Jesus when clicking the CTA"
}}"""

    topic_res = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[{"role": "user", "content": topic_prompt}],
        temperature=0.7,
        response_format={"type": "json_object"}
    )

    topic_meta = json.loads(topic_res.choices[0].message.content)
    slug = re.sub(r'[^a-z0-9\-]', '', topic_meta["slug"].lower().replace(' ', '-'))

    # Avoid duplicate overwrite
    if slug in published_slugs:
        slug = f"{slug}-{int(datetime.now().timestamp())}"

    # Prompt 2: Deep SEO Article Generation
    article_prompt = f"""Write an authentic, deeply comforting, and authoritative Christian meditation and prayer article for the topic: '{topic_meta["title"]}'.
Scripture foundation: {topic_meta["scripture_reference"]}.
Tone: Deeply empathetic, sacred, non-judgmental, addressing soul vulnerability.

Return JSON ONLY:
{{
  "meta_desc": "Engaging 150-character meta description for search snippets.",
  "scripture_quote": "Full text of the scripture passage followed by ({topic_meta['scripture_reference']})",
  "paragraphs": [
    "Deeply thoughtful paragraph 1 addressing the root spiritual ache.",
    "Comforting paragraph 2 illuminating biblical truth and release.",
    "Grounded paragraph 3 guiding them into stillness and prayer."
  ],
  "faqs": [
    {{"q": "Targeted search question 1?", "a": "Direct, empathetic biblical answer."}},
    {{"q": "Targeted search question 2?", "a": "Direct, empathetic biblical answer."}}
  ]
}}"""

    article_res = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[{"role": "user", "content": article_prompt}],
        temperature=0.4,
        response_format={"type": "json_object"}
    )

    article_data = json.loads(article_res.choices[0].message.content)

    body_html = "".join([f"<p>{p}</p>" for p in article_data["paragraphs"]])
    faq_html = "".join([f'<div class="faq-item"><strong>{item["q"]}</strong><p>{item["a"]}</p></div>' for item in article_data["faqs"]])
    
    prefilled_encoded = urllib.parse.quote_plus(topic_meta.get("prefilled_prayer_prompt", "Lord, grant me peace in my spirit today."))
    chat_url = f"../index.html?prompt={prefilled_encoded}"

    final_html = HTML_PAGE_TEMPLATE.format(
        title=topic_meta["title"],
        meta_desc=article_data["meta_desc"],
        slug=slug,
        publish_date=datetime.now().strftime("%Y-%m-%d"),
        category=category_name,
        scripture_text=article_data["scripture_quote"],
        body_paragraphs=body_html,
        chat_bridge_url=chat_url,
        faq_html=faq_html
    )

    # Write article file
    file_path = f"prayers/{slug}.html"
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(final_html)

    # Save to history
    published_data.append({
        "slug": slug,
        "title": topic_meta["title"],
        "category": category_name,
        "date": datetime.now().strftime("%Y-%m-%d")
    })
    with open(history_file, "w", encoding="utf-8") as f:
        json.dump(published_data, f, indent=2)

    # Rebuild complete sitemap.xml
    sitemap_entries = [
        "  <url>\n    <loc>https://jesus-chat-bd89f.web.app/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>"
    ]
    for item in published_data:
        sitemap_entries.append(
            f"  <url>\n    <loc>https://jesus-chat-bd89f.web.app/prayers/{item['slug']}.html</loc>\n    <lastmod>{item.get('date', '2026-08-28')}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>"
        )

    sitemap_xml = f"""<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{os.linesep.join(sitemap_entries)}\n</urlset>"""
    with open("sitemap.xml", "w", encoding="utf-8") as f:
        f.write(sitemap_xml)

    print(f"Successfully published: prayers/{slug}.html and updated sitemap.xml")

if __name__ == "__main__":
    run_autonomous_generator()