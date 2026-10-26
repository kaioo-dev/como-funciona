---
name: render
description: Gera os quadros de revisão e o MP4 final do boletim e confere volume e duração. Use depois de sincronizar (ou para uma prévia sem narração).
---

# Render

1. Quadros de revisão (1 por bloco; com a área segura do Reels pintada):
   `node scripts/render.mjs <data> --quadros 30,200,400,600,800` → `projetos/<data>/revisao/*.jpg`. Olhe cada um:
   texto dentro da área segura, pins nos bairros certos, cartão sem cortar nada, fonte visível.
   Mostre à pessoa e peça o OK.
2. Vídeo: `node scripts/render.mjs <data>` → `edicoes/<data>/joinville-hoje-<data>.mp4` (2D: poucos minutos).
3. Conferir: `python3 tools/checar.py "edicoes/<data>/joinville-hoje-<data>.mp4"` (volume médio −20 a −15 dB, pico
   abaixo de −1 dB, sem quadros escuros, até 1:20).
