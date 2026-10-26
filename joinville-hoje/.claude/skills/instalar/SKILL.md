---
name: instalar
description: Confere e instala o que o kit JOINVILLE HOJE precisa (Node, Python, ffmpeg, dependências, openpyxl, faster-whisper). Use no início da sessão ou quando um comando falhar por falta de programa.
---

# Instalar

Confira em silêncio e só fale do que faltar.

| Precisa | Conferir | Instalar |
|---|---|---|
| Node 20+ | `node -v` | Mac: `brew install node` · Windows: `winget install OpenJS.NodeJS.LTS` |
| Python 3.10+ | `python3 --version` (Windows: `python`) | Mac: `brew install python` · Windows: `winget install Python.Python.3.12` |
| ffmpeg | `ffmpeg -version` | Mac: `brew install ffmpeg` · Windows: `winget install Gyan.FFmpeg` |
| dependências do vídeo | pasta `node_modules/` | `npm install` |
| planilha da ANP | `python3 -c "import openpyxl"` | `python3 -m pip install openpyxl` |
| transcrição | `python3 -c "import faster_whisper"` | `python3 -m pip install faster-whisper "av<16"` |

- O `av<16` evita um erro conhecido do faster-whisper com a versão nova do PyAV.
- Na primeira transcrição o faster-whisper baixa um modelo de ~1,6 GB. Avise antes.
- Depois: `npm run typecheck`. Passou? Ofereça a prévia do exemplo: `node scripts/render.mjs 2026-10-26`.
