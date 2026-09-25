/**
 * MELODIA · Landing Page
 * main.js: interações gerais da página
 *
 *  1. Menu fixo com efeito de transparência (header)
 *  2. Menu mobile (abrir e fechar)
 *  3. Link ativo no menu conforme a seção visível (scrollspy)
 *  4. Animações de entrada ao rolar a página
 *  5. Contadores animados dos números
 *  6. Ano atual no rodapé
 *
 * O código fica dentro de uma IIFE (função que se executa sozinha) para não
 * criar variáveis globais que poderiam conflitar com os outros scripts.
 */
(() => {
  'use strict';

  const header = document.getElementById('site-header');
  const menuButton = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const supportsObserver = 'IntersectionObserver' in window;


  /* 1. MENU FIXO COM EFEITO DE TRANSPARÊNCIA ================================
     O header é fixo (position: fixed) e começa transparente sobre o hero.
     Ao rolar mais que SCROLL_LIMIT pixels, o JS adiciona o atributo
     data-scrolled e as classes "data-scrolled:*" do Tailwind aplicam o fundo
     translúcido com desfoque (efeito de vidro). Ao voltar ao topo, ele some. */
  const SCROLL_LIMIT = 24;
  let ticking = false;

  const isMenuOpen = () => Boolean(mobileMenu && !mobileMenu.hidden);

  function updateHeader() {
    const scrolled = window.scrollY > SCROLL_LIMIT;
    // Com o menu mobile aberto, o header também fica sólido para dar leitura
    header.toggleAttribute('data-scrolled', scrolled || isMenuOpen());
    ticking = false;
  }

  function onScroll() {
    // requestAnimationFrame limita a atualização a 1 vez por quadro (performance)
    if (!ticking) {
      window.requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }

  if (header) {
    updateHeader(); // estado correto mesmo se a página abrir já rolada
    window.addEventListener('scroll', onScroll, { passive: true });
  }


  /* 2. MENU MOBILE ==========================================================
     O botão alterna o atributo "hidden" do painel e mantém o aria-expanded
     atualizado para leitores de tela. Fecha ao clicar num link, ao apertar
     Esc, ao clicar fora do menu ou ao aumentar a tela para desktop.        */
  function setMenu(open) {
    if (!menuButton || !mobileMenu) return;
    mobileMenu.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    updateHeader();
  }

  if (menuButton && mobileMenu) {
    menuButton.addEventListener('click', () => setMenu(!isMenuOpen()));

    mobileMenu.addEventListener('click', (event) => {
      if (event.target.closest('a')) setMenu(false);
    });

    document.addEventListener('click', (event) => {
      if (isMenuOpen() && !header.contains(event.target)) setMenu(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isMenuOpen()) {
        setMenu(false);
        menuButton.focus();
      }
    });

    window.matchMedia('(min-width: 1024px)').addEventListener('change', (event) => {
      if (event.matches) setMenu(false);
    });
  }


  /* 3. SCROLLSPY: LINK ATIVO NO MENU ========================================
     O IntersectionObserver avisa quando uma seção cruza a faixa central da
     tela. O link correspondente recebe aria-current="true", estilizado no CSS
     pela classe .nav-link (aria-[current=true]:bg-white/10).               */
  const navLinks = Array.from(document.querySelectorAll('[data-nav-link]'));
  const sections = Array.from(document.querySelectorAll('main section[id]'));

  function setActiveLink(id) {
    navLinks.forEach((link) => {
      if (link.getAttribute('href') === `#${id}`) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  if (supportsObserver && navLinks.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveLink(entry.target.id);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach((section) => spy.observe(section));
  }


  /* 4. ANIMAÇÕES DE ENTRADA (REVEAL) ========================================
     Elementos com a classe .reveal começam invisíveis (ver src/input.css) e
     ganham .is-visible quando entram na tela, disparando a animação CSS.
     O atraso de cada item vem da variável CSS --delay no próprio HTML.     */
  const revealElements = document.querySelectorAll('.reveal');

  if (supportsObserver && !reducedMotion.matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // anima só uma vez
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    revealElements.forEach((element) => revealObserver.observe(element));
  } else {
    revealElements.forEach((element) => element.classList.add('is-visible'));
  }


  /* 5. CONTADORES ANIMADOS ==================================================
     <span data-counter="80"> conta de 0 até 80 quando aparece na tela.
     data-decimals define as casas decimais (ex.: 4,9). O número é formatado
     no padrão brasileiro com toLocaleString('pt-BR').                      */
  const counters = document.querySelectorAll('[data-counter]');
  const COUNTER_DURATION = 1600; // ms

  const formatNumber = (value, decimals) => value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function animateCounter(element) {
    const target = parseFloat(element.dataset.counter);
    const decimals = parseInt(element.dataset.decimals || '0', 10);
    const start = performance.now();

    function frame(now) {
      const progress = Math.min((now - start) / COUNTER_DURATION, 1);
      element.textContent = formatNumber(target * easeOutCubic(progress), decimals);
      if (progress < 1) window.requestAnimationFrame(frame);
    }

    window.requestAnimationFrame(frame);
  }

  if (supportsObserver && !reducedMotion.matches) {
    const counterObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.6 });

    counters.forEach((counter) => {
      const decimals = parseInt(counter.dataset.decimals || '0', 10);
      counter.textContent = formatNumber(0, decimals);
      counterObserver.observe(counter);
    });
  }


  /* 6. ANO ATUAL NO RODAPÉ ================================================== */
  document.querySelectorAll('[data-year]').forEach((element) => {
    element.textContent = new Date().getFullYear();
  });
})();
