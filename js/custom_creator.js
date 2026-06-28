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
        if (!civilian) {
          if (typeof showCustomAlert === 'function') showCustomAlert("يرجى كتابة الكلمة السرية!");
          return;
        }
        const pairs = getUndercoverPairs();
        // Check uniqueness
        if (pairs.some(p => p.civilian.toLowerCase() === civilian.toLowerCase())) {
          if (typeof showCustomAlert === 'function') showCustomAlert("هذه الكلمة موجودة بالفعل!");
          return;
        }
        pairs.push({ civilian, undercover: undercover || "" });
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
        <span>🕵️‍♂️ ${item.civilian}</span>
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
    saveUndercoverPairs,
    getWyrQuestions,
    saveWyrQuestions,
    getTodCards,
    saveTodCards,
    getCustomWords,
    saveCustomWords
  };
})();

// Register globally
window.CustomCreator = CustomCreator;

// Quick Add Cards Modal Function
window.openQuickAddModal = (gameId, onModalClose) => {
  let title = "";
  let helperText = "";
  let btnText = "";
  let listTitle = "";
  let inputHtml = "";
  
  let getItems = () => [];
  let saveItems = (items) => {};
  let addItem = (modal) => {};
  let renderListItem = (item, index) => "";
  
  if (gameId === 'undercover') {
    title = "إضافة كروت للجاسوس 🕵️‍♂️";
    helperText = "سيتم إضافة الكلمة إلى قائمة كروتك الخاصة لتظهر للمواطنين.";
    btnText = "إضافة كلمة للجاسوس ➕";
    listTitle = "الكلمات المضافة حالياً:";
    inputHtml = `
      <input type="text" id="qa-input-civilian" class="input-custom" placeholder="الكلمة السرية (مثال: تفاح)" style="width: 100%; margin-bottom: 10px;">
    `;
    getItems = () => CustomCreator.getUndercoverPairs();
    saveItems = (items) => CustomCreator.saveUndercoverPairs(items);
    addItem = (modal) => {
      const civilian = modal.querySelector('#qa-input-civilian').value.trim();
      if (!civilian) {
        showCustomAlert("يرجى كتابة الكلمة السرية!");
        return false;
      }
      const items = getItems();
      if (items.some(i => i.civilian.toLowerCase() === civilian.toLowerCase())) {
        showCustomAlert("هذه الكلمة مضافة بالفعل!");
        return false;
      }
      items.push({ civilian, undercover: "" });
      saveItems(items);
      modal.querySelector('#qa-input-civilian').value = '';
      return true;
    };
    renderListItem = (item, index) => `
      <div class="added-item-row" style="border-right: 3px solid var(--accent); display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 8px 12px; border-radius: 8px; margin-bottom: 5px;">
        <span>🕵️‍♂️ ${item.civilian}</span>
        <button class="btn-delete-item" data-index="${index}" style="background: none; border: none; cursor: pointer; color: var(--danger); font-size: 1rem; padding: 2px;">❌</button>
      </div>
    `;
  }
  else if (gameId === 'would_you_rather') {
    title = "إضافة سؤال لو خيروك 🤔";
    helperText = "اكتب خيارين محيرين للمقارنة بينهما.";
    btnText = "إضافة السؤال ➕";
    listTitle = "الأسئلة المضافة حالياً:";
    inputHtml = `
      <input type="text" id="qa-input-wyr-a" class="input-custom" placeholder="الخيار الأول (أ) (مثال: تعيش في جزيرة)" style="width: 100%; margin-bottom: 10px;">
      <input type="text" id="qa-input-wyr-b" class="input-custom" placeholder="الخيار الثاني (ب) (مثال: تعيش في مدينة مزدحمة)" style="width: 100%; margin-bottom: 10px;">
    `;
    getItems = () => CustomCreator.getWyrQuestions();
    saveItems = (items) => CustomCreator.saveWyrQuestions(items);
    addItem = (modal) => {
      const a = modal.querySelector('#qa-input-wyr-a').value.trim();
      const b = modal.querySelector('#qa-input-wyr-b').value.trim();
      if (!a || !b) {
        showCustomAlert("يرجى ملء كلا الخيارين!");
        return false;
      }
      const items = getItems();
      if (items.some(i => i.a.toLowerCase() === a.toLowerCase())) {
        showCustomAlert("هذا السؤال مضاف بالفعل!");
        return false;
      }
      items.push({ a, b });
      saveItems(items);
      modal.querySelector('#qa-input-wyr-a').value = '';
      modal.querySelector('#qa-input-wyr-b').value = '';
      return true;
    };
    renderListItem = (item, index) => `
      <div class="added-item-row" style="border-right: 3px solid #ff7043; display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 8px 12px; border-radius: 8px; margin-bottom: 5px;">
        <span style="font-size: 0.85rem; line-height: 1.4; text-align: right;">أ: ${item.a}<br>ب: ${item.b}</span>
        <button class="btn-delete-item" data-index="${index}" style="background: none; border: none; cursor: pointer; color: var(--danger); font-size: 1rem; padding: 2px;">❌</button>
      </div>
    `;
  }
  else if (gameId === 'truth_or_dare') {
    title = "إضافة كرت صراحة أو تحدي 🍾";
    helperText = "اختر نوع الكرت (صراحة أو تحدي) ثم اكتب المحتوى.";
    btnText = "إضافة الكرت ➕";
    listTitle = "الكروت المضافة حالياً:";
    inputHtml = `
      <div style="display: flex; gap: 10px; margin-bottom: 10px; width: 100%;">
        <button class="btn btn-outline" id="qa-tod-truth" style="flex: 1; border-color: #00f2fe; color: #00f2fe; background: rgba(0, 242, 254, 0.1);">💬 صراحة</button>
        <button class="btn btn-outline" id="qa-tod-dare" style="flex: 1; border-color: rgba(255,255,255,0.2); color: #fff;">🔥 تحدي</button>
      </div>
      <input type="text" id="qa-input-tod-text" class="input-custom" placeholder="اكتب سؤال الصراحة هنا..." style="width: 100%; margin-bottom: 10px;">
    `;
    getItems = () => CustomCreator.getTodCards();
    saveItems = (items) => CustomCreator.saveTodCards(items);
    
    let selectedType = 'truth';
    addItem = (modal) => {
      const text = modal.querySelector('#qa-input-tod-text').value.trim();
      if (!text) {
        showCustomAlert("يرجى كتابة نص التحدي/السؤال!");
        return false;
      }
      const items = getItems();
      if (items.some(i => i.text.toLowerCase() === text.toLowerCase() && i.type === selectedType)) {
        showCustomAlert("هذا الكرت مضاف بالفعل!");
        return false;
      }
      items.push({ type: selectedType, text });
      saveItems(items);
      modal.querySelector('#qa-input-tod-text').value = '';
      return true;
    };
    renderListItem = (item, index) => `
      <div class="added-item-row" style="border-right: 3px solid ${item.type === 'truth' ? '#00f2fe' : '#ff5e62'}; display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 8px 12px; border-radius: 8px; margin-bottom: 5px;">
        <span>${item.type === 'truth' ? '💬 [صراحة]' : '🔥 [تحدي]'} ${item.text}</span>
        <button class="btn-delete-item" data-index="${index}" style="background: none; border: none; cursor: pointer; color: var(--danger); font-size: 1rem; padding: 2px;">❌</button>
      </div>
    `;
  }
  else {
    title = "إضافة كلمات مخصصة 🎭";
    helperText = "سيتم استخدام الكلمات المضافة في ألعاب الكلمات المخصصة.";
    btnText = "إضافة الكلمة ➕";
    listTitle = "الكلمات المضافة حالياً:";
    inputHtml = `
      <input type="text" id="qa-input-word" class="input-custom" placeholder="اكتب الكلمة/العبارة (مثال: سوبرمان)" style="width: 100%; margin-bottom: 10px;">
    `;
    getItems = () => CustomCreator.getCustomWords();
    saveItems = (items) => CustomCreator.saveCustomWords(items);
    addItem = (modal) => {
      const word = modal.querySelector('#qa-input-word').value.trim();
      if (!word) {
        showCustomAlert("يرجى كتابة الكلمة!");
        return false;
      }
      const items = getItems();
      if (items.includes(word)) {
        showCustomAlert("هذه الكلمة مضافة بالفعل!");
        return false;
      }
      items.push(word);
      saveItems(items);
      modal.querySelector('#qa-input-word').value = '';
      return true;
    };
    renderListItem = (item, index) => `
      <div class="added-item-row" style="border-right: 3px solid var(--primary); display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 8px 12px; border-radius: 8px; margin-bottom: 5px;">
        <span>🎭 ${item}</span>
        <button class="btn-delete-item" data-index="${index}" style="background: none; border: none; cursor: pointer; color: var(--danger); font-size: 1rem; padding: 2px;">❌</button>
      </div>
    `;
  }
  
  const overlay = document.createElement('div');
  overlay.className = 'custom-modal-overlay quick-add-modal animate-fade-in';
  overlay.style.zIndex = '1500';
  overlay.style.direction = 'rtl';
  
  overlay.innerHTML = `
    <div class="custom-modal-card animate-zoom-in" style="max-width: 420px; width: 90%; padding: 25px; max-height: 85vh; display: flex; flex-direction: column; text-align: right;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin: 0; color: #fff;">${title}</h3>
        <button id="qa-close-btn" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--text-muted); padding: 5px;">❌</button>
      </div>
      
      <div style="margin-bottom: 15px;">
        ${inputHtml}
      </div>
      
      <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: -5px; margin-bottom: 15px; line-height: 1.4;">${helperText}</p>
      
      <button class="btn btn-primary" id="qa-save-btn" style="width: 100%; margin-bottom: 20px; font-weight: 700; padding: 12px; border-radius: 12px;">
        <span>${btnText}</span>
      </button>
      
      <h4 style="font-size: 0.9rem; margin-bottom: 8px; color: var(--accent); font-weight: 700;">${listTitle}</h4>
      <div id="qa-items-list" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; min-height: 120px; max-height: 200px; padding-left: 5px; margin-bottom: 10px;">
        <!-- Items injected here -->
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  const renderList = () => {
    const listContainer = overlay.querySelector('#qa-items-list');
    const items = getItems();
    if (items.length === 0) {
      listContainer.innerHTML = '<div style="text-align: center; padding: 15px; color: var(--text-muted); font-size: 0.85rem;">لم تقم بإضافة أي كروت مخصصة بعد.</div>';
      return;
    }
    listContainer.innerHTML = items.map((item, idx) => renderListItem(item, idx)).join('');
    
    listContainer.querySelectorAll('.btn-delete-item').forEach(btn => {
      btn.addEventListener('click', () => {
        Sounds.playFail();
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        const currentItems = getItems();
        currentItems.splice(idx, 1);
        saveItems(currentItems);
        renderList();
      });
    });
  };
  
  renderList();
  
  overlay.querySelector('#qa-close-btn').addEventListener('click', () => {
    Sounds.playClick();
    overlay.remove();
    if (onModalClose) onModalClose();
  });
  
  overlay.querySelector('#qa-save-btn').addEventListener('click', () => {
    if (addItem(overlay)) {
      Sounds.playSuccess();
      renderList();
    }
  });
  
  if (gameId === 'truth_or_dare') {
    let selectedType = 'truth';
    const truthBtn = overlay.querySelector('#qa-tod-truth');
    const dareBtn = overlay.querySelector('#qa-tod-dare');
    const inputField = overlay.querySelector('#qa-input-tod-text');
    
    truthBtn.addEventListener('click', () => {
      Sounds.playClick();
      selectedType = 'truth';
      truthBtn.style.borderColor = '#00f2fe';
      truthBtn.style.color = '#00f2fe';
      truthBtn.style.background = 'rgba(0, 242, 254, 0.1)';
      
      dareBtn.style.borderColor = 'rgba(255,255,255,0.2)';
      dareBtn.style.color = '#fff';
      dareBtn.style.background = 'none';
      inputField.placeholder = 'اكتب سؤال الصراحة هنا...';
    });
    
    dareBtn.addEventListener('click', () => {
      Sounds.playClick();
      selectedType = 'dare';
      dareBtn.style.borderColor = '#ff5e62';
      dareBtn.style.color = '#ff5e62';
      dareBtn.style.background = 'rgba(255, 94, 98, 0.1)';
      
      truthBtn.style.borderColor = 'rgba(255,255,255,0.2)';
      truthBtn.style.color = '#fff';
      truthBtn.style.background = 'none';
      inputField.placeholder = 'اكتب تحدي الجرأة هنا...';
    });
    
    // Override click event to use local selectedType
    const saveBtn = overlay.querySelector('#qa-save-btn');
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    newSaveBtn.addEventListener('click', () => {
      const text = overlay.querySelector('#qa-input-tod-text').value.trim();
      if (!text) {
        showCustomAlert("يرجى كتابة نص التحدي/السؤال!");
        return;
      }
      const items = getItems();
      if (items.some(i => i.text.toLowerCase() === text.toLowerCase() && i.type === selectedType)) {
        showCustomAlert("هذا الكرت مضاف بالفعل!");
        return;
      }
      items.push({ type: selectedType, text });
      saveItems(items);
      overlay.querySelector('#qa-input-tod-text').value = '';
      Sounds.playSuccess();
      renderList();
    });
  }
};
