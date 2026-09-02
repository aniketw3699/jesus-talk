/* WORD-BY-WORD AUDIOBOOK ENGINE WITH SCREEN WAKE-LOCK & HARDENED MOBILE TTS */
(function() {
  let cachedVoices = [];
  let wakeLock = null;
  let keepAliveTimer = null;

  async function requestScreenLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch (err) {
      console.log('WakeLock not supported or prevented:', err);
    }
  }

  function releaseScreenLock() {
    if (wakeLock !== null) {
      wakeLock.release().then(() => { wakeLock = null; }).catch(() => {});
    }
  }

  function startKeepAlive() {
    stopKeepAlive();
    keepAliveTimer = setInterval(() => {
      if (isPlaying && !isPaused && 'speechSynthesis' in window && speechSynthesis.speaking) {
        speechSynthesis.pause();
        speechSynthesis.resume();
      }
    }, 9000);
  }

  function stopKeepAlive() {
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
  }

  function loadVoices() {
    if ('speechSynthesis' in window) {
      cachedVoices = speechSynthesis.getVoices();
    }
  }
  loadVoices();
  if ('speechSynthesis' in window && speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
  }

  window.addEventListener('DOMContentLoaded', () => {
    const selectors = '.badge, h1, .sec-h2, .body-p, .verse-text, .verse-ref, .step-h3, .step-p, .prayer-h3, .prayer-body, .faq-q, .faq-a';
    const textElements = document.querySelectorAll(selectors);
    let globalWordIndex = 0;

    textElements.forEach(el => {
      if (!el.closest('.audio-word-wrapper') && el.textContent.trim().length > 0) {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
        let node;
        const textNodes = [];
        while (node = walker.nextNode()) textNodes.push(node);

        textNodes.forEach(textNode => {
          const content = textNode.nodeValue.replace(/\\n/g, ' ');
          const words = content.split(/(\s+)/);
          const frag = document.createDocumentFragment();

          words.forEach(word => {
            if (word.trim().length > 0) {
              const span = document.createElement('span');
              span.className = 'audio-word';
              span.dataset.wordIndex = globalWordIndex++;
              span.textContent = word;
              span.onclick = (e) => {
                e.stopPropagation();
                jumpToWord(parseInt(span.dataset.wordIndex, 10));
              };
              frag.appendChild(span);
            } else {
              frag.appendChild(document.createTextNode(word));
            }
          });
          textNode.parentNode.replaceChild(frag, textNode);
        });
      }
    });

    const style = document.createElement('style');
    style.innerHTML = `
      .audio-word { transition: background 0.15s ease, color 0.15s ease; cursor: pointer; border-radius: 4px; padding: 1px 2px; }
      .audio-word:hover { background: rgba(226, 183, 100, 0.35); color: #e2b764; }
      .audio-word.active-word { background: #e2b764 !important; color: #000000 !important; font-weight: 700 !important; box-shadow: 0 0 8px rgba(226, 183, 100, 0.5); }
      .podcast-bar { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(15, 15, 18, 0.97); backdrop-filter: blur(14px); border-top: 1.5px solid rgba(226, 183, 100, 0.4); padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; z-index: 1000; box-shadow: 0 -10px 30px rgba(0,0,0,0.7); max-width: 640px; margin: 0 auto; border-radius: 20px 20px 0 0; }
      .podcast-info { display: flex; flex-direction: column; }
      .podcast-title { font-size: 13px; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px; font-family: 'Cinzel', serif; }
      .podcast-status { font-size: 11px; color: #e2b764; }
      .podcast-controls { display: flex; gap: 12px; align-items: center; }
      .podcast-btn { background: linear-gradient(135deg, #dfb455 0%, #b88628 100%); border: none; color: #000; font-weight: 800; font-size: 13px; padding: 8px 20px; border-radius: 20px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(226, 183, 100, 0.35); }
    `;
    document.head.appendChild(style);

    const pageTitle = document.querySelector('h1')?.textContent || document.title || "Sacred Devotional";
    const playerHtml = `
      <div class="podcast-bar">
        <div class="podcast-info">
          <span class="podcast-title">${pageTitle}</span>
          <span class="podcast-status" id="podStatus">Ready to listen</span>
        </div>
        <div class="podcast-controls">
          <button class="podcast-btn" id="podPlayBtn" onclick="toggleAudiobook()">▶ Play Audio</button>
        </div>
      </div>
    `;
    const container = document.createElement('div');
    container.innerHTML = playerHtml;
    document.body.appendChild(container);
  });

  const blogMusicAudio = new Audio('../blog-ambient.mp3');
  blogMusicAudio.loop = true;
  blogMusicAudio.volume = 0.22;

  let isPlaying = false;
  let isPaused = false;
  let wordElements = [];
  let currentWordIndex = 0;
  let fullArticleText = "";
  let wordCharMap = [];

  function cleanScriptureSpokenText(raw) {
    if (!raw) return "";
    let text = raw.replace(/\\n/g, ' ');

    // Normalize curly apostrophes to straight single quote
    text = text.replace(/[\u2018\u2019\u201B\u2032']/g, "'");

    // Prevent TTS from pronouncing possessive 's' as letter "S"
    text = text.replace(/\bGod's\b/gi, 'Gods');
    text = text.replace(/\bLord's\b/gi, 'Lords');
    text = text.replace(/\bChrist's\b/gi, 'Christs');
    text = text.replace(/\bJesus'\b/gi, 'Jesus');

    // Strip quotation marks without breaking inner word apostrophes
    text = text.replace(/["“”«»]/g, '');
    text = text.replace(/^'+|'+$/g, '');

    // Prevent words from merging over dashes and hyphens
    text = text.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D—–]/g, ', ');

    // Colons and semicolons: give natural breathing pauses so sentences do not collide
    text = text.replace(/[:;]/g, ', ');

    // Strip non-standard parenthesis content
    text = text.replace(/\([^\x00-\x7F]+\)/g, '');

    // Book numbers
    text = text.replace(/\b1\s+([A-Za-z]+)/g, 'First $1');
    text = text.replace(/\b2\s+([A-Za-z]+)/g, 'Second $1');
    text = text.replace(/\b3\s+([A-Za-z]+)/g, 'Third $1');

    // Chapter & verse format
    text = text.replace(/(\d+)[:\.](\d+)\s*-\s*(\d+)/g, 'chapter $1, verses $2 to $3');
    text = text.replace(/(\d+)[:\.](\d+)/g, 'chapter $1, verse $2');

    // Structural braces to natural pauses
    text = text.replace(/[\(\)\[\]\{\}]/g, ', ');

    // Consolidate redundant punctuation marks
    text = text.replace(/\.{2,}/g, '. ');
    text = text.replace(/,{2,}/g, ', ');

    return text.replace(/\s+/g, ' ').trim();
  }

  function buildTextAndMap() {
    fullArticleText = "";
    wordCharMap = [];
    const blockSelectors = '.badge, h1, .sec-h2, .body-p, .verse-text, .verse-ref, .step-h3, .step-p, .prayer-h3, .prayer-body, .faq-q, .faq-a';
    const blocks = document.querySelectorAll(blockSelectors);

    blocks.forEach(block => {
      const blockWords = block.querySelectorAll('.audio-word');
      blockWords.forEach(el => {
        let rawWord = el.textContent || '';
        let spokenWord = cleanScriptureSpokenText(rawWord);
        const startIndex = fullArticleText.length;
        fullArticleText += spokenWord + " ";
        const endIndex = fullArticleText.length;
        wordCharMap.push({ startIndex, endIndex, element: el, index: wordCharMap.length });
      });
      // Add a deliberate pause between major paragraph sections
      if (blockWords.length > 0) fullArticleText = fullArticleText.trimEnd() + ".  ";
    });
    wordElements = wordCharMap.map(m => m.element);
  }

  function getSacredVoice() {
    if (!cachedVoices || cachedVoices.length === 0) loadVoices();
    const english = cachedVoices.filter(v => v.lang && (v.lang.startsWith('en') || v.lang.startsWith('eng')));
    const daniel = english.find(v => (v.name || '').toLowerCase().includes('daniel') && !v.name.toLowerCase().includes('female'));
    if (daniel) return daniel;
    const male = english.find(v => ['oliver', 'arthur', 'george', 'rishi'].some(n => (v.name || '').toLowerCase().includes(n)) && !v.name.toLowerCase().includes('female'));
    return male || english[0] || cachedVoices[0] || null;
  }

  window.toggleAudiobook = function() {
    if (!('speechSynthesis' in window)) return alert("Speech is not supported on this device.");
    const btn = document.getElementById("podPlayBtn");
    const status = document.getElementById("podStatus");
    if (wordElements.length === 0) buildTextAndMap();

    if (isPlaying) {
      speechSynthesis.pause();
      blogMusicAudio.pause();
      isPlaying = false;
      isPaused = true;
      stopKeepAlive();
      releaseScreenLock();
      if (btn) btn.innerHTML = "▶ Resume";
      if (status) status.textContent = "Paused";
      return;
    }

    if (isPaused) {
      speechSynthesis.resume();
      try { blogMusicAudio.play().catch(() => {}); } catch(e) {}
      isPlaying = true;
      isPaused = false;
      startKeepAlive();
      requestScreenLock();
      if (btn) btn.innerHTML = "⏸ Pause";
      if (status) status.textContent = "Narrating devotional...";
      return;
    }

    startNarrationFrom(currentWordIndex);
  };

  window.jumpToWord = function(wordIdx) {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    blogMusicAudio.pause();
    stopKeepAlive();
    currentWordIndex = wordIdx;
    isPaused = false;
    startNarrationFrom(currentWordIndex);
  };

  function startNarrationFrom(startIndex) {
    if (wordElements.length === 0) buildTextAndMap();
    if (startIndex >= wordCharMap.length) return stopAudiobook();

    currentWordIndex = startIndex;
    const target = wordCharMap[currentWordIndex];
    if (!target) return;

    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }

    // Bind utterance to window to protect against mobile GC cleanup
    window._sacredUtterance = new SpeechSynthesisUtterance(fullArticleText.substring(target.startIndex));
    const utterance = window._sacredUtterance;
    
    const voice = getSacredVoice();
    if (voice) utterance.voice = voice;
    
    // Slow, soothing pastoral rate with deliberate pauses
    utterance.rate = 0.77;
    utterance.pitch = 0.84;

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const absolute = target.startIndex + event.charIndex;
        const matched = wordCharMap.find(m => absolute >= m.startIndex && absolute < m.endIndex);
        if (matched) {
          currentWordIndex = matched.index;
          highlightWord(currentWordIndex);
        }
      }
    };

    utterance.onstart = () => {
      isPlaying = true;
      isPaused = false;
      requestScreenLock();
      startKeepAlive();
      const btn = document.getElementById("podPlayBtn");
      const status = document.getElementById("podStatus");
      if (btn) btn.innerHTML = "⏸ Pause";
      if (status) status.textContent = "Narrating devotional...";
      try { 
        blogMusicAudio.currentTime = 0; 
        blogMusicAudio.play().catch(() => {}); 
      } catch(e) {}
    };

    utterance.onend = () => {
      stopAudiobook();
    };

    utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') {
        return;
      }
      console.warn("Audiobook speech note:", e);
      stopAudiobook();
    };

    // Small delay ensures mobile speech synthesis engine initializes cleanly
    setTimeout(() => {
      speechSynthesis.speak(utterance);
    }, 40);
  }

  function highlightWord(idx) {
    wordElements.forEach(el => el.classList.remove('active-word'));
    const activeEl = wordElements[idx];
    if (activeEl) {
      activeEl.classList.add('active-word');
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function stopAudiobook() {
    stopKeepAlive();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    blogMusicAudio.pause();
    releaseScreenLock();
    isPlaying = false;
    isPaused = false;
    currentWordIndex = 0;
    const btn = document.getElementById("podPlayBtn");
    const status = document.getElementById("podStatus");
    if (btn) btn.innerHTML = "▶ Play Audio";
    if (status) status.textContent = "Finished";
    wordElements.forEach(el => el.classList.remove('active-word'));
  }
})();