/**
 * MELODIA · Landing Page
 * form.js: validação e envio do formulário de novidades (captação de e-mails)
 *
 *  - Validação personalizada em português (o atributo novalidate no <form>
 *    desliga os balões padrão do navegador para usarmos as nossas mensagens).
 *  - Mensagens de erro ligadas aos campos com aria-invalid e aria-describedby,
 *    para que leitores de tela anunciem o problema.
 *  - Envio: o GitHub Pages só hospeda arquivos estáticos (não tem back-end).
 *    Por isso, por padrão, os cadastros ficam salvos no localStorage do
 *    navegador (modo demonstração). Para coletar os e-mails de verdade, basta
 *    colocar a URL de um serviço como o Formspree no atributo data-endpoint
 *    do <form>: o envio passa a ser feito com fetch().
 */
(() => {
  'use strict';

  const form = document.getElementById('newsletter-form');
  if (!form) return;

  const STORAGE_KEY = 'melodia:leads';
  const statusBox = form.querySelector('[data-form-status]');
  const submitButton = form.querySelector('[data-submit]');
  const submitLabel = form.querySelector('[data-submit-label]');
  const submitIcon = form.querySelector('[data-submit-icon]');

  const fields = {
    nome: form.elements.nome,
    email: form.elements.email,
    consentimento: form.elements.consentimento,
  };

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  // Cada função devolve a mensagem de erro, ou '' se o campo estiver válido
  const validators = {
    nome(input) {
      const value = input.value.trim();
      if (!value) return 'Conta pra gente como podemos te chamar.';
      if (value.length < 2) return 'O nome precisa ter pelo menos 2 letras.';
      return '';
    },
    email(input) {
      const value = input.value.trim();
      if (!value) return 'Informe seu e-mail para receber as novidades.';
      if (!EMAIL_PATTERN.test(value)) return 'Esse e-mail não parece válido. Confira e tente de novo.';
      return '';
    },
    consentimento(input) {
      return input.checked ? '' : 'Para continuar, marque que aceita receber nossos e-mails.';
    },
  };


  /* Mensagens de erro de cada campo ======================================== */
  function showFieldError(name, message) {
    const input = fields[name];
    const errorElement = document.getElementById(`${name}-erro`);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (!errorElement) return;
    errorElement.hidden = !message;
    errorElement.replaceChildren();
    if (message) {
      const icon = document.createElement('i');
      icon.className = 'fa-solid fa-circle-exclamation';
      icon.setAttribute('aria-hidden', 'true');
      errorElement.append(icon, ` ${message}`);
    }
  }

  function validateField(name) {
    const message = validators[name](fields[name]);
    showFieldError(name, message);
    return !message;
  }

  // Valida ao sair do campo e, se ele já estava com erro, a cada digitação
  Object.keys(validators).forEach((name) => {
    const input = fields[name];
    const liveEvent = input.type === 'checkbox' ? 'change' : 'input';

    input.addEventListener(liveEvent, () => {
      if (input.getAttribute('aria-invalid') === 'true') validateField(name);
    });

    if (input.type !== 'checkbox') {
      input.addEventListener('blur', () => {
        if (input.value.trim()) validateField(name);
      });
    }
  });


  /* Caixa de status geral (sucesso, aviso ou erro) ========================= */
  const STATUS_ICONS = {
    success: 'fa-solid fa-circle-check',
    info: 'fa-solid fa-circle-info',
    error: 'fa-solid fa-triangle-exclamation',
  };

  function setStatus(type, message) {
    if (!statusBox) return;
    if (!type) {
      statusBox.removeAttribute('data-type');
      statusBox.replaceChildren();
      return;
    }
    statusBox.dataset.type = type; // estilizado com data-[type=success]:... no HTML
    const icon = document.createElement('i');
    icon.className = `${STATUS_ICONS[type]} mt-0.5`;
    icon.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.textContent = message;
    statusBox.replaceChildren(icon, text);
  }

  function setLoading(loading) {
    submitButton.disabled = loading;
    submitButton.setAttribute('aria-busy', String(loading));
    submitLabel.textContent = loading ? 'Enviando…' : 'Quero receber novidades';
    submitIcon.className = loading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-paper-plane';
  }


  /* Armazenamento local (modo demonstração) ================================ */
  function readLeads() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return []; // localStorage bloqueado (ex.: navegação privada)
    }
  }

  // Devolve false se o e-mail já estava cadastrado
  function saveLead(lead) {
    const leads = readLeads();
    if (leads.some((item) => item.email === lead.email)) return false;
    leads.push(lead);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
    } catch {
      // sem armazenamento disponível: segue como sucesso na demonstração
    }
    return true;
  }

  const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });


  /* Envio ================================================================== */
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus(null);

    // Valida todos os campos (sem parar no primeiro, para mostrar todos os erros)
    const invalid = Object.keys(validators).filter((name) => !validateField(name));
    if (invalid.length) {
      fields[invalid[0]].focus();
      setStatus('error', 'Confira os campos destacados antes de enviar.');
      return;
    }

    // Honeypot preenchido = provavelmente um robô: ignora em silêncio
    if (form.elements.empresa && form.elements.empresa.value) return;

    const lead = {
      nome: fields.nome.value.trim(),
      email: fields.email.value.trim().toLowerCase(),
      estilo: form.elements.estilo.value,
      data: new Date().toISOString(),
    };
    const firstName = lead.nome.split(' ')[0];

    setLoading(true);
    try {
      const endpoint = form.dataset.endpoint;

      if (endpoint) {
        // Envio real para um serviço de formulários (ex.: Formspree)
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(form),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      } else {
        // Modo demonstração: simula a rede e guarda no navegador
        await wait(900);
        if (!saveLead(lead)) {
          setStatus('info', `${firstName}, o e-mail ${lead.email} já está na nossa lista. Fique de olho na sua caixa de entrada!`);
          return;
        }
      }

      form.reset();
      Object.keys(fields).forEach((name) => fields[name].removeAttribute('aria-invalid'));
      setStatus('success', `Prontinho, ${firstName}! Você entrou na lista do Melodia. Em breve seu cupom de 3 meses de Premium chega em ${lead.email}.`);
    } catch (error) {
      setStatus('error', 'Não conseguimos enviar agora. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  });
})();
