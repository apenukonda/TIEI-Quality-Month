import { useEffect } from 'react';
import { KN_DECREASE_PX } from './knSettings';

// Regex helpers
const KANNADA_CHAR = /[\u0C80-\u0CFF]/;
const KANNADA_RUN = /([\u0C80-\u0CFF]+)/g;

function parsePx(value: string | null) {
  if (!value) return null;
  const m = value.match(/^([0-9.]+)px$/);
  return m ? parseFloat(m[1]) : null;
}

// Unwrap helper: replace a node with a set of nodes
function createFragmentFromParts(doc: Document, parts: Array<{ text: string; isKn: boolean }>, parentFontPx: number) {
  const frag = doc.createDocumentFragment();
  parts.forEach(p => {
    if (!p.isKn) {
      frag.appendChild(doc.createTextNode(p.text));
      return;
    }
    const span = doc.createElement('span');
    span.textContent = p.text;
    span.dataset.knScaled = '1';
    const newSize = Math.max(1, parentFontPx - KN_DECREASE_PX);
    span.style.fontSize = `${newSize}px`;
    // Prevent transforming inside this span again
    span.classList.add('kn-scaled');
    frag.appendChild(span);
  });
  return frag;
}

export default function KnFontScaler({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;

    const doc = document;

    function processTextNode(tn: Text) {
      if (!tn.nodeValue) return;
      if (!KANNADA_CHAR.test(tn.nodeValue)) return;
  const parent = tn.parentElement;
      if (!parent) return;
      const tag = parent.tagName.toLowerCase();
  // Skip form controls, code blocks and other nodes we shouldn't touch.
  if (['input', 'textarea', 'select', 'code', 'pre', 'svg', 'script', 'style'].includes(tag)) return;
  // If an ancestor explicitly opts out from Kannada scaling, skip it.
  if (parent.closest && (parent.closest('span.kn-scaled') || parent.closest('[data-kn-skip]'))) return;

      const parentStyle = window.getComputedStyle(parent);
      const parentFontPx = parsePx(parentStyle.fontSize) || 16;

      const txt = tn.nodeValue || '';

      const parts: Array<{ text: string; isKn: boolean }> = [];
      let lastIndex = 0;
      KANNADA_RUN.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = KANNADA_RUN.exec(txt)) !== null) {
        const idx = m.index;
        if (idx > lastIndex) parts.push({ text: txt.slice(lastIndex, idx), isKn: false });
        parts.push({ text: m[0], isKn: true });
        lastIndex = idx + m[0].length;
      }
      if (lastIndex < txt.length) parts.push({ text: txt.slice(lastIndex), isKn: false });

  // If there's only one part but it's Kannada, we still want to wrap and scale it.
  if (parts.length <= 1 && !(parts[0] && parts[0].isKn)) return;

      const frag = createFragmentFromParts(doc, parts, parentFontPx);
      tn.parentNode?.replaceChild(frag, tn);
    }

    function processNode(root: Node) {
      // Find text nodes under root
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);
      nodes.forEach(processTextNode);
    }

    // Initial pass
    processNode(document.body);

    // Observe for future changes
    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        if (m.type === 'childList') {
          m.addedNodes.forEach(n => processNode(n));
        } else if (m.type === 'characterData') {
          const target = m.target as Node;
          if (target && target.parentNode) processNode(target.parentNode);
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    // Cleanup: remove scaled spans and disconnect observer
    return () => {
      observer.disconnect();
      const scaled = Array.from(document.querySelectorAll('span[data-kn-scaled]'));
      scaled.forEach(s => {
        const parent = s.parentNode;
        if (!parent) return;
        parent.replaceChild(document.createTextNode(s.textContent || ''), s);
      });
    };
  }, [enabled]);

  return null;
}
