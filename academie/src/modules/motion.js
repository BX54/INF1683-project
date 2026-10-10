export const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (reduced) document.documentElement.classList.add('reduced');

export const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Découpe le texte d'un élément en mots (<span class="w"><span class="w-i">), en conservant les balises internes. */
export function splitWords(el, innerClass = 'w-i') {
  if (el.dataset.splitDone) return [...el.querySelectorAll(`.${innerClass}`)];
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.append(document.createTextNode(' '));
            return;
          }
          const w = document.createElement('span');
          w.className = 'w';
          const i = document.createElement('span');
          i.className = innerClass;
          i.textContent = part;
          w.append(i);
          frag.append(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
        walk(child);
      }
    });
  };
  walk(el);
  el.dataset.splitDone = '1';
  const words = [...el.querySelectorAll(`.${innerClass}`)];
  // Décale le reflet doré mot à mot pour un effet de vague
  words.forEach((w, i) => {
    if (w.closest('.gold-text')) w.style.animationDelay = `${-i * 0.35}s`;
  });
  return words;
}

export const formatPrice = (p) => `${p} $`;
