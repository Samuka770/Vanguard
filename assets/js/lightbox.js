(function(){
  // Create overlay once
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `
    <div class="lightbox-content">
      <button class="lightbox-close" aria-label="Fechar">Fechar</button>
      <img class="lightbox-img" alt="Imagem ampliada" />
      <div class="lightbox-help">Rolar/Pinçar para zoom • Arrastar para mover • Esc para fechar</div>
    </div>`;
  document.body.appendChild(overlay);

  const imgEl = overlay.querySelector('.lightbox-img');
  const closeBtn = overlay.querySelector('.lightbox-close');
  const content = overlay.querySelector('.lightbox-content');

  let scale = 1, minScale = 1, maxScale = 6;
  let tx = 0, ty = 0; // translation
  let startX = 0, startY = 0; // drag start
  let dragging = false;
  let lastTouchDist = 0; // pinch zoom

  function updateTransform(){
    imgEl.style.transform = `translate(${tx}px, ${ty}px) scale(${scale}) translate(-50%, -50%)`;
  }

  function openLightbox(src){
    imgEl.src = src;
    scale = 1; tx = 0; ty = 0; updateTransform();
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox(){
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Wheel zoom
  content.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = Math.sign(e.deltaY);
    const factor = 0.1;
    scale = Math.min(maxScale, Math.max(minScale, scale - delta * factor));
    updateTransform();
  }, { passive: false });

  // Drag to pan (mouse)
  content.addEventListener('mousedown', (e) => {
    dragging = true; startX = e.clientX; startY = e.clientY;
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    tx += (e.clientX - startX); ty += (e.clientY - startY);
    startX = e.clientX; startY = e.clientY; updateTransform();
  });
  window.addEventListener('mouseup', () => { dragging = false; });

  // Touch: drag and pinch
  content.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1){
      dragging = true; startX = e.touches[0].clientX; startY = e.touches[0].clientY;
    } else if (e.touches.length === 2){
      dragging = false;
      const [a,b] = e.touches;
      lastTouchDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }
  }, { passive: true });
  content.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && dragging){
      const t = e.touches[0];
      tx += (t.clientX - startX); ty += (t.clientY - startY);
      startX = t.clientX; startY = t.clientY; updateTransform();
    } else if (e.touches.length === 2){
      e.preventDefault();
      const [a,b] = e.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const diff = dist - lastTouchDist;
      lastTouchDist = dist;
      const factor = diff * 0.003; // sensitivity
      scale = Math.min(maxScale, Math.max(minScale, scale + factor));
      updateTransform();
    }
  }, { passive: false });
  content.addEventListener('touchend', () => { dragging = false; lastTouchDist = 0; });

  // Close handlers
  closeBtn.addEventListener('click', closeLightbox);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeLightbox(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });

  // Hook images with data-lightbox
  function enableLightbox(selector){
    document.querySelectorAll(selector).forEach(el => {
      el.style.cursor = 'zoom-in';
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const src = el.getAttribute('src') || el.dataset.src;
        if (src) openLightbox(src);
      });
    });
  }

  // Enable for planner builds background and any .js-lightbox
  enableLightbox('#buildsBackground, .js-lightbox');
})();
