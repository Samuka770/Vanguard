(function() {
  const ROLES = [
    // ----SUPS E TANKS----
    { key: 'martelo_batalha', label: 'Martelo de Batalha' },
    { key: 'maca_pesada', label: 'Maça Pesada' },
    { key: 'para_tempo', label: 'Para Tempo' },
    { key: 'silence', label: 'Silence' },
    { key: 'petrea1', label: 'Pétrea' },
    { key: 'petrea2', label: 'Pétrea' },
    { key: 'oculto', label: 'Oculto' },
    { key: 'jurador', label: 'Jurador' },

    // ----DPS----
    { key: 'prisma', label: 'Prisma' },
    { key: 'cancao_alvorada', label: 'Canção da Alvorada' },
    { key: 'putrido', label: 'Putrido' },
    { key: 'feiticeiro', label: 'Feiticeiro' },
    { key: 'quebrareinos', label: 'Quebrareinos' },
    { key: 'cravadas', label: 'Cravadas' },
    { key: 'archa', label: 'Archa' },
    { key: 'caca_espirito', label: 'Caça Espírito' },

    // --HEALERS--
    { key: 'queda_santa1', label: 'Queda Santa' },
    { key: 'queda_santa2', label: 'Queda Santa' },
    { key: 'rampante', label: 'Rampante' },
    { key: 'exaltado', label: 'Exaltado' },

    // BM (CARROÇA)
    { key: 'bm_carroca', label: 'BM (Carroça)' },
  ];
  // Map each role key to an image path (place your images under /assets/img)
  const ROLE_IMAGES = {
    martelo_batalha: '/assets/img/martelo_batalha.jpg',
    maca_pesada: '/assets/img/maca_pesada.jpg',
    para_tempo: '/assets/img/para_tempo.jpg',
    silence: '/assets/img/silence.jpg',
    petrea1: '/assets/img/petrea.jpg',
    petrea2: '/assets/img/petrea.jpg',
    oculto: '/assets/img/oculto.jpg',
    jurador: '/assets/img/jurador.jpg',

    prisma: '/assets/img/prisma.jpg',
    cancao_alvorada: '/assets/img/cancao_alvorada.jpg',
    putrido: '/assets/img/putrido.jpg',
    feiticeiro: '/assets/img/feiticeiro.jpg',
    quebrareinos: '/assets/img/quebrareinos.jpg',
    cravadas: '/assets/img/cravadas.jpg',
    archa: '/assets/img/archa.jpg',
    caca_espirito: '/assets/img/caca_espirito.jpg',

    queda_santa1: '/assets/img/queda_santa.jpg',
    queda_santa2: '/assets/img/queda_santa.jpg',
    rampante: '/assets/img/rampante.jpg',
    exaltado: '/assets/img/exaltado.jpg',

    bm_carroca: '/assets/img/bm_carroca.jpg',
  };
  const STORAGE_KEY = 'vgk_zvz_ping_one_v1';
  const $role = document.getElementById('role');
  const $name = document.getElementById('name');
  const $pingOne = document.getElementById('pingOne');
  const $roleImage = document.getElementById('roleImage');
  const $roleImageLabel = document.getElementById('roleImageLabel');
  const state = loadState() || { role: '', name: '' };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function makeOption(role) {
    const opt = document.createElement('option');
    opt.value = role.key; opt.textContent = role.label;
    return opt;
  }

  function initForm() {
    // Populate roles
    $role.appendChild(new Option('Selecione a role', ''));
    ROLES.forEach(r => $role.appendChild(makeOption(r)));
    $role.value = state.role || '';
    $name.value = state.name || '';

    // Initialize preview
    updatePreview(state.role);

    $role.addEventListener('change', (e) => {
      state.role = e.target.value; saveState();
      updatePreview(state.role);
    });
    $name.addEventListener('input', (e) => { state.name = e.target.value; saveState(); });

    $pingOne.addEventListener('click', () => {
      const roleKey = state.role;
      const roleLabel = ROLES.find(r => r.key === roleKey)?.label || '—';
      const name = (state.name?.trim() || 'Sem nome');
      const text = `@here ${name} confirmado em ${roleLabel}.`;

      // Copy ping text
      navigator.clipboard?.writeText(text).then(() => {
        $pingOne.textContent = 'Copiado!';
        setTimeout(() => $pingOne.textContent = 'Pingar minha participação', 1200);
      }).catch(() => { alert(text); });

      // Log to backend (non-blocking)
      logPing({ name, role_key: roleKey, role_label: roleLabel });
    });

    // Removed clear button per request
  }

  function updatePreview(roleKey) {
    const role = ROLES.find(r => r.key === roleKey);
    const imgSrc = ROLE_IMAGES[roleKey] || '';
    if ($roleImage) {
      $roleImage.src = imgSrc;
      $roleImage.style.visibility = imgSrc ? 'visible' : 'hidden';
    }
    if ($roleImageLabel) {
      $roleImageLabel.textContent = role ? role.label : 'Selecione uma role';
    }
  }

  initForm();
  
  function logPing(payload) {
    try {
      fetch('/assets/db/pings.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(res => { if (res?.status !== 'ok') console.warn('Ping save error', res); })
        .catch(err => console.warn('Ping save failed', err));
    } catch (e) { console.warn('Ping save exception', e); }
  }
})();
