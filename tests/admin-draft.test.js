import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { UI } from '../src/i18n.js';

const source = readFileSync(new URL('../public/admin-v4.js', import.meta.url), 'utf8');
const functions = source.slice(source.indexOf('function readDraft()'), source.indexOf('async function save()'));
function editor() {
  const data = new Map(), notices = [];
  const config = { name: 'Edited', links: [], settings: {} };
  const context = vm.createContext({
    config, saved: JSON.stringify({ ...config, name: 'Saved' }), dirty: true,
    draftKey: 'draft', draftOwner: 'tab-one', draftTimer: null, pendingDraft: null, pendingDraftRaw: null, draftWarning: false, draftDiscarded: false,
    ui: UI.en.admin, draftNotice: { hidden: true, querySelector: () => ({}) },
    document: { querySelector: () => ({}) }, clearTimeout() {}, confirm: () => true,
    showToast(message) { notices.push(message); },
    localStorage: { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
  });
  vm.runInContext(functions, context);
  return { data, notices, context, run: code => vm.runInContext(code, context) };
}

test('drafts contain only editor settings and successful saves remove only their own draft', () => {
  const e = editor();
  e.context.passwordPanel = { password: 'must-not-be-stored' };
  e.run('persistDraft()');
  assert.equal(JSON.parse(e.data.get('draft')).config.name, 'Edited');
  assert.ok(!e.data.get('draft').includes('must-not-be-stored'));
  e.run('dirty = false; persistDraft()');
  assert.equal(e.data.has('draft'), false);
  e.data.set('draft', JSON.stringify({ owner: 'another-tab', config: {} }));
  e.run('persistDraft()');
  assert.equal(e.data.has('draft'), true);
});

test('drafts from other tabs wait for a decision and are never silently overwritten', () => {
  const e = editor();
  const other = JSON.stringify({ format: 'contact-hub', version: 1, owner: 'other', base: '{}', config: { name: 'Other draft' } });
  e.data.set('draft', other);
  e.run('persistDraft()');
  assert.equal(e.data.get('draft'), other);
  assert.equal(e.context.draftNotice.hidden, false);
  assert.equal(e.context.pendingDraft.config.name, 'Other draft');
  e.run('persistDraft()');
  assert.equal(e.data.get('draft'), other);
});

test('discard does not recreate a draft on page exit and denied storage is nonfatal', () => {
  const e = editor();
  e.run('persistDraft(); discardDraft(); persistDraft()');
  assert.equal(e.data.has('draft'), false);
  assert.equal(e.context.config.name, 'Edited');
  e.context.localStorage.getItem = () => { throw new Error('Denied'); };
  assert.doesNotThrow(() => e.run('draftDiscarded = false; persistDraft(); persistDraft()'));
  assert.equal(e.notices.filter(message => message === UI.en.admin.draftUnavailable).length, 1);
});

test('backup, draft and visibility controls have all three owner translations', () => {
  const keys = ['backup', 'backupHelp', 'exportSettings', 'importSettings', 'importConfirm', 'imported', 'importFailed', 'draftFound', 'restoreDraft', 'discardDraft', 'draftHelp', 'draftConfirm', 'draftConflict', 'draftRestored', 'draftUnavailable', 'draftInvalid', 'discardConfirm', 'draftDiscarded', 'draftChanged', 'visibility', 'active', 'pending', 'hidden', 'visibilityHelp'];
  for (const lang of ['zh-TW', 'en', 'ja']) {
    for (const key of keys) assert.ok(UI[lang].admin[key]?.trim(), `${lang}: ${key}`);
    assert.ok(UI[lang].api.invalidBackup);
  }
});
