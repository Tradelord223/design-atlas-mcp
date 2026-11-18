import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectEditionSource } from '../src/edition-source.js';

test('inventory ties visible copy and photo candidates to the supplied HTML and base URL', () => {
  const html = `<!doctype html><head><base href="/assets/"><title>Workshop</title><meta name="description" content="A view inside"></head>
    <main id="bench"><h1>The bench</h1><img alt="A steel plate" src="plate.jpg"><img src="plate.jpg"><p>From the <em>workshop</em> floor.</p><a href="../notes">Open notes</a>
    <div hidden><img src="hidden.jpg"><button>Hidden</button></div><script>const text = 'ignore';</script></main>`;
  const result = inspectEditionSource({html,pageUrl:'https://example.org/field/'});
  assert.equal(result.title,'Workshop');
  assert.equal(result.description,'A view inside');
  assert.equal(result.headings[0].line,2);
  assert.equal(result.photos.length,1);
  assert.equal(result.photos[0].src,'https://example.org/assets/plate.jpg');
  assert.equal(result.photos[0].section,'bench');
  assert.deepEqual(result.controls.map(c=>c.destination),['https://example.org/notes']);
  assert.equal(result.passages[0].text,'From the workshop floor.');
  assert.throws(()=>inspectEditionSource({html,pageUrl:'file:///source'}),/HTTPS/);
});
