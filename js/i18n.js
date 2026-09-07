/* REIN 1V1 - Centralized i18n & Language System */
const I18n = (function() {
  const STORAGE_KEY = 'rein1v1_lang';
  let currentLang = 'en';

  const translations = {
    en: {
      // Navbar & General
      brandTitle: 'REIN 1V1',
      brandTag: 'PRO GROUPS',
      navLeaderboard: '🏆 Leaderboard',
      navRanks: '🏅 Rank Info',
      navTournaments: '⚔️ Tournaments & Groups',
      navMatches: '📊 Match History',
      navAdmin: '⚡ DEV Admin',
      soundOn: '🔊 Sound: ON',
      soundOff: '🔇 Sound: OFF',
      logInSignUp: 'Log In / Sign Up',
      exit: 'Exit',
      devBadge: 'DEV',

      // Hero Section
      heroTitle: 'R6 SIEGE GROUP STAGE CHAMPIONSHIP',
      heroSubtitle: 'Every competitor starts at <strong>500 ELO (Gold)</strong>. ELO is dynamically calculated from round-by-round results (<strong>+15 Win / -10 Loss</strong>) scaled against opponent strength.',
      statStartingElo: '500 ELO',
      statStartingLabel: 'Starting Rating',
      statFormatVal: 'Double Elim',
      statFormatLabel: 'Dynamic Bracket',
      statEloVal: 'Round-Based',
      statEloLabel: 'ELO Calculation',
      statChampVal: '2000+',
      statChampLabel: 'Champion Rank',

      // Leaderboard
      tournamentLabel: 'Tournament:',
      searchPlaceholder: 'Search player or tag...',
      allTiers: 'All Rank Tiers',
      colRank: 'Rank ▲▼',
      colPlayer: 'Player',
      colTier: 'Rank Tier',
      colElo: 'ELO Rating ▲▼',
      colWL: 'W-L',
      colWinrate: 'Win Rate ▲▼',
      colStreak: '🔥 Streak ▲▼',
      noPlayersFound: 'No players found in this leaderboard.',

      // Ranks Page
      rankPageTitle: '🏅 ELO RANK SYSTEM',
      rankPageSub: 'Rank is determined strictly by your ELO rating. <strong>Click any rank card below to view detailed ELO bounds, difficulty rules, and sample round match calculations.</strong>',
      clickRankCard: 'CLICK ANY RANK CARD TO INSPECT DETAILS',
      clickForDetails: 'Click for Details ➔',
      howEloWorks: '⚡ ROUND-BASED ELO SYSTEM EXPLANATION',
      roundPointsTitle: '🎯 Round Win & Loss Points',
      roundPointsDesc: 'ELO is calculated from round-by-round results: <strong>+15 points for every round won</strong> and <strong>-10 points for every round lost</strong>. Close matches yield smaller ELO shifts, while dominant blowouts yield large ELO gains.',
      multiplierTitle: '⚔️ Opponent ELO Rating Multiplier',
      multiplierDesc: 'Round points are scaled by opponent rating strength:',
      mult1: 'Beating a higher-ELO opponent: Multiplies ELO gain.',
      mult2: 'Beating a lower-ELO opponent: Yields smaller ELO gain.',
      mult3: 'Losing to a lower-ELO opponent: Increases ELO loss penalty.',
      mult4: 'Losing to a higher-ELO opponent: Reduces ELO loss penalty.',

      // Tournaments Page
      allTournaments: 'ALL TOURNAMENTS',
      startLabel: 'Start:',
      showBracketBtn: '🎮 Show Tournament & Bracket',
      backToTournaments: '← Back to All Tournaments',
      startDate: '📅 Start Date:',
      totalParticipants: '👥 Total Participants:',
      formatLabel: '⚙️ Format:',
      formatVal: 'Group Stage & True Double Elimination',
      groupStandings: 'Group Stage Standings',
      dynamicBracketTitle: '🎮 DYNAMIC DOUBLE ELIMINATION BRACKET',
      bracketAdapted: 'Auto-adapted with Winner & Loser Brackets for {count} Participants',
      winnerBracketHeader: '🏆 WINNER BRACKET',
      loserBracketHeader: '💀 LOSER BRACKET',
      grandFinalHeader: '👑 GRAND FINAL',
      tournamentChampion: 'TOURNAMENT CHAMPION',

      // Match Statuses & Brackets
      statusLive: '🔴 LIVE',
      statusCompleted: 'DONE',
      statusUpcoming: 'UPCOMING',
      grandFinalTitle: '👑 GRAND FINAL MATCH',
      gfResetTitle: '🔥 GRAND FINAL RESET MATCH',

      // Matches Tab
      matchResultsTitle: 'TOURNAMENT MATCH RESULTS',
      noMatchesFound: 'No match history available for this tournament.',

      // DEV Admin
      adminTitle: '⚡ DEV MANAGEMENT SUITE',
      adminLockedTitle: 'DEV ADMIN ACCESS REQUIRED',
      adminLockedSub: 'Enter the DEV administrator passcode to unlock live player editing, round match recording, group stage generation, and tournament controls.',
      enterPasscode: 'Enter DEV Passcode (rein1v1dev)',
      unlockBtn: 'Unlock DEV Portal',
      btnRecordMatch: '🎮 Record Round Match',
      btnGenerateGroups: '⚙️ Generate Groups',
      btnAddPlayer: '➕ Add Player',
      btnCreateTourney: '🏆 Create Tournament',
      btnBackupJson: '💾 Backup JSON',
      btnRestoreJson: '📂 Restore JSON',
      managingTourney: 'Managing Tournament:',
      noPlayersRegistered: 'No players registered in this tournament yet. Use "Add New Player" above.',
      colPlace: 'Place',
      colPlayerGroup: 'Player & Group',
      colReorder: 'Reorder Place',
      colActions: 'Actions',
      btnEdit: 'Edit',
      btnDelete: 'Delete',

      // Modals
      authTitle: 'PLAYER AUTHENTICATION',
      emailOrUser: 'Email or Username',
      password: 'Password',
      login: 'Log In',
      noAccount: "Don't have an account?",
      signUpHere: 'Sign Up Here',
      hasAccount: 'Already have an account?',
      logInHere: 'Log In Here',
      createAccount: 'Create Account',
      playerName: 'Player Username',
      emailAddr: 'Email Address',

      // Record Match Modal
      recordMatchTitle: '🎮 RECORD ROUND MATCH RESULT',
      player1: 'Player 1',
      player2: 'Player 2',
      p1RoundsWon: 'Player 1 Rounds Won',
      p2RoundsWon: 'Player 2 Rounds Won',
      eloImpactPreview: 'Calculated Round ELO Impact Preview',
      confirmMatchBtn: 'Confirm & Apply Match Result',

      // Add/Edit Player Modal
      addPlayerTitle: '➕ ADD NEW PLAYER',
      editPlayerTitle: '✏️ EDIT PLAYER DETAILS',
      battleTagOpt: 'BattleTag (Optional)',
      groupAssign: 'Group Assignment',
      startingElo: 'Starting ELO',
      wins: 'Wins',
      losses: 'Losses',
      streak: 'Streak',
      avatarEmoji: 'Avatar Emoji',
      addPlayerBtn: 'Add Player To Leaderboard',
      saveChangesBtn: 'Save Changes',

      // Create Tourney Modal
      createTourneyTitle: '🏆 CREATE TOURNAMENT',
      tourneyName: 'Tournament Name',
      prizePool: 'Prize Pool',
      participantCount: 'Participant / Team Count',
      statusLabel: 'Status',
      launchTourneyBtn: 'Launch Tournament',

      // Generate Groups Modal
      genGroupsTitle: '⚙️ GENERATE DYNAMIC GROUP STAGE',
      totalTeams: 'Total Number of Teams / Participants',
      genGroupsSub: 'Groups (Group A, Group B, Group C...) will automatically be generated based on this team count.',
      genGroupsBtn: 'Generate & Balance Group Stage',

      // Player Profile Modal
      playerStatsTitle: 'PLAYER STATS & PROFILE',
      currentRating: 'Current Rating',
      tourneyRank: 'Tournament Rank',
      perfRecord: 'Performance Record',
      currWinStreak: 'Current Win Streak:',
      totalMatches: 'Total Matches:',
      victories: 'Victories:',
      defeats: 'Defeats:',

      // Ranks
      rankChampion: 'Champion',
      rankGrandmaster: 'Grandmaster',
      rankMaster: 'Master',
      rankDiamond: 'Diamond',
      rankPlatinum: 'Platinum',
      rankGold: 'Gold',
      rankSilver: 'Silver',
      rankBronze: 'Bronze'
    },
    ar: {
      // Navbar & General
      brandTitle: 'راين 1 ضد 1',
      brandTag: 'المجموعات المحترفة',
      navLeaderboard: '🏆 قائمة المتصدرين',
      navRanks: '🏅 معلومات الرتب',
      navTournaments: '⚔️ البطولات والمجموعات',
      navMatches: '📊 سجل المباريات',
      navAdmin: '⚡ لوحة التطوير',
      soundOn: '🔊 الصوت: مفعّل',
      soundOff: '🔇 الصوت: مكتوم',
      logInSignUp: 'تسجيل الدخول / حساب جديد',
      exit: 'خروج',
      devBadge: 'مطور',

      // Hero Section
      heroTitle: 'بطولة المجموعات لسيج R6',
      heroSubtitle: 'يبدأ كل متنافس برتبة <strong>500 ELO (ذهبي)</strong>. يتم احتساب نقاط ELO ديناميكيًا بناءً على نتائج الجولات (<strong>+15 للفوز / -10 للخسارة</strong>) وفق قوة المنافس.',
      statStartingElo: '500 ELO',
      statStartingLabel: 'التقييم الأولي',
      statFormatVal: 'تصفية مزدوجة',
      statFormatLabel: 'سلم تنافسي',
      statEloVal: 'حسب الجولات',
      statEloLabel: 'حساب النقاط',
      statChampVal: '+2000',
      statChampLabel: 'رتبة البطل',

      // Leaderboard
      tournamentLabel: 'البطولة:',
      searchPlaceholder: 'ابحث عن لاعب أو تاغ...',
      allTiers: 'جميع الرتب',
      colRank: 'المركز ▲▼',
      colPlayer: 'اللاعب',
      colTier: 'الرتبة',
      colElo: 'تقييم ELO ▲▼',
      colWL: 'فوز-خسارة',
      colWinrate: 'نسبة الفوز ▲▼',
      colStreak: '🔥 السلسلة ▲▼',
      noPlayersFound: 'لم يتم العثور على لاعبين في هذه البطولة.',

      // Ranks Page
      rankPageTitle: '🏅 نظام رتب ELO التنافسي',
      rankPageSub: 'تحدد رتبتك بناءً على تقييم ELO الخاص بك. <strong>انقر على أي بطاقة رتبة لعرض النطاقات وقواعد الصعوبة وأمثلة الحسابات.</strong>',
      clickRankCard: 'انقر على أي بطاقة للتفاصيل',
      clickForDetails: 'انقر للتفاصيل ➔',
      howEloWorks: '⚡ شرح نظام ELO المبني على الجولات',
      roundPointsTitle: '🎯 نقاط الفوز والخسارة للجولات',
      roundPointsDesc: 'يتم احتساب نقاط ELO من نتائج كل جولة: <strong>+15 نقطة لكل جولة فوز</strong> و <strong>-10 نقاط لكل جولة خسارة</strong>. المباريات التقاربة تعطي تغييرًا أقل، بينما الانتصارات الساحقة تعطي قفزات كبيرة.',
      multiplierTitle: '⚔️ معامل تقييم المنافس',
      multiplierDesc: 'يتم تضخيم نقاط الجولة وفقًا لتقييم المنافس:',
      mult1: 'الفوز على منافس أعلى تقييمًا: يضاعف مكاسب ELO.',
      mult2: 'الفوز على منافس أقل تقييمًا: يعطي مكاسب ELO أقل.',
      mult3: 'الخسارة أمام منافس أقل تقييمًا: تزيد عقوبة الخسارة.',
      mult4: 'الخسارة أمام منافس أعلى تقييمًا: تقلل عقوبة الخسارة.',

      // Tournaments Page
      allTournaments: 'جميع البطولات',
      startLabel: 'البدء:',
      showBracketBtn: '🎮 عرض البطولة والسلم التنافسي',
      backToTournaments: '← العودة إلى قائمة البطولات',
      startDate: '📅 تاريخ البدء:',
      totalParticipants: '👥 إجمالي المشاركين:',
      formatLabel: '⚙️ النظام:',
      formatVal: 'مرحلة المجموعات والتصفية المزدوجة',
      groupStandings: 'ترتيب مرحلة المجموعات',
      dynamicBracketTitle: '🎮 سلم التصفية المزدوجة التفاعلي',
      bracketAdapted: 'تكيف تلقائي مع سلم الفائزين والخاسرين لـ {count} مشارك',
      winnerBracketHeader: '🏆 سلم الفائزين (WINNER BRACKET)',
      loserBracketHeader: '💀 سلم الخاسرين (LOSER BRACKET)',
      grandFinalHeader: '👑 النهائي الكبير (GRAND FINAL)',
      tournamentChampion: 'بطل البطولة',

      // Match Statuses & Brackets
      statusLive: '🔴 مباشر',
      statusCompleted: 'مكتمل',
      statusUpcoming: 'قادم',
      grandFinalTitle: '👑 مباراة النهائي الكبير',
      gfResetTitle: '🔥 مباراة إعادة النهائي الكبير',

      // Matches Tab
      matchResultsTitle: 'نتائج مباريات البطولة',
      noMatchesFound: 'لا يوجد سجل مباريات لهذه البطولة حالياً.',

      // DEV Admin
      adminTitle: '⚡ جناح إدارة المطورين',
      adminLockedTitle: 'مطلوب صلاحيات المطور',
      adminLockedSub: 'أدخل رمز مرور المطور لفتح تعديل اللاعبين وتسجيل المباريات وإنشاء المجموعات والتحكم في البطولات.',
      enterPasscode: 'أدخل رمز المرور (rein1v1dev)',
      unlockBtn: 'فتح لوحة التطوير',
      btnRecordMatch: '🎮 تسجيل نتيجة مباراة',
      btnGenerateGroups: '⚙️ إنشاء المجموعات',
      btnAddPlayer: '➕ إضافة لاعب',
      btnCreateTourney: '🏆 إنشاء بطولة',
      btnBackupJson: '💾 نسخة احتياطية JSON',
      btnRestoreJson: '📂 استعادة JSON',
      managingTourney: 'إدارة البطولة:',
      noPlayersRegistered: 'لا يوجد لاعبون مسجلون في هذه البطولة بعد. استخدم "إضافة لاعب جديد" أعلاه.',
      colPlace: 'المركز',
      colPlayerGroup: 'اللاعب والمجموعة',
      colReorder: 'إعادة الترتيب',
      colActions: 'الإجراءات',
      btnEdit: 'تعديل',
      btnDelete: 'حذف',

      // Modals
      authTitle: 'مصادقة اللاعبين',
      emailOrUser: 'البريد الإلكتروني أو اسم المستخدم',
      password: 'كلمة المرور',
      login: 'تسجيل الدخول',
      noAccount: 'ليس لديك حساب؟',
      signUpHere: 'سجل هنا',
      hasAccount: 'لديك حساب بالفعل؟',
      logInHere: 'سجل الدخول هنا',
      createAccount: 'إنشاء حساب جديد',
      playerName: 'اسم المستخدم للاعب',
      emailAddr: 'عنوان البريد الإلكتروني',

      // Record Match Modal
      recordMatchTitle: '🎮 تسجيل نتيجة مباراة الجولات',
      player1: 'اللاعب الأول',
      player2: 'اللاعب الثاني',
      p1RoundsWon: 'جولات فوز اللاعب الأول',
      p2RoundsWon: 'جولات فوز اللاعب الثاني',
      eloImpactPreview: 'معاينة تأثير ELO للجولات',
      confirmMatchBtn: 'تأكيد وتطبيق نتيجة المباراة',

      // Add/Edit Player Modal
      addPlayerTitle: '➕ إضافة لاعب جديد',
      editPlayerTitle: '✏️ تعديل بيانات اللاعب',
      battleTagOpt: 'باتل تاغ (اختياري)',
      groupAssign: 'تحديد المجموعة',
      startingElo: 'تقييم ELO الأولي',
      wins: 'الانتصارات',
      losses: 'الهزائم',
      streak: 'السلسلة',
      avatarEmoji: 'الرمز التعبيري',
      addPlayerBtn: 'إضافة اللاعب للقائمة',
      saveChangesBtn: 'حفظ التغييرات',

      // Create Tourney Modal
      createTourneyTitle: '🏆 إنشاء بطولة جديدة',
      tourneyName: 'اسم البطولة',
      prizePool: 'جائزة البطولة',
      participantCount: 'عدد المشاركين / الفرق',
      statusLabel: 'الحالة',
      launchTourneyBtn: 'إطلاق البطولة',

      // Generate Groups Modal
      genGroupsTitle: '⚙️ إنشاء مرحلة المجموعات الديناميكية',
      totalTeams: 'عدد الفرق / المشاركين الإجمالي',
      genGroupsSub: 'سيتم توليد المجموعات تلقائيًا بناءً على هذا العدد من الفرق.',
      genGroupsBtn: 'إنشاء وموازنة المجموعات',

      // Player Profile Modal
      playerStatsTitle: 'إحصائيات وملف اللاعب',
      currentRating: 'التقييم الحالي',
      tourneyRank: 'ترتيب البطولة',
      perfRecord: 'سجل الأداء',
      currWinStreak: 'سلسلة الانتصارات الحالية:',
      totalMatches: 'إجمالي المباريات:',
      victories: 'الانتصارات:',
      defeats: 'الهزائم:',

      // Ranks
      rankChampion: 'البطل (Champion)',
      rankGrandmaster: 'الجراند ماستر (Grandmaster)',
      rankMaster: 'الماستر (Master)',
      rankDiamond: 'الدايموند (Diamond)',
      rankPlatinum: 'البلاتينيوم (Platinum)',
      rankGold: 'الذهبي (Gold)',
      rankSilver: 'الفضي (Silver)',
      rankBronze: 'البرونزي (Bronze)'
    }
  };

  function init() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && (stored === 'en' || stored === 'ar')) {
        currentLang = stored;
      } else {
        currentLang = 'en';
      }
    } catch (e) {
      currentLang = 'en';
    }
    applyLanguage(currentLang);
  }

  function setLanguage(lang) {
    if (lang !== 'en' && lang !== 'ar') return;
    currentLang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {}
    applyLanguage(lang);
  }

  function toggleLanguage() {
    const nextLang = currentLang === 'en' ? 'ar' : 'en';
    setLanguage(nextLang);
    return nextLang;
  }

  function getLanguage() {
    return currentLang;
  }

  function isRTL() {
    return currentLang === 'ar';
  }

  function t(key, replacements = {}) {
    const langDict = translations[currentLang] || translations.en;
    let str = langDict[key] || translations.en[key] || key;

    Object.keys(replacements).forEach(k => {
      str = str.replace(`{${k}}`, replacements[k]);
    });

    return str;
  }

  function applyLanguage(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    if (lang === 'ar') {
      document.body.classList.add('rtl-mode');
    } else {
      document.body.classList.remove('rtl-mode');
    }

    // Update static DOM elements marked with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (key) {
        if (el.tagName === 'INPUT' && el.type === 'text') {
          el.placeholder = t(key);
        } else {
          el.innerHTML = t(key);
        }
      }
    });

    // Update language switcher button text
    const langBtn = document.getElementById('lang-toggle-btn');
    if (langBtn) {
      langBtn.innerHTML = lang === 'ar' ? '🇺🇸 English' : '🇸🇦 العربية';
    }

    // Notify App to refresh active view content if initialized
    if (typeof App !== 'undefined' && App.renderCurrentView) {
      App.renderCurrentView();
    }
  }

  init();

  return {
    init,
    setLanguage,
    toggleLanguage,
    getLanguage,
    isRTL,
    t,
    applyLanguage
  };
})();
