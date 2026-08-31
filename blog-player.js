/* ADVANCED WORD-BY-WORD AUDIOBOOK & PODCAST PLAYER INJECTOR */
(function() {
  window.addEventListener('DOMContentLoaded', () => {
    // 1. Wrap every single word in the article content into interactive audio-word spans
    const articleContainer = document.querySelector('article') || document.querySelector('.container') || document.querySelector('main');
    if (articleContainer) {
      const walker = document.createTreeWalker(articleContainer, NodeFilter.SHOW_TEXT, null, false);
      let node;
      const textNodes = [];
      while (node = walker.nextNode()) {
        textNodes.push(node);
      }

      let globalWordIndex = 0;
      textNodes.forEach(textNode => {
        // Skip script, style, and navigation links
        if (!textNode.parentNode.closest('script, style, .nav-back, .meta-bar, .podcast-bar')) {
          const content = textNode.nodeValue;
          // Split by whitespace while preserving spacing structure
          const words = content.split(/(\s+)/);
          const frag = document.createDocumentFragment();

          words.forEach(word => {
            if (word.trim().length > 0) {
              const span = document.createElement('span');
              span.className = 'audio-word';
              span.dataset.wordIndex = globalWordIndex++;
              span.textContent = word;
              span.title = "Click to play from here";
              span.onclick = () => jumpToWord(parseInt(span.dataset.wordIndex));
              frag.appendChild(span);
            } else {
              frag.appendChild(document.createTextNode(word));
            }
          });
          textNode.parentNode.replaceChild(frag, textNode);
        }
      });
    }

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

  // 4. Audiobook Narration, Precise Word Highlighting & Resume Engine
  const blogMusicAudio = new Audio('../blog-ambient.mp3');
  blogMusicAudio.loop = true;
  blogMusicAudio.volume = 0.22;
  
  let isPlaying = false;
  let isPaused = false;
  let activeUtterance = null;
  let wordElements = [];
  let currentWordIndex = 0;
  let fullArticleText = "";
  let wordCharMap = []; // Maps character start/end index in full text to word DOM elements

  function buildTextAndMap() {
    wordElements = Array.from(document.querySelectorAll('.audio-word'));
    fullArticleText = "";
    wordCharMap = [];

    wordElements.forEach((el, idx) => {
      const wordText = el.textContent;
      const startIndex = fullArticleText.length;
      fullArticleText += wordText + " ";
      const endIndex = fullArticleText.length;
      wordCharMap.push({ startIndex, endIndex, element: el, index: idx });
    });
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
      // Pause
      speechSynthesis.pause();
      blogMusicAudio.pause();
      isPlaying = false;
      isPaused = true;
      if (btn) btn.innerHTML = "▶ Resume";
      if (status) status.textContent = "Paused";
      return;
    }

    if (isPaused) {
      // Resume from exact paused word
      speechSynthesis.resume();
      try { blogMusicAudio.play().catch(e => {}); } catch(e) {}
      isPlaying = true;
      isPaused = false;
      if (btn) btn.innerHTML = "⏸ Pause";
      if (status) status.textContent = "Narrating devotional...";
      return;
    }

    // Start fresh from beginning or selected word
    startNarrationFrom(currentWordIndex);
  };

  window.jumpToWord = function(wordIdx) {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    blogMusicAudio.pause();
    currentWordIndex = wordIdx;
    startNarrationFrom(currentWordIndex);
  };

  function startNarrationFrom(startIndex) {
    if (wordElements.length === 0) buildTextAndMap();
    if (startIndex >= wordElements.length) {
      stopAudiobook();
      return;
    }

    currentWordIndex = startIndex;
    const targetMapObj = wordCharMap[currentWordIndex];
    if (!targetMapObj) return;

    // Slice text from the exact character position of the clicked/current word
    const textToSpeak = fullArticleText.substring(targetMapObj.startIndex);

    activeUtterance = new SpeechSynthesisUtterance(textToSpeak);
    const voice = getSacredVoice();
    if (voice) activeUtterance.voice = voice;
    activeUtterance.rate = 0.84;
    activeUtterance.pitch = 0.78;

    activeUtterance.onboundary = (event) => {
      if (event.name === 'word') {
        const absoluteCharIndex = targetMapObj.startIndex + event.charIndex;
        // Find corresponding word element
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