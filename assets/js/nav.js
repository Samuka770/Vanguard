(function(){
  const burger = document.querySelector('.hamburger');
  const nav = document.querySelector('.nav');
  if (!burger || !nav) return;

  const closeNav = () => {
    nav.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  };
  const openNav = () => {
    nav.classList.add('open');
    burger.setAttribute('aria-expanded', 'true');
  };

  burger.addEventListener('click', () => {
    if (nav.classList.contains('open')) closeNav(); else openNav();
  });

  // Close when clicking a nav link
  nav.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link) closeNav();
  });

  // Close when clicking outside (mobile only)
  document.addEventListener('click', (e) => {
    if (!nav.classList.contains('open')) return;
    const withinNav = nav.contains(e.target);
    const withinBurger = burger.contains(e.target);
    if (!withinNav && !withinBurger) closeNav();
  });

  // Handle resize: ensure nav closes when switching to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 860) closeNav();
  }, { passive: true });
})();
