# Roteiro de apresentação · Check-Point 05 (Melodia)

Guia para o grupo demonstrar a landing page funcionando e explicar como chegou ao resultado,
usando os termos técnicos pedidos: **estrutura HTML, classes Tailwind, layout responsivo,
interações em JS, organização de arquivos e decisões de interface**.

⏱️ Tempo sugerido: 8 a 10 minutos. Com menos de 5 pessoas, juntem as partes.

| Parte | Quem | Tempo | Assunto |
|---|---|---|---|
| 1 | Integrante 1 | 2 min | Abertura + demonstração ao vivo |
| 2 | Integrante 2 | 1,5 min | Estrutura HTML5 e organização de arquivos |
| 3 | Integrante 3 | 2 min | Tailwind, CSS3 e layout responsivo |
| 4 | Integrante 4 | 2 min | Interações em JavaScript |
| 5 | Integrante 5 | 1,5 min | Formulário, deploy e decisões de interface |

---

## 1. Abertura + demonstração ao vivo

**Fala:** "O Melodia é um app de música para jovens e amantes de música que buscam novas descobertas.
Criamos uma landing page moderna e clean, com cores vibrantes e elementos musicais, destacando os
quatro diferenciais: som superior, playlists personalizadas, descoberta de artistas e interface intuitiva."

**Roteiro de cliques** (testem antes!):

1. Abrir o link do **GitHub Pages**.
2. Mostrar o **header transparente** e rolar um pouco: ele ganha fundo translúcido com desfoque.
3. Voltar ao topo e clicar em **Ouvir Agora**: a música toca no celular, a capa cresce, o visualizador
   reage ao som e até o logo "dança".
4. Rolar até **Funcionalidades** e trocar o preset do equalizador para **Mais graves** (dá para ouvir a diferença).
   Repare no **mini player** que aparece embaixo.
5. Passar por **Depoimentos** e abrir uma pergunta do **FAQ**.
6. No **formulário**, clicar em enviar vazio (erros), digitar um e-mail inválido e depois enviar corretamente.
7. No rodapé, abrir a **Política de Privacidade**.
8. Apertar **F12 → Ctrl+Shift+M** (modo dispositivo) e mostrar o site no celular com o menu hambúrguer.

---

## 2. Estrutura HTML5 e organização de arquivos

**Fala:** "Usamos HTML5 semântico: cada parte da página tem a tag certa, o que ajuda a acessibilidade e o SEO."

```html
<header id="site-header">...</header>          <!-- menu fixo -->
<main id="conteudo">
  <section id="inicio">...</section>          <!-- hero -->
  <section id="apresentacao">...</section>    <!-- benefícios -->
  <section id="funcionalidades">...</section> <!-- cards -->
  <section id="depoimentos">...</section>     <!-- figure + blockquote -->
  <section id="faq">...</section>             <!-- details + summary -->
  <section id="contato">...</section>         <!-- formulário -->
</main>
<footer>...</footer>
```

- Depoimentos com `<figure>`, `<blockquote>` e `<cite>`; FAQ com `<details>`/`<summary>` (abre e fecha sem JS).
- Acessibilidade: link "Pular para o conteúdo", `aria-label` nos botões de ícone, `aria-expanded` no menu,
  `aria-live` nas mensagens e `alt` nas imagens.
- **Organização:** `index.html` e `politica-de-privacidade.html` na raiz; `assets/` com `css`, `js`
  (um arquivo por responsabilidade: `main.js`, `player.js`, `form.js`), `img` e `audio`; `src/input.css` é o
  CSS fonte que o Tailwind compila para `assets/css/style.css`.

---

## 3. Tailwind, CSS3 e layout responsivo

**Fala:** "Definimos a paleta e a tipografia uma única vez no `@theme` do Tailwind v4. Cada variável vira
classe: `--color-brand-500` gera `bg-brand-500`, `text-brand-500`..."

```css
/* src/input.css */
@theme {
  --font-display: "Bricolage Grotesque", "DM Sans", ui-sans-serif, system-ui, sans-serif;
  --color-ink-900: #0c0a17;
  --color-brand-500: #f72ba8;
}
```

**Layout responsivo (mobile-first):** a mesma lista vira 1, 2 ou 4 colunas conforme a tela.

```html
<ul class="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
```

**Estilo consistente dos ícones** (pedido no slide): um componente reutilizado em todos os benefícios.

```css
.icon-badge {
  @apply grid size-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-violet-500/25
         to-brand-500/25 text-2xl text-brand-300 ring-1 ring-white/10 ring-inset transition duration-300;
}
```

**Variante customizada:** criamos a variante `playing:`, ativa enquanto a música toca.

```css
@custom-variant playing (&:where(.is-playing, .is-playing *));
```

```html
<img class="scale-[0.92] transition duration-500 playing:scale-100" ...>
```

**CSS3 puro:** o disco de vinil é feito só com gradientes (`repeating-radial-gradient` + `conic-gradient`),
o equalizador usa `@keyframes`, e quem ativa "reduzir movimento" no sistema não vê animações
(`@media (prefers-reduced-motion: reduce)`).

---

## 4. Interações em JavaScript

**Menu fixo com efeito de transparência** (requisito do slide), em `assets/js/main.js`:

```js
const SCROLL_LIMIT = 24;

function updateHeader() {
  const scrolled = window.scrollY > SCROLL_LIMIT;
  header.toggleAttribute('data-scrolled', scrolled || isMenuOpen());
  ticking = false;
}
```

```html
<header class="fixed ... data-scrolled:bg-ink-900/75 data-scrolled:backdrop-blur-xl">
```

**Fala:** "O JavaScript só liga ou desliga o atributo `data-scrolled`; o visual fica com o Tailwind. Usamos
`requestAnimationFrame` para atualizar no máximo uma vez por quadro, o que deixa a rolagem leve."

**Animações ao rolar:** `IntersectionObserver` avisa quando o elemento entra na tela (sem biblioteca externa).

```js
const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    observer.unobserve(entry.target);
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
```

**Player e equalizador** (`assets/js/player.js`): o som passa por 10 filtros da **Web Audio API**,
um por faixa de frequência, antes de chegar às caixas de som.

```js
// <audio> → 10 filtros → volume → analisador → caixas de som
[source, ...bandFilters, gainNode, analyserNode, context.destination]
  .reduce((from, to) => { from.connect(to); return to; });
```

---

## 5. Formulário, deploy e decisões de interface

**Formulário** (`assets/js/form.js`): validação com mensagens em português e `aria-invalid`.

```js
email(input) {
  const value = input.value.trim();
  if (!value) return 'Informe seu e-mail para receber as novidades.';
  if (!EMAIL_PATTERN.test(value)) return 'Esse e-mail não parece válido. Confira e tente de novo.';
  return '';
},
```

**Fala:** "O GitHub Pages não tem back-end, então na demonstração os e-mails ficam no `localStorage`. Para
coletar de verdade, basta colocar a URL do Formspree no atributo `data-endpoint`."

**Deploy:** repositório no GitHub → Settings → Pages → Deploy from a branch (main, /root).
O CSS já vai compilado, então não há build no servidor.

**Decisões de interface:**
- Fundo escuro para destacar as cores vibrantes (magenta, violeta e laranja), no estilo dos apps de música.
- Um elemento musical recorrente (barras de equalizador) para dar identidade sem poluir a tela.
- Mockup interativo no lugar de uma imagem estática: o visitante já "usa" o app antes de baixar.
- Contraste AA, foco visível, navegação por teclado e suporte a "reduzir movimento".
- Performance: CSS com só as classes usadas, fontes com `display=swap`, imagens `loading="lazy"` e áudio
  carregado apenas no clique (`preload="none"`).

---

## Perguntas que o professor pode fazer

**Por que usar o Tailwind CLI em vez do CDN?**
O CDN compila as classes no navegador de cada visitante. O CLI gera um CSS pronto e minificado só com as
classes usadas: carrega mais rápido e não "pisca" sem estilo.

**Onde está o CSS3, se vocês usaram Tailwind?**
Em `src/input.css`: variáveis, `@keyframes`, gradientes do vinil, `@property`, `backdrop-filter`,
estilização do `input range` e a media query de movimento reduzido.

**Como o menu fica transparente?**
O header é `position: fixed` com fundo transparente. O `main.js` escuta a rolagem e, passando de 24px,
adiciona `data-scrolled`; as classes `data-scrolled:*` aplicam o fundo translúcido e o `backdrop-blur`.

**Vocês usaram alguma biblioteca JavaScript?**
Não foi necessário (o item era opcional). Usamos APIs nativas: `IntersectionObserver` para as animações e a
Web Audio API para o equalizador. Assim o site fica mais leve e sem dependências.

**De onde vêm as músicas? Tem problema de direitos autorais?**
São do acervo FreePD, em domínio público (Kevin MacLeod e Frank Nora). Os créditos estão no README e no rodapé.

**O site funciona no celular?**
Sim. É mobile-first: testamos em 390px, 768px, 1280px e 1440px, com menu hambúrguer e formulário em uma coluna.
