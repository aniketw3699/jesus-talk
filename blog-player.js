/* ADVANCED WORD-BY-WORD AUDIOBOOK & CLEAN SCRIPTURE CADENCE ENGINE */
(function() {
  let cachedVoices = [];
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
        while (node = walker.nextNode()) {
          textNodes.push(node);
        }

        textNodes.forEach(textNode => {
          // Clean any escaped \n characters from DOM text
          const content = textNode.nodeValue.replace(/\\n/g, ' ');
          const words = content.split(/(\s+)/);
          const frag = document.createDocumentFragment();

          words.forEach(word => {
            if (word.trim().length > 0) {
              const span = document.createElement('span');
              span.className = 'audio-word';
              span.dataset.wordIndex = globalWordIndex++;
              span.textContent = word;
              span.title = "Click to play from here";
              
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
      .audio-word {
        transition: background 0.15s ease, color 0.15s ease;
        cursor: pointer;
        border-radius: 4px;
        padding: 1px 2px;
      }
      .audio-word:hover {
        background: rgba(226, 183, 100, 0.35);
        color: #e2b764;
      }
      .audio-word.active-word {
        background: #e2b764 !important;
        color: #000000 !important;
        font-weight: 700 !important;
        box-shadow: 0 0 8px rgba(226, 183, 100, 0.5);
      }
      .podcast-bar {
        position: fixed; bottom: 0; left: 0; right: 0;
        background: rgba(15, 15, 18, 0.97); backdrop-filter: blur(14px);
        border-top: 1.5px solid rgba(226, 183, 100, 0.4);
        padding: 12px 20px; display: flex; align-items: center; justify-content: space-between;
        z-index: 1000; box-shadow: 0 -10px 30px rgba(0,0,0,0.7);
        max-width: 640px; margin: 0 auto; border-radius: 20px 20px 0 0;
      }
      .podcast-info { display: flex; flex-direction: column; }
      .podcast-title { font-size: 13px; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px; font-family: 'Cinzel', serif; }
      .podcast-status { font-size: 11px; color: #e2b764; }
      .podcast-controls { display: flex; gap: 12px; align-items: center; }
      .podcast-btn {
        background: linear-gradient(135deg, #dfb455 0%, #b88628 100%);
        border: none; color: #000; font-weight: 800; font-size: 13px;
        padding: 8px 20px; border-radius: 20px; cursor: pointer;
        display: inline-flex; align-items: center; gap: 6px;
        box-shadow: 0 4px 14px rgba(226, 183, 100, 0.35);
      }
      .podcast-btn:active { transform: scale(0.96); }
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

  function cleanScriptureSpokenText(raw) {
    if (!raw) return "";
    let text = raw.replace(/\\n/g, ' ');

    text = text.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D—–]/g, '-');
    text = text.replace(/\([^\x00-\x7F]+\)/g, '');

    text = text.replace(/\b1\s+([A-Za-z]+)/g, 'First $1');
    text = text.replace(/\b2\s+([A-Za-z]+)/g, 'Second $1');
    text = text.replace(/\b3\s+([A-Za-z]+)/g, 'Third $1');

    text = text.replace(/(\d+)[:\.](\d+)\s*-\s*(\d+)/g, 'chapter $1, verses $2 to $3');
    text = text.replace(/(\d+)[:\.](\d+)/g, 'chapter $1, verse $2');

    // Remove quotes and symbols cleanly without ellipses
    text = text.replace(/["“”‘’'«»]/g, ' ');
    text = text.replace(/[\(\)\[\]\{\}]/g, ', ');
    text = text.replace(/\.{2,}/g, '. ');
    text = text.replace(/,{2,}/g, ', ');
    text = text.replace(/^[.,;:\s]+/, '');

    return text.replace(/\s+/g, ' ').trim();
  }

  function buildTextAndMap() {
    wordElements = Array.from(document.querySelectorAll('.audio-word'));
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

      if (blockWords.length > 0) {
        fullArticleText = fullArticleText.trimEnd() + ". ";
      }
    });

    wordElements = wordCharMap.map(m => m.element);
  }

  function getSacredVoice() {
    if (!cachedVoices || cachedVoices.length === 0) {
      loadVoices();
    }
    const englishVoices = cachedVoices.filter(v => v.lang && (v.lang.startsWith('en') || v.lang.startsWith('eng')));

    const danielVoice = englishVoices.find(v => {
      const name = (v.name || '').toLowerCase();
      const uri = (v.voiceURI || '').toLowerCase();
      return (name.includes('daniel') || uri.includes('daniel')) && !name.includes('female');
    });
    if (danielVoice) return danielVoice;

    const appleMale = englishVoices.find(v => {
      const name = (v.name || '').toLowerCase();
      return (name.includes('oliver') || name.includes('arthur') || name.includes('george') || name.includes('rishi')) && !name.includes('female');
    });
    if (appleMale) return appleMale;

    const androidMale = englishVoices.find(v => {
      const name = (v.name || '').toLowerCase();
      return name.includes('uk english male') || name.includes('male');
    });
    if (androidMale) return androidMale;

    return englishVoices[0] || cachedVoices[0] || null;
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

  window.jumpToWord = function(wordIdx) {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    blogMusicAudio.pause();
    currentWordIndex = wordIdx;
    isPaused = false;
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
    
    activeUtterance.rate = 0.80;
    activeUtterance.pitch = 0.80;

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