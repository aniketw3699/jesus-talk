(() => {
  "use strict";

  const manifest = window.ONEINTOONE_BIBLE_MANIFEST;
  const memory = new Map();
  const MAX_MEMORY_BOOKS = 3;

  function normalizeBookName(name) {
    const value = String(name || "").trim().toLowerCase();
    if (value === "psalm") return "Psalms";
    const hit = manifest.books.find(function(book){ return book.name.toLowerCase() === value; });
    return hit ? hit.name : String(name || "").trim();
  }

  function getBook(name) {
    const canonical = normalizeBookName(name);
    return manifest.books.find(function(book){ return book.name === canonical; }) || null;
  }

  function sourceUrl(name) {
    const book = getBook(name);
    if (!book) throw new Error("Unknown Bible book: " + name);
    return manifest.sourceBase + book.slug + ".json";
  }

  function rememberBook(name, parsed) {
    if (memory.has(name)) memory.delete(name);
    memory.set(name, parsed);
    while (memory.size > MAX_MEMORY_BOOKS) {
      const oldest = memory.keys().next().value;
      memory.delete(oldest);
    }
  }

  function parseSource(raw) {
    const chapters = {};
    for (const item of Array.isArray(raw) ? raw : []) {
      if (!item || !item.chapterNumber || !item.verseNumber || typeof item.value !== "string") continue;
      if (item.type !== "paragraph text" && item.type !== "line text") continue;
      const chapter = Number(item.chapterNumber);
      const verse = Number(item.verseNumber);
      if (!chapters[chapter]) chapters[chapter] = {};
      chapters[chapter][verse] = ((chapters[chapter][verse] || "") + " " + item.value).replace(/\s+/g, " ").trim();
    }
    return chapters;
  }

  async function loadBook(name) {
    const book = getBook(name);
    if (!book) throw new Error("Unknown Bible book");
    if (memory.has(book.name)) {
      const parsed = memory.get(book.name);
      rememberBook(book.name, parsed);
      return parsed;
    }
    const response = await fetch(sourceUrl(book.name), { cache:"default" });
    if (!response.ok) throw new Error("Unable to load " + book.name);
    const raw = await response.json();
    const parsed = parseSource(raw);
    rememberBook(book.name, parsed);
    return parsed;
  }

  async function getChapter(name, chapter) {
    const parsed = await loadBook(name);
    const chapterMap = parsed[Number(chapter)] || {};
    return Object.keys(chapterMap)
      .map(Number)
      .sort(function(a,b){ return a-b; })
      .map(function(verse){ return { verse:verse, text:chapterMap[verse] }; });
  }

  function parseReference(reference) {
    const match = String(reference || "").trim().match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
    if (!match) return null;
    const book = normalizeBookName(match[1]);
    if (!getBook(book)) return null;
    return {
      book:book,
      chapter:Number(match[2]),
      startVerse:Number(match[3]),
      endVerse:Number(match[4] || match[3])
    };
  }

  async function getReference(reference) {
    const parsedRef = parseReference(reference);
    if (!parsedRef) return null;
    const verses = await getChapter(parsedRef.book, parsedRef.chapter);
    const selected = verses.filter(function(v){
      return v.verse >= parsedRef.startVerse && v.verse <= parsedRef.endVerse;
    });
    return {
      reference:reference,
      book:parsedRef.book,
      chapter:parsedRef.chapter,
      startVerse:parsedRef.startVerse,
      endVerse:parsedRef.endVerse,
      text:selected.map(function(v){ return v.text; }).join(" ")
    };
  }

  function normalizeSearch(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[’]/g, "'")
      .replace(/[^a-z0-9'\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  async function search(query, options) {
    const opts = options || {};
    const limit = Math.max(1, Math.min(50, Number(opts.limit) || 24));
    const direct = parseReference(query);
    if (direct) {
      const result = await getReference(query);
      return result ? [result] : [];
    }

    const clean = normalizeSearch(query);
    if (clean.length < 2) return [];
    const tokens = clean.split(" ").filter(function(t){ return t.length > 2; }).slice(0, 8);
    const results = [];

    for (let bookIndex = 0; bookIndex < manifest.books.length; bookIndex += 1) {
      const book = manifest.books[bookIndex];
      if (typeof opts.onProgress === "function") {
        opts.onProgress({ done:bookIndex, total:manifest.books.length, book:book.name });
      }

      let parsed;
      try {
        parsed = await loadBook(book.name);
      } catch (_) {
        continue;
      }

      for (const chapterKey of Object.keys(parsed)) {
        const chapter = Number(chapterKey);
        const verses = parsed[chapter];
        for (const verseKey of Object.keys(verses)) {
          const verse = Number(verseKey);
          const text = verses[verse];
          const normalized = normalizeSearch(text);
          let score = normalized.includes(clean) ? 12 : 0;
          for (const token of tokens) if (normalized.includes(token)) score += 1;
          if (score <= 0 || (tokens.length > 1 && score < Math.min(2, tokens.length))) continue;
          results.push({
            reference:book.name + " " + chapter + ":" + verse,
            book:book.name,
            chapter:chapter,
            startVerse:verse,
            endVerse:verse,
            text:text,
            score:score
          });
        }
      }

      results.sort(function(a,b){ return b.score - a.score; });
      if (results.length > limit * 4) results.length = limit * 2;
    }

    if (typeof opts.onProgress === "function") {
      opts.onProgress({ done:manifest.books.length, total:manifest.books.length, book:"" });
    }
    return results.sort(function(a,b){ return b.score - a.score; }).slice(0, limit);
  }

  async function topic(topicId) {
    const refs = manifest.topics[topicId] || [];
    const results = [];
    for (const ref of refs) {
      try {
        const hit = await getReference(ref);
        if (hit) results.push(hit);
      } catch (_) {}
    }
    return results;
  }

  window.ONEINTOONE_BIBLE = {
    version:"1.0.0",
    manifest:manifest,
    sourceUrl:sourceUrl,
    loadBook:loadBook,
    getChapter:getChapter,
    parseReference:parseReference,
    getReference:getReference,
    search:search,
    topic:topic
  };
})();