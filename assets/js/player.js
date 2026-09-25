/**
 * MELODIA · Landing Page
 * player.js: player de áudio de demonstração do app
 *
 *  - Toca músicas em domínio público do acervo FreePD, seguindo a dica de usar
 *    bibliotecas de áudio sem copyright. Os MP3 ficam em assets/audio/ e, se
 *    algum arquivo local falhar, o player busca a cópia no Internet Archive.
 *  - Os controles são ligados por atributos data-player-* no HTML: o mesmo
 *    código atualiza o celular do hero E o mini player flutuante.
 *  - Web Audio API: equalizador de 10 bandas (seção Funcionalidades) que muda
 *    o som de verdade, e visualizador de frequências no mockup do celular.
 *  - Media Session API: mostra a música e os controles na central de mídia do
 *    sistema (teclas de mídia do teclado, tela de bloqueio do celular).
 */
(() => {
  'use strict';

  const audio = document.getElementById('melodia-audio');
  if (!audio) return;


  /* 1. DADOS ================================================================ */
  const AUDIO_PATH = 'assets/audio/';
  const ARCHIVE_URL = 'https://archive.org/download/freepd/'; // cópia reserva

  // file = arquivo local | archive = mesmo arquivo no acervo FreePD do Internet Archive
  const TRACKS = [
    { title: 'City Sunshine', artist: 'Kevin MacLeod', file: 'city-sunshine.mp3', archive: 'upbeat/City%20Sunshine.mp3', cover: 'assets/img/covers/city-sunshine.svg', color: '#f97316', duration: 185 },
    { title: 'Chill Beat', artist: 'Frank Nora', file: 'chill-beat.mp3', archive: 'Page2/Chill%20Beat.mp3', cover: 'assets/img/covers/chill-beat.svg', color: '#8b5cf6', duration: 149 },
    { title: 'Funshine', artist: 'Kevin MacLeod', file: 'funshine.mp3', archive: 'upbeat/Funshine.mp3', cover: 'assets/img/covers/funshine.svg', color: '#f72ba8', duration: 165 },
    { title: 'Meditating Beat', artist: 'Kevin MacLeod', file: 'meditating-beat.mp3', archive: 'electronic/Meditating%20Beat.mp3', cover: 'assets/img/covers/meditating-beat.svg', color: '#06b6d4', duration: 157 },
  ];

  // A página está sendo servida por http(s), como no GitHub Pages ou no Live Server?
  // Aberta direto do disco (file://), o navegador bloqueia a Web Audio API com
  // arquivos locais, então o player toca normalmente, só que sem o equalizador.
  const IS_HTTP = location.protocol.startsWith('http');
  if (IS_HTTP) audio.crossOrigin = 'anonymous'; // permite analisar também a cópia reserva

  // Frequências (Hz) das 10 bandas do equalizador e o ganho (dB) de cada preset
  const EQ_BANDS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  const EQ_PRESETS = {
    equilibrado: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    graves: [9, 8, 6, 3, 1, 0, 0, 0, 0, 0],
    vocal: [-4, -3, -1, 1, 4, 5, 4, 2, 0, -2],
    eletronico: [7, 6, 2, 0, -3, -1, 1, 3, 6, 7],
  };

  const state = {
    index: 0,
    started: false, // o usuário já deu play alguma vez?
    shuffle: false,
    seeking: false, // arrastando a barra de progresso?
    preset: 'equilibrado',
    liked: new Set(),
    usingArchive: false, // tocando a cópia reserva do Internet Archive?
    errors: 0, // falhas seguidas de carregamento (evita tentar para sempre)
  };


  /* 2. ELEMENTOS ============================================================ */
  const all = (selector) => document.querySelectorAll(selector);
  const statusElement = document.getElementById('player-status');
  const heroPlayer = document.getElementById('hero-player');
  const miniPlayer = document.getElementById('mini-player');
  const visualizer = document.querySelector('[data-visualizer]');
  const eqFills = all('[data-eq-fill]');


  /* 3. UTILITÁRIOS ========================================================== */
  function formatTime(seconds) {
    const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
    const minutes = Math.floor(safe / 60);
    const rest = Math.floor(safe % 60);
    return `${minutes}:${String(rest).padStart(2, '0')}`;
  }

  const currentTrack = () => TRACKS[state.index];
  const isPlaying = () => !audio.paused && !audio.ended;
  const trackDuration = () => (Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : currentTrack().duration);

  function equalizerIcon() {
    const icon = document.createElement('span');
    icon.className = 'equalizer text-brand-400';
    icon.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 4; i += 1) icon.appendChild(document.createElement('span'));
    return icon;
  }

  // Mensagem abaixo do botão "Ouvir Agora" (também lida por leitores de tela).
  // Usa textContent, e não innerHTML, por segurança (evita injeção de HTML).
  function setStatus(icon, text) {
    if (!statusElement) return;
    let iconNode = icon;
    if (typeof icon === 'string') {
      iconNode = document.createElement('i');
      iconNode.className = `${icon} text-brand-400`;
      iconNode.setAttribute('aria-hidden', 'true');
    }
    const textNode = document.createElement('span');
    textNode.textContent = text;
    statusElement.replaceChildren(iconNode, ' ', textNode);
  }


  /* 4. RENDERIZAÇÃO: atualiza todos os elementos data-player-* ============== */
  function renderTrack() {
    const track = currentTrack();
    all('[data-player-title]').forEach((element) => { element.textContent = track.title; });
    all('[data-player-artist]').forEach((element) => { element.textContent = track.artist; });
    all('[data-player-duration]').forEach((element) => { element.textContent = formatTime(track.duration); });
    all('[data-player-cover]').forEach((image) => {
      image.src = track.cover;
      image.alt = 'decorative' in image.dataset ? '' : `Capa da faixa ${track.title}`;
    });
    // Cor ambiente do celular (animada pelo CSS com @property --track-color)
    all('[data-player-theme]').forEach((element) => element.style.setProperty('--track-color', track.color));
    renderLike();
    renderProgress(0);
    updateMediaSession();
  }

  function renderPlayState() {
    const playing = isPlaying();
    // A classe .is-playing no <body> ativa a variante "playing:" do Tailwind
    document.body.classList.toggle('is-playing', playing);
    all('[data-player-toggle]').forEach((button) => button.setAttribute('aria-label', playing ? 'Pausar' : 'Tocar'));
    all('[data-cta-label]').forEach((label) => {
      if (playing) label.textContent = 'Pausar música';
      else label.textContent = state.started ? 'Continuar ouvindo' : 'Ouvir Agora';
    });
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  }

  function renderProgress(current = audio.currentTime) {
    const duration = trackDuration();
    const percent = duration ? Math.min((current / duration) * 100, 100) : 0;
    if (!state.seeking) {
      all('[data-player-seek]').forEach((input) => {
        input.value = percent;
        input.style.setProperty('--progress', `${percent}%`);
        input.setAttribute('aria-valuetext', `${formatTime(current)} de ${formatTime(duration)}`);
      });
      all('[data-player-current]').forEach((element) => { element.textContent = formatTime(current); });
    }
    all('[data-player-bar]').forEach((bar) => { bar.style.width = `${percent}%`; });
  }

  function renderLike() {
    const liked = state.liked.has(state.index);
    all('[data-player-like]').forEach((button) => {
      button.setAttribute('aria-pressed', String(liked));
      const icon = button.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-solid', liked);
        icon.classList.toggle('fa-regular', !liked);
      }
    });
  }


  /* 5. CONTROLES ============================================================ */
  function load(index, { autoplay = false } = {}) {
    state.index = (index + TRACKS.length) % TRACKS.length; // volta ao início/fim da lista
    state.usingArchive = false;
    audio.src = AUDIO_PATH + currentTrack().file;
    renderTrack();
    if (autoplay) {
      play();
      return;
    }
    renderPlayState();
    stopVisualizer();
    if (state.started) {
      const track = currentTrack();
      setStatus('fa-solid fa-pause', `Pausado: ${track.title} · ${track.artist}`);
    }
  }

  async function play() {
    state.started = true;
    setupAudioGraph();
    try {
      if (audioContext && audioContext.state === 'suspended') await audioContext.resume();
      await audio.play();
    } catch (error) {
      // Falhas de rede são tratadas no evento "error" do <audio>
      if (error.name === 'NotAllowedError') {
        setStatus('fa-solid fa-hand-pointer', 'Toque no botão de play para começar a ouvir.');
      }
    }
  }

  function pause() {
    audio.pause();
  }

  function toggle() {
    if (isPlaying()) pause();
    else play();
  }

  function next({ autoplay = isPlaying() } = {}) {
    let nextIndex = state.index + 1;
    if (state.shuffle && TRACKS.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * TRACKS.length);
      } while (nextIndex === state.index);
    }
    load(nextIndex, { autoplay });
  }

  function previous() {
    // Igual aos apps de música: depois de 3s, "anterior" volta ao começo da faixa
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    load(state.index - 1, { autoplay: isPlaying() });
  }

  all('[data-player-toggle], [data-player-cta]').forEach((button) => button.addEventListener('click', toggle));
  all('[data-player-next]').forEach((button) => button.addEventListener('click', () => next()));
  all('[data-player-prev]').forEach((button) => button.addEventListener('click', previous));

  all('[data-player-like]').forEach((button) => button.addEventListener('click', () => {
    if (state.liked.has(state.index)) state.liked.delete(state.index);
    else state.liked.add(state.index);
    renderLike();
  }));

  all('[data-player-shuffle]').forEach((button) => button.addEventListener('click', () => {
    state.shuffle = !state.shuffle;
    all('[data-player-shuffle]').forEach((element) => element.setAttribute('aria-pressed', String(state.shuffle)));
  }));

  all('[data-player-repeat]').forEach((button) => button.addEventListener('click', () => {
    audio.loop = !audio.loop;
    all('[data-player-repeat]').forEach((element) => element.setAttribute('aria-pressed', String(audio.loop)));
  }));

  // Barra de progresso: "input" enquanto arrasta, "change" ao soltar
  all('[data-player-seek]').forEach((input) => {
    input.addEventListener('input', () => {
      state.seeking = true;
      const time = (input.value / 100) * trackDuration();
      input.style.setProperty('--progress', `${input.value}%`);
      all('[data-player-current]').forEach((element) => { element.textContent = formatTime(time); });
    });

    input.addEventListener('change', () => {
      audio.currentTime = (input.value / 100) * trackDuration();
      state.seeking = false;
      renderProgress(audio.currentTime);
    });
  });


  /* 6. EVENTOS DO <audio> =================================================== */
  audio.addEventListener('play', () => {
    renderPlayState();
    if (audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) document.body.classList.add('is-buffering');
    const track = currentTrack();
    setStatus(equalizerIcon(), `Tocando agora: ${track.title} · ${track.artist}`);
    miniDismissed = false;
    updateMiniPlayer();
    startVisualizer();
  });

  audio.addEventListener('playing', () => {
    state.errors = 0;
    document.body.classList.remove('is-buffering');
  });

  audio.addEventListener('pause', () => {
    renderPlayState();
    stopVisualizer();
    document.body.classList.remove('is-buffering');
    if (!audio.ended) {
      const track = currentTrack();
      setStatus('fa-solid fa-pause', `Pausado: ${track.title} · ${track.artist}`);
    }
  });

  audio.addEventListener('waiting', () => document.body.classList.add('is-buffering'));
  audio.addEventListener('timeupdate', () => renderProgress());
  audio.addEventListener('ended', () => next({ autoplay: true }));

  audio.addEventListener('loadedmetadata', () => {
    all('[data-player-duration]').forEach((element) => { element.textContent = formatTime(audio.duration); });
    renderProgress();
  });

  audio.addEventListener('error', () => {
    // 1ª tentativa de recuperação: a mesma faixa, direto do Internet Archive
    const track = currentTrack();
    if (!state.usingArchive && track.archive) {
      state.usingArchive = true;
      audio.src = ARCHIVE_URL + track.archive;
      if (state.started) play();
      return;
    }

    document.body.classList.remove('is-buffering');
    state.errors += 1;
    if (state.errors < TRACKS.length) {
      setStatus('fa-solid fa-triangle-exclamation', `Não foi possível carregar "${currentTrack().title}". Tentando a próxima…`);
      next({ autoplay: true });
    } else {
      state.errors = 0;
      renderPlayState();
      setStatus('fa-solid fa-triangle-exclamation', 'As músicas de demonstração estão indisponíveis agora. Tente novamente mais tarde.');
    }
  });


  /* 7. WEB AUDIO API: EQUALIZADOR + ANALISADOR ==============================
     Caminho do som:  <audio> → 10 filtros (um por banda) → volume → analisador → caixas de som
     O AudioContext só pode ser criado após um clique do usuário (regra dos
     navegadores), por isso é montado no primeiro play.                     */
  let audioContext = null;
  let masterGain = null;
  let analyser = null;
  let filters = [];
  let frequencyData = null;

  const dbToGain = (db) => 10 ** (db / 20);
  // Reduz o volume geral quando o preset aumenta frequências (evita distorção)
  const headroomFor = (gains) => dbToGain(-Math.max(0, ...gains) * 0.6);

  function setupAudioGraph() {
    if (audioContext || !IS_HTTP) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return; // navegador sem Web Audio: o player funciona sem EQ

    try {
      const context = new AudioContextClass();
      const gains = EQ_PRESETS[state.preset];

      const bandFilters = EQ_BANDS.map((frequency, i) => {
        const filter = context.createBiquadFilter();
        if (i === 0) filter.type = 'lowshelf';
        else if (i === EQ_BANDS.length - 1) filter.type = 'highshelf';
        else filter.type = 'peaking';
        filter.frequency.value = frequency;
        filter.Q.value = 1.2;
        filter.gain.value = gains[i];
        return filter;
      });

      const gainNode = context.createGain();
      gainNode.gain.value = headroomFor(gains);

      const analyserNode = context.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.78;

      const source = context.createMediaElementSource(audio);
      [source, ...bandFilters, gainNode, analyserNode, context.destination]
        .reduce((from, to) => { from.connect(to); return to; });

      audioContext = context;
      filters = bandFilters;
      masterGain = gainNode;
      analyser = analyserNode;
      frequencyData = new Uint8Array(analyserNode.frequencyBinCount);
      document.body.classList.add('has-audio-graph');
    } catch (error) {
      audioContext = null; // segue tocando sem o equalizador
    }
  }

  function applyPreset(name) {
    const gains = EQ_PRESETS[name];
    if (!gains) return;
    state.preset = name;

    // Visual: 50% = 0 dB; cada dB sobe ou desce 4,5% a barra
    eqFills.forEach((fill, i) => { fill.style.height = `${50 + gains[i] * 4.5}%`; });

    // Som: transição suave dos ganhos para não dar "estalos"
    if (audioContext) {
      const now = audioContext.currentTime;
      filters.forEach((filter, i) => filter.gain.setTargetAtTime(gains[i], now, 0.12));
      masterGain.gain.setTargetAtTime(headroomFor(gains), now, 0.12);
    }
  }

  all('input[name="eq-preset"]').forEach((radio) => radio.addEventListener('change', () => {
    if (radio.checked) applyPreset(radio.value);
  }));


  /* 8. VISUALIZADOR DE FREQUÊNCIAS ========================================= */
  const BAR_COUNT = 28;
  let visualizerBars = [];
  let animationId = null;
  let heroVisible = true;

  function buildVisualizer() {
    if (!visualizer) return;
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < BAR_COUNT; i += 1) {
      const bar = document.createElement('span');
      // Altura de repouso em forma de onda (usada enquanto a música está pausada)
      const rest = 0.16 + 0.16 * Math.abs(Math.sin(i * 0.7)) + 0.1 * Math.abs(Math.sin(i * 1.9));
      bar.style.setProperty('--rest', rest.toFixed(2));
      bar.style.setProperty('--i', i);
      fragment.appendChild(bar);
    }
    visualizer.appendChild(fragment);
    visualizerBars = Array.from(visualizer.children);
  }

  function drawVisualizer() {
    if (!analyser || !isPlaying() || !heroVisible) {
      animationId = null;
      return;
    }
    analyser.getByteFrequencyData(frequencyData);
    const usableBins = Math.floor(frequencyData.length * 0.7); // agudos extremos quase não têm energia
    visualizerBars.forEach((bar, i) => {
      // Escala logarítmica: mais barras para graves e médios, como o ouvido percebe
      const bin = Math.min(usableBins - 1, Math.floor(((i / BAR_COUNT) ** 1.7) * usableBins));
      const level = Math.max(0.08, frequencyData[bin] / 255);
      bar.style.transform = `scaleY(${level.toFixed(3)})`;
    });
    animationId = window.requestAnimationFrame(drawVisualizer);
  }

  function startVisualizer() {
    if (analyser && !animationId) animationId = window.requestAnimationFrame(drawVisualizer);
  }

  function stopVisualizer() {
    if (animationId) window.cancelAnimationFrame(animationId);
    animationId = null;
    visualizerBars.forEach((bar) => { bar.style.transform = ''; }); // volta à altura de repouso
  }


  /* 9. MINI PLAYER FLUTUANTE ================================================
     Aparece quando a música já começou e o celular do hero saiu da tela.   */
  let miniDismissed = false;

  function updateMiniPlayer() {
    if (!miniPlayer) return;
    const show = state.started && !heroVisible && !miniDismissed;
    miniPlayer.toggleAttribute('data-visible', show);
    miniPlayer.inert = !show; // escondido = fora da navegação por teclado
  }

  if (heroPlayer && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      updateMiniPlayer();
      if (heroVisible && isPlaying()) startVisualizer();
    }, { threshold: 0.25 }).observe(heroPlayer);
  }

  const miniClose = document.querySelector('[data-mini-close]');
  if (miniClose) {
    miniClose.addEventListener('click', () => {
      miniDismissed = true;
      pause();
      updateMiniPlayer();
    });
  }


  /* 10. MEDIA SESSION API =================================================== */
  function updateMediaSession() {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    const track = currentTrack();
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: 'Melodia · Descobertas da Semana',
      artwork: IS_HTTP ? [{ src: new URL(track.cover, document.baseURI).href, sizes: '400x400', type: 'image/svg+xml' }] : [],
    });
  }

  if ('mediaSession' in navigator) {
    const handlers = {
      play,
      pause,
      previoustrack: previous,
      nexttrack: () => next({ autoplay: true }),
    };
    Object.entries(handlers).forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // ação não suportada neste navegador
      }
    });
  }


  /* 11. INICIALIZAÇÃO ======================================================= */
  buildVisualizer();
  load(0);
  const checkedPreset = document.querySelector('input[name="eq-preset"]:checked');
  applyPreset(checkedPreset ? checkedPreset.value : 'equilibrado');
})();
