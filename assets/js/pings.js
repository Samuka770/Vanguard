(function(){
  const API_LIST_ENDPOINT = (document.querySelector('meta[name="api-list-endpoint"]')?.content || '').trim();
  const API_LIST_QUERY = new URLSearchParams(location.search).get('apiList')?.trim() || '';
  const endpoint = API_LIST_QUERY || API_LIST_ENDPOINT || '/assets/db/pings_list.php';

  const $list = document.getElementById('pingsList');
  const $refresh = document.getElementById('refresh');
  const $status = document.getElementById('status');
  const $deleteAll = document.getElementById('deleteAll');
  const $generateList = document.getElementById('generateList');
  const $generatedText = document.getElementById('generatedText');
  const $listContent = document.getElementById('listContent');
  const $copyList = document.getElementById('copyList');

  // --- Simple base64-gated auth (client-side only; obfuscation, not true security) ---
  const AUTH_KEY = 'vgk_pings_auth_session_v1';
  const ALLOWED_TOKENS = [
    'YWRtaW46dmdrMjAyNQ==' 
  ];

  const $overlay = document.getElementById('authOverlay');
  const $u = document.getElementById('authUser');
  const $p = document.getElementById('authPass');
  const $go = document.getElementById('authSubmit');
  const $err = document.getElementById('authError');
  const $close = document.getElementById('authClose');

  function toBase64Utf8(s){
    // handle UTF-8
    return btoa(unescape(encodeURIComponent(String(s))));
  }

  function isTokenAllowed(tok){ return ALLOWED_TOKENS.includes(tok); }

  // Use sessionStorage so the token is cleared when the tab/page closes
  function getStoredToken(){ return sessionStorage.getItem(AUTH_KEY) || ''; }
  function storeToken(tok){ try { sessionStorage.setItem(AUTH_KEY, tok); } catch {} }

  function showOverlay(){ $overlay.style.display = 'grid'; $u?.focus(); }
  function hideOverlay(){ $overlay.style.display = 'none'; }

  async function ensureAuth(){
    const existing = getStoredToken();
    if (existing && isTokenAllowed(existing)) { hideOverlay(); return existing; }

    showOverlay();
    // Close handler: send to home
    $close?.addEventListener('click', () => { window.location.href = '/index.html#home'; });
    return new Promise(resolve => {
      const submit = () => {
        const tok = toBase64Utf8(`${$u.value}:${$p.value}`);
        if (isTokenAllowed(tok)) { storeToken(tok); hideOverlay(); resolve(tok); }
        else { $err.textContent = 'Credenciais inválidas.'; }
      };
      $go?.addEventListener('click', submit);
      [$u,$p].forEach(el => el?.addEventListener('keydown', (e)=>{ if(e.key==='Enter') submit(); }));
    });
  }

  // Force re-login on page unload/revisit: clear any session token when leaving
  window.addEventListener('beforeunload', () => {
    try { sessionStorage.removeItem(AUTH_KEY); } catch {}
  });

  function fmtDate(ts){
    try { const d = new Date(ts.replace(' ', 'T')); return d.toLocaleString(); } catch { return ts; }
  }

  function render(items){
    if(!Array.isArray(items) || items.length === 0){
      $list.innerHTML = '<div class="hint">Sem pings ainda.</div>';
      return;
    }

    // Group by topics: Tanks/Sups, DPS, Healers, BM (Albion-specific mapping)
    const normalize = s => String(s || '').toLowerCase();
    const groups = {
      tanks: [],
      dps: [],
      heal: [],
      bm: []
    };
    // Known weapon/role name mappings (Portuguese/Albion terms)
    // Healers per provided list: Queda Santa, Rampante, Exaltado
    const isHealerName = (t) => /\b(queda santa|rampante|exaltado|holy|nature|revitalize|rejuvenation|grande santo|grande natureza)\b/.test(t);
    const isSupportName = (t) => /\b(para tempo|arcano|time freeze|arcane|enfeebling|motivating)\b/.test(t);
    const isTankName = (t) => /\b(martelo de batalha|martelo|maça pesada|maca pesada|mace|hammer|grovekeeper|campeao da natureza|guardian|silence|oculto|jurador|petrea|pétrea)\b/.test(t);
    const isBMName = (t) => /\b(bm|battle ?mount|carroça|carroca)\b/.test(t);
    items.forEach(it => {
      const key = normalize(it.role_key);
      const label = normalize(it.role_label);
      const name = normalize(it.name);
      const text = `${key} ${label} ${name}`.trim();
      let bucket = 'dps';
      // Prefer explicit role_key when provided
      if (/\b(tank|tanks|sup|support)\b/.test(key)) bucket = 'tanks';
      else if (/\b(heal|healer)\b/.test(key)) bucket = 'heal';
      else if (/\b(bm|battle ?mount)\b/.test(key)) bucket = 'bm';
      else {
        // Fallback by weapon/build name mapping
        if (isBMName(text)) bucket = 'bm';
        else if (isTankName(text)) bucket = 'tanks';
        else if (isSupportName(text)) bucket = 'tanks'; // Sups grouped with Tanks
        else if (isHealerName(text)) bucket = 'heal';
        else bucket = 'dps';
      }
      groups[bucket].push(it);
    });

    const section = (title, arr) => {
      if (!arr.length) return '';
      const cards = arr.map(it => `
        <div class="ping-card" data-id="${it.id}">
          <div>
            <div class="ping-name">${escapeHtml(it.name || 'Sem nome')}</div>
            <div class="ping-role">${escapeHtml(it.role_label || it.role_key || '-')}</div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <div class="ping-time">${fmtDate(it.created_at)}</div>
            <button class="ping-del" title="Remover">✕</button>
          </div>
        </div>`).join('');
      return `
        <h3 style="margin:12px 0 8px;">${title}</h3>
        <div class="pings-grid">${cards}</div>
      `;
    };

    $list.innerHTML = [
      section('Tanks/Sups', groups.tanks),
      section('DPS', groups.dps),
      section('Healers', groups.heal),
      section('BM', groups.bm)
    ].join('');
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  }

  async function load(authTok){
    $status.textContent = 'Carregando...';
    try {
      const res = await fetch(endpoint + '?limit=100', { method: 'GET', headers: authTok ? { 'Authorization': 'Basic ' + authTok } : undefined });
      if(!res.ok) throw new Error('HTTP '+res.status);
      const json = await res.json();
      if(json.status !== 'ok') throw new Error('API error');
      latestPings = json.data || []; // Store for list generation
      render(json.data);
      $status.textContent = `Atualizado em ${new Date().toLocaleTimeString()}`;
    } catch(e){
      console.warn('Load pings failed', e);
      $status.textContent = 'Falha ao carregar pings';
    }
  }

  async function deleteAll(authTok){
    try {
      const url = `${endpoint}?action=truncate`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(authTok ? { 'Authorization': 'Basic ' + authTok } : {}) },
        body: new URLSearchParams({ action: 'truncate' }).toString()
      });
      if(!res.ok) throw new Error('HTTP '+res.status);
      const json = await res.json();
      if(json.status !== 'ok') throw new Error('API error');
      $list.innerHTML = '<div class="hint">Sem pings ainda.</div>';
      $status.textContent = 'Lista apagada';
    } catch(e){
      console.warn('Truncate failed', e);
      alert('Falha ao apagar lista.');
    }
  }

  async function deletePing(id, authTok){
    // Tenta deletar por ID; se inválido, faz fallback por nome
    const numericId = Number(id);
    const card = $list.querySelector(`[data-id="${id}"]`);
    const nameText = card?.querySelector('.ping-name')?.textContent?.trim();

    // helper para requisição POST
    async function postDelete(payload, query){
      const url = query ? `${endpoint}?${new URLSearchParams(query).toString()}` : endpoint;
      const formBody = new URLSearchParams(payload).toString();
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(authTok ? { 'Authorization': 'Basic ' + authTok } : {}) },
        body: formBody
      });
      if(!res.ok) throw new Error('HTTP '+res.status);
      const json = await res.json();
      if(json.status !== 'ok') throw new Error('API error');
      return json;
    }

    try {
      if (Number.isFinite(numericId) && numericId > 0) {
        // Send both JSON body and querystring to maximize compatibility
        await postDelete({ action: 'delete', id: numericId }, { action: 'delete', id: String(numericId) });
      } else if (nameText) {
        // Fallback: tenta excluir pelo nome
        await postDelete({ action: 'delete_by_name', name: nameText }, { action: 'delete_by_name', name: nameText });
      } else {
        throw new Error('Invalid id and missing name');
      }

      if (card) card.remove();
    } catch(e){
      console.warn('Delete ping failed', e);
      const msg = e?.message === 'HTTP 400' ? 'Falha ao remover (400). Verifique se o backend aceita o formato.' : 'Falha ao remover.';
      alert(msg);
    }
  }

  // Store latest data for list generation
  let latestPings = [];

  function generateFormattedList(){
    // Build a source array: prefer API data; fallback to DOM cards
    let source = Array.isArray(latestPings) ? latestPings.slice() : [];
    if (!source.length) {
      const cards = Array.from(document.querySelectorAll('#pingsList .ping-card'));
      source = cards.map(card => ({
        name: card.querySelector('.ping-name')?.textContent?.trim() || 'Sem nome',
        role_label: card.querySelector('.ping-role')?.textContent?.trim() || ''
      }));
      if (!source.length) {
        alert('Nenhum ping disponível para gerar a lista.');
        return;
      }
    }

    // Map each ping to appropriate role slot
    const normalize = s => String(s || '').toLowerCase();
    
    // Role mapping based on weapon/build names
    const roleMap = {
      // Tanks/Sups
      'hoj': [],
      'martelo': [],
      'maca': [],
      'paratempo': [],
      'silence': [],
      'petrea1': [],
      'petrea2': [],
      'oculto': [],
      'jurador': [],
      // DPS
      'prisma': [],
      'cancao': [],
      'putrido': [],
      'feiticeiro': [],
      'quebrareinos': [],
      'cravadas': [],
      'archa': [],
      'caca': [],
      // Healers
      'queda1': [],
      'queda2': [],
      'rampante': [],
      'exaltado': [],
      // BM
      'bm': []
    };

    source.forEach(ping => {
      const name = ping.name || 'Sem nome';
      const key = normalize(ping.role_key);
      const label = normalize(ping.role_label);
      const text = `${key} ${label} ${name}`.trim();

      // Match to specific role slots
      if (/\b(hoj|champion)\b/.test(text)) roleMap.hoj.push(name);
      else if (/\b(martelo de batalha|battle ?hammer|graveguard)\b/.test(text)) roleMap.martelo.push(name);
      else if (/\b(maça pesada|maca pesada|heavy mace)\b/.test(text)) roleMap.maca.push(name);
      else if (/\b(para tempo|time ?freeze|arcano)\b/.test(text)) roleMap.paratempo.push(name);
      else if (/\b(silence|enfeebling)\b/.test(text)) roleMap.silence.push(name);
      else if (/\b(pétrea|petrea|grovekeeper|campeao da natureza)\b/.test(text)) {
        if (roleMap.petrea1.length === 0) roleMap.petrea1.push(name);
        else roleMap.petrea2.push(name);
      }
      else if (/\b(oculto|shadowcaller)\b/.test(text)) roleMap.oculto.push(name);
      else if (/\b(jurador|oathkeeper)\b/.test(text)) roleMap.jurador.push(name);
      // DPS
      else if (/\b(prisma|prism|ring|light ?caller)\b/.test(text)) roleMap.prisma.push(name);
      else if (/\b(canção|cancao|alvorada|dawn ?song|bard)\b/.test(text)) roleMap.cancao.push(name);
      else if (/\b(putrido|blight|staff)\b/.test(text)) roleMap.putrido.push(name);
      else if (/\b(feiticeiro|sorcerer)\b/.test(text)) roleMap.feiticeiro.push(name);
      else if (/\b(quebra ?reinos|realm ?breaker)\b/.test(text)) roleMap.quebrareinos.push(name);
      else if (/\b(cravadas|galatine|clarent)\b/.test(text)) roleMap.cravadas.push(name);
      else if (/\b(archa|arcane|staff)\b/.test(text)) roleMap.archa.push(name);
      else if (/\b(caça|caca|espirito|spirit|hunter)\b/.test(text)) roleMap.caca.push(name);
      // Healers
      else if (/\b(queda santa|fall|holy|grande santo)\b/.test(text)) {
        if (roleMap.queda1.length === 0) roleMap.queda1.push(name);
        else roleMap.queda2.push(name);
      }
      else if (/\b(rampante|rampant|grande natureza)\b/.test(text)) roleMap.rampante.push(name);
      else if (/\b(exaltado|exalted)\b/.test(text)) roleMap.exaltado.push(name);
      // BM
      else if (/\b(bm|battle ?mount|carroça|carroca)\b/.test(text)) roleMap.bm.push(name);
    });

    // Build formatted text
    const lines = [
      '** ----SUPS E TANKS---- **',
      `**HOJ -      ${roleMap.hoj.join(', ') || ''}**`,
      `** MARTELO DE BATALHA -  ${roleMap.martelo.join(', ') || ''}**`,
      `**MAÇA PESADA -  ${roleMap.maca.join(', ') || ''}**`,
      `** PARA TEMPO - ${roleMap.paratempo.join(', ') || ''}**`,
      `** SILENCE - ${roleMap.silence.join(', ') || ''}**`,
      `**PÉTREA -     ${roleMap.petrea1.join(', ') || ''}**`,
      `**PÉTREA -   ${roleMap.petrea2.join(', ') || ''}**`,
      `**OCULTO -   ${roleMap.oculto.join(', ') || ''}**`,
      `**JURADOR -     ${roleMap.jurador.join(', ') || ''}**`,
      '',
      '** ----DPS---- **',
      `**PRISMA -   ${roleMap.prisma.join(', ') || ''}**`,
      `**CANÇÃO DA ALVORADA -   ${roleMap.cancao.join(', ') || ''}**`,
      `**PUTRIDO -     ${roleMap.putrido.join(', ') || ''}**`,
      `**FEITICEIRO -  ${roleMap.feiticeiro.join(', ') || ''}**`,
      `**QUEBRAREINOS -  ${roleMap.quebrareinos.join(', ') || ''}**`,
      `**CRAVADAS -  ${roleMap.cravadas.join(', ') || ''}**`,
      `**ARCHA -  ${roleMap.archa.join(', ') || ''}**`,
      `**CAÇA ESPIRITO -      ${roleMap.caca.join(', ') || ''}**`,
      '',
      '** --HEALERS--**',
      `**QUEDA SANTA -      ${roleMap.queda1.join(', ') || ''}**`,
      `**QUEDA SANTA -      ${roleMap.queda2.join(', ') || ''}**`,
      `**RAMPANTE -   ${roleMap.rampante.join(', ') || ''}**`,
      `**EXALTADO -  ${roleMap.exaltado.join(', ') || ''}**`,
      '',
      `**BM ( CARROÇA ) -     ${roleMap.bm.join(', ') || ''}**`
    ];

    const formatted = lines.join('\n');
    $listContent.textContent = formatted;
    $generatedText.style.display = 'block';
  }

  (async () => {
    const tok = await ensureAuth();
    $refresh?.addEventListener('click', () => load(tok));
    $deleteAll?.addEventListener('click', () => {
      if (confirm('Deletar todos os pings? Esta ação não pode ser desfeita.')) deleteAll(tok);
    });
    $generateList?.addEventListener('click', generateFormattedList);
    $copyList?.addEventListener('click', () => {
      const text = $listContent.textContent;
      navigator.clipboard.writeText(text).then(() => {
        const orig = $copyList.textContent;
        $copyList.textContent = '✓ Copiado';
        setTimeout(() => { $copyList.textContent = orig; }, 2000);
      }).catch(() => alert('Falha ao copiar.'));
    });
    load(tok);
    setInterval(() => load(tok), 30000);

    // Delegate delete click
    $list.addEventListener('click', (e) => {
      const btn = e.target.closest('.ping-del');
      if (!btn) return;
      const card = btn.closest('[data-id]');
      const id = card?.getAttribute('data-id');
      if (!id) return;
      if (confirm('Remover este ping?')) deletePing(id, tok);
    });
  })();
})();
