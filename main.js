(() => {
  let currentCard = null;
  let cardsData = [];
  let favorites = new Set();
  let activeTab = 'all';
  let activeTag = null;

  // --- carregar JSON ---
  async function loadCardsData() {
    try {
      const res = await fetch('https://novalendae.github.io/Links-dos-apps-e-sites/servicos.json');
      if (!res.ok) throw new Error('Erro ao buscar JSON: ' + res.status);
      const data = await res.json();
      cardsData = data.map(item => ({
  id: item.id,
  title: item.nome,
  desc: item.descricao,
  url: item.link,
  tags: item.tags || [],
  detalhes: item.detalhes || "",
  imagens: Array.isArray(item.imagem) ? item.imagem : (item.imagem ? [item.imagem] : [])
}));
      renderCards();
    } catch (err) {
      console.error(err);
    }
  }

  loadCardsData();

  // --- elementos ---
  const searchInput = document.getElementById('searchInput');
  const searchDropdown = document.getElementById('searchDropdown');
  const cardsContainer = document.getElementById('cardsContainer');
  const tabAll = document.getElementById('tab-all');
  const tabFavs = document.getElementById('tab-favs');
  const favCountEl = document.getElementById('favCount');
  const filterBar = document.getElementById('filterBar');
  const activeTagName = document.getElementById('activeTagName');
  const clearFilterBtn = document.getElementById('clearFilter');
  const emptyState = document.getElementById('emptyState');

  // --- favoritos ---
  function loadFavorites() {
    try {
      const raw = localStorage.getItem('lt_favs');
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  }

  function saveFavorites() { localStorage.setItem('lt_favs', JSON.stringify([...favorites])); }

  function toggleFavorite(id) {
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    saveFavorites();
    updateFavCount();
    renderCards();
  }

  function updateFavCount() { favCountEl.textContent = favorites.size; }

  favorites = loadFavorites();
  updateFavCount();

  // --- tabs ---
  function setActiveTab() {
    if (activeTab === 'all') {
      tabAll.classList.add('active');
      tabFavs.classList.remove('active');
    } else {
      tabAll.classList.remove('active');
      tabFavs.classList.add('active');
    }
  }

  tabAll.addEventListener('click', () => { activeTab = 'all'; setActiveTab(); renderCards(); });
  tabFavs.addEventListener('click', () => { activeTab = 'favs'; setActiveTab(); renderCards(); });

  // --- filtro por tag ---
  clearFilterBtn.addEventListener('click', () => {
    activeTag = null;
    filterBar.classList.add('hidden');
    renderCards();
  });

  function applyTagFilter(tagName) {
    activeTag = tagName;
    activeTagName.textContent = tagName;
    filterBar.classList.remove('hidden');
    hideSearchDropdown();
    searchInput.value = '';
    activeTab = 'all';
    setActiveTab();
    renderCards();
    closeCardModal();
  }

  // --- search ---
  searchInput.addEventListener('input', onSearchInput);
  document.addEventListener('click', e => { if (!e.target.closest('.search-wrap')) hideSearchDropdown(); });

  function onSearchInput(e) {
    const q = (e.target.value || '').trim();
    if (!q) { hideSearchDropdown(); return; }
    const results = searchQuery(q);
    showDropdown(results);
  }

  function searchQuery(query) {
    const q = query.toLowerCase();
    const cardMatches = cardsData.filter(c => c.title.toLowerCase().includes(q))
      .map(c => ({ type: 'card', id: c.id, title: c.title, url: c.url }));
    const tagSet = new Set();
    cardsData.forEach(c => { c.tags.forEach(t => { if (t.toLowerCase().includes(q)) tagSet.add(t); }); });
    const tagMatches = Array.from(tagSet).map(t => ({ type: 'tag', tag: t }));
    return { cards: cardMatches, tags: tagMatches };
  }

  function showDropdown(results) {
    const { cards, tags } = results;
    searchDropdown.innerHTML = '';
    if (!cards.length && !tags.length) {
      searchDropdown.innerHTML = `<div class="search-item"><div class="search-label">Nada</div><div class="search-title">Nenhum resultado</div></div>`;
      searchDropdown.classList.remove('hidden');
      return;
    }

    tags.forEach(t => {
      const node = document.createElement('div');
      node.className = 'search-item';
      node.innerHTML = `<div class="search-label">Tag:</div><div class="search-title">${escapeHtml(t.tag)}</div>`;
      node.addEventListener('click', () => applyTagFilter(t.tag));
      searchDropdown.appendChild(node);
    });

    cards.forEach(c => {
      const node = document.createElement('div');
      node.className = 'search-item';
      node.innerHTML = `<div class="search-label">Card:</div><div class="search-title">${escapeHtml(c.title)}</div>`;
      node.addEventListener('click', () => window.open(c.url, '_blank', 'noopener'));
      searchDropdown.appendChild(node);
    });

    searchDropdown.classList.remove('hidden');
  }

  function hideSearchDropdown() { searchDropdown.classList.add('hidden'); }

  // --- renderização dos cards ---
  function getVisibleCards() {
    let list = cardsData.slice();
    if (activeTab === 'favs') list = list.filter(c => favorites.has(c.id));
    if (activeTag) list = list.filter(c => c.tags.map(t => t.toLowerCase()).includes(activeTag.toLowerCase()));
    return list;
  }

  function renderCards() {
    const visible = getVisibleCards();
    cardsContainer.innerHTML = '';
    if (!visible.length) { emptyState.classList.remove('hidden'); return; }
    else emptyState.classList.add('hidden');

    visible.forEach(card => {
      const el = document.createElement('article');
      el.className = 'card';
      el.innerHTML = `
        <div class="row">
          <a class="title" href="#">${escapeHtml(card.title)}</a>
          <button class="fav-btn ${favorites.has(card.id)?'active':''}" title="Favoritar" data-id="${card.id}">
            ${favorites.has(card.id)?'♥':'♡'}
          </button>
        </div>
        <div class="desc">${escapeHtml(card.desc||'')}</div>
        <div class="card-tags">
          ${card.tags.map(tag=>`<span class="tag" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</span>`).join(' ')}
        </div>
      `;

      el.querySelector('.fav-btn').addEventListener('click', e => {
        e.preventDefault();
        toggleFavorite(e.currentTarget.dataset.id);
      });

      el.querySelector('.title').addEventListener('click', e => {
        e.preventDefault();
        openCardModal(card);
      });

      el.querySelectorAll('.card-tags .tag').forEach(tagEl => {
        tagEl.addEventListener('click', () => applyTagFilter(tagEl.dataset.tag));
      });

      cardsContainer.appendChild(el);
    });
  }

  // --- modal ---
  function openCardModal(card) {
    currentCard = card;
    document.getElementById('modalTitle').textContent = card.title;
    const modalImage = document.getElementById('modalImage');

    if (card.imagens && card.imagens.length > 0) {
      modalImage.src = card.imagens[0];
      modalImage.dataset.index = 0;
      modalImage.dataset.total = card.imagens.length;
    } else {
      modalImage.src = card.imagem || '';
      modalImage.dataset.index = 0;
      modalImage.dataset.total = 1;
    }

    document.getElementById('modalDesc').textContent = card.detalhes || card.desc;
    document.getElementById('modalLink').href = card.url;
    document.getElementById('modalTags').innerHTML = card.tags.map(t => `<span class="tag">${t}</span>`).join(' ');

    document.querySelectorAll('#modalTags .tag').forEach(tagEl => {
      tagEl.addEventListener('click', () => { closeCardModal(); applyTagFilter(tagEl.textContent); });
    });

    document.getElementById('cardModal').classList.remove('hidden');
  }

  function prevImage() {
    const modalImage = document.getElementById('modalImage');
    if (!currentCard || !currentCard.imagens || currentCard.imagens.length < 2) return;
    let index = parseInt(modalImage.dataset.index, 10);
    const total = currentCard.imagens.length;
    index = (index - 1 + total) % total;
    modalImage.dataset.index = index;
    modalImage.src = currentCard.imagens[index];
  }

  function nextImage() {
    const modalImage = document.getElementById('modalImage');
    if (!currentCard || !currentCard.imagens || currentCard.imagens.length < 2) return;
    let index = parseInt(modalImage.dataset.index, 10);
    const total = currentCard.imagens.length;
    index = (index + 1) % total;
    modalImage.dataset.index = index;
    modalImage.src = currentCard.imagens[index];
  }

  function closeCardModal() {
    document.getElementById('cardModal').classList.add('hidden');
  }

  document.getElementById('prevBtn').addEventListener('click', prevImage);
  document.getElementById('nextBtn').addEventListener('click', nextImage);
  document.getElementById('modalClose').addEventListener('click', closeCardModal);
  document.querySelector('.modal-overlay').addEventListener('click', closeCardModal);

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } [s] || s));
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      hideSearchDropdown();
      searchInput.blur();
    }
  });
})();