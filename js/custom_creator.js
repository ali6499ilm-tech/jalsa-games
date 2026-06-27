// Jalsa Custom Content Creator Coordinator
const CustomCreator = (() => {
  // 1. Data Access Methods
  const getUndercoverPairs = () => {
    return JSON.parse(localStorage.getItem('jalsa_custom_undercover') || '[]');
  };
  const saveUndercoverPairs = (pairs) => {
    localStorage.setItem('jalsa_custom_undercover', JSON.stringify(pairs));
  };

  const getWyrQuestions = () => {
    return JSON.parse(localStorage.getItem('jalsa_custom_wyr') || '[]');
  };
  const saveWyrQuestions = (questions) => {
    localStorage.setItem('jalsa_custom_wyr', JSON.stringify(questions));
  };

  const getTodCards = () => {
    return JSON.parse(localStorage.getItem('jalsa_custom_tod') || '[]');
  };
  const saveTodCards = (cards) => {
    localStorage.setItem('jalsa_custom_tod', JSON.stringify(cards));
  };

  const getCustomWords = () => {
    return JSON.parse(localStorage.getItem('jalsa_custom_words') || '[]');
  };
  const saveCustomWords = (words) => {
    localStorage.setItem('jalsa_custom_words', JSON.stringify(words));
  };

  // State
  let activeTab = 'undercover';
  let activeTodType = 'truth'; // or 'dare'

  // DOM elements cache
  let dom = {};

  const init = () => {
    // Cache DOM Elements
    dom = {
      tabs: document.querySelectorAll('.btn-tab'),
      tabContents: {
        undercover: document.getElementById('tab-undercover-content'),
        wyr: document.getElementById('tab-wyr-content'),
        tod: document.getElementById('tab-tod-content'),
        words: document.getElementById('tab-words-content')
      },
      // Undercover Elements
      inputUcCivilian: document.getElementById('input-uc-civilian'),
      inputUcUndercover: document.getElementById('input-uc-undercover'),
      btnAddUc: document.getElementById('btn-add-uc'),
      listUc: document.getElementById('list-uc'),
      // Wyr Elements
      inputWyrA: document.getElementById('input-wyr-a'),
      inputWyrB: document.getElementById('input-wyr-b'),
      btnAddWyr: document.getElementById('btn-add-wyr'),
      listWyr: document.getElementById('list-wyr'),
      // Tod Elements
      btnTodTypeTruth: document.getElementById('btn-tod-type-truth'),
      btnTodTypeDare: document.getElementById('btn-tod-type-dare'),
      inputTodText: document.getElementById('input-tod-text'),
      btnAddTod: document.getElementById('btn-add-tod'),
      listTod: document.getElementById('list-tod'),
      // Words Elements
      inputWordText: document.getElementById('input-word-text'),
      btnAddWord: document.getElementById('btn-add-word'),
      listWords: document.getElementById('list-words'),
      // Back Button
      btnBack: document.getElementById('btn-custom-creator-back')
    };

    setupEventListeners();
    renderAllLists();
  };

  const setupEventListeners = () => {
    // Tab switching
    dom.tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        if (typeof Sounds !== 'undefined' && typeof Sounds.playClick === 'function') {
          Sounds.playClick();
        }
        const tabName = btn.getAttribute('data-tab');
        switchTab(tabName);
      });
    });

    // Back button
    if (dom.btnBack) {
      dom.btnBack.addEventListener('click', () => {
        if (typeof Sounds !== 'undefined' && typeof Sounds.playClick === 'function') {
          Sounds.playClick();
        }
        // Navigate back to the previous screen (typically home or games list)
        if (window.history && window.history.back) {
          window.history.back();
        } else if (typeof App !== 'undefined' && typeof App.showScreen === 'function') {
          App.showScreen('screen-home');
        }
      });
    }

    // Undercover Add
    if (dom.btnAddUc) {
      dom.btnAddUc.addEventListener('click', () => {
        const civilian = dom.inputUcCivilian.value.trim();
        const undercover = dom.inputUcUndercover.value.trim();
        if (!civilian || !undercover) {
          if (typeof showCustomAlert === 'function') showCustomAlert("يرجى ملء كلمتي المواطن والجاسوس!");
          return;
        }
        const pairs = getUndercoverPairs();
        // Check uniqueness
        if (pairs.some(p => p.civilian.toLowerCase() === civilian.toLowerCase())) {
          if (typeof showCustomAlert === 'function') showCustomAlert("هذا الثنائي موجود بالفعل!");
          return;
        }
        pairs.push({ civilian, undercover });
        saveUndercoverPairs(pairs);
        dom.inputUcCivilian.value = '';
        dom.inputUcUndercover.value = '';
        if (typeof Sounds !== 'undefined' && typeof Sounds.playSuccess === 'function') {
          Sounds.playSuccess();
        }
        renderUndercoverList();
      });
    }

    // Wyr Add
    if (dom.btnAddWyr) {
      dom.btnAddWyr.addEventListener('click', () => {
        const a = dom.inputWyrA.value.trim();
        const b = dom.inputWyrB.value.trim();
        if (!a || !b) {
          if (typeof showCustomAlert === 'function') showCustomAlert("يرجى ملء كلا الخيارين!");
          return;
        }
        const list = getWyrQuestions();
        if (list.some(q => q.a.toLowerCase() === a.toLowerCase())) {
          if (typeof showCustomAlert === 'function') showCustomAlert("هذا الخيار موجود بالفعل!");
          return;
        }
        list.push({ a, b });
        saveWyrQuestions(list);
        dom.inputWyrA.value = '';
        dom.inputWyrB.value = '';
        if (typeof Sounds !== 'undefined' && typeof Sounds.playSuccess === 'function') {
          Sounds.playSuccess();
        }
        renderWyrList();
      });
    }

    // Tod Type Selector Toggle
    if (dom.btnTodTypeTruth) {
      dom.btnTodTypeTruth.addEventListener('click', () => {
        if (typeof Sounds !== 'undefined' && typeof Sounds.playClick === 'function') {
          Sounds.playClick();
        }
        activeTodType = 'truth';
        dom.btnTodTypeTruth.style.borderColor = '#00f2fe';
        dom.btnTodTypeTruth.style.color = '#00f2fe';
        dom.btnTodTypeTruth.style.background = 'rgba(0, 242, 254, 0.1)';

        dom.btnTodTypeDare.style.borderColor = 'rgba(255,255,255,0.2)';
        dom.btnTodTypeDare.style.color = '#fff';
        dom.btnTodTypeDare.style.background = 'none';
        dom.inputTodText.placeholder = 'اكتب سؤال الصراحة هنا...';
      });
    }

    if (dom.btnTodTypeDare) {
      dom.btnTodTypeDare.addEventListener('click', () => {
        if (typeof Sounds !== 'undefined' && typeof Sounds.playClick === 'function') {
          Sounds.playClick();
        }
        activeTodType = 'dare';
        dom.btnTodTypeDare.style.borderColor = '#ff5e62';
        dom.btnTodTypeDare.style.color = '#ff5e62';
        dom.btnTodTypeDare.style.background = 'rgba(255, 94, 98, 0.1)';

        dom.btnTodTypeTruth.style.borderColor = 'rgba(255,255,255,0.2)';
        dom.btnTodTypeTruth.style.color = '#fff';
        dom.btnTodTypeTruth.style.background = 'none';
        dom.inputTodText.placeholder = 'اكتب تحدي الجرأة هنا...';
      });
    }

    // Tod Add
    if (dom.btnAddTod) {
      dom.btnAddTod.addEventListener('click', () => {
        const text = dom.inputTodText.value.trim();
        if (!text) {
          if (typeof showCustomAlert === 'function') showCustomAlert("يرجى كتابة نص التحدي/السؤال!");
          return;
        }
        const list = getTodCards();
        if (list.some(c => c.text.toLowerCase() === text.toLowerCase() && c.type === activeTodType)) {
          if (typeof showCustomAlert === 'function') showCustomAlert("هذا الكرت موجود بالفعل!");
          return;
        }
        list.push({ type: activeTodType, text });
        saveTodCards(list);
        dom.inputTodText.value = '';
        if (typeof Sounds !== 'undefined' && typeof Sounds.playSuccess === 'function') {
          Sounds.playSuccess();
        }
        renderTodList();
      });
    }

    // Words Add
    if (dom.btnAddWord) {
      dom.btnAddWord.addEventListener('click', () => {
        const word = dom.inputWordText.value.trim();
        if (!word) {
          if (typeof showCustomAlert === 'function') showCustomAlert("يرجى كتابة الكلمة أولاً!");
          return;
        }
        const list = getCustomWords();
        if (list.includes(word)) {
          if (typeof showCustomAlert === 'function') showCustomAlert("هذه الكلمة مضافة بالفعل!");
          return;
        }
        list.push(word);
        saveCustomWords(list);
        dom.inputWordText.value = '';
        if (typeof Sounds !== 'undefined' && typeof Sounds.playSuccess === 'function') {
          Sounds.playSuccess();
        }
        renderWordsList();
      });
    }
  };

  const switchTab = (tabName) => {
    activeTab = tabName;
    
    // Toggle active tab buttons
    dom.tabs.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Toggle tab contents
    Object.keys(dom.tabContents).forEach(key => {
      if (key === tabName) {
        dom.tabContents[key].style.display = 'block';
      } else {
        dom.tabContents[key].style.display = 'none';
      }
    });
  };

  // Rendering Helper Methods
  const renderUndercoverList = () => {
    const list = getUndercoverPairs();
    if (list.length === 0) {
      dom.listUc.innerHTML = '<div style="text-align: center; padding: 15px; color: var(--text-muted); font-size: 0.9rem;">لم تقم بإضافة كروت مخصصة للجاسوس بعد.</div>';
      return;
    }
    dom.listUc.innerHTML = list.map((item, index) => `
      <div class="added-item-row" style="border-right: 3px solid var(--accent);">
        <span>👨‍✈️ ${item.civilian} / 🕵️‍♂️ ${item.undercover}</span>
        <button class="btn-delete-item" data-index="${index}">❌</button>
      </div>
    `).join('');

    dom.listUc.querySelectorAll('.btn-delete-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        const pairs = getUndercoverPairs();
        pairs.splice(idx, 1);
        saveUndercoverPairs(pairs);
        if (typeof Sounds !== 'undefined' && typeof Sounds.playFail === 'function') {
          Sounds.playFail();
        }
        renderUndercoverList();
      });
    });
  };

  const renderWyrList = () => {
    const list = getWyrQuestions();
    if (list.length === 0) {
      dom.listWyr.innerHTML = '<div style="text-align: center; padding: 15px; color: var(--text-muted); font-size: 0.9rem;">لم تقم بإضافة أسئلة "لو خيروك" بعد.</div>';
      return;
    }
    dom.listWyr.innerHTML = list.map((item, index) => `
      <div class="added-item-row" style="border-right: 3px solid #ff7043;">
        <span style="font-size: 0.85rem; line-height: 1.4;">أ: ${item.a}<br>ب: ${item.b}</span>
        <button class="btn-delete-item" data-index="${index}">❌</button>
      </div>
    `).join('');

    dom.listWyr.querySelectorAll('.btn-delete-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        const wyr = getWyrQuestions();
        wyr.splice(idx, 1);
        saveWyrQuestions(wyr);
        if (typeof Sounds !== 'undefined' && typeof Sounds.playFail === 'function') {
          Sounds.playFail();
        }
        renderWyrList();
      });
    });
  };

  const renderTodList = () => {
    const list = getTodCards();
    if (list.length === 0) {
      dom.listTod.innerHTML = '<div style="text-align: center; padding: 15px; color: var(--text-muted); font-size: 0.9rem;">لم تقم بإضافة كروت "صراحة أو تحدي" بعد.</div>';
      return;
    }
    dom.listTod.innerHTML = list.map((item, index) => `
      <div class="added-item-row" style="border-right: 3px solid ${item.type === 'truth' ? '#00f2fe' : '#ff5e62'}">
        <span>${item.type === 'truth' ? '💬 [صراحة]' : '🔥 [جرأة]'} ${item.text}</span>
        <button class="btn-delete-item" data-index="${index}">❌</button>
      </div>
    `).join('');

    dom.listTod.querySelectorAll('.btn-delete-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        const tod = getTodCards();
        tod.splice(idx, 1);
        saveTodCards(tod);
        if (typeof Sounds !== 'undefined' && typeof Sounds.playFail === 'function') {
          Sounds.playFail();
        }
        renderTodList();
      });
    });
  };

  const renderWordsList = () => {
    const list = getCustomWords();
    if (list.length === 0) {
      dom.listWords.innerHTML = '<div style="text-align: center; padding: 15px; color: var(--text-muted); font-size: 0.9rem;">لم تقم بإضافة كلمات عامة بعد.</div>';
      return;
    }
    dom.listWords.innerHTML = list.map((item, index) => `
      <div class="added-item-row" style="border-right: 3px solid var(--primary);">
        <span>🎭 ${item}</span>
        <button class="btn-delete-item" data-index="${index}">❌</button>
      </div>
    `).join('');

    dom.listWords.querySelectorAll('.btn-delete-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        const w = getCustomWords();
        w.splice(idx, 1);
        saveCustomWords(w);
        if (typeof Sounds !== 'undefined' && typeof Sounds.playFail === 'function') {
          Sounds.playFail();
        }
        renderWordsList();
      });
    });
  };

  const renderAllLists = () => {
    renderUndercoverList();
    renderWyrList();
    renderTodList();
    renderWordsList();
  };

  return {
    init,
    getUndercoverPairs,
    getWyrQuestions,
    getTodCards,
    getCustomWords
  };
})();

// Register globally
window.CustomCreator = CustomCreator;
