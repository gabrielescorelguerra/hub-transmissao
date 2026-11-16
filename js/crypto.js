// Senha fixa do editor: o token do GitHub fica no repositório (auth.json) cifrado com a senha.
// Quem tiver o código E a senha consegue abrir; sem a senha, é só texto cifrado.
const ITER = 310000;
const b64 = (u8) => btoa(String.fromCharCode(...u8));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function key(password, salt, iter) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptToken(token, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(password, salt, ITER), new TextEncoder().encode(token)));
  return { v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), data: b64(data) };
}

/** Devolve o token, ou lança Error('senha incorreta'). */
export async function decryptToken(blob, password) {
  try {
    const out = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(blob.iv) }, await key(password, unb64(blob.salt), blob.iter || ITER), unb64(blob.data));
    return new TextDecoder().decode(out);
  } catch { throw new Error('Senha incorreta.'); }
}
