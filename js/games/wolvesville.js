// Jalsa - Wolvesville (الذئاب والقرويون) Game Logic
const WolvesvilleGame = (() => {
  let playersList = [];
  let gamePlayers = []; // { id, name, emoji, color, role, active: true }
  
  // Game phases: 'lobby', 'reveal', 'night_intro', 'night_action', 'day_announce', 'day_discuss', 'day_vote', 'game_over'
  let currentPhase = 'lobby';
  let revealIndex = 0;
  let nightPlayerIndex = 0;
  let activeNightPlayers = [];
  
  // Distribution settings
  let distributionMode = 'random'; // 'random' or 'manual'
  let manualRoleCounts = {
    villager: 0,
    werewolf: 0,
    seer: 0,
    doctor: 0,
    mayor: 0,
    gunner: 0,
    medium: 0,
    junior_werewolf: 0,
    wolf_seer: 0,
    fool: 0,
    serial_killer: 0,
    cupid: 0,
    arsonist: 0
  };

  // Night choices & State
  let nightNumber = 1;
  let lovers = []; // array of 2 player objects
  let dousedPlayerIds = []; // player IDs doused by Arsonist
  let arsonistIgnite = false; // whether Arsonist chose to ignite
  let gunnerBullets = {}; // player.id -> bullets (1 or 0)
  
  let werewolfTarget = null;
  let killerTarget = null;
  let doctorTarget = null;
  let seerTarget = null;
  
  // Timers
  let timerVal = 0;
  let timerInterval = null;
  let pretendTimeout = null;
  
  let containerEl = null;
  let onExitCallback = null;

  const init = (players, container, onExit) => {
    playersList = players;
    containerEl = container;
    onExitCallback = onExit;
    
    setupGame();
  };

  const setupGame = () => {
    currentPhase = 'lobby';
    revealIndex = 0;
    nightPlayerIndex = 0;
    activeNightPlayers = [];
    distributionMode = 'random';
    nightNumber = 1;
    lovers = [];
    dousedPlayerIds = [];
    arsonistIgnite = false;
    gunnerBullets = {};
    
    initManualRoleCounts();
    resetNightChoices();
    renderLobbyScreen();
  };

  const resetNightChoices = () => {
    werewolfTarget = null;
    killerTarget = null;
    doctorTarget = null;
    seerTarget = null;
    arsonistIgnite = false;
  };

  const getRandomRolesForCount = (count, isPro) => {
    let roles = [];
    if (isPro) {
      if (count === 4) {
        roles = ['werewolf', 'seer', 'fool', 'villager'];
      } else if (count === 5) {
        roles = ['werewolf', 'seer', 'doctor', 'fool', 'villager'];
      } else if (count === 6) {
        roles = ['werewolf', 'seer', 'doctor', 'serial_killer', 'mayor', 'villager'];
      } else if (count === 7) {
        roles = ['werewolf', 'seer', 'doctor', 'serial_killer', 'cupid', 'mayor', 'villager'];
      } else if (count === 8) {
        roles = ['werewolf', 'wolf_seer', 'seer', 'doctor', 'serial_killer', 'cupid', 'mayor', 'villager'];
      } else if (count === 9) {
        roles = ['werewolf', 'wolf_seer', 'seer', 'doctor', 'serial_killer', 'cupid', 'mayor', 'gunner', 'villager'];
      } else if (count === 10) {
        roles = ['werewolf', 'werewolf', 'wolf_seer', 'seer', 'doctor', 'serial_killer', 'cupid', 'mayor', 'gunner', 'villager'];
      } else if (count === 11) {
        roles = ['werewolf', 'werewolf', 'wolf_seer', 'seer', 'doctor', 'serial_killer', 'cupid', 'mayor', 'gunner', 'arsonist', 'villager'];
      } else if (count === 12) {
        roles = ['werewolf', 'werewolf', 'wolf_seer', 'seer', 'doctor', 'serial_killer', 'cupid', 'mayor', 'gunner', 'arsonist', 'medium', 'junior_werewolf'];
      } else {
        roles = ['werewolf', 'werewolf', 'junior_werewolf', 'wolf_seer', 'seer', 'doctor', 'mayor', 'gunner', 'medium', 'fool', 'serial_killer', 'cupid', 'arsonist'];
        while (roles.length < count) {
          roles.push('villager');
        }
      }
    } else {
      // Free mode: strictly free roles only!
      if (count === 4) {
        roles = ['werewolf', 'seer', 'villager', 'villager'];
      } else if (count === 5) {
        roles = ['werewolf', 'seer', 'doctor', 'villager', 'villager'];
      } else if (count === 6) {
        roles = ['werewolf', 'seer', 'doctor', 'villager', 'villager', 'villager'];
      } else if (count === 7) {
        roles = ['werewolf', 'werewolf', 'seer', 'doctor', 'villager', 'villager', 'villager'];
      } else {
        roles = ['werewolf', 'werewolf', 'seer', 'doctor'];
        while (roles.length < count) {
          roles.push('villager');
        }
      }
    }
    return roles.slice(0, count);
  };

  const initManualRoleCounts = () => {
    const isPro = window.isProUser();
    const count = playersList.length;
    const defaultRoles = getRandomRolesForCount(count, isPro);
    
    // Reset manual counts
    manualRoleCounts = {
      villager: 0,
      werewolf: 0,
      seer: 0,
      doctor: 0,
      mayor: 0,
      gunner: 0,
      medium: 0,
      junior_werewolf: 0,
      wolf_seer: 0,
      fool: 0,
      serial_killer: 0,
      cupid: 0,
      arsonist: 0
    };
    
    defaultRoles.forEach(r => {
      manualRoleCounts[r]++;
    });
  };

  const getRoleArabicName = (role) => {
    const names = {
      villager: "قروي 🧑‍🌾",
      seer: "عراف 🔮",
      doctor: "طبيب 👨‍⚕️",
      werewolf: "ذئب مستذئب 🐺",
      mayor: "الرئيس 👑",
      gunner: "صاحب السلاح 🔫",
      medium: "الوسيط 👻",
      junior_werewolf: "المستذئب الصغير 🐺👶",
      wolf_seer: "عراف الذئاب 🔮🐺",
      fool: "الأحمق 🃏",
      serial_killer: "القاتل المتسلسل 🔪",
      cupid: "إله الحب 💘",
      arsonist: "الحارق 🔥"
    };
    return names[role] || role;
  };

  const getRoleGoal = (role) => {
    const goals = {
      villager: "ابحث عن الذئاب والقاتل المتسلسل واقنع الجميع بشنقهم نهاراً لحماية قريتك. 🔵",
      seer: "استيقظ ليلاً واكشف هالات اللاعبين لمعرفة ولائهم ووجه القرويين بشكل غير مباشر. 🔵",
      doctor: "اختر لاعباً كل ليلة لحمايته من هجمات المخالب والسكاكين (يمكنك حماية نفسك). 🔵",
      werewolf: "اتفق مع الذئاب الأخرى ليلاً واقضوا على القرويين دون أن تنكشف هويتكم. 🔴",
      mayor: "صوتك في النهار يُحتسب بصوتين بدلاً من صوت واحد لمساعدتك في قيادة البلدة. 🔵",
      gunner: "لديك رصاصة واحدة في اللعبة كاملة؛ يمكنك استخدامها في مرحلة النقاش لقتل لاعب أمام الجميع علناً. 🔵",
      medium: "استيقظ ليلاً لمحادثة الموتى واختيار أحدهم ليكشف لك روحه ودوره الحقيقي. 🔵",
      junior_werewolf: "تشارك مع الذئاب، وإذا تم شنقك نهاراً، يمكنك اختيار لاعب ليموت معك فوراً انتقاماً. 🔴",
      wolf_seer: "استيقظ ليلاً واكشف الدور الدقيق لأي لاعب لمساعدة فريق الذئاب في اختيار ضحاياهم. 🔴",
      fool: "تظاهر بالشك والريبة! هدفك الوحيد هو جعل القرويين يشكون بك ويشنقونك نهاراً لتفوز بمفردك! 🟣",
      serial_killer: "أنت عدو الجميع. استيقظ ليلاً واقضِ على ضحية واحدة. يجب أن تكون الناجي الوحيد لتفوز. 🟣",
      cupid: "في الليلة الأولى فقط، اختر لاعبين لربطهما كعشاق. إذا مات أحدهما، يموت الآخر فوراً! 🟣",
      arsonist: "قم بصب البنزين على اللاعبين ليلاً سراً، أو اختر إشعال النار لحرق كل من صببت عليهم البنزين معاً! 🟣"
    };
    return goals[role] || "";
  };

  const assignRoles = () => {
    const numPlayers = playersList.length;
    let roles = [];

    if (distributionMode === 'random') {
      const isPro = window.isProUser();
      roles = getRandomRolesForCount(numPlayers, isPro);
    } else {
      // Manual distribution
      const isPro = window.isProUser();
      Object.keys(manualRoleCounts).forEach(role => {
        const isPremiumRole = ['mayor', 'gunner', 'medium', 'junior_werewolf', 'wolf_seer', 'fool', 'serial_killer', 'cupid', 'arsonist'].includes(role);
        let count = manualRoleCounts[role] || 0;
        if (isPremiumRole && !isPro) {
          manualRoleCounts.villager = (manualRoleCounts.villager || 0) + count;
          manualRoleCounts[role] = 0;
          count = 0;
        }
        for (let i = 0; i < count; i++) {
          roles.push(role);
        }
      });
    }

    // Shuffle roles (Fisher-Yates)
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    // Assign to active players
    gamePlayers = playersList.map((p, idx) => ({
      ...p,
      role: roles[idx] || 'villager',
      active: true
    }));

    // Initialize gunner bullets
    gunnerBullets = {};
    gamePlayers.forEach(p => {
      if (p.role === 'gunner') {
        gunnerBullets[p.id] = 1;
      }
    });
  };

  const renderLobbyScreen = () => {
    const isPro = window.isProUser();
    const numPlayers = playersList.length;

    // Calculate current selected total in manual mode
    const manualTotal = Object.values(manualRoleCounts).reduce((a, b) => a + b, 0);
    const isMatching = manualTotal === numPlayers;

    // Preview roles for random mode
    let randomRoles = getRandomRolesForCount(numPlayers, isPro);
    let randomCounts = {
      villager: 0, werewolf: 0, seer: 0, doctor: 0, mayor: 0, gunner: 0,
      medium: 0, junior_werewolf: 0, wolf_seer: 0, fool: 0, serial_killer: 0,
      cupid: 0, arsonist: 0
    };
    randomRoles.forEach(r => randomCounts[r]++);

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">الذئاب والقرويون (Wolvesville) 🐺</span>
          <h2>إعداد القرية الغامضة</h2>
        </div>

        <div class="modes-toggle" style="display: flex; gap: 10px; margin-bottom: 20px; justify-content: center;">
          <button class="btn ${distributionMode === 'random' ? 'btn-primary' : 'btn-outline'}" id="btn-mode-random" style="flex: 1; padding: 10px;">توزيع عشوائي 🎲</button>
          <button class="btn ${distributionMode === 'manual' ? 'btn-primary' : 'btn-outline'}" id="btn-mode-manual" style="flex: 1; padding: 10px;">تحديد يدوي ⚙️</button>
        </div>

        <div class="wolves-roles-container" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 15px; border-radius: 16px; margin: 15px 0; text-align: right;">
          <h4 style="margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px;">
            ${distributionMode === 'random' ? 'معاينة توزيع الأدوار التلقائي:' : 'حدد عدد اللاعبين لكل دور:'}
          </h4>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${Object.keys(manualRoleCounts).map(role => {
              const isPremiumRole = ['mayor', 'gunner', 'medium', 'junior_werewolf', 'wolf_seer', 'fool', 'serial_killer', 'cupid', 'arsonist'].includes(role);
              const showLock = isPremiumRole && !isPro;
              const currentCount = distributionMode === 'random' ? (randomCounts[role] || 0) : manualRoleCounts[role];

              let controlHtml = "";
              if (distributionMode === 'random') {
                if (showLock) {
                  controlHtml = `<span style="font-size: 0.85rem; color: #ffd700; font-weight: 700;">🔒 مغلق (برو)</span>`;
                } else {
                  controlHtml = `<span class="player-mini-badge" style="background: #222; border: 1px solid #333; margin: 0; min-width: 60px; text-align: center;">${currentCount} لاعب</span>`;
                }
              } else {
                // Manual Mode Selector Controls
                if (showLock) {
                  controlHtml = `
                    <div style="display: flex; align-items: center; gap: 5px;">
                      <span style="font-size: 0.85rem; color: #ffd700; font-weight: 700;">🔒 مغلق (برو)</span>
                    </div>
                  `;
                } else {
                  controlHtml = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <button class="btn role-adjust-btn" data-role="${role}" data-action="minus" style="padding: 2px 10px; font-size: 1rem; border-radius: 6px; background: #222; border: 1px solid #444; color: #fff;">-</button>
                      <strong style="font-size: 1.1rem; min-width: 20px; text-align: center; color: #fff;">${currentCount}</strong>
                      <button class="btn role-adjust-btn" data-role="${role}" data-action="plus" style="padding: 2px 10px; font-size: 1rem; border-radius: 6px; background: #222; border: 1px solid #444; color: #fff;">+</button>
                    </div>
                  `;
                }
              }

              return `
                <div class="${showLock ? 'wolves-role-row-locked' : ''}" 
                  style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px dashed rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 4px; transition: all 0.3s ease; cursor: ${showLock ? 'pointer' : 'default'};"
                  ${showLock ? `data-role-lock="${role}"` : ''}>
                  <div style="display: flex; flex-direction: column;">
                    <strong style="color: ${showLock ? '#ccc' : '#fff'};">${getRoleArabicName(role)}</strong>
                    <span style="font-size: 0.75rem; color: ${showLock ? '#777' : 'var(--text-muted)'}; max-width: 220px; margin-top: 2px; line-height: 1.3;">
                      ${showLock ? `دور ممتع ومتقدم (${getRoleArabicName(role)}). اضغط للفتح 💎` : getRoleGoal(role).split('.')[0]}
                    </span>
                  </div>
                  <div>
                    ${controlHtml}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          ${distributionMode === 'manual' ? `
            <div style="margin-top: 15px; padding: 12px; border-radius: 10px; text-align: center; font-size: 0.9rem; font-weight: 700;
              background: ${isMatching ? 'rgba(0, 230, 118, 0.05)' : 'rgba(255, 23, 68, 0.05)'};
              border: 1px solid ${isMatching ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 23, 68, 0.2)'};
              color: ${isMatching ? '#00e676' : 'var(--danger)'};">
              ${isMatching ? `الأدوار متطابقة وجاهزة! (${manualTotal} من ${numPlayers} لاعبين) ✔️` : `يجب تحديد ${numPlayers} أدوار بالضبط! (محدد حالياً: ${manualTotal}) ⚠️`}
            </div>
          ` : ''}

          ${!isPro ? `
            <div style="margin-top: 12px; background: rgba(0, 242, 254, 0.05); border: 1px dashed rgba(0, 242, 254, 0.2); padding: 10px; border-radius: 8px; font-size: 0.8rem; text-align: center; color: #00f2fe; cursor: pointer;" id="btn-unlock-pro-roles">
              💎 الأدوار المقفلة تتطلب النسخة البرو. اضغط للفتح!
            </div>
          ` : ''}
        </div>

        <div class="active-players-list-simple">
          <h4>القرويون المشاركون (${numPlayers}):</h4>
          <div class="players-badges-container">
            ${playersList.map(p => `
              <span class="player-mini-badge" style="background: ${p.color}">
                <span>${p.emoji}</span> ${p.name}
              </span>
            `).join('')}
          </div>
        </div>

        <!-- Timer Settings Box -->
        ${(() => {
          const settings = window.GameSettings ? window.GameSettings.get('wolvesville') : { discussionTime: 45 };
          return `
            <div class="settings-box" style="margin-top: 15px; margin-bottom: 15px; background: rgba(255,255,255,0.02); padding: 15px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); text-align: right;">
              <h4 style="margin-bottom: 12px; color: var(--accent);">⚙️ إعداد مؤقت النهار:</h4>
              <div style="display: flex; gap: 15px; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.9rem; color: #fff;">وقت النقاش الصباحي:</span>
                <div style="display: flex; gap: 5px; align-items: center;">
                  <button class="btn btn-outline" id="btn-wolves-time-dec" style="padding: 2px 10px; font-size: 0.8rem;">-</button>
                  <span id="lbl-wolves-time" style="font-weight: 700; min-width: 30px; text-align: center;">${settings.discussionTime}ث</span>
                  <button class="btn btn-outline" id="btn-wolves-time-inc" style="padding: 2px 10px; font-size: 0.8rem;">+</button>
                </div>
              </div>
            </div>
          `;
        })()}

        <div class="game-controls">
          <button class="btn btn-primary btn-large" id="btn-start-wolves-reveal" ${distributionMode === 'manual' && !isMatching ? 'disabled' : ''}>
            <span>ابدأ كشف الهويات السرية 👁️</span>
          </button>
        </div>
      </div>
    `;

    // Attach mode switch event listeners
    document.getElementById('btn-mode-random').addEventListener('click', () => {
      Sounds.playClick();
      distributionMode = 'random';
      renderLobbyScreen();
    });

    document.getElementById('btn-mode-manual').addEventListener('click', () => {
      Sounds.playClick();
      distributionMode = 'manual';
      initManualRoleCounts();
      renderLobbyScreen();
    });

    // Attach premium upgrade modal trigger
    if (!isPro) {
      const unlockBtn = document.getElementById('btn-unlock-pro-roles');
      if (unlockBtn) {
        unlockBtn.addEventListener('click', () => {
          window.showProUpgradeModal(() => {
            setupGame();
          });
        });
      }

      containerEl.querySelectorAll('[data-role-lock]').forEach(el => {
        el.addEventListener('click', () => {
          window.showProUpgradeModal(() => {
            setupGame();
          });
        });
      });
    }

    // Attach plus/minus adjustment listeners for manual mode
    if (distributionMode === 'manual') {
      containerEl.querySelectorAll('.role-adjust-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          Sounds.playClick();
          const role = btn.getAttribute('data-role');
          const action = btn.getAttribute('data-action');

          if (action === 'plus') {
            if (manualTotal < numPlayers) {
              manualRoleCounts[role]++;
            } else {
              showCustomAlert(`لا يمكنك إضافة أدوار أكثر من عدد اللاعبين (${numPlayers} لاعبين)!`);
            }
          } else if (action === 'minus') {
            if (manualRoleCounts[role] > 0) {
              manualRoleCounts[role]--;
            }
          }
          renderLobbyScreen();
        });
      });
    }

    // Start reveal phase
    document.getElementById('btn-start-wolves-reveal').addEventListener('click', () => {
      Sounds.playClick();
      assignRoles();
      startRevealPhase();
    });

    // Wolvesville Settings Adjustments
    document.getElementById('btn-wolves-time-dec').addEventListener('click', () => {
      Sounds.playClick();
      const s = window.GameSettings.get('wolvesville');
      if (s.discussionTime > 15) {
        s.discussionTime -= 15;
        window.GameSettings.set('wolvesville', s);
        renderLobbyScreen();
      }
    });

    document.getElementById('btn-wolves-time-inc').addEventListener('click', () => {
      Sounds.playClick();
      const s = window.GameSettings.get('wolvesville');
      if (s.discussionTime < 180) {
        s.discussionTime += 15;
        window.GameSettings.set('wolvesville', s);
        renderLobbyScreen();
      }
    });
  };

  const startRevealPhase = () => {
    currentPhase = 'reveal';
    revealIndex = 0;
    renderRevealPassScreen();
  };

  const renderRevealPassScreen = () => {
    const player = gamePlayers[revealIndex];
    
    containerEl.innerHTML = `
      <div class="game-card wolves-night-view text-center" style="background: #0d0d0d; border: 1px solid #1a1a1a; min-height: 480px; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #fff;">
        <span style="font-size: 3rem; margin-bottom: 20px;">📲</span>
        <h3 style="font-size: 1.6rem; font-weight: 700; color: #e0e0e0; margin-bottom: 10px;">دور اللاعب التالي</h3>
        <p style="color: #888; font-size: 0.95rem; margin-bottom: 30px; padding: 0 20px;">
          مرر الهاتف إلى <strong style="color: ${player.color}; font-size: 1.15rem;">${player.name}</strong> سراً للتأكد من عدم رؤية الآخرين لدوره.
        </p>

        <button class="btn btn-accent btn-large animate-pulse" id="btn-show-my-role" style="box-shadow: 0 0 10px rgba(0, 242, 254, 0.15); background: #1a1a1a; border: 1px solid #333; color: #fff;">
          <span>أنا ${player.name}، اعرض دوري 👁️</span>
        </button>
      </div>
    `;

    document.getElementById('btn-show-my-role').addEventListener('click', () => {
      Sounds.playClick();
      renderRoleCardScreen();
    });
  };

  const renderRoleCardScreen = () => {
    const player = gamePlayers[revealIndex];
    const roleName = getRoleArabicName(player.role);
    const roleGoal = getRoleGoal(player.role);
    
    let wolfPartners = [];
    const isWolfRole = ['werewolf', 'wolf_seer', 'junior_werewolf'].includes(player.role);
    if (isWolfRole) {
      wolfPartners = gamePlayers
        .filter(p => ['werewolf', 'wolf_seer', 'junior_werewolf'].includes(p.role) && p.id !== player.id)
        .map(p => `${p.name} (${getRoleArabicName(p.role)})`);
    }

    containerEl.innerHTML = `
      <div class="game-card wolves-night-view text-center" style="background: #050505; border: 2px solid #111; min-height: 480px; display: flex; flex-direction: column; justify-content: space-between; padding: 30px; color: #e0e0e0;">
        <div>
          <span style="font-size: 0.85rem; color: #555; letter-spacing: 1px; display: block; margin-bottom: 30px;">بطاقة الهوية السرية 🤫</span>
          
          <h2 style="font-size: 2rem; font-weight: 900; color: #fff; margin-bottom: 15px;">${player.name}</h2>
          
          <div style="background: #0c0c0c; border: 1px solid #222; padding: 25px; border-radius: 20px; display: inline-block; min-width: 200px; margin-bottom: 25px;">
            <span style="font-size: 1.1rem; font-weight: 800; color: #e0e0e0; display: block;">دورك السري هو:</span>
            <strong style="font-size: 1.7rem; font-weight: 900; color: #fff; display: block; margin-top: 10px;">${roleName}</strong>
          </div>

          <p style="font-size: 0.95rem; line-height: 1.6; color: #999; max-width: 320px; margin: 0 auto;">
            ${roleGoal}
          </p>

          ${wolfPartners.length > 0 ? `
            <div style="margin-top: 20px; background: rgba(255,255,255,0.02); border: 1px solid #1e1e1e; padding: 10px; border-radius: 12px; font-size: 0.85rem; color: #aaa;">
              🐺 شركاؤك الذئاب في البلدة: <strong style="color:#ff5e62;">${wolfPartners.join(', ')}</strong>
            </div>
          ` : ''}
        </div>

        <div>
          <button class="btn btn-outline" id="btn-hide-role-reveal" style="border-color: #333; color: #999; background: #0c0c0c; width: 100%; max-width: 250px;">
            <span>إخفاء الدور وتمرير 🔒</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-hide-role-reveal').addEventListener('click', () => {
      Sounds.playClick();
      revealIndex++;
      if (revealIndex < gamePlayers.length) {
        renderRevealPassScreen();
      } else {
        startNightPhase();
      }
    });
  };

  const startNightPhase = () => {
    currentPhase = 'night_intro';
    resetNightChoices();
    renderNightIntroScreen();
  };

  const renderNightIntroScreen = () => {
    Sounds.playFail();

    containerEl.innerHTML = `
      <div class="game-card wolves-night-view text-center" style="background: #000; border: 1px solid #111; min-height: 480px; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #fff; padding: 20px;">
        <span style="font-size: 4rem; margin-bottom: 25px; filter: grayscale(1);">🌙</span>
        <h2 style="font-size: 2rem; font-weight: 900; color: #fff; margin-bottom: 15px;">البلدة نائمة.. 🌃</h2>
        <p style="font-size: 1.1rem; color: #777; line-height: 1.6; max-width: 320px; margin-bottom: 40px; direction: rtl;">
          أغلقوا أعينكم جميعاً الآن! الليل قد خيّم على القرية ولا يمكن لأي قروي النظر للشاشة.
        </p>

        <button class="btn btn-accent btn-large" id="btn-start-night-loops" style="background: #111; border: 1px solid #222; color: #fff; box-shadow: 0 0 10px rgba(255,255,255,0.02);">
          <span>مستعد، ابدأ جولة التمرير ➡️</span>
        </button>
      </div>
    `;

    document.getElementById('btn-start-night-loops').addEventListener('click', () => {
      Sounds.playClick();
      nightPlayerIndex = 0;
      activeNightPlayers = gamePlayers.filter(p => p.active);
      renderNextNightPassScreen();
    });
  };

  const renderNextNightPassScreen = () => {
    const player = activeNightPlayers[nightPlayerIndex];

    containerEl.innerHTML = `
      <div class="game-card wolves-night-view text-center" style="background: #080808; border: 1px solid #1a1a1a; min-height: 480px; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #fff;">
        <span style="font-size: 2.5rem; margin-bottom: 15px;">🔒</span>
        <h3 style="font-size: 1.4rem; font-weight: 700; color: #bbb; margin-bottom: 10px;">دور اللاعب التالي سراً</h3>
        <p style="color: #666; font-size: 0.9rem; margin-bottom: 25px;">
          مرر الهاتف إلى <strong style="color: ${player.color}; font-size: 1.1rem;">${player.name}</strong> سراً ليؤدي دوره.
        </p>

        <button class="btn btn-primary btn-large" id="btn-start-player-night" style="background: #151515; border: 1px solid #333; color: #fff;">
          <span>أنا ${player.name}، ابدأ 👁️</span>
        </button>
      </div>
    `;

    document.getElementById('btn-start-player-night').addEventListener('click', () => {
      Sounds.playClick();
      renderPlayerNightActionScreen();
    });
  };

  const renderPlayerNightActionScreen = () => {
    const player = activeNightPlayers[nightPlayerIndex];
    
    let hasNightAction = false;
    if (['werewolf', 'junior_werewolf', 'wolf_seer'].includes(player.role)) {
      hasNightAction = true;
    } else if (player.role === 'serial_killer') {
      hasNightAction = true;
    } else if (player.role === 'doctor') {
      hasNightAction = true;
    } else if (player.role === 'seer') {
      hasNightAction = true;
    } else if (player.role === 'arsonist') {
      hasNightAction = true;
    } else if (player.role === 'cupid' && nightNumber === 1) {
      hasNightAction = true;
    } else if (player.role === 'medium') {
      const deadCount = gamePlayers.filter(p => !p.active).length;
      if (deadCount > 0) {
        hasNightAction = true;
      }
    }

    if (!hasNightAction) {
      renderPretendThinkingScreen(player);
    } else {
      renderRealNightActionScreen(player);
    }
  };

  const renderPretendThinkingScreen = (player) => {
    let loverPartner = null;
    if (lovers.length === 2) {
      if (lovers[0] === player.id) {
        loverPartner = gamePlayers.find(p => p.id === lovers[1]);
      } else if (lovers[1] === player.id) {
        loverPartner = gamePlayers.find(p => p.id === lovers[0]);
      }
    }

    containerEl.innerHTML = `
      <div class="game-card wolves-night-view text-center" style="background: #050505; border: 2px solid #111; min-height: 480px; display: flex; flex-direction: column; justify-content: space-between; padding: 30px; color: #bbb;">
        <div>
          <span style="font-size: 0.8rem; color: #444; display: block; margin-bottom: 20px;">ليلة هادئة في القرية 🌌</span>
          
          <h3 style="font-size: 1.5rem; font-weight: 800; color: #fff; margin-bottom: 15px;">${player.name}</h3>
          
          <div style="background: #0c0c0c; border: 1px solid #1a1a1a; padding: 15px; border-radius: 14px; margin-bottom: 20px; font-size: 0.9rem; color: #888;">
            أنت تؤدي دورك السري الآن. تظاهر بأنك تفكر بتركيز لتشتيت انتباه الآخرين! 🕵️‍♂️
          </div>

          ${loverPartner ? `
            <div style="margin-top: 15px; background: rgba(255, 94, 98, 0.05); border: 1px dashed rgba(255, 94, 98, 0.2); padding: 10px; border-radius: 12px; font-size: 0.85rem; color: #ff5e62; text-align: center;">
              💘 شريكك في العشق هو: <strong>${loverPartner.name}</strong> (${getRoleArabicName(loverPartner.role)})
            </div>
          ` : ''}

          <div style="width: 100%; max-width: 250px; height: 8px; background: #111; border-radius: 10px; margin: 30px auto 10px; overflow: hidden; border: 1px solid #222;">
            <div id="pretend-progress-bar" style="height: 100%; width: 0%; background: #444; transition: width 0.1s linear;"></div>
          </div>
          <div id="pretend-label" style="font-size: 0.85rem; color: #555;">جاري اتخاذ القرار...</div>
        </div>

        <div>
          <button class="btn btn-outline" id="btn-confirm-pretend" disabled style="border-color: #222; color: #444; background: #080808; width: 100%; max-width: 250px;">
            <span>تأكيد الاختيار 🔒</span>
          </button>
        </div>
      </div>
    `;

    const bar = document.getElementById('pretend-progress-bar');
    const label = document.getElementById('pretend-label');
    const confirmBtn = document.getElementById('btn-confirm-pretend');
    
    let duration = 5000; 
    let intervalTime = 100;
    let elapsed = 0;

    pretendTimeout = setInterval(() => {
      elapsed += intervalTime;
      const pct = (elapsed / duration) * 100;
      if (bar) bar.style.width = `${pct}%`;

      if (elapsed >= duration) {
        clearInterval(pretendTimeout);
        if (label) label.textContent = "تم اتخاذ القرار بنجاح! ✔️";
        if (confirmBtn) {
          confirmBtn.disabled = false;
          confirmBtn.style.borderColor = "#444";
          confirmBtn.style.color = "#999";
        }
      }
    }, intervalTime);

    confirmBtn.addEventListener('click', () => {
      Sounds.playClick();
      goToNextNightPlayer();
    });
  };

  const renderRealNightActionScreen = (player) => {
    const possibleTargets = gamePlayers.filter(p => p.active && p.id !== player.id);
    const selfTarget = gamePlayers.find(p => p.id === player.id);

    let loverPartner = null;
    if (lovers.length === 2) {
      if (lovers[0] === player.id) {
        loverPartner = gamePlayers.find(p => p.id === lovers[1]);
      } else if (lovers[1] === player.id) {
        loverPartner = gamePlayers.find(p => p.id === lovers[0]);
      }
    }

    let instructionText = "";
    let targetsListHtml = "";

    if (['werewolf', 'junior_werewolf'].includes(player.role)) {
      let prevTargetNotice = "";
      if (werewolfTarget !== null) {
        const prevT = gamePlayers.find(p => p.id === werewolfTarget);
        if (prevT) {
          prevTargetNotice = `
            <div style="background: rgba(255, 94, 98, 0.05); border: 1px dashed rgba(255, 94, 98, 0.2); padding: 8px; border-radius: 8px; font-size: 0.85rem; color: #ff5e62; margin-bottom: 12px; text-align: center;">
              🐺 الذئاب السابقة حددت الضحية: <strong>${prevT.name}</strong>
            </div>
          `;
        }
      }
      
      instructionText = "اختر ضحية لالتهامها مع بقية المستذئبين الليلة 🐺:";
      targetsListHtml = prevTargetNotice + possibleTargets.map(t => `
        <button class="btn btn-outline target-select-btn" data-tid="${t.id}" style="border-color: #222; background: #0c0c0c; color: #e0e0e0; margin-bottom: 8px; width: 100%; justify-content: center; display: inline-flex;">
          <span>${t.name}</span>
        </button>
      `).join('');
    } else if (player.role === 'wolf_seer') {
      instructionText = "اختر لاعباً لكشف دوره الدقيق، ثم اختر ضحية الذئاب الليلة:";
      let prevTargetNotice = "";
      if (werewolfTarget !== null) {
        const prevT = gamePlayers.find(p => p.id === werewolfTarget);
        if (prevT) {
          prevTargetNotice = `
            <div style="background: rgba(255, 94, 98, 0.05); border: 1px dashed rgba(255, 94, 98, 0.2); padding: 8px; border-radius: 8px; font-size: 0.85rem; color: #ff5e62; margin-bottom: 12px; text-align: center;">
              🐺 الذئاب السابقة حددت الضحية: <strong>${prevT.name}</strong>
            </div>
          `;
        }
      }

      targetsListHtml = `
        <div style="margin-bottom: 15px;">
          <div style="font-size: 0.85rem; color: #ffd700; margin-bottom: 5px;">1. كشف الدور الدقيق (انقر على لاعب):</div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${possibleTargets.map(t => `
              <button class="btn btn-outline wolf-seer-reveal-btn" data-tid="${t.id}" style="border-color: #222; background: #0c0c0c; color: #fff;">
                <span>${t.name}</span>
              </button>
            `).join('')}
          </div>
          <div id="wolf-seer-reveal-result" style="margin-top: 10px; padding: 10px; background: rgba(255,215,0,0.05); border: 1px dashed rgba(255,215,0,0.2); border-radius: 8px; font-size: 0.9rem; text-align: center; color: #ffd700; display: none;">
            جاري الكشف...
          </div>
        </div>
        <hr style="border-color: rgba(255,255,255,0.05); margin: 15px 0;">
        <div>
          <div style="font-size: 0.85rem; color: #ff5e62; margin-bottom: 5px;">2. ضحية الذئاب الليلة:</div>
          ${prevTargetNotice}
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${possibleTargets.map(t => `
              <button class="btn btn-outline wolf-seer-victim-btn" data-tid="${t.id}" style="border-color: #222; background: #0c0c0c; color: #fff;">
                <span>${t.name}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    } else if (player.role === 'serial_killer') {
      instructionText = "اختر ضحية لتصفيتها وقتلها بالسكين الليلة 🔪:";
      targetsListHtml = possibleTargets.map(t => `
        <button class="btn btn-outline target-select-btn" data-tid="${t.id}" style="border-color: #222; background: #0c0c0c; color: #e0e0e0; margin-bottom: 8px; width: 100%; justify-content: center; display: inline-flex;">
          <span>${t.name}</span>
        </button>
      `).join('');
    } else if (player.role === 'doctor') {
      instructionText = "اختر لاعباً لحمايته من الهجمات الليلة (يمكنك اختيار نفسك) 👨‍⚕️:";
      const doctorTargets = [selfTarget, ...possibleTargets].filter(Boolean);
      targetsListHtml = doctorTargets.map(t => `
        <button class="btn btn-outline target-select-btn" data-tid="${t.id}" style="border-color: #222; background: #0c0c0c; color: #e0e0e0; margin-bottom: 8px; width: 100%; justify-content: center; display: inline-flex;">
          <span>${t.name} ${t.id === player.id ? '(أنت)' : ''}</span>
        </button>
      `).join('');
    } else if (player.role === 'seer') {
      instructionText = "اختر لاعباً لكشف ولائه وفريقه 🔮:";
      targetsListHtml = possibleTargets.map(t => `
        <button class="btn btn-outline target-select-btn" data-tid="${t.id}" style="border-color: #222; background: #0c0c0c; color: #e0e0e0; margin-bottom: 8px; width: 100%; justify-content: center; display: inline-flex;">
          <span>${t.name}</span>
        </button>
      `).join('');
    } else if (player.role === 'cupid') {
      instructionText = "اختر لاعبين اثنين لربطهما كعشاق طوال اللعبة 💘:";
      targetsListHtml = possibleTargets.map(t => `
        <button class="btn btn-outline target-select-btn" data-tid="${t.id}" style="border-color: #222; background: #0c0c0c; color: #e0e0e0; margin-bottom: 8px; width: 100%; justify-content: center; display: inline-flex;">
          <span>${t.name}</span>
        </button>
      `).join('');
    } else if (player.role === 'medium') {
      instructionText = "اختر أحد اللاعبين الموتى لتكشف البلدة عن دوره الحقيقي سراً لك:";
      const deadPlayers = gamePlayers.filter(p => !p.active);
      targetsListHtml = deadPlayers.map(t => `
        <button class="btn btn-outline medium-target-btn" data-tid="${t.id}" style="border-color: #222; background: #0c0c0c; color: #e0e0e0; margin-bottom: 8px; width: 100%; justify-content: center; display: inline-flex;">
          <span>${t.name}</span>
        </button>
      `).join('');
    } else if (player.role === 'arsonist') {
      instructionText = "اختر إما صب البنزين على أحد اللاعبين سراً، أو إشعال النار لحرق كل من صببت عليهم البنزين سابقاً 🔥:";
      targetsListHtml = `
        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
          <button class="btn btn-outline" id="btn-arsonist-douse-mode" style="flex: 1; border-color: #222; background: #0c0c0c; color: #fff;">صب البنزين ⛽</button>
          <button class="btn btn-outline" id="btn-arsonist-ignite-mode" style="flex: 1; border-color: #222; background: #0c0c0c; color: #ff5e62;">إشعال النار 🔥 (${dousedPlayerIds.length})</button>
        </div>
        <div id="arsonist-targets-container" style="display: none;">
          <div style="font-size: 0.85rem; color: #777; margin-bottom: 8px;">اختر لاعباً لصب البنزين عليه:</div>
          ${possibleTargets.map(t => {
            const isAlreadyDoused = dousedPlayerIds.includes(t.id);
            return `
              <button class="btn btn-outline arsonist-target-btn" data-tid="${t.id}" ${isAlreadyDoused ? 'disabled' : ''} style="border-color: #222; background: #0c0c0c; color: ${isAlreadyDoused ? '#444' : '#e0e0e0'}; margin-bottom: 8px; width: 100%; justify-content: center; display: inline-flex;">
                <span>${t.name} ${isAlreadyDoused ? '(مبلل بالبنزين ⛽)' : ''}</span>
              </button>
            `;
          }).join('')}
        </div>
        <div id="arsonist-ignite-confirm" style="display: none; padding: 15px; background: rgba(255, 94, 98, 0.05); border: 1px dashed rgba(255, 94, 98, 0.2); border-radius: 12px; margin-bottom: 10px; text-align: center; color: #ff5e62;">
          سيتم حرق جميع اللاعبين المبللين بالبنزين وموتهم فوراً الليلة! 🔥
        </div>
      `;
    }

    containerEl.innerHTML = `
      <div class="game-card wolves-night-view text-center" style="background: #050505; border: 2px solid #111; min-height: 480px; display: flex; flex-direction: column; justify-content: space-between; padding: 25px; color: #e0e0e0;">
        <div>
          <span style="font-size: 0.85rem; color: #555; display: block; margin-bottom: 15px;">اتخذ قرارك السري 🕵️‍♂️</span>
          <h3 style="font-size: 1.4rem; font-weight: 800; color: #fff; margin-bottom: 5px;">${player.name} (${getRoleArabicName(player.role)})</h3>
          <p style="font-size: 0.9rem; color: #888; margin-bottom: 20px; line-height: 1.4;">${instructionText}</p>
          
          ${loverPartner ? `
            <div style="margin-top: -10px; margin-bottom: 15px; background: rgba(255, 94, 98, 0.05); border: 1px dashed rgba(255, 94, 98, 0.2); padding: 8px; border-radius: 10px; font-size: 0.8rem; color: #ff5e62; text-align: center;">
              💘 شريكك في العشق هو: <strong>${loverPartner.name}</strong> (${getRoleArabicName(loverPartner.role)})
            </div>
          ` : ''}

          <div class="targets-list-grid" style="display: flex; flex-direction: column; gap: 8px; max-height: 250px; overflow-y: auto; padding: 5px;">
            ${targetsListHtml}
          </div>

          <div id="seer-result-box" style="margin-top: 15px; padding: 12px; background: #0c0c0c; border: 1px dashed #333; border-radius: 12px; font-size: 0.95rem; color: #fff; display: none;">
            جاري فحص هالة اللاعب... ⏳
          </div>
        </div>

        <div>
          <button class="btn btn-outline" id="btn-confirm-action" disabled style="border-color: #222; color: #444; background: #080808; width: 100%; max-width: 250px;">
            <span>تأكيد وتمرير 🔒</span>
          </button>
        </div>
      </div>
    `;

    const confirmBtn = document.getElementById('btn-confirm-action');
    const targetButtons = containerEl.querySelectorAll('.target-select-btn');
    const resultBox = document.getElementById('seer-result-box');
    let selectedTid = null;
    let selectedCupidTids = [];

    if (player.role === 'cupid') {
      targetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          Sounds.playClick();
          const tid = parseInt(btn.getAttribute('data-tid'), 10);
          
          if (selectedCupidTids.includes(tid)) {
            selectedCupidTids = selectedCupidTids.filter(id => id !== tid);
            btn.style.borderColor = '#222';
            btn.style.color = '#e0e0e0';
            btn.style.boxShadow = 'none';
          } else {
            if (selectedCupidTids.length < 2) {
              selectedCupidTids.push(tid);
              btn.style.borderColor = '#ffd700';
              btn.style.color = '#fff';
              btn.style.boxShadow = '0 0 5px rgba(255, 215, 0, 0.2)';
            } else {
              showCustomAlert("يمكنك اختيار لاعبين اثنين فقط لرابطة العشاق!");
            }
          }
          
          if (selectedCupidTids.length === 2) {
            confirmBtn.disabled = false;
            confirmBtn.style.borderColor = '#444';
            confirmBtn.style.color = '#fff';
          } else {
            confirmBtn.disabled = true;
            confirmBtn.style.borderColor = '#222';
            confirmBtn.style.color = '#444';
          }
        });
      });
    } else if (player.role === 'wolf_seer') {
      const revealBtns = containerEl.querySelectorAll('.wolf-seer-reveal-btn');
      const victimBtns = containerEl.querySelectorAll('.wolf-seer-victim-btn');
      const revealResult = document.getElementById('wolf-seer-reveal-result');
      
      let revealed = false;
      let selectedVictimTid = null;
      
      revealBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          Sounds.playClick();
          const tid = parseInt(btn.getAttribute('data-tid'), 10);
          const targetPlayer = gamePlayers.find(p => p.id === tid);
          
          revealResult.style.display = 'block';
          revealResult.innerHTML = `🔮 دور اللاعب <strong>${targetPlayer.name}</strong> الدقيق هو: <strong style="color: #fff;">${getRoleArabicName(targetPlayer.role)}</strong>`;
          
          revealBtns.forEach(b => b.style.borderColor = '#222');
          btn.style.borderColor = '#ffd700';
          revealed = true;
          
          if (selectedVictimTid !== null) {
            confirmBtn.disabled = false;
            confirmBtn.style.borderColor = '#444';
            confirmBtn.style.color = '#fff';
          }
        });
      });
      
      victimBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          Sounds.playClick();
          selectedVictimTid = parseInt(btn.getAttribute('data-tid'), 10);
          
          victimBtns.forEach(b => b.style.borderColor = '#222');
          btn.style.borderColor = '#ff5e62';
          
          selectedTid = selectedVictimTid;
          
          if (revealed) {
            confirmBtn.disabled = false;
            confirmBtn.style.borderColor = '#444';
            confirmBtn.style.color = '#fff';
          }
        });
      });
    } else if (player.role === 'medium') {
      const mediumBtns = containerEl.querySelectorAll('.medium-target-btn');
      
      mediumBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          Sounds.playClick();
          const tid = parseInt(btn.getAttribute('data-tid'), 10);
          const targetPlayer = gamePlayers.find(p => p.id === tid);
          
          mediumBtns.forEach(b => b.style.borderColor = '#222');
          btn.style.borderColor = '#fff';
          
          if (resultBox) {
            resultBox.style.display = 'block';
            resultBox.innerHTML = `👻 روحه تخبرك أن دوره كان: <strong style="color: #fff;">${getRoleArabicName(targetPlayer.role)}</strong>`;
          }
          
          selectedTid = tid;
          confirmBtn.disabled = false;
          confirmBtn.style.borderColor = '#444';
          confirmBtn.style.color = '#fff';
        });
      });
    } else if (player.role === 'arsonist') {
      const btnDouse = document.getElementById('btn-arsonist-douse-mode');
      const btnIgnite = document.getElementById('btn-arsonist-ignite-mode');
      const targetsContainer = document.getElementById('arsonist-targets-container');
      const igniteConfirm = document.getElementById('arsonist-ignite-confirm');
      const arsonistTargets = containerEl.querySelectorAll('.arsonist-target-btn');
      
      let arsonistAction = null;
      
      btnDouse.addEventListener('click', () => {
        Sounds.playClick();
        arsonistAction = 'douse';
        btnDouse.style.borderColor = '#fff';
        btnDouse.style.background = '#1a1a1a';
        btnIgnite.style.borderColor = '#222';
        btnIgnite.style.background = '#0c0c0c';
        
        targetsContainer.style.display = 'block';
        igniteConfirm.style.display = 'none';
        
        confirmBtn.disabled = true;
        confirmBtn.style.borderColor = '#222';
        confirmBtn.style.color = '#444';
      });
      
      btnIgnite.addEventListener('click', () => {
        Sounds.playClick();
        arsonistAction = 'ignite';
        btnIgnite.style.borderColor = '#ff5e62';
        btnIgnite.style.background = 'rgba(255, 94, 98, 0.1)';
        btnDouse.style.borderColor = '#222';
        btnDouse.style.background = '#0c0c0c';
        
        targetsContainer.style.display = 'none';
        igniteConfirm.style.display = 'block';
        
        selectedTid = 'ignite';
        confirmBtn.disabled = false;
        confirmBtn.style.borderColor = '#ff5e62';
        confirmBtn.style.color = '#fff';
      });
      
      arsonistTargets.forEach(btn => {
        btn.addEventListener('click', () => {
          Sounds.playClick();
          arsonistTargets.forEach(b => {
            b.style.borderColor = '#222';
          });
          btn.style.borderColor = '#fff';
          selectedTid = parseInt(btn.getAttribute('data-tid'), 10);
          
          confirmBtn.disabled = false;
          confirmBtn.style.borderColor = '#444';
          confirmBtn.style.color = '#fff';
        });
      });
    } else {
      // Normal single target selection
      targetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          Sounds.playClick();
          targetButtons.forEach(b => {
            b.style.borderColor = '#222';
            b.style.color = '#e0e0e0';
            b.style.boxShadow = 'none';
          });

          btn.style.borderColor = '#fff';
          btn.style.color = '#fff';
          btn.style.boxShadow = '0 0 5px rgba(255, 255, 255, 0.1)';

          selectedTid = parseInt(btn.getAttribute('data-tid'), 10);
          
          if (player.role === 'seer') {
            const targetPlayer = gamePlayers.find(p => p.id === selectedTid);
            let teamName = "القرويين 🔵";
            if (['werewolf', 'wolf_seer', 'junior_werewolf'].includes(targetPlayer.role)) {
              teamName = "الذئاب 🔴";
            } else if (['fool', 'serial_killer', 'cupid', 'arsonist'].includes(targetPlayer.role)) {
              teamName = "المحايدين 🟣";
            }
            
            if (resultBox) {
              resultBox.style.display = 'block';
              resultBox.innerHTML = `هالة اللاعب سرياً: <strong style="color: #fff;">${teamName}</strong>`;
            }
          }

          confirmBtn.disabled = false;
          confirmBtn.style.borderColor = '#444';
          confirmBtn.style.color = '#fff';
        });
      });
    }

    confirmBtn.addEventListener('click', () => {
      Sounds.playClick();
      
      if (['werewolf', 'junior_werewolf', 'wolf_seer'].includes(player.role)) {
        werewolfTarget = selectedTid;
      } else if (player.role === 'serial_killer') {
        killerTarget = selectedTid;
      } else if (player.role === 'doctor') {
        doctorTarget = selectedTid;
      } else if (player.role === 'seer') {
        seerTarget = selectedTid;
      } else if (player.role === 'cupid') {
        lovers = [selectedCupidTids[0], selectedCupidTids[1]];
      } else if (player.role === 'arsonist') {
        if (selectedTid === 'ignite') {
          arsonistIgnite = true;
        } else {
          dousedPlayerIds.push(selectedTid);
        }
      }

      goToNextNightPlayer();
    });
  };

  const goToNextNightPlayer = () => {
    nightPlayerIndex++;
    if (nightPlayerIndex < activeNightPlayers.length) {
      renderNextNightPassScreen();
    } else {
      resolveNightActions();
    }
  };

  const resolveNightActions = () => {
    let deadPlayers = [];
    
    // 1. Werewolf Target vs Doctor Protection
    if (werewolfTarget !== null) {
      if (werewolfTarget !== doctorTarget) {
        deadPlayers.push(werewolfTarget);
      }
    }
    
    // 2. Serial Killer Target vs Doctor Protection
    if (killerTarget !== null) {
      if (killerTarget !== doctorTarget) {
        deadPlayers.push(killerTarget);
      }
    }
    
    // 3. Arsonist Ignite
    if (arsonistIgnite) {
      dousedPlayerIds.forEach(pid => {
        const p = gamePlayers.find(pl => pl.id === pid && pl.active);
        if (p) {
          deadPlayers.push(pid);
        }
      });
      dousedPlayerIds = [];
    }

    deadPlayers = [...new Set(deadPlayers)];

    // 4. Lovers death cascade
    if (lovers.length === 2) {
      const p1Id = lovers[0];
      const p2Id = lovers[1];
      const p1WillDie = deadPlayers.includes(p1Id);
      const p2WillDie = deadPlayers.includes(p2Id);
      if (p1WillDie && !deadPlayers.includes(p2Id)) {
        deadPlayers.push(p2Id);
      } else if (p2WillDie && !deadPlayers.includes(p1Id)) {
        deadPlayers.push(p1Id);
      }
    }

    deadPlayers.forEach(pid => {
      const victim = gamePlayers.find(p => p.id === pid);
      if (victim) {
        victim.active = false;
      }
    });

    let deathLog = [];
    deadPlayers.forEach(pid => {
      const p = gamePlayers.find(p => p.id === pid);
      if (!p) return;
      
      let loverDeathNote = "";
      if (lovers.length === 2 && lovers.includes(pid)) {
        const partnerId = lovers.find(id => id !== pid);
        const partner = gamePlayers.find(pl => pl.id === partnerId);
        const partnerDirectlyKilled = (partnerId === werewolfTarget && werewolfTarget !== doctorTarget) || 
                                      (partnerId === killerTarget && killerTarget !== doctorTarget) || 
                                      (arsonistIgnite && dousedPlayerIds.includes(partnerId));
        const selfDirectlyKilled = (pid === werewolfTarget && werewolfTarget !== doctorTarget) || 
                                   (pid === killerTarget && killerTarget !== doctorTarget) || 
                                   (arsonistIgnite && dousedPlayerIds.includes(pid));
                                   
        if (partnerDirectlyKilled && !selfDirectlyKilled) {
          loverDeathNote = " (مات حزناً على حبيبه 💔)";
        }
      }
      
      deathLog.push(`${p.emoji} <strong>${p.name}</strong> (${getRoleArabicName(p.role)})${loverDeathNote}`);
    });

    // Reset night-specific flags for next rounds
    werewolfTarget = null;
    killerTarget = null;
    doctorTarget = null;
    seerTarget = null;
    arsonistIgnite = false;

    nightNumber++;

    currentPhase = 'day_announce';
    renderDayAnnounceScreen(deathLog);
  };

  const renderDayAnnounceScreen = (deathLog) => {
    Sounds.playSuccess();

    let announcementText = "";
    if (deathLog.length === 0) {
      announcementText = `
        <div class="victory-box victory-team-a" style="margin: 30px 0; background: rgba(0, 230, 118, 0.08); border: 1px solid rgba(0, 230, 118, 0.2);">
          <span class="victory-icon" style="font-size: 3.5rem;">🛡️</span>
          <h2 style="font-size: 1.6rem; color: #00e676; font-weight: 800; margin-top: 10px;">كانت ليلة هادئة!</h2>
          <p style="font-size: 0.95rem; color: var(--text-muted); margin-top: 10px;">لم يمت أحد الليلة الماضية. نجح الطبيب في حماية المستهدفين أو لم يختر الأعداء ضحاياهم!</p>
        </div>
      `;
    } else {
      announcementText = `
        <div class="victory-box victory-draw" style="margin: 30px 0; background: rgba(255, 23, 68, 0.08); border: 1px solid rgba(255, 23, 68, 0.2);">
          <span class="victory-icon" style="font-size: 3.5rem;">☠️</span>
          <h2 style="font-size: 1.6rem; color: var(--danger); font-weight: 800; margin-top: 10px;">جرائم ليلية بشعة!</h2>
          <p style="font-size: 0.95rem; color: var(--text-muted); margin-top: 10px; margin-bottom: 20px;">استيقظت القرية لتجد جثث الضحايا التالية معلقة:</p>
          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 1.15rem; color: #fff;">
            ${deathLog.map(log => `<div>${log}</div>`).join('')}
          </div>
        </div>
      `;
    }

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">النهار قد حل ☀️</span>
          <h2>أخبار القرية الصباحية</h2>
        </div>

        ${announcementText}

        <div class="game-controls">
          <button class="btn btn-primary btn-large" id="btn-go-to-discuss">
            <span>الذهاب للنقاش والتحليل 🗣️</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-go-to-discuss').addEventListener('click', () => {
      Sounds.playClick();
      
      const winner = checkWinConditions();
      if (winner) {
        renderGameOverScreen(winner);
      } else {
        startDiscussPhase();
      }
    });
  };

  const startDiscussPhase = () => {
    currentPhase = 'day_discuss';
    const settings = window.GameSettings ? window.GameSettings.get('wolvesville') : { discussionTime: 45 };
    timerVal = settings.discussionTime; 
    renderDiscussScreen();
  };

  const renderDiscussScreen = () => {
    const activeGunners = gamePlayers.filter(p => p.active && p.role === 'gunner' && gunnerBullets[p.id] > 0);
    let gunnerBtnHtml = "";
    if (activeGunners.length > 0) {
      gunnerBtnHtml = `
        <button class="btn btn-accent" id="btn-gunner-shoot-ui" style="background: #ff5e62; border: 1px solid #ff3b30; color: #fff; margin-top: 15px; width: 100%; max-width: 250px; margin-left: auto; margin-right: auto; display: block;">
          <span>شغل السلاح 🔫</span>
        </button>
      `;
    }

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">النقاش اليومي 🗣️</span>
          <h2>من هو المتهم؟ 🤔</h2>
        </div>

        <div style="margin: 30px 0;">
          <p style="font-size: 1.05rem; color: var(--text-muted); line-height: 1.5;">
            تحدثوا واتهموا وحللوا من استغرق وقتاً طويلاً أو ارتبك أثناء التمرير!
          </p>

          <div style="font-size: 4rem; font-weight: 900; color: #fff; margin: 20px 0;" id="discuss-timer-val">
            ${timerVal}
          </div>
          <button class="btn btn-outline" id="btn-start-discuss-timer" style="margin-bottom: 20px;">
            <span>ابدأ مؤقت النقاش ⏱️</span>
          </button>

          ${gunnerBtnHtml}
        </div>

        <div class="active-players-list-simple" style="text-align: right;">
          <h4>الأعضاء الأحياء حالياً (${gamePlayers.filter(p => p.active).length}):</h4>
          <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">
            ${gamePlayers.map(p => `
              <span class="player-mini-badge" style="background: ${p.color}; opacity: ${p.active ? 1 : 0.2}; text-decoration: ${p.active ? 'none' : 'line-through'};">
                <span>${p.emoji}</span> ${p.name}
              </span>
            `).join('')}
          </div>
        </div>

        <div class="game-controls" style="margin-top: 30px;">
          <button class="btn btn-primary btn-large" id="btn-go-to-vote">
            <span>انتقل للتصويت والإعدام 🗳️</span>
          </button>
        </div>
      </div>
    `;

    const timerLabel = document.getElementById('discuss-timer-val');
    const startTimerBtn = document.getElementById('btn-start-discuss-timer');
    
    startTimerBtn.addEventListener('click', () => {
      startTimerBtn.disabled = true;
      Sounds.playClick();

      timerInterval = setInterval(() => {
        timerVal--;
        if (timerLabel) timerLabel.textContent = timerVal;
        
        if (timerVal <= 10 && timerVal > 0) {
          Sounds.playTick(1.0);
        }

        if (timerVal <= 0) {
          clearInterval(timerInterval);
          Sounds.playFail();
          if (timerLabel) timerLabel.textContent = "انتهى الوقت! 🗳️";
        }
      }, 1000);
    });

    if (activeGunners.length > 0) {
      document.getElementById('btn-gunner-shoot-ui').addEventListener('click', () => {
        Sounds.playClick();
        renderGunnerSelectScreen(activeGunners);
      });
    }

    document.getElementById('btn-go-to-vote').addEventListener('click', () => {
      clearInterval(timerInterval);
      Sounds.playClick();
      startVotePhase();
    });
  };

  const renderGunnerSelectScreen = (activeGunners) => {
    if (activeGunners.length === 1) {
      renderGunnerTargetSelection(activeGunners[0]);
    } else {
      containerEl.innerHTML = `
        <div class="game-card animate-fade-in text-center">
          <div class="game-header">
            <span class="game-badge">إطلاق النار 🔫</span>
            <h2>اختر صاحب السلاح</h2>
          </div>
          <p style="color: var(--text-muted); margin-bottom: 20px;">من هو اللاعب صاحب السلاح الذي يريد إطلاق النار الآن؟</p>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${activeGunners.map(g => `
              <button class="btn btn-outline gunner-select-player-btn" data-gid="${g.id}">
                <span>${g.emoji} ${g.name}</span>
              </button>
            `).join('')}
          </div>
          <button class="btn btn-outline" id="btn-cancel-shoot" style="margin-top: 20px;">إلغاء 🚫</button>
        </div>
      `;
      
      containerEl.querySelectorAll('.gunner-select-player-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          Sounds.playClick();
          const gid = parseInt(btn.getAttribute('data-gid'), 10);
          const gunner = gamePlayers.find(p => p.id === gid);
          renderGunnerTargetSelection(gunner);
        });
      });

      document.getElementById('btn-cancel-shoot').addEventListener('click', () => {
        Sounds.playClick();
        renderDiscussScreen();
      });
    }
  };

  const renderGunnerTargetSelection = (gunner) => {
    const possibleTargets = gamePlayers.filter(p => p.active && p.id !== gunner.id);
    
    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">إطلاق النار 🔫</span>
          <h2>صاحب السلاح: ${gunner.name}</h2>
        </div>
        <p style="color: var(--text-muted); margin-bottom: 20px;">اختر اللاعب الذي تريد إطلاق النار عليه وقتله فوراً:</p>
        
        <div class="targets-list-grid" style="display: flex; flex-direction: column; gap: 8px; max-height: 250px; overflow-y: auto; padding: 5px;">
          ${possibleTargets.map(t => `
            <button class="btn btn-outline gunner-target-btn" data-tid="${t.id}" style="border-color: rgba(255,255,255,0.08); background: rgba(255,255,255,0.01); color: #fff; width: 100%; justify-content: center; display: inline-flex;">
              <span>${t.emoji} ${t.name}</span>
            </button>
          `).join('')}
        </div>

        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button class="btn btn-outline" id="btn-cancel-shoot" style="flex: 1;">إلغاء 🚫</button>
          <button class="btn btn-primary" id="btn-confirm-shoot" disabled style="flex: 1;">تأكيد الإطلاق 🔫</button>
        </div>
      </div>
    `;

    const confirmBtn = document.getElementById('btn-confirm-shoot');
    const targetButtons = containerEl.querySelectorAll('.gunner-target-btn');
    let selectedTid = null;

    targetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        Sounds.playClick();
        targetButtons.forEach(b => {
          b.style.borderColor = 'rgba(255,255,255,0.08)';
        });
        btn.style.borderColor = '#ff5e62';
        selectedTid = parseInt(btn.getAttribute('data-tid'), 10);
        confirmBtn.disabled = false;
      });
    });

    document.getElementById('btn-cancel-shoot').addEventListener('click', () => {
      Sounds.playClick();
      renderDiscussScreen();
    });

    confirmBtn.addEventListener('click', () => {
      Sounds.playClick();
      shootPlayer(gunner.id, selectedTid);
    });
  };

  const shootPlayer = (gunnerId, targetId) => {
    const target = gamePlayers.find(p => p.id === targetId);
    if (!target) return;
    
    target.active = false;
    gunnerBullets[gunnerId] = 0;
    
    Sounds.playFail(); 
    
    let loversDied = true;
    let deadIds = [targetId];
    while (loversDied) {
      loversDied = false;
      if (lovers.length === 2) {
        const p1Id = lovers[0];
        const p2Id = lovers[1];
        if (deadIds.includes(p1Id) && !deadIds.includes(p2Id)) {
          deadIds.push(p2Id);
          loversDied = true;
        } else if (deadIds.includes(p2Id) && !deadIds.includes(p1Id)) {
          deadIds.push(p1Id);
          loversDied = true;
        }
      }
    }
    
    deadIds.forEach(pid => {
      const victim = gamePlayers.find(p => p.id === pid);
      if (victim) {
        victim.active = false;
      }
    });

    let extraDeathHtml = "";
    if (deadIds.length > 1) {
      const otherDead = deadIds.filter(id => id !== targetId).map(id => gamePlayers.find(p => p.id === id));
      extraDeathHtml = `
        <div style="margin-top: 15px; color: #ff5e62; font-weight: 700;">
          💔 وبسبب رابطة العشق، لحق به شريكه وتوفي فوراً:
          ${otherDead.map(od => `<br>${od.emoji} ${od.name} (${getRoleArabicName(od.role)})`).join('')}
        </div>
      `;
    }

    containerEl.innerHTML = `
      <div class="game-card wolves-night-view text-center" style="background: #0a0a0a; border: 2px solid #333; padding: 30px; color: #fff;">
        <span style="font-size: 4rem; display: block; margin-bottom: 20px;">💥</span>
        <h2 style="font-size: 1.8rem; font-weight: 900; color: #ff3333; margin-bottom: 15px;">دوت طلقة في أرجاء القرية!</h2>
        <p style="font-size: 1.1rem; line-height: 1.6; color: #ccc;">
          قام صاحب السلاح بإشهار سلاحه سراً وإطلاق النار على:
        </p>
        <div style="background: #111; border: 1px solid #222; padding: 20px; border-radius: 16px; margin: 20px auto; max-width: 300px;">
          <strong style="font-size: 1.5rem; color: #fff;">${target.emoji} ${target.name}</strong>
          <span style="display: block; font-size: 1rem; color: #888; margin-top: 8px;">وكان دوره الحقيقي هو:</span>
          <strong style="display: block; font-size: 1.3rem; color: #ff4a4a; margin-top: 5px;">${getRoleArabicName(target.role)}</strong>
        </div>
        ${extraDeathHtml}
        
        <div class="game-controls" style="margin-top: 30px;">
          <button class="btn btn-primary" id="btn-after-shoot-continue">
            <span>متابعة النهار ➡️</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-after-shoot-continue').addEventListener('click', () => {
      Sounds.playClick();
      const winner = checkWinConditions();
      if (winner) {
        renderGameOverScreen(winner);
      } else {
        renderDiscussScreen();
      }
    });
  };

  const startVotePhase = () => {
    currentPhase = 'day_vote';
    renderVoteScreen();
  };

  const renderVoteScreen = () => {
    const activePlayers = gamePlayers.filter(p => p.active);

    const activeMayor = activePlayers.find(p => p.role === 'mayor');
    let mayorNoticeHtml = "";
    if (activeMayor) {
      mayorNoticeHtml = `
        <div style="background: rgba(255,215,0,0.05); border: 1px dashed rgba(255,215,0,0.2); padding: 8px; border-radius: 8px; font-size: 0.85rem; color: #ffd700; margin-bottom: 12px; text-align: center;">
          👑 العمدة <strong>${activeMayor.name}</strong> على قيد الحياة وصوته يساوي صوتين!
        </div>
      `;
    }

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">التصويت والإعدام 🗳️</span>
          <h2>من هو الذئب أو القاتل؟</h2>
        </div>

        <p style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 20px;">
          اختاروا اللاعب الذي حصل على أغلبية الأصوات لشنقه، أو اختاروا تخطي الجولة إذا اتفقتم على ذلك:
        </p>

        ${mayorNoticeHtml}

        <div class="targets-list-grid" style="display: flex; flex-direction: column; gap: 8px; max-height: 250px; overflow-y: auto; padding: 5px; margin-bottom: 20px;">
          ${activePlayers.map(p => `
            <button class="btn btn-outline vote-target-btn" data-pid="${p.id}" style="border-color: rgba(255,255,255,0.08); background: rgba(255,255,255,0.01); color: #fff; width: 100%; justify-content: center; display: inline-flex; border-right: 4px solid ${p.color};">
              <span>${p.emoji} ${p.name}</span>
            </button>
          `).join('')}

          <button class="btn btn-outline vote-target-btn" data-pid="skip" style="border-color: #333; background: rgba(255,255,255,0.03); color: var(--text-muted); width: 100%; justify-content: center; display: inline-flex;">
            <span>🚫 تخطي التصويت (لا أحد)</span>
          </button>
        </div>

        <div class="game-controls">
          <button class="btn btn-accent btn-large" id="btn-confirm-vote" disabled>
            <span>تأكيد الحكم والشنق ⚖️</span>
          </button>
        </div>
      </div>
    `;

    const confirmBtn = document.getElementById('btn-confirm-vote');
    const voteButtons = containerEl.querySelectorAll('.vote-target-btn');
    let selectedVotePid = null;

    voteButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        Sounds.playClick();
        voteButtons.forEach(b => {
          b.style.borderColor = 'rgba(255,255,255,0.08)';
          b.style.boxShadow = 'none';
        });

        btn.style.borderColor = 'var(--accent)';
        btn.style.boxShadow = '0 0 10px var(--accent-glow)';

        selectedVotePid = btn.getAttribute('data-pid');
        confirmBtn.disabled = false;
      });
    });

    confirmBtn.addEventListener('click', () => {
      Sounds.playClick();
      executeVotedPlayer(selectedVotePid);
    });
  };

  const executeVotedPlayer = (pid) => {
    if (pid === 'skip') {
      showExecutionRevealScreen(null);
      return;
    }

    const targetId = parseInt(pid, 10);
    const victim = gamePlayers.find(p => p.id === targetId);
    
    victim.active = false;

    if (victim.role === 'fool') {
      renderGameOverScreen('fool', victim);
    } else if (victim.role === 'junior_werewolf') {
      renderJuniorWerewolfRevengeScreen(victim);
    } else {
      showExecutionRevealScreen(victim);
    }
  };

  const renderJuniorWerewolfRevengeScreen = (juniorWolf) => {
    const possibleTargets = gamePlayers.filter(p => p.active && p.id !== juniorWolf.id);
    
    containerEl.innerHTML = `
      <div class="game-card wolves-night-view text-center" style="background: #0a0a0a; border: 2px solid #ff5e62; padding: 25px; color: #fff;">
        <span style="font-size: 3.5rem; display: block; margin-bottom: 20px;">🐺👶</span>
        <h2 style="font-size: 1.6rem; font-weight: 800; color: #ff5e62; margin-bottom: 10px;">انتقام المستذئب الصغير!</h2>
        <p style="color: #ccc; font-size: 0.95rem; margin-bottom: 20px;">
          مرر الهاتف إلى <strong style="color: ${juniorWolf.color};">${juniorWolf.name}</strong> سراً ليختار لاعباً ليموت معه انتقاماً!
        </p>
        
        <div class="targets-list-grid" style="display: flex; flex-direction: column; gap: 8px; max-height: 250px; overflow-y: auto; padding: 5px;">
          ${possibleTargets.map(t => `
            <button class="btn btn-outline jw-target-btn" data-tid="${t.id}" style="border-color: rgba(255,255,255,0.08); background: rgba(255,255,255,0.01); color: #fff; width: 100%; justify-content: center; display: inline-flex;">
              <span>${t.emoji} ${t.name}</span>
            </button>
          `).join('')}
        </div>

        <div style="margin-top: 20px;">
          <button class="btn btn-primary" id="btn-confirm-jw-revenge" disabled style="width: 100%; max-width: 250px;">
            <span>تنفيذ الانتقام المظلم 💀</span>
          </button>
        </div>
      </div>
    `;

    const confirmBtn = document.getElementById('btn-confirm-jw-revenge');
    const targetButtons = containerEl.querySelectorAll('.jw-target-btn');
    let selectedTid = null;

    targetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        Sounds.playClick();
        targetButtons.forEach(b => {
          b.style.borderColor = 'rgba(255,255,255,0.08)';
        });
        btn.style.borderColor = '#ff5e62';
        selectedTid = parseInt(btn.getAttribute('data-tid'), 10);
        confirmBtn.disabled = false;
      });
    });

    confirmBtn.addEventListener('click', () => {
      Sounds.playClick();
      
      const revengeTarget = gamePlayers.find(p => p.id === selectedTid);
      if (revengeTarget) {
        revengeTarget.active = false;
        
        let loversDied = true;
        let deadIds = [revengeTarget.id];
        while (loversDied) {
          loversDied = false;
          if (lovers.length === 2) {
            const p1Id = lovers[0];
            const p2Id = lovers[1];
            if (deadIds.includes(p1Id) && !deadIds.includes(p2Id)) {
              deadIds.push(p2Id);
              loversDied = true;
            } else if (deadIds.includes(p2Id) && !deadIds.includes(p1Id)) {
              deadIds.push(p1Id);
              loversDied = true;
            }
          }
        }
        
        deadIds.forEach(pid => {
          const victim = gamePlayers.find(p => p.id === pid);
          if (victim) {
            victim.active = false;
          }
        });
      }
      
      showExecutionRevealScreen(juniorWolf, revengeTarget);
    });
  };

  const showExecutionRevealScreen = (victim, revengeTarget = null) => {
    Sounds.playFail();
    let messageHtml = "";

    if (victim === null) {
      messageHtml = `
        <div class="victory-box victory-draw" style="margin: 30px 0;">
          <span class="victory-icon">🚫</span>
          <h2>اتفق القرويون على تخطي التصويت!</h2>
          <p>لم يتم شنق أحد في هذا النهار. القاتل والذئاب ما زالوا طلقاء يخططون للّيل القادم!</p>
        </div>
      `;
    } else {
      let revengeHtml = "";
      if (revengeTarget) {
        let loverNote = "";
        if (lovers.length === 2 && lovers.includes(revengeTarget.id)) {
          const partnerId = lovers.find(id => id !== revengeTarget.id);
          const partner = gamePlayers.find(pl => pl.id === partnerId);
          loverNote = `<br>💔 ولحق به حبيبه <strong>${partner.name}</strong> (${getRoleArabicName(partner.role)}) وتوفي فوراً!`;
        }
        
        revengeHtml = `
          <div style="margin-top: 15px; padding: 12px; background: rgba(255, 94, 98, 0.08); border: 1px solid rgba(255, 94, 98, 0.2); border-radius: 12px; color: #ff5e62; font-size: 0.95rem;">
            💀 <strong>انتقام الصغير:</strong> بسبب لعنة المستذئب الصغير، سحب معه اللاعب <strong>${revengeTarget.name}</strong> (${getRoleArabicName(revengeTarget.role)}) إلى القبر!
            ${loverNote}
          </div>
        `;
      }

      messageHtml = `
        <div class="victory-box victory-draw" style="margin: 30px 0; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);">
          <span class="victory-icon">⚖️</span>
          <h2>تم شنق ${victim.name}!</h2>
          <p style="margin-top: 10px; font-size: 0.95rem; color: var(--text-muted);">بعد ربط المشنقة وإعدامه، كشفت البلدة عن هويته الحقيقية وكان:</p>
          <strong style="font-size: 1.6rem; color: #fff; display: block; margin-top: 12px;">${getRoleArabicName(victim.role)}</strong>
          ${revengeHtml}
        </div>
      `;
    }

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">نتيجة المحكمة ⚖️</span>
          <h2>تأكيد الإعدام</h2>
        </div>

        ${messageHtml}

        <div class="game-controls">
          <button class="btn btn-primary btn-large" id="btn-end-day-phase">
            <span>الذهاب للمرحلة التالية ➡️</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-end-day-phase').addEventListener('click', () => {
      Sounds.playClick();
      
      const winner = checkWinConditions();
      if (winner) {
        renderGameOverScreen(winner);
      } else {
        startNightPhase();
      }
    });
  };

  const checkWinConditions = () => {
    const activeSK = gamePlayers.filter(p => p.role === 'serial_killer' && p.active).length;
    const activeArsonist = gamePlayers.filter(p => p.role === 'arsonist' && p.active).length;
    const activeWolves = gamePlayers.filter(p => ['werewolf', 'wolf_seer', 'junior_werewolf'].includes(p.role) && p.active).length;
    const activeVillagers = gamePlayers.filter(p => ['villager', 'seer', 'doctor', 'mayor', 'gunner', 'medium', 'cupid'].includes(p.role) && p.active).length;
    const totalActive = gamePlayers.filter(p => p.active).length;

    if (activeSK > 0 && totalActive <= 2) {
      if (totalActive === 1 || (totalActive === 2 && activeWolves === 0 && activeArsonist === 0)) {
        return 'serial_killer';
      }
    }

    if (activeArsonist > 0 && totalActive <= 2) {
      if (totalActive === 1 || (totalActive === 2 && activeWolves === 0 && activeSK === 0)) {
        return 'arsonist';
      }
    }

    if (activeWolves > 0 && activeSK === 0 && activeArsonist === 0 && activeWolves >= (totalActive - activeWolves)) {
      return 'werewolves';
    }

    if (activeWolves === 0 && activeSK === 0 && activeArsonist === 0) {
      return 'villagers';
    }

    return null;
  };

  const renderGameOverScreen = (winner, specialVictim = null) => {
    currentPhase = 'game_over';
    Sounds.playSuccess();

    // Award global points
    if (window.addGlobalPoints) {
      gamePlayers.forEach(p => {
        let isWinner = false;
        let points = 20;

        if (winner === 'villagers') {
          const isWolf = p.role.includes('werewolf') || p.role.includes('wolf');
          const isSolo = p.role === 'serial_killer' || p.role === 'arsonist' || p.role === 'fool';
          if (!isWolf && !isSolo) {
            isWinner = true;
            points = 25;
          }
        } else if (winner === 'werewolves') {
          const isWolf = p.role.includes('werewolf') || p.role.includes('wolf');
          if (isWolf) {
            isWinner = true;
            points = 30;
          }
        } else if (winner === 'serial_killer' && p.role === 'serial_killer') {
          isWinner = true;
          points = 40;
        } else if (winner === 'arsonist' && p.role === 'arsonist') {
          isWinner = true;
          points = 40;
        } else if (winner === 'fool' && p.role === 'fool') {
          if (specialVictim && specialVictim.id === p.id) {
            isWinner = true;
            points = 40;
          }
        }

        if (isWinner) {
          window.addGlobalPoints(p.id, points);
        }
      });
    }

    let winTitle = "";
    let winDescription = "";
    let winThemeClass = "victory-team-a"; 
    let winIcon = "🏆";

    if (winner === 'villagers') {
      winTitle = "انتصر القرويون! 🔵";
      winDescription = "لقد تم تطهير القرية من الذئاب المتعطشة للدماء ومن القاتل المتسلسل بنجاح! عادت السكينة إلى الديار.";
      winThemeClass = "victory-team-b"; 
      winIcon = "🧑‍🌾";
    } else if (winner === 'werewolves') {
      winTitle = "انتصرت الذئاب! 🔴";
      winDescription = "لقد التهمت الذئاب قرويي البلدة واحداً تلو الآخر حتى تمت السيطرة على القرية بالكامل! عواء النصر يدوي في الليل.";
      winThemeClass = "victory-draw"; 
      winIcon = "🐺";
    } else if (winner === 'serial_killer') {
      winTitle = "فاز القاتل المتسلسل! 🔪";
      winDescription = "لقد تمكن القاتل المتسلسل من تصفية الجميع والوقوف بمفرده كناجٍ وحيد بدم بارد! لعبة عبقرية وهادئة.";
      winThemeClass = "victory-team-a"; 
      winIcon = "🔪";
    } else if (winner === 'arsonist') {
      winTitle = "فاز الحارق! 🔥";
      winDescription = "لقد تمكن الحارق من سكب البنزين على الجميع وإشعال النيران ليحرق القرية بالكامل ويقف وحيداً فوق الرماد!";
      winThemeClass = "victory-draw";
      winIcon = "🔥";
    } else if (winner === 'fool') {
      winTitle = "فاز الأحمق! 🃏";
      winDescription = `لقد نجح <strong>${specialVictim ? specialVictim.name : 'الأحمق'}</strong> في خداعكم بالكامل وجعلكم تصوتون لشنقه! لقد فاز باللعبة بمفرده بينما خسر الجميع!`;
      winThemeClass = "victory-team-a";
      winIcon = "🃏";
    }

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">انتهت اللعبة! 🏁</span>
          <h2>النتيجة النهائية</h2>
        </div>

        <div class="victory-box ${winThemeClass}" style="margin: 25px 0;">
          <span class="victory-icon" style="font-size: 3.5rem;">${winIcon}</span>
          <h2 style="font-size: 1.7rem; color: #fff; font-weight: 800;">${winTitle}</h2>
          <p style="font-size: 0.95rem; color: var(--text-muted); margin-top: 8px; line-height: 1.5;">${winDescription}</p>
        </div>

        <h4 style="text-align: right; margin-bottom: 8px;">أدوار وحالات اللاعبين:</h4>
        <div class="scoreboard-scroll" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 25px; max-height: 200px; overflow-y: auto; padding: 5px;">
          ${gamePlayers.map(p => `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-radius: 12px; border-right: 4px solid ${p.color};">
              <span style="font-weight: 700; color: #fff; text-decoration: ${p.active ? 'none' : 'line-through'}; opacity: ${p.active ? 1 : 0.5};">
                ${p.emoji} ${p.name}
              </span>
              <span style="font-size: 0.85rem; font-weight: 600; color: ${p.active ? 'var(--accent)' : 'var(--danger)'};">
                ${getRoleArabicName(p.role)} (${p.active ? 'حي' : 'ميت 💀'})
              </span>
            </div>
          `).join('')}
        </div>

        <div class="game-controls-stacked">
          <button class="btn btn-primary" id="btn-replay-wolves">لعب من جديد 🔄</button>
          <button class="btn btn-outline" id="btn-exit-wolves">خروج للقائمة الرئيسية 🚪</button>
        </div>
      </div>
    `;

    document.getElementById('btn-replay-wolves').addEventListener('click', () => {
      Sounds.playClick();
      setupGame();
    });

    document.getElementById('btn-exit-wolves').addEventListener('click', () => {
      Sounds.playClick();
      onExitCallback();
    });
  };

  const restart = () => {
    cleanup();
    setupGame();
  };

  const cleanup = () => {
    clearInterval(timerInterval);
    clearInterval(pretendTimeout);
  };

  return {
    init,
    cleanup,
    restart
  };
})();

// Register globally
window.WolvesvilleGame = WolvesvilleGame;
