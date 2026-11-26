/* Sinh Hoa 4.0 — page interactions (vanilla JS, no build step).
 * Each feature only runs when its markup is present, so one file serves both pages. */
(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /** Lowercase + strip Vietnamese accents so "di truyen" matches "Di truyền". */
  function normalize(text) {
    return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
  }

  /* ------------------------------------------------------------------
   * Tab groups: <div data-tabs="name"> with <button data-value="…">.
   * Clicking a button makes it active and fires a "tabchange" event.
   * ------------------------------------------------------------------ */
  function setActiveTab(group, button) {
    $$("button[data-value]", group).forEach(function (b) {
      var active = b === button;
      b.classList.toggle("is-active", active);
      if (b.getAttribute("role") === "tab") {
        b.setAttribute("aria-selected", String(active));
        b.classList.toggle("t-body-m-sb", active);
        b.classList.toggle("t-body-m-med", !active);
      } else {
        b.setAttribute("aria-pressed", String(active));
      }
    });
  }

  $$("[data-tabs]").forEach(function (group) {
    group.addEventListener("click", function (e) {
      var button = e.target.closest("button[data-value]");
      if (!button || button.classList.contains("is-active")) return;
      setActiveTab(group, button);
      group.dispatchEvent(new CustomEvent("tabchange", { detail: button.dataset.value }));
    });
  });

  function onTabChange(name, handler) {
    var group = $('[data-tabs="' + name + '"]');
    if (group) group.addEventListener("tabchange", function (e) { handler(e.detail); });
  }

  /* ------------------------------------------------------------------
   * Carousels: arrow buttons with data-carousel="<track id>" data-dir="±1".
   * ------------------------------------------------------------------ */
  $$("[data-carousel]").forEach(function (button) {
    button.addEventListener("click", function () {
      var track = document.getElementById(button.dataset.carousel);
      if (!track) return;
      var card = track.querySelector(":scope > :not([hidden])");
      var step = card ? card.offsetWidth + 24 : track.clientWidth;
      track.scrollBy({ left: Number(button.dataset.dir) * step, behavior: "smooth" });
    });
  });

  /* ------------------------------------------------------------------
   * Home — "Khoá học Luyện thi" filter
   * ------------------------------------------------------------------ */
  onTabChange("home-courses", function (value) {
    $$("#courses-track .course-card").forEach(function (card) {
      card.hidden = value !== "Tất cả" && card.dataset.tags.split("|").indexOf(value) === -1;
    });
    $("#courses-track").scrollTo({ left: 0 });
  });

  /* ------------------------------------------------------------------
   * Home — "Đề thi thử" filter
   * ------------------------------------------------------------------ */
  onTabChange("home-exams", function (value) {
    var grade = (value.match(/^Chuyên đề (Sinh \d+)$/) || [])[1];
    var featured = $("[data-featured]");
    if (featured) featured.hidden = !(value === "Tất cả" || value === "Luyện đề tổng hợp Sinh 12");
    var cards = $$(".exam-card");
    cards.forEach(function (card) {
      card.hidden = value !== "Tất cả" && card.dataset.grade !== grade;
    });
    var list = $(".exam-cards");
    if (list) list.hidden = cards.every(function (c) { return c.hidden; });
  });

  /* ------------------------------------------------------------------
   * Khoá học page — search, category, quick filter, status, sort, paging
   * ------------------------------------------------------------------ */
  var grid = $("#course-grid");
  if (grid) {
    var cards = $$(".listing-card", grid);
    cards.forEach(function (card) {
      card.dataset.search = normalize(card.querySelector(".listing-card__title").textContent + " " +
        card.querySelector(".chip").textContent + " " + card.querySelector(".cover__title").textContent);
    });

    var state = { query: "", category: "Tất cả", quick: "Video bài giảng", status: "Tất cả", sort: "Phổ biến nhất", page: 1 };
    var countEl = $("#results-count");
    var subEl = $("#results-sub");
    var emptyEl = $("#course-empty");

    function matches(card) {
      var d = card.dataset;
      var offer = d.offer !== undefined;
      if (state.category !== "Tất cả" && d.categories.split("|").indexOf(state.category) === -1) return false;
      if (state.quick === "Có ưu đãi" ? !offer : d.formats.split("|").indexOf(state.quick) === -1) return false;
      if (state.status === "Có ưu đãi" && !offer) return false;
      if (state.status === "Miễn phí" && d.price !== "0") return false;
      if (state.query && d.search.indexOf(state.query) === -1) return false;
      return true;
    }

    var sorters = {
      "Phổ biến nhất": function (a, b) { return a.dataset.index - b.dataset.index; },
      "Đánh giá cao": function (a, b) { return b.dataset.rating - a.dataset.rating || a.dataset.index - b.dataset.index; },
      "Giá thấp đến cao": function (a, b) { return a.dataset.price - b.dataset.price; },
      "Giá cao đến thấp": function (a, b) { return b.dataset.price - a.dataset.price; },
    };

    function applyFilters() {
      var visible = 0;
      cards.slice().sort(sorters[state.sort]).forEach(function (card) {
        grid.appendChild(card); // re-append in sorted order
        card.hidden = !matches(card);
        if (!card.hidden) visible++;
      });
      countEl.textContent = visible + " khoá học";
      subEl.textContent = (state.category === "Tất cả" ? "Tất cả danh mục" : state.category) + " · Môn Sinh học";
      grid.hidden = visible === 0;
      emptyEl.hidden = visible !== 0;
    }

    function resetPage() {
      state.page = 1;
      renderPagination();
    }

    var search = $("#course-search");
    search.addEventListener("input", function () {
      state.query = normalize(search.value.trim());
      applyFilters();
      resetPage();
    });
    $("#course-search-form").addEventListener("submit", function (e) { e.preventDefault(); });

    onTabChange("category", function (v) { state.category = v; applyFilters(); resetPage(); });
    onTabChange("quick", function (v) { state.quick = v; applyFilters(); resetPage(); });

    [["#status-select", "status"], ["#sort-select", "sort"]].forEach(function (pair) {
      var select = $(pair[0]);
      select.addEventListener("change", function () {
        select.parentElement.querySelector(".dropdown__value").textContent = select.value;
        state[pair[1]] = select.value;
        applyFilters();
      });
    });

    /* Pagination — "1 2 3 … 5" style. Total pages come from data-total (mock until there is an API). */
    var pager = $("[data-pagination]");
    var totalPages = Number(pager.dataset.total) || 1;

    function pageItems(page, total) {
      if (total <= 4) return Array.from({ length: total }, function (_, i) { return i + 1; });
      var set = [1, total, page - 1, page, page + 1];
      if (page <= 3) set.push(2, 3);
      if (page >= total - 2) set.push(total - 1, total - 2);
      var pages = set.filter(function (p, i) { return p >= 1 && p <= total && set.indexOf(p) === i; })
        .sort(function (a, b) { return a - b; });
      var out = [];
      pages.forEach(function (p, i) {
        if (i > 0 && p - pages[i - 1] > 1) out.push("…");
        out.push(p);
      });
      return out;
    }

    function renderPagination() {
      var page = state.page;
      var html =
        '<button type="button" class="icon-btn" data-page="' + (page - 1) + '" aria-label="Trang trước"' + (page <= 1 ? " disabled" : "") + ">" +
        '<img src="assets/' + (page <= 1 ? "icon-chevron-left-page.svg" : "icon-chevron-left-circle.svg") + '" width="24" height="24" alt=""></button>';
      pageItems(page, totalPages).forEach(function (p) {
        html += p === "…"
          ? '<span class="pagination__gap t-body-m-med">…</span>'
          : '<button type="button" class="page-item' + (p === page ? ' is-active" aria-current="page"' : '"') + ' data-page="' + p + '">' + p + "</button>";
      });
      html +=
        '<button type="button" class="icon-btn" data-page="' + (page + 1) + '" aria-label="Trang sau"' + (page >= totalPages ? " disabled" : "") + ">" +
        '<img src="assets/icon-chevron-right-circle.svg" width="24" height="24" alt=""></button>';
      pager.innerHTML = html;
    }

    pager.addEventListener("click", function (e) {
      var button = e.target.closest("button[data-page]");
      if (!button || button.disabled) return;
      state.page = Number(button.dataset.page);
      renderPagination();
      // TODO: load this page of courses from the API once it exists.
      $("#danh-sach").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    renderPagination();
  }

  /* ------------------------------------------------------------------
   * Khoá học page — consultation form
   * ------------------------------------------------------------------ */
  var form = $("#consult-form");
  if (form) {
    var goalInput = form.querySelector('input[name="goal"]');
    onTabChange("goal", function (v) { goalInput.value = v; });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var data = Object.fromEntries(new FormData(form));
      // TODO: send `data` to the consultation API.
      console.info("Đăng ký tư vấn:", data);
      var submit = form.querySelector('button[type="submit"] span');
      submit.textContent = "Đã gửi — chúng tôi sẽ liên hệ sớm!";
      form.reset();
      goalInput.value = "TN THPT";
      setActiveTab($('[data-tabs="goal"]', form), $('[data-value="TN THPT"]', form));
      setTimeout(function () { submit.textContent = "Gửi thông tin"; }, 4000);
    });
  }
})();
