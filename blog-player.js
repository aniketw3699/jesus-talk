/* ADVANCED WORD-BY-WORD AUDIOBOOK & PODCAST PLAYER INJECTOR */
(function() {
  window.addEventListener('DOMContentLoaded', () => {
    // 1. Target all distinct structural elements including badges and headings
    const selectors = '.badge, h1, .sec-h2, .body-p, .verse-text, .verse-ref, .step-h3, .step-p, .prayer-h3, .prayer-body, .faq-q, .faq-a';
    const textElements = document.querySelectorAll(selectors);
    
    textElements.forEach(el => {
      if (!el.closest('.audio-word-wrapper') && el.textContent.trim().length > 0) {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
        let node;
        const textNodes = [];
        while (node = walker.nextNode()) {
          textNodes.push(node);
        }

        textNodes.forEach(textNode => {
          const content = textNode.nodeValue;
          const words = content.split(/(\s+)/);
          const frag = document.createDocumentFragment();

          words.forEach(word => {
            if (word.trim().length > 0) {
              const span = document.createElement('span');
              span.className = 'audio-word';
              span.textContent = word;
              frag.appendChild(span);
            } else {
              frag.appendChild(document.createTextNode(word));
            }
          });
          textNode.parentNode.replaceChild(frag, textNode);
        });
      }
    });

    // 2. Inject CSS Styles for Word Highlighting & Floating Player
    const style = document.createElement('style');
    style.innerHTML = `
      .audio-word {
        transition: background 0.15s ease, color 0.15s ease;
        cursor: pointer;
        border-radius: 3px;
        padding: 0 1px;
      }
      .audio-word:hover {
        background: rgba(226, 183, 100, 0.25);
      }
      .audio-word.active-word {
        background: #e2b764 !important;
        color: #000 !important;
        font-weight: 600;
      }
      .podcast-bar {
        position: fixed; bottom: 0; left: 0; right: 0;
        background: rgba(15, 15, 18, 0.96); backdrop-filter: blur(12px);
        border-top: 1px solid rgba(226, 183, 100, 0.35);
        padding: 12px 20px; display: flex; align-items: center; justify-content: space-between;
        z-index: 1000; box-shadow: 0 -10px 30px rgba(0,0,0,0.6);
        max-width: 640px; margin: 0 auto; border-radius: 20px 20px 0 0;
      }
      .podcast-info { display: flex; flex-direction: column; }
      .podcast-title { font-size: 13px; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px; font-family: 'Cinzel', serif; }
      .podcast-status { font-size: 11px; color: #e2b764; }
      .podcast-controls { display: flex; gap: 12px; align-items: center; }
      .podcast-btn {
        background: linear-gradient(135deg, #dfb455 0%, #b88628 100%);
        border: none; color: #000; font-weight: 800; font-size: 12.5px;
        padding: 8px 18px; border-radius: 20px; cursor: pointer;
        display: inline-flex; align-items: center; gap: 6px;
        box-shadow: 0 4px 12px rgba(226, 183, 100, 0.3);
      }
      .podcast-btn:active { transform: scale(0.96); }
    `;
    document.head.appendChild(style);

    // 3. Inject Floating Podcast Bar HTML
    const pageTitle = document.querySelector('h1')?.textContent || document.title || "Sacred Devotional";
    const playerHtml = `
      <div class="podcast-bar">
        <div class="podcast-info">
          <span class="podcast-title">${pageTitle}</span>
          <span class="podcast-status" id="podStatus">Ready to listen</span>
        </div>
        <div class="podcast-controls">
          <button class="podcast-btn" id="podPlayBtn" onclick="toggleAudiobook()">
            ▶ Play Audio
          </button>
        </div>
      </div>
    `;
    const container = document.createElement('div');
    container.innerHTML = playerHtml;
    document.body.appendChild(container);
  });

  // 4. Audiobook Narration with Structural Pauses & Highlighting
  const blogMusicAudio = new Audio('../blog-ambient.mp3');
  blogMusicAudio.loop = true;
  blogMusicAudio.volume = 0.22;
  
  let isPlaying = false;
  let isPaused = false;
  let activeUtterance = null;
  let wordElements = [];
  let currentWordIndex = 0;
  let fullArticleText = "";
  let wordCharMap = [];

  function buildTextAndMap() {
    wordElements = Array.from(document.querySelectorAll('.audio-word'));
    fullArticleText = "";
    wordCharMap = [];

    // Group by parent block elements to inject natural pauses between structural line breaks
    const blockSelectors = '.badge, h1, .sec-h2, .body-p, .verse-text, .verse-ref, .step-h3, .step-p, .prayer-h3, .prayer-body, .faq-q, .faq-a';
    const blocks = document.querySelectorAll(blockSelectors);

    blocks.forEach(block => {
      const blockWords = block.querySelectorAll('.audio-word');
      blockWords.forEach(el => {
        const wordText = el.textContent;
        const startIndex = fullArticleText.length;
        fullArticleText += wordText + " ";
        const endIndex = fullArticleText.length;
        wordCharMap.push({ startIndex, endIndex, element: el, index: wordCharMap.length });
      });
      // Append a distinct pause/period break at the end of each block element (Badge, H1, H2, Paragraph)
      if (blockWords.length > 0) {
        fullArticleText = fullArticleText.trimEnd() + ". ";
      }
    });

    // Re-index wordElements to match wordCharMap exactly
    wordElements = wordCharMap.map(m => m.element);
  }

  function getSacredVoice() {
    const voices = window.speechSynthesis.getVoices();
    const english = voices.filter(v => v.lang && v.lang.startsWith('en'));
    const daniel = english.find(v => (v.name || '').toLowerCase().includes('daniel'));
    if (daniel) return daniel;
    const male = english.find(v => !['female','woman','girl','samantha','victoria','zira','karen'].some(f => (v.name||'').toLowerCase().includes(f)));
    return male || english[0] || voices[0];
  }

  window.toggleAudiobook = function() {
    if (!('speechSynthesis' in window)) {
      alert("Audiobook speech is not supported on this device.");
      return;
    }

    const btn = document.getElementById("podPlayBtn");
    const status = document.getElementById("podStatus");

    if (wordElements.length === 0) {
      buildTextAndMap();
    }

    if (isPlaying) {
      speechSynthesis.pause();
      blogMusicAudio.pause();
      isPlaying = false;
      isPaused = true;
      if (btn) btn.innerHTML = "▶ Resume";
      if (status) status.textContent = "Paused";
      return;
    }

    if (isPaused) {
      speechSynthesis.resume();
      try { blogMusicAudio.play().catch(e => {}); } catch(e) {}
      isPlaying = true;
      isPaused = false;
      if (btn) btn.innerHTML = "⏸ Pause";
      if (status) status.textContent = "Narrating devotional...";
      return;
    }

    startNarrationFrom(currentWordIndex);
  };

  function startNarrationFrom(startIndex) {
    if (wordElements.length === 0) buildTextAndMap();
    if (startIndex >= wordCharMap.length) {
      stopAudiobook();
      return;
    }

    currentWordIndex = startIndex;
    const targetMapObj = wordCharMap[currentWordIndex];
    if (!targetMapObj) return;

    const textToSpeak = fullArticleText.substring(targetMapObj.startIndex);

    activeUtterance = new SpeechSynthesisUtterance(textToSpeak);
    const voice = getSacredVoice();
    if (voice) activeUtterance.voice = voice;
    activeUtterance.rate = 0.84;
    activeUtterance.pitch = 0.78;

    activeUtterance.onboundary = (event) => {
      if (event.name === 'word') {
        const absoluteCharIndex = targetMapObj.startIndex + event.charIndex;
        const matched = wordCharMap.find(m => absoluteCharIndex >= m.startIndex && absoluteCharIndex < m.endIndex);
        if (matched) {
          currentWordIndex = matched.index;
          highlightWord(currentWordIndex);
        }
      }
    };

    activeUtterance.onstart = () => {
      isPlaying = true;
      isPaused = false;
      const btn = document.getElementById("podPlayBtn");
      const status = document.getElementById("podStatus");
      if (btn) btn.innerHTML = "⏸ Pause";
      if (status) status.textContent = "Narrating devotional...";
      
      try {
        blogMusicAudio.currentTime = 0;
        blogMusicAudio.play().catch(e => {});
      } catch(e) {}
    };

    activeUtterance.onend = () => {
      stopAudiobook();
    };

    activeUtterance.onerror = () => {
      stopAudiobook();
    };

    speechSynthesis.speak(activeUtterance);
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
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    blogMusicAudio.pause();
    isPlaying = false;
    isPaused = false;
    currentWordIndex = 0;
    const btn = document.getElementById("podPlayBtn");
    const status = document.getElementById("podStatus");
    if (btn) btn.innerHTML = "▶ Play Audio";
    if (status) status.textContent = "Finished";
    wordElements.forEach(el => el.classList.remove('active-word'));
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && isPlaying) {
      speechSynthesis.pause();
      blogMusicAudio.pause();
    }
  });
})();