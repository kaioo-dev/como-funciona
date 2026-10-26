"""Checagem do MP4 final: duração, volume médio, piscadas (saltos bruscos de brilho) e quadros escuros.

Uso:
    python3 tools/checar.py "edicoes/002. pix/pix.mp4"

Aprovado quando: volume médio entre -20 e -15 dB, pico abaixo de -1 dB, 0 piscadas, 0 quadros escuros e até 1:20.
Piscada = o brilho médio pula e volta em até 2 quadros (cortes de cena normais não contam).
"""

import re
import subprocess
import sys


def rodar(args):
    return subprocess.run(args, capture_output=True, text=True).stderr


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    mp4 = sys.argv[1]

    vol = rodar(["ffmpeg", "-hide_banner", "-nostats", "-i", mp4, "-vn", "-af", "volumedetect", "-f", "null", "-"])
    media = float(re.search(r"mean_volume: (-?[\d.]+)", vol).group(1))
    pico = float(re.search(r"max_volume: (-?[\d.]+)", vol).group(1))
    dur = re.search(r"Duration: ([\d:.]+)", vol).group(1)

    est = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", mp4, "-vf", "scale=270:-1,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-", "-an", "-f", "null", "-"],
        capture_output=True, text=True,
    ).stdout
    y = [float(v) for v in re.findall(r"YAVG=([\d.]+)", est)]
    piscadas = []
    for i in range(1, len(y) - 2):
        for volta in (1, 2):
            sobe = y[i] - y[i - 1]
            desce = y[i + volta - 1] - y[i + volta]
            if abs(sobe) > 12 and abs(desce) > 12 and (sobe > 0) == (desce > 0):
                piscadas.append(i)
                break

    # quadro escuro no meio do vídeo = câmera dentro de um objeto (fora a abertura e o fecho no preto)
    fps = len(y) / max(1e-6, sum(float(x) * 60 ** (2 - i) for i, x in enumerate(dur.split(':'))))
    escuros = [i for i in range(int(fps * 0.5), len(y) - int(fps * 0.7)) if y[i] < 12]
    segundos = sum(float(x) * 60 ** (2 - i) for i, x in enumerate(dur.split(':')))
    print(f"duração: {dur}  {'OK' if segundos <= 80.5 else 'LONGO: o Reels ideal tem no máximo 1:20'}")
    print(f"volume médio: {media} dB  (ideal -20 a -15)  {'OK' if -20 <= media <= -15 else 'AJUSTAR'}")
    print(f"pico: {pico} dB  (abaixo de -1)  {'OK' if pico < -1 else 'AJUSTAR'}")
    print(f"piscadas: {len(piscadas)}  {'OK' if not piscadas else 'nos quadros ' + str(piscadas[:20])}")
    print(f"quadros escuros: {len(escuros)}  {'OK' if not escuros else 'a partir dos segundos ' + str(sorted({round(i / fps, 1) for i in escuros})[:10])}")


if __name__ == "__main__":
    main()
