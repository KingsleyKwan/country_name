(function () {
  "use strict";

  const DATA = window.COUNTRY_DATA;
  const STORAGE_LANG = "countryNames.lang";
  const STORAGE_MODE = "countryNames.listMode";

  const savedMode = localStorage.getItem(STORAGE_MODE);
  const state = {
    lang: localStorage.getItem(STORAGE_LANG) || "zh-HK",
    listMode: savedMode === "all" ? "all" : "kids",
    continentId: "all",
    view: "home",
    search: "",
    deck: [],
    deckIndex: 0,
    flipped: false,
  };

  const els = {
    brand: document.getElementById("brand"),
    tagline: document.getElementById("tagline"),
    btnZh: document.getElementById("btnZh"),
    btnEn: document.getElementById("btnEn"),
    modeHint: document.getElementById("modeHint"),
    btnModeKids: document.getElementById("btnModeKids"),
    btnModeAll: document.getElementById("btnModeAll"),
    continentGrid: document.getElementById("continentGrid"),
    viewHome: document.getElementById("view-home"),
    viewBrowse: document.getElementById("view-browse"),
    viewPractice: document.getElementById("view-practice"),
    browseTitle: document.getElementById("browseTitle"),
    practiceTitle: document.getElementById("practiceTitle"),
    searchInput: document.getElementById("searchInput"),
    countryList: document.getElementById("countryList"),
    browseEmpty: document.getElementById("browseEmpty"),
    browseBack: document.getElementById("browseBack"),
    practiceBack: document.getElementById("practiceBack"),
    goPractice: document.getElementById("goPractice"),
    goBrowse: document.getElementById("goBrowse"),
    flashcard: document.getElementById("flashcard"),
    flashFlag: document.getElementById("flashFlag"),
    flashHint: document.getElementById("flashHint"),
    flashContinentFront: document.getElementById("flashContinentFront"),
    flashFlagBack: document.getElementById("flashFlagBack"),
    flashNamePrimary: document.getElementById("flashNamePrimary"),
    flashNameSecondary: document.getElementById("flashNameSecondary"),
    flashContinentBack: document.getElementById("flashContinentBack"),
    flashNote: document.getElementById("flashNote"),
    cardProgress: document.getElementById("cardProgress"),
    btnPrev: document.getElementById("btnPrev"),
    btnNext: document.getElementById("btnNext"),
    btnShuffle: document.getElementById("btnShuffle"),
  };

  function t(key) {
    return DATA.ui[state.lang][key] || DATA.ui.en[key] || key;
  }

  function format(template, vars) {
    return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
  }

  function continentById(id) {
    return DATA.continents.find((c) => c.id === id);
  }

  function continentLabel(id) {
    const c = continentById(id);
    if (!c) return id;
    return state.lang === "zh-HK" ? c.zh : c.en;
  }

  function activeCountries() {
    if (state.listMode === "all") return DATA.countries;
    return DATA.countries.filter((c) => c.kids);
  }

  function countriesForContinent(continentId) {
    const pool = activeCountries();
    if (continentId === "all") return pool.slice();
    return pool.filter((c) => c.continent === continentId);
  }

  function countForContinent(continentId) {
    return countriesForContinent(continentId).length;
  }

  function filteredBrowseList() {
    const q = state.search.trim().toLowerCase();
    let list = countriesForContinent(state.continentId);
    if (q) {
      list = list.filter(
        (c) =>
          c.zh.toLowerCase().includes(q) ||
          c.en.toLowerCase().includes(q)
      );
    }
    return list;
  }

  function showView(name) {
    state.view = name;
    const map = {
      home: els.viewHome,
      browse: els.viewBrowse,
      practice: els.viewPractice,
    };
    Object.entries(map).forEach(([key, el]) => {
      const active = key === name;
      el.hidden = !active;
      el.classList.toggle("is-active", active);
    });
  }

  function applyI18n() {
    document.documentElement.lang = state.lang === "zh-HK" ? "zh-HK" : "en";
    els.brand.textContent = t("brand");
    els.tagline.textContent = t("tagline");
    els.btnZh.classList.toggle("is-active", state.lang === "zh-HK");
    els.btnEn.classList.toggle("is-active", state.lang === "en");
    els.searchInput.placeholder = t("searchPlaceholder");
    els.modeHint.textContent = t("modeHint");
    els.btnModeKids.textContent = t("modeKids");
    els.btnModeAll.textContent = t("modeAll");
    els.btnModeKids.classList.toggle("is-active", state.listMode === "kids");
    els.btnModeAll.classList.toggle("is-active", state.listMode === "all");

    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      node.textContent = t(key);
    });

    renderHome();
    if (state.view === "browse") renderBrowse();
    if (state.view === "practice") {
      buildDeck();
      renderFlashcard();
    }
  }

  function setLang(lang) {
    state.lang = lang;
    localStorage.setItem(STORAGE_LANG, lang);
    applyI18n();
  }

  function setListMode(mode) {
    state.listMode = mode === "all" ? "all" : "kids";
    localStorage.setItem(STORAGE_MODE, state.listMode);
    els.btnModeKids.classList.toggle("is-active", state.listMode === "kids");
    els.btnModeAll.classList.toggle("is-active", state.listMode === "all");
    renderHome();
  }

  function renderHome() {
    const continents = DATA.continents;
    els.continentGrid.innerHTML = continents
      .map((c) => {
        const count = countForContinent(c.id);
        const name = state.lang === "zh-HK" ? c.zh : c.en;
        const countLabel = format(t("countriesCount"), { n: count });
        const allClass = c.id === "all" ? " is-all" : "";
        return `
          <button type="button" class="continent-card${allClass}" data-continent="${c.id}">
            <span class="continent-emoji" aria-hidden="true">${c.emoji}</span>
            <span class="continent-name">${name}</span>
            <span class="continent-count">${countLabel}</span>
          </button>
        `;
      })
      .join("");
  }

  function openContinent(continentId) {
    state.continentId = continentId;
    state.search = "";
    els.searchInput.value = "";
    showView("browse");
    renderBrowse();
  }

  function renderBrowse() {
    const cont = continentById(state.continentId);
    els.browseTitle.textContent =
      state.lang === "zh-HK" ? cont.zh : cont.en;

    const list = filteredBrowseList();
    els.browseEmpty.hidden = list.length > 0;
    els.browseEmpty.textContent = t("noResults");

    els.countryList.innerHTML = list
      .map((c, i) => {
        const primary = state.lang === "zh-HK" ? c.zh : c.en;
        const secondary = state.lang === "zh-HK" ? c.en : c.zh;
        const note =
          state.lang === "zh-HK" ? c.noteZh || "" : c.noteEn || "";
        const contName = continentLabel(c.continent);
        return `
          <li class="country-item" style="animation-delay: ${Math.min(i, 12) * 0.03}s">
            <span class="country-flag" aria-hidden="true">${c.flag}</span>
            <div class="country-text">
              <p class="country-primary">${primary}</p>
              <p class="country-secondary">${secondary}</p>
              <p class="country-meta">${t("continentLabel")}: ${contName}</p>
              ${note ? `<p class="country-note">${note}</p>` : ""}
            </div>
          </li>
        `;
      })
      .join("");
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildDeck() {
    state.deck = shuffle(countriesForContinent(state.continentId));
    state.deckIndex = 0;
    state.flipped = false;
  }

  function openPractice() {
    buildDeck();
    showView("practice");
    renderFlashcard();
  }

  function renderFlashcard() {
    const cont = continentById(state.continentId);
    els.practiceTitle.textContent =
      state.lang === "zh-HK" ? cont.zh : cont.en;

    if (!state.deck.length) {
      buildDeck();
    }

    const card = state.deck[state.deckIndex];
    if (!card) return;

    const primary = state.lang === "zh-HK" ? card.zh : card.en;
    const secondary = state.lang === "zh-HK" ? card.en : card.zh;
    const note =
      state.lang === "zh-HK" ? card.noteZh || "" : card.noteEn || "";
    const contName = continentLabel(card.continent);

    els.cardProgress.textContent = format(t("of"), {
      current: state.deckIndex + 1,
      total: state.deck.length,
    });

    els.flashFlag.textContent = card.flag;
    els.flashFlagBack.textContent = card.flag;
    els.flashHint.textContent = state.flipped ? t("tapToHide") : t("tapToFlip");
    els.flashContinentFront.textContent = contName;
    els.flashContinentBack.textContent = `${t("continentLabel")}: ${contName}`;
    els.flashNamePrimary.textContent = primary;
    els.flashNameSecondary.textContent = secondary;
    els.flashNote.textContent = note;
    els.flashNote.hidden = !note;

    els.flashcard.classList.toggle("is-flipped", state.flipped);
    els.flashcard.setAttribute(
      "aria-label",
      state.flipped ? `${primary}, ${secondary}` : contName
    );
  }

  function stepDeck(delta) {
    if (!state.deck.length) return;
    state.deckIndex =
      (state.deckIndex + delta + state.deck.length) % state.deck.length;
    state.flipped = false;
    renderFlashcard();
  }

  // Events
  els.btnZh.addEventListener("click", () => setLang("zh-HK"));
  els.btnEn.addEventListener("click", () => setLang("en"));
  els.btnModeKids.addEventListener("click", () => setListMode("kids"));
  els.btnModeAll.addEventListener("click", () => setListMode("all"));

  els.continentGrid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-continent]");
    if (!btn) return;
    openContinent(btn.getAttribute("data-continent"));
  });

  els.browseBack.addEventListener("click", () => showView("home"));
  els.practiceBack.addEventListener("click", () => showView("browse"));
  els.goPractice.addEventListener("click", () => openPractice());
  els.goBrowse.addEventListener("click", () => {
    showView("browse");
    renderBrowse();
  });

  els.searchInput.addEventListener("input", () => {
    state.search = els.searchInput.value;
    renderBrowse();
  });

  els.flashcard.addEventListener("click", () => {
    state.flipped = !state.flipped;
    renderFlashcard();
  });

  els.btnPrev.addEventListener("click", () => stepDeck(-1));
  els.btnNext.addEventListener("click", () => stepDeck(1));
  els.btnShuffle.addEventListener("click", () => {
    buildDeck();
    renderFlashcard();
  });

  applyI18n();
  showView("home");
})();
