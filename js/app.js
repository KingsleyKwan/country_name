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
    detailCountryId: null,
    practiceReturn: "browse",
    isAssignment: false,
  };

  const els = {
    brand: document.getElementById("brand"),
    tagline: document.getElementById("tagline"),
    btnZh: document.getElementById("btnZh"),
    btnEn: document.getElementById("btnEn"),
    modeHint: document.getElementById("modeHint"),
    btnModeKids: document.getElementById("btnModeKids"),
    btnModeAll: document.getElementById("btnModeAll"),
    btnAssignment: document.getElementById("btnAssignment"),
    assignmentTitle: document.getElementById("assignmentTitle"),
    assignmentSub: document.getElementById("assignmentSub"),
    continentGrid: document.getElementById("continentGrid"),
    viewHome: document.getElementById("view-home"),
    viewBrowse: document.getElementById("view-browse"),
    viewDetail: document.getElementById("view-detail"),
    viewPractice: document.getElementById("view-practice"),
    browseTitle: document.getElementById("browseTitle"),
    practiceTitle: document.getElementById("practiceTitle"),
    searchInput: document.getElementById("searchInput"),
    countryList: document.getElementById("countryList"),
    browseEmpty: document.getElementById("browseEmpty"),
    browseBack: document.getElementById("browseBack"),
    practiceBack: document.getElementById("practiceBack"),
    detailBack: document.getElementById("detailBack"),
    goPractice: document.getElementById("goPractice"),
    goBrowse: document.getElementById("goBrowse"),
    detailTitle: document.getElementById("detailTitle"),
    detailFlag: document.getElementById("detailFlag"),
    detailPrimary: document.getElementById("detailPrimary"),
    detailSecondary: document.getElementById("detailSecondary"),
    detailMeta: document.getElementById("detailMeta"),
    detailNote: document.getElementById("detailNote"),
    detailMapHeading: document.getElementById("detailMapHeading"),
    detailMapStatus: document.getElementById("detailMapStatus"),
    detailNameLabel: document.getElementById("detailNameLabel"),
    detailFlagLabel: document.getElementById("detailFlagLabel"),
    detailContinentLabel: document.getElementById("detailContinentLabel"),
    practiceMapHeading: document.getElementById("practiceMapHeading"),
    practiceMapStatus: document.getElementById("practiceMapStatus"),
    flashcard: document.getElementById("flashcard"),
    flashFlagImg: document.getElementById("flashFlagImg"),
    flashFlagImgBack: document.getElementById("flashFlagImgBack"),
    flashNameFront: document.getElementById("flashNameFront"),
    flashHint: document.getElementById("flashHint"),
    flashContinentFront: document.getElementById("flashContinentFront"),
    flashNamePrimary: document.getElementById("flashNamePrimary"),
    flashNameSecondary: document.getElementById("flashNameSecondary"),
    flashContinentBack: document.getElementById("flashContinentBack"),
    flashNote: document.getElementById("flashNote"),
    cardProgress: document.getElementById("cardProgress"),
    btnPrev: document.getElementById("btnPrev"),
    btnNext: document.getElementById("btnNext"),
    btnShuffle: document.getElementById("btnShuffle"),
  };

  let detailMapApi = null;
  let practiceMapApi = null;

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

  function continentsOf(country) {
    if (Array.isArray(country.continents) && country.continents.length) {
      return country.continents;
    }
    return country.continent ? [country.continent] : [];
  }

  function continentsText(country) {
    const join = state.lang === "zh-HK" ? "、" : ", ";
    return continentsOf(country).map(continentLabel).join(join);
  }

  function continentSectionLabel(country) {
    return continentsOf(country).length > 1
      ? t("labelContinentsMulti")
      : t("labelContinent");
  }

  function placeKind(country) {
    return country.kind || "country";
  }

  function openDetailHint(country) {
    const kind = placeKind(country);
    if (kind === "region") return t("openDetailRegion");
    if (kind === "continent") return t("openDetailContinent");
    return t("openDetailCountry");
  }

  function nameLabelFor(country) {
    const kind = placeKind(country);
    if (kind === "region") return t("labelNameRegion");
    if (kind === "continent") return t("labelNameContinent");
    return t("labelNameCountry");
  }

  function kindNote(country) {
    const kind = placeKind(country);
    if (kind === "region") return t("labelKindRegion");
    if (kind === "continent") return t("labelKindContinent");
    return "";
  }

  function countryById(id) {
    return DATA.countries.find((c) => c.id === id);
  }

  function activeCountries() {
    if (state.listMode === "all") return DATA.countries;
    return DATA.countries.filter((c) => c.kids);
  }

  function countriesForContinent(continentId) {
    const pool = activeCountries();
    if (continentId === "all") return pool.slice();
    return pool.filter((c) => continentsOf(c).includes(continentId));
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
      detail: els.viewDetail,
      practice: els.viewPractice,
    };
    Object.entries(map).forEach(([key, el]) => {
      const active = key === name;
      el.hidden = !active;
      el.classList.toggle("is-active", active);
    });
  }

  function ensureDetailMap() {
    if (!detailMapApi) {
      detailMapApi = CountryMap.createMap(document.getElementById("detailMap"));
    }
    return detailMapApi;
  }

  function ensurePracticeMap() {
    if (!practiceMapApi) {
      practiceMapApi = CountryMap.createMap(document.getElementById("practiceMap"));
    }
    return practiceMapApi;
  }

  function updateAssignmentButton() {
    const n = activeCountries().length;
    els.assignmentTitle.textContent = t("assignment");
    const key = state.listMode === "all" ? "assignmentAll" : "assignmentKids";
    els.assignmentSub.textContent = format(t(key), { n });
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
    els.detailMapHeading.textContent = t("onMap");
    els.practiceMapHeading.textContent = t("onMap");
    els.detailNameLabel.textContent = t("labelName");
    els.detailFlagLabel.textContent = t("labelFlag");
    els.detailContinentLabel.textContent = t("labelContinent");
    updateAssignmentButton();

    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      node.textContent = t(key);
    });

    renderHome();
    if (state.view === "browse") renderBrowse();
    if (state.view === "detail" && state.detailCountryId) openDetail(state.detailCountryId, true);
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
    updateAssignmentButton();
    renderHome();
  }

  function renderHome() {
    updateAssignmentButton();
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
        const flagSrc = CountryMap.flagUrl(c.id, 640);
        return `
          <li>
            <button
              type="button"
              class="country-item"
              data-country="${c.id}"
              style="background-image: url('${flagSrc}'); animation-delay: ${Math.min(i, 12) * 0.03}s"
              aria-label="${primary}"
            >
              <div class="country-text">
                <p class="country-primary">${primary}</p>
                <p class="country-hint">${openDetailHint(c)}</p>
              </div>
            </button>
          </li>
        `;
      })
      .join("");
  }

  function openDetail(countryId, keepView) {
    const c = countryById(countryId);
    if (!c) return;
    state.detailCountryId = countryId;
    if (!keepView) showView("detail");

    const primary = state.lang === "zh-HK" ? c.zh : c.en;
    const secondary = state.lang === "zh-HK" ? c.en : c.zh;
    const note = state.lang === "zh-HK" ? c.noteZh || "" : c.noteEn || "";
    const contName = continentsText(c);
    const kindExtra = kindNote(c);
    const combinedNote = [kindExtra, note].filter(Boolean).join(state.lang === "zh-HK" ? " · " : " · ");

    els.detailTitle.textContent = primary;
    els.detailNameLabel.textContent = nameLabelFor(c);
    els.detailFlagLabel.textContent = t("labelFlag");
    els.detailContinentLabel.textContent = continentSectionLabel(c);
    els.detailPrimary.textContent = primary;
    els.detailSecondary.textContent = secondary;
    els.detailMeta.textContent = contName;
    els.detailNote.textContent = combinedNote;
    els.detailNote.hidden = !combinedNote;
    els.detailFlag.src = CountryMap.flagUrl(c.id, 320);
    els.detailFlag.alt = primary;
    els.detailMapHeading.textContent = t("onMap");

    const api = ensureDetailMap();
    CountryMap.showCountry(
      api,
      countryId,
      els.detailMapStatus,
      t("mapLoading"),
      t("mapError")
    );
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
    state.isAssignment = false;
    state.practiceReturn = "browse";
    buildDeck();
    showView("practice");
    renderFlashcard();
  }

  function openAssignment() {
    state.continentId = "all";
    state.isAssignment = true;
    state.practiceReturn = "home";
    buildDeck();
    showView("practice");
    renderFlashcard();
  }

  function renderFlashcard() {
    if (state.isAssignment) {
      els.practiceTitle.textContent = `${t("assignmentTitle")} · ${state.deck.length}`;
    } else {
      const cont = continentById(state.continentId);
      els.practiceTitle.textContent =
        state.lang === "zh-HK" ? cont.zh : cont.en;
    }
    els.practiceMapHeading.textContent = t("onMap");

    if (!state.deck.length) {
      buildDeck();
    }

    const card = state.deck[state.deckIndex];
    if (!card) return;

    const primary = state.lang === "zh-HK" ? card.zh : card.en;
    const secondary = state.lang === "zh-HK" ? card.en : card.zh;
    const note =
      state.lang === "zh-HK" ? card.noteZh || "" : card.noteEn || "";
    const contName = continentsText(card);

    els.cardProgress.textContent = format(t("of"), {
      current: state.deckIndex + 1,
      total: state.deck.length,
    });

    const flagSrc = CountryMap.flagUrl(card.id, 160);
    els.flashFlagImg.src = flagSrc;
    els.flashFlagImgBack.src = flagSrc;
    els.flashFlagImgBack.alt = primary;
    els.flashNamePrimary.textContent = primary;
    els.flashNameSecondary.textContent = secondary;
    els.flashContinentBack.textContent = `${continentSectionLabel(card)}: ${contName}`;
    els.flashNote.textContent = note;
    els.flashNote.hidden = !note;

    if (state.isAssignment) {
      // Front: name only — hide flag, continents, and map until flip
      els.flashFlagImg.hidden = true;
      els.flashNameFront.hidden = false;
      els.flashNameFront.textContent = primary;
      els.flashContinentFront.hidden = true;
      els.flashHint.textContent = state.flipped ? t("tapToHide") : t("tapToReveal");
      els.flashFlagImg.alt = "";
    } else {
      els.flashFlagImg.hidden = false;
      els.flashNameFront.hidden = true;
      els.flashContinentFront.hidden = false;
      els.flashContinentFront.textContent = contName;
      els.flashHint.textContent = state.flipped ? t("tapToHide") : t("tapToFlip");
      els.flashFlagImg.alt = state.flipped ? primary : "";
    }

    els.flashcard.classList.toggle("is-flipped", state.flipped);
    els.flashcard.setAttribute(
      "aria-label",
      state.flipped ? `${primary}, ${secondary}, ${contName}` : primary
    );

    const mapFrame = document.querySelector(".map-frame-practice");
    const mapHeading = els.practiceMapHeading;
    if (state.isAssignment && !state.flipped) {
      if (mapFrame) mapFrame.hidden = true;
      mapHeading.hidden = true;
    } else {
      if (mapFrame) mapFrame.hidden = false;
      mapHeading.hidden = false;
      const api = ensurePracticeMap();
      CountryMap.showCountry(
        api,
        card.id,
        els.practiceMapStatus,
        t("mapLoading"),
        t("mapError")
      );
    }
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
  els.btnAssignment.addEventListener("click", () => openAssignment());

  els.continentGrid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-continent]");
    if (!btn) return;
    openContinent(btn.getAttribute("data-continent"));
  });

  els.countryList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-country]");
    if (!btn) return;
    openDetail(btn.getAttribute("data-country"));
  });

  els.browseBack.addEventListener("click", () => showView("home"));
  els.detailBack.addEventListener("click", () => showView("browse"));
  els.practiceBack.addEventListener("click", () => {
    if (state.practiceReturn === "home") {
      showView("home");
    } else {
      showView("browse");
      renderBrowse();
    }
  });
  els.goPractice.addEventListener("click", () => openPractice());
  els.goBrowse.addEventListener("click", () => {
    if (state.isAssignment) {
      state.continentId = "all";
      showView("browse");
      renderBrowse();
      return;
    }
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

  // Warm map data in background
  CountryMap.loadWorld().catch(() => {});

  applyI18n();
  showView("home");
})();
