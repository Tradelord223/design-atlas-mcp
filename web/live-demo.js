import { hostedMcpUrl } from './hosting.js';

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

async function request(method, params, id, signal, version) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
  if (version) headers['MCP-Protocol-Version'] = version;
  const response = await fetch(hostedMcpUrl, {
    method: 'POST', headers, credentials: 'omit', signal,
    body: JSON.stringify({ jsonrpc: '2.0', method, params, ...(id ? { id } : {}) })
  });
  if (!response.ok) throw new Error('The Space returned HTTP ' + response.status + '.');
  if (!id) return;
  const payload = await response.text();
  let message;
  if (response.headers.get('content-type')?.includes('text/event-stream')) {
    for (const event of payload.split(/\r?\n\r?\n/)) {
      const data = event.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
      if (data) {
        const item = JSON.parse(data);
        if (item.id === id) message = item;
      }
    }
  } else {
    message = JSON.parse(payload);
  }
  if (message?.error || message?.id !== id || !message?.result) {
    throw new Error(message?.error?.message || 'The Space returned an incomplete MCP response.');
  }
  return message.result;
}

export function mountLiveDemo(container) {
  if (!hostedMcpUrl || !container) return;
  container.classList.add('atlas-live');
  container.hidden = false;
  const title = element('h2', 'Search the hosted MCP');
  const intro = element('p', 'Send a design question to the public Hugging Face Space and inspect one of the references it returns.');
  const form = element('form');
  const label = element('label', 'What are you designing?');
  const input = element('input');
  input.id = 'atlas-live-query'; label.htmlFor = input.id;
  input.value = 'Meeting notes with editable action items';
  input.maxLength = 500; input.required = true; input.type = 'search';
  const submit = element('button', 'Run live search'); submit.type = 'submit';
  const row = element('div', '', 'atlas-live-controls');
  row.append(input, submit); form.append(label, row);
  const status = element('p', '', 'atlas-live-status'); status.setAttribute('role', 'status');
  const results = element('div', '', 'atlas-live-results');
  const serverLink = element('a', 'Open the Space'); serverLink.href = new URL('/', hostedMcpUrl).href;
  container.append(title, intro, form, status, results, serverLink);

  let active;
  let version;
  async function tool(name, args, id, signal) {
    const result = await request('tools/call', { name, arguments: args }, id, signal, version);
    if (result.isError) throw new Error(result.content?.find(i => i.type === 'text')?.text || 'The tool could not complete the request.');
    return result;
  }
  function failure(error) {
    return error.name === 'TimeoutError' ? 'The Space is taking longer than a minute to respond. Try the search again.' : error.message;
  }
  function controllerForRequest() {
    active?.abort();
    active = new AbortController();
    return AbortSignal.any([active.signal, AbortSignal.timeout(60000)]);
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const query = input.value.trim(); if (!query) return;
    const signal = controllerForRequest();
    results.replaceChildren(); submit.disabled = true;
    status.textContent = 'Connecting to the Space…';
    try {
      const info = await request('initialize', {
        protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'Design Atlas gallery', version: '1.0' }
      }, 1, signal);
      version = info.protocolVersion;
      await request('notifications/initialized', {}, null, signal, version);
      const found = await tool('search_inspirations', { query, limit: 3 }, 2, signal);
      const cards = found.structuredContent.results;
      status.textContent = cards.length ? cards.length + ' results from ' + info.serverInfo.name + ' ' + info.serverInfo.version + '.' : 'No matches. Try a term such as notebook, checkout or motion.';
      for (const card of cards) {
        const entry = element('article');
        entry.append(element('h3', card.title), element('p', card.summary));
        const inspect = element('button', 'Inspect reference'); inspect.type = 'button';
        const preview = element('div', '', 'atlas-live-preview');
        const ref = element('a', 'View study'); ref.href = './?id=' + encodeURIComponent(card.id);
        entry.append(inspect, ref, preview); results.append(entry);
        inspect.addEventListener('click', async () => {
          inspect.disabled = true;
          preview.textContent = 'Reading the evidence…';
          try {
            const response = await tool('get_inspiration', { id: card.id }, 3, AbortSignal.any([active.signal, AbortSignal.timeout(60000)]));
            const images = response.content.filter(item => item.type === 'image' && item.mimeType === 'image/png');
            preview.replaceChildren(element('p', images.length + (images.length===1?' image':' frames') + ' · ' + response.structuredContent.files.length + ' evidence files'));
            const strip = element('div', '', 'atlas-live-strip');
            for (const [index, image] of images.entries()) {
              const img = element('img'); img.src = 'data:image/png;base64,' + image.data;
              img.alt = card.title + (images.length > 1 ? ', frame ' + (index + 1) : ''); strip.append(img);
            }
            preview.append(strip);
          } catch (error) { if (error.name !== 'AbortError') preview.textContent = failure(error); }
          finally { inspect.disabled = false; }
        });
      }
    } catch (error) { if (error.name !== 'AbortError') status.textContent = failure(error); }
    finally { submit.disabled = false; }
  });
  if (location.hash === '#live-mcp') container.scrollIntoView();
}

mountLiveDemo(document.getElementById('live-mcp'));
