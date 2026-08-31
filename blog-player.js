/* DYNAMIC PODCAST & AUDIOBOOK PLAYER INJECTOR */
(function() {
  window.addEventListener('DOMContentLoaded', () => {
    // 1. Wrap article paragraphs in sensory blocks for sentence-by-sentence highlighting
    const articleBody = document.querySelector('.blog-content') || document.querySelector('main') || document.querySelector('.container');
    if (articleBody) {
      const children = Array.from(articleBody.children);
      children.forEach(el => {
        if (['P', 'H2', 'H3', 'BLOCKQUOTE'].includes(el.tagName) && !el.classList.contains('sensory-block')) {
          const wrapper = document.createElement('div');
          wrapper.className = 'sensory-block';
          el.parentNode.insertBefore(wrapper, el);
          wrapper.appendChild(el);
        }
      });
    }

    // 2. Inject CSS Styles for the Player and Highlighting
    const style = document.createElement('style');
    style.innerHTML = `
      .sensory-block {
        padding: 6px 10px;
        border-radius: 8px;
        transition: background 0.3s ease, transform 0.2s ease;
      }
      .sensory-block.active-speech {
        background: rgba(226, 183, 100, 0.18) !important;
        border-left: 3px solid #e2b764 !important;
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

  // 4. Audiobook Narration, Music, and Highlighting Engine
  const blogMusicAudio = new Audio('../blog-ambient.mp3');
  blogMusicAudio.loop = true;
  blogMusicAudio.volume = 0.22;
  let isPlaying = false;
  let activeUtterance = null;
  let blockElements = [];
  let currentBlockIndex = 0;

  function preprocessText(rawText) {
    if (!rawText) return "";
    let text = rawText.replace(/<[^>]*>/g, ' ');
    text = text.replace(/✝|📿|🕊️|📖|📜|🌅|✨|💔|🤝|💼|🧭|🌿|🛡️/g, '');
    text = text.replace(/\(?\b(\d?\s*[A-Za-z]+)\s+(\d+):(\d+(?:-\d+)?)\)?/g, (m, b, c, v) => `... ${b.trim()}, chapter ${c}, verse ${v}. ... `);
    text = text.replace(/[—–]/g, ', ').replace(/”|"/g, ' ... ').replace(/“/g, ' ');
    text = text.replace(/\.\s+/g, '. ... ').replace(/;\s+/g, '; ... ').replace(/:\s+/g, ': ... ');
    return text.replace(/\s+/g, ' ').trim();
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
    blockElements = Array.from(document.querySelectorAll('.sensory-block'));

    if (isPlaying) {
      speechSynthesis.cancel();
      blogMusicAudio.pause();
      isPlaying = false;
      if (btn) btn.innerHTML = "▶ Play Audio";
      if (status) status.textContent = "Paused";
      blockElements.forEach(el => el.classList.remove('active-speech'));
      return;
    }

    isPlaying = true;
    if (btn) btn.innerHTML = "⏸ Pause";
    if (status) status.textContent = "Narrating devotional...";

    try {
      blogMusicAudio.currentTime = 0;
      blogMusicAudio.play().catch(e => {});
    } catch(e) {}

    currentBlockIndex = 0;
    speakBlock(currentBlockIndex);
  };

  function speakBlock(index) {
    if (!isPlaying || index >= blockElements.length) {
      stopAudiobook();
      return;
    }

    blockElements.forEach(el => el.classList.remove('active-speech'));
    const currentEl = blockElements[index];
    currentEl.classList.add('active-speech');
    currentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const textToRead = preprocessText(currentEl.textContent || currentEl.innerText);
    activeUtterance = new SpeechSynthesisUtterance(textToRead);
    
    const voice = getSacredVoice();
    if (voice) activeUtterance.voice = voice;
    activeUtterance.rate = 0.84;
    activeUtterance.pitch = 0.78;

    activeUtterance.onend = () => {
      currentBlockIndex++;
      speakBlock(currentBlockIndex);
    };

    activeUtterance.onerror = () => {
      stopAudiobook();
    };

    speechSynthesis.speak(activeUtterance);
  }

  function stopAudiobook() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    blogMusicAudio.pause();
    isPlaying = false;
    const btn = document.getElementById("podPlayBtn");
    const status = document.getElementById("podStatus");
    if (btn) btn.innerHTML = "▶ Play Audio";
    if (status) status.textContent = "Finished";
    blockElements.forEach(el => el.classList.remove('active-speech'));
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && isPlaying) stopAudiobook();
  });
})();