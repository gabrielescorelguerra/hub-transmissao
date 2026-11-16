import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptToken, decryptToken } from '../js/crypto.js';

test('cifra e decifra o token com a senha certa', async () => {
  const blob = await encryptToken('github_pat_abc123', 'minha senha');
  assert.ok(!JSON.stringify(blob).includes('github_pat'));
  assert.equal(await decryptToken(blob, 'minha senha'), 'github_pat_abc123');
});
test('senha errada falha', async () => {
  const blob = await encryptToken('github_pat_abc123', 'certa');
  await assert.rejects(() => decryptToken(blob, 'errada'), /Senha incorreta/);
});
