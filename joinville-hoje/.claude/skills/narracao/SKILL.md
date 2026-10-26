---
name: narracao
description: Gera e prepara a narração do boletim (ElevenLabs), com números por extenso. Use depois do texto aprovado.
---

# Narração

1. `python3 tools/roteiro_da_edicao.py "projetos/<data>/edicao.json"` → `audio/roteiro-tags.txt` (texto para a voz),
   `roteiro-falado.txt` e `trocas.txt`.
2. A pessoa gera no ElevenLabs (Text to Speech), **sempre com a mesma voz** (é a identidade da página), colando o
   `roteiro-tags.txt`, e salva o MP3 em `projetos/<data>/audio/`.
   Automático: se existir a variável de ambiente `ELEVENLABS_API_KEY` (a pessoa configura; você nunca pede nem grava
   a chave), dá para gerar pela API com a voz escolhida — combine com a pessoa antes da primeira vez.
3. Acelere 8% e normalize:
   ```bash
   ffmpeg -y -i "projetos/<data>/audio/<arquivo>.mp3" -af "atempo=1.08,loudnorm=I=-15:TP=-1.5:LRA=11" -ar 48000 "projetos/<data>/audio/narracao-norm.wav"
   ```
Sem narração, o render ainda funciona (vídeo mudo, tempo estimado): serve de prévia.
