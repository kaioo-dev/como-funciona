"""Alinha os tempos do palavras.json (faster-whisper) ao texto exato do roteiro.

Uso:
    python tools/alinhar_roteiro.py <palavras.json> <roteiro.txt> <saida.ts> ["falado=>legenda" ...]

O roteiro é o texto que a voz leu. Cada par "falado=>legenda" troca um trecho do roteiro na legenda
(ex.: "trezentos milhões=>300 milhões"). Palavras que o Whisper ouviu diferente recebem o tempo dos vizinhos.
Gera um .ts com `export const PALAVRAS: {w, s, e}[]`.
"""

import difflib
import json
import re
import sys
import unicodedata


def norm(w):
    w = unicodedata.normalize('NFKD', w.lower())
    w = ''.join(c for c in w if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]', '', w)


def main():
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    wh = json.load(open(sys.argv[1], encoding='utf-8'))
    roteiro = open(sys.argv[2], encoding='utf-8').read().strip().replace('\n', ' ')
    trocas = [a.split('=>') for a in sys.argv[4:]]
    for falado, legenda in trocas:
        roteiro = roteiro.replace(falado, legenda)
    rw = roteiro.split()
    sin = {'para': 'pro', 'trezentos': '300'}
    a = [sin.get(norm(x['w']), norm(x['w'])) for x in wh]
    b = [sin.get(norm(x), norm(x)) for x in rw]
    tempo = [None] * len(rw)
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag == 'equal':
            for k in range(i2 - i1):
                tempo[j1 + k] = (wh[i1 + k]['s'], wh[i1 + k]['e'])
        elif tag == 'replace':
            s, e, n = wh[i1]['s'], wh[i2 - 1]['e'], j2 - j1
            for k in range(n):
                tempo[j1 + k] = (s + (e - s) * k / n, s + (e - s) * (k + 1) / n)
        if tag != 'equal':
            print(tag, a[i1:i2], '->', b[j1:j2])
    for j in range(len(rw)):
        if tempo[j] is None:
            ant = next((tempo[k] for k in range(j - 1, -1, -1) if tempo[k]), (0, 0))
            pos = next((tempo[k] for k in range(j + 1, len(rw)) if tempo[k]), ant)
            tempo[j] = (ant[1], max(ant[1] + 0.05, pos[0]))
    out = [{'w': w, 's': round(t[0], 3), 'e': round(t[1], 3)} for w, t in zip(rw, tempo)]
    ts = '// Gerado por tools/alinhar_roteiro.py. Não editar à mão.\n'
    ts += 'export const PALAVRAS: {w: string; s: number; e: number}[] = ' + json.dumps(out, ensure_ascii=False) + ';\n'
    open(sys.argv[3], 'w', encoding='utf-8').write(ts)
    print(len(out), 'palavras; última termina em', out[-1]['e'])


if __name__ == '__main__':
    main()
