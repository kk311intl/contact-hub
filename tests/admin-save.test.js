import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../public/admin-v4.js', import.meta.url), 'utf8');
const save = source.slice(source.indexOf('async function save()'), source.indexOf('function showToast('));

test('save keeps edits made in flight dirty and supports the next save', async () => {
  const original = { name: 'Example', links: [{ label: 'Original' }], settings: { footerLinks: [{ label: 'Status' }] } };
  let resolve, submitted, renders = 0;
  const context = vm.createContext({
    config: structuredClone(original), saved: JSON.stringify(original), dirty: false,
    saveButton: { disabled: false }, document: {}, ui: { title: 'Admin', saved: 'Saved' },
    collect() {}, showToast() {},
    renderLinks() { renders++; }, renderFooterLinks() { renders++; },
    fetch(_, options) { submitted = JSON.parse(options.body); return new Promise(done => { resolve = done; }); }
  });
  vm.runInContext('function markDirty() { dirty = JSON.stringify(config) !== saved; }\n' + save, context);
  const first = vm.runInContext('save()', context);
  context.config.links[0].label = 'Edited while saving';
  context.config.settings.footerLinks[0].label = 'New footer';
  resolve({ ok: true, json: async () => submitted });
  await first;
  assert.equal(context.config.links[0].label, 'Edited while saving');
  assert.equal(context.config.settings.footerLinks[0].label, 'New footer');
  assert.equal(context.dirty, true);
  assert.equal(renders, 0);
  assert.equal(context.saveButton.disabled, false);
  const second = vm.runInContext('save()', context);
  resolve({ ok: true, json: async () => submitted });
  await second;
  assert.equal(context.dirty, false);
  assert.equal(renders, 2);
});

test('failed saves preserve current edits and re-enable saving', async () => {
  const context = vm.createContext({
    config: { name: 'Example' }, saved: '{}', saveButton: { disabled: false },
    collect() {}, showToast() {}, fetch: async () => { throw new Error('Offline'); }
  });
  vm.runInContext(save, context);
  await vm.runInContext('save()', context);
  assert.equal(context.config.name, 'Example');
  assert.equal(context.saved, '{}');
  assert.equal(context.saveButton.disabled, false);
});
