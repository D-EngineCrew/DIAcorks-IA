// src/components/services/webTools.js
// Búsqueda en internet (DuckDuckGo, sin API key) para darle contexto a la IA.

const SEARCH_WORDS = /\b(busca|buscar|búscame|busque|internet|en la web|googlea|noticias|últimas noticias|hoy|actualidad|precio actual|clima)\b/i;

export const wantsSearch = (text) => SEARCH_WORDS.test(String(text || ''));

export const toQuery = (text) =>
  String(text || '')
    .replace(/\b(busca|buscar|búscame|busque|en internet|en la web|por favor|googlea)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);

const decode = (s) =>
  String(s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();

const realUrl = (href) => {
  const m = String(href).match(/[?&]uddg=([^&]+)/);
  if (m) { try { return decodeURIComponent(m[1]); } catch (e) {} }
  return String(href).startsWith('//') ? 'https:' + href : href;
};

export const webSearch = async (query, onStatus) => {
  try {
    onStatus && onStatus('Buscando en internet…');
    const res = await fetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query), {
      headers: { 'User-Agent': 'Mozilla/5.0 (Android) DIAcorks' },
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const html = await res.text();
    const sources = [];
    const re = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = re.exec(html)) !== null && sources.length < 5) {
      sources.push({ url: realUrl(m[1]), title: decode(m[2]), snippet: decode(m[3]) });
    }
    if (!sources.length) return { ok: false, error: 'sin resultados' };
    const context = sources.map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet}\nFuente: ${s.url}`).join('\n\n');
    return { ok: true, sources, context };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
};
