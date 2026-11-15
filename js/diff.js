// Diff de linhas (LCS) para a tela de publicação.
export function diffLines(a = '', b = '') {
  const A = a === '' ? [] : a.split('\n'); const B = b === '' ? [] : b.split('\n');
  // remove prefixo/sufixo comuns para reduzir o custo
  let s = 0; while (s < A.length && s < B.length && A[s] === B[s]) s++;
  let ea = A.length, eb = B.length; while (ea > s && eb > s && A[ea - 1] === B[eb - 1]) { ea--; eb--; }
  const a2 = A.slice(s, ea), b2 = B.slice(s, eb);
  const rows = A.slice(0, s).map((x) => ({ t: ' ', x }));
  if (a2.length * b2.length > 4e6) {
    a2.forEach((x) => rows.push({ t: '-', x })); b2.forEach((x) => rows.push({ t: '+', x }));
  } else {
    const n = a2.length, m = b2.length;
    const L = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a2[i] === b2[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (a2[i] === b2[j]) { rows.push({ t: ' ', x: a2[i] }); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) rows.push({ t: '-', x: a2[i++] });
      else rows.push({ t: '+', x: b2[j++] });
    }
    while (i < n) rows.push({ t: '-', x: a2[i++] });
    while (j < m) rows.push({ t: '+', x: b2[j++] });
  }
  A.slice(ea).forEach((x) => rows.push({ t: ' ', x }));
  const stats = { add: rows.filter((r) => r.t === '+').length, del: rows.filter((r) => r.t === '-').length };
  return { rows, stats };
}

/** Reduz o diff a trechos com `ctx` linhas de contexto. */
export function collapseDiff(rows, ctx = 2) {
  const keep = new Array(rows.length).fill(false);
  rows.forEach((r, i) => { if (r.t !== ' ') for (let k = Math.max(0, i - ctx); k <= Math.min(rows.length - 1, i + ctx); k++) keep[k] = true; });
  const out = []; let gap = false;
  rows.forEach((r, i) => { if (keep[i]) { out.push(r); gap = false; } else if (!gap) { out.push({ t: '…', x: '' }); gap = true; } });
  return out;
}
