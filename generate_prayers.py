import os
import json
from datetime import datetime
from groq import Groq
from dotenv import load_dotenv

load_dotenv(dotenv_path="./jesus-talk-api/.env")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
if not GROQ_API_KEY:
    print("GROQ_API_KEY not found in .env. Please set it.")
    exit(1)

client = Groq(api_key=GROQ_API_KEY)

HTML_TEMPLATE = """<!DOCTYPE html>
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
    "datePublished": "2026-08-28",
    "mainEntityOfPage": "https://jesus-chat-bd89f.web.app/prayers/{slug}.html"
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
    }}
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
      <h3>Speak Your Heart in Direct Sanctuary</h3>
      <p>Bring your thoughts, prayers, and struggles to Jesus in complete privacy.</p>
      <a href="../index.html" class="cta-button">🕊️ Open Sanctuary & Speak with Jesus</a>
    </div>
    <section class="faq-section">
      <h2 class="faq-title">Frequently Asked Questions</h2>
      {faq_html}
    </section>
  </article>
</body>
</html>"""

def generate_articles():
    os.makedirs("prayers", exist_ok=True)
    with open("topics.json", "r") as f:
        topics = json.load(f)

    sitemap_urls = [
        "  <url>\n    <loc>https://jesus-chat-bd89f.web.app/</loc>\n    <lastmod>2026-08-28</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>"
    ]

    for topic in topics:
        slug = topic["slug"]
        print(f"Generating SEO article for: {topic['title']}...")

        prompt = f"""Write an authentic, deeply comforting, and authoritative 3-paragraph Christian meditation and prayer guide for the topic: '{topic['title']}'.
Key scripture context: {topic['scripture']}.
Include 2 insightful FAQs with questions and answers for Google searchers.

Return JSON only in this exact format:
{{
  "meta_desc": "A 150-character SEO description.",
  "scripture_quote": "Exact scripture verse text ({topic['scripture']})",
  "paragraphs": ["Paragraph 1 text", "Paragraph 2 text", "Paragraph 3 text"],
  "faqs": [
    {{"q": "Question 1?", "a": "Answer 1."}},
    {{"q": "Question 2?", "a": "Answer 2."}}
  ]
}}"""

        res = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            response_format={"type": "json_object"}
        )

        data = json.loads(res.choices[0].message.content)

        body_html = "".join([f"<p>{p}</p>" for p in data["paragraphs"]])
        faq_html = "".join([f'<div class="faq-item"><strong>{item["q"]}</strong><p>{item["a"]}</p></div>' for item in data["faqs"]])

        page_content = HTML_TEMPLATE.format(
            title=topic["title"],
            meta_desc=data["meta_desc"],
            slug=slug,
            category=topic["category"],
            scripture_text=data["scripture_quote"],
            body_paragraphs=body_html,
            faq_html=faq_html
        )

        with open(f"prayers/{slug}.html", "w") as out:
            out.write(page_content)

        sitemap_urls.append(
            f"  <url>\n    <loc>https://jesus-chat-bd89f.web.app/prayers/{slug}.html</loc>\n    <lastmod>2026-08-28</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>"
        )

    # Auto-generate sitemap.xml
    sitemap_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{os.linesep.join(sitemap_urls)}
</urlset>"""

    with open("sitemap.xml", "w") as sf:
        sf.write(sitemap_content)

    print("All SEO prayer articles and sitemap.xml generated successfully.")

if __name__ == "__main__":
    generate_articles()