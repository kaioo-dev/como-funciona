---
name: instalar
description: Confere e instala o que o kit precisa (Node, Python, ffmpeg, dependências, faster-whisper). Use no início da sessão ou quando um comando falhar por falta de programa.
---

# Instalar o kit

Confira em silêncio e só fale do que faltar.

| Precisa | Como conferir | Como instalar |
|---|---|---|
| Node 20+ | `node -v` | Mac: `brew install node` · Windows: `winget install OpenJS.NodeJS.LTS` |
| Python 3.10+ | `python3 --version` (Windows: `python`) | Mac: `brew install python` · Windows: `winget install Python.Python.3.12` |
| ffmpeg | `ffmpeg -version` | Mac: `brew install ffmpeg` · Windows: `winget install Gyan.FFmpeg` |
| dependências do vídeo | pasta `node_modules/` existe | `npm install` (na pasta do kit) |
| transcrição | `python3 -c "import faster_whisper"` | `python3 -m pip install faster-whisper numpy` |

- Sem Homebrew no Mac: explique que é o "instalador de programas" do Mac e mande a pessoa colar no Terminal o comando oficial de https://brew.sh (ela precisa digitar a senha do computador; você não pode fazer isso por ela).
- Na primeira transcrição, o faster-whisper baixa um modelo de ~1,6 GB. Avise antes.
- Depois de instalar, rode `npm run typecheck`. Se passar, ofereça renderizar o exemplo:
  `ABAS=1 GL=angle node scripts/render.mjs Overbooking "edicoes/001. overbooking/overbooking.mp4"`
  (no Windows PowerShell: `$env:ABAS=1; $env:GL="angle"; node scripts/render.mjs ...`).

Contas que a pessoa precisa ter (ela mesma cria; você nunca cria conta nem digita senha):
- **Claude** (plano pago, para usar o Claude Code).
- **ElevenLabs** (para a narração; o plano Starter já permite uso comercial).
