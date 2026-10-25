---
name: narracao
description: Guia a pessoa a gerar a narração no ElevenLabs e prepara o áudio (velocidade e volume). Use depois do roteiro aprovado.
---

# Narração

## 1. A pessoa gera no ElevenLabs (na conta dela)

Explique em passos curtos:
1. Abrir https://elevenlabs.io → **Text to Speech**.
2. Escolher uma voz masculina ou feminina **grave e calma, em português** (na Voice Library, filtre por Portuguese / Narration). Use **sempre a mesma voz** em todos os vídeos: ela vira a identidade do perfil.
3. Modelo: o mais recente que aceita as tags de emoção entre colchetes.
4. Colar o conteúdo de `roteiro-tags.txt` (gerado pelo `tools/preparar_roteiro.py`).
5. Gerar 2–3 versões, escolher a mais natural e baixar o MP3.
6. Colocar o arquivo em `projetos/<NNN. slug>/audio/` (qualquer nome terminado em `.mp3`).

Se você tiver uma ferramenta de navegador conectada e a pessoa pedir, pode fazer isso por ela na conta já logada. Nunca peça, mostre ou grave a chave da API dela.

## 2. Você prepara o áudio

Acelera 8% (narração de Reels precisa de ritmo) e normaliza o volume:

```bash
ffmpeg -y -i "projetos/<NNN. slug>/audio/<arquivo>.mp3" -af "atempo=1.08,loudnorm=I=-15:TP=-1.5:LRA=11" -ar 48000 "projetos/<NNN. slug>/audio/narracao-norm.wav"
```

Ouça os pontos críticos lendo a transcrição (próxima skill). Se uma palavra saiu errada (sigla soletrada, número lido errado), ajuste a grafia no `roteiro-tags.txt` e peça para a pessoa gerar só aquele trecho de novo, ou o texto inteiro.

No vídeo de exemplo, a narração e a trilha estão em MP3 só pra o kit ficar leve; nos vídeos novos use WAV.

Duração final: `ffprobe -v error -show_entries format=duration -of csv=p=0 "…/narracao-norm.wav"`. Esse número vira o `AUDIO_SEG` do vídeo.
