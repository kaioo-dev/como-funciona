"""Trilha sintetizada (sem samples, sem licença de terceiros). Mude bpm, acordes e clima a cada vídeo.
Uso: python3 tools/gerar_trilha.py saida.wav SEGUNDOS [--bpm 96] [--acordes Am-F-C-G] [--clima animado|tenso|calmo] [--semente 15]
  animado: bateria cheia (padrão) · tenso: menos bateria, baixo mais presente · calmo: sem bumbo, só dedilhado e baixo
Acordes aceitos: C, Cm, C#, Db, D, Dm … B, Bm (maior ou menor). Ex.: --acordes Dm-Bb-F-C"""
import argparse, wave
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('saida'); ap.add_argument('segundos', type=float)
ap.add_argument('--bpm', type=float, default=96)
ap.add_argument('--acordes', default='Am-F-C-G')
ap.add_argument('--clima', default='animado', choices=['animado', 'tenso', 'calmo'])
ap.add_argument('--semente', type=int, default=15)
a = ap.parse_args()
SR = 48000
saida, dur = a.saida, a.segundos
n = int(SR * dur)
mix = np.zeros((n, 2))
bpm = a.bpm
beat = 60 / bpm
rng = np.random.default_rng(a.semente)
NOMES = {'C': 48, 'C#': 49, 'Db': 49, 'D': 50, 'D#': 51, 'Eb': 51, 'E': 52, 'F': 53, 'F#': 54, 'Gb': 54, 'G': 55, 'G#': 56, 'Ab': 56, 'A': 57, 'A#': 58, 'Bb': 58, 'B': 59}
def acorde(nome):
    menor = nome.endswith('m')
    raiz = NOMES[nome[:-1] if menor else nome]
    if raiz < 52: raiz += 12
    return [raiz, raiz + (3 if menor else 4), raiz + 7]

def env(length, a, d):
    t = np.arange(length) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)

def put(sig, start, pan=0.0, gain=1.0):
    i = int(start * SR)
    if i >= n: return
    sig = sig[: n - i] * gain
    mix[i:i + len(sig), 0] += sig * (1 - max(0, pan))
    mix[i:i + len(sig), 1] += sig * (1 + min(0, pan))

def nota(m):
    return 440 * 2 ** ((m - 69) / 12)

def kick():
    L = int(0.35 * SR); t = np.arange(L) / SR
    f = 50 + 90 * np.exp(-t / 0.04)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(L, 0.002, 0.12)

def hat():
    L = int(0.06 * SR); x = rng.standard_normal(L)
    x = np.diff(x, prepend=0)  # passa-alta simples
    return x * env(L, 0.001, 0.015) * 0.5

def clap():
    L = int(0.2 * SR); x = rng.standard_normal(L)
    x = np.convolve(x, np.ones(6) / 6, 'same') - np.convolve(x, np.ones(40) / 40, 'same')
    return x * env(L, 0.002, 0.06)

def pluck(f, d=0.32):
    L = int(0.6 * SR); t = np.arange(L) / SR
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    return s * env(L, 0.003, d)

def baixo(f, L):
    t = np.arange(L) / SR
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    return s * np.minimum(1, t / 0.01) * np.exp(-t / 0.5)

acordes = [acorde(x) for x in a.acordes.split('-')]
compassos = int(dur / (4 * beat)) + 1
for c in range(compassos):
    t0 = c * 4 * beat
    ac = acordes[(c // 2) % len(acordes)]
    # baixo: tônica nas batidas 1 e 3, oitava abaixo
    for b in (0, 2, 2.5):
        put(baixo(nota(ac[0] - 12), int(beat * 0.9 * SR)), t0 + b * beat, gain=0.32)
    # bateria (entra depois de 2 compassos para a abertura respirar)
    if c >= 1 and a.clima != 'calmo':
        for b in (range(4) if a.clima == 'animado' else (0, 2)):
            put(kick(), t0 + b * beat, gain=0.55)
        for b in (1, 3) if a.clima == 'animado' else ():
            put(clap(), t0 + b * beat, gain=0.22)
    for k in range(8 if a.clima != 'calmo' else 0):
        put(hat(), t0 + k * beat / 2 + (0.012 if k % 2 else 0), pan=0.3, gain=0.18 if k % 2 else 0.1)
    # dedilhado em colcheias, subindo e descendo pelo acorde
    padrao = [0, 1, 2, 1, 2, 0, 1, 2]
    for k, idx in enumerate(padrao):
        put(pluck(nota(ac[idx] + 12)), t0 + k * beat / 2, pan=-0.35 if k % 2 else 0.35, gain=0.14)

# compressão suave + normalização
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
fade = int(1.2 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
mix *= 0.89 / np.max(np.abs(mix))
pcm = (mix * 32767).astype(np.int16)
with wave.open(saida, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('ok', saida, round(dur, 2), 's')
