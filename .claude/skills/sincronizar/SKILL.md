---
name: sincronizar
description: Gera o tempo exato de cada palavra da narração (palavras.ts), base de todas as animações e da legenda. Use depois de criar narracao-norm.wav.
---

# Tempo de cada palavra

```bash
python3 tools/transcrever.py "projetos/<NNN. slug>/audio/narracao-norm.wav" "projetos/<NNN. slug>/transcricao" pt
python3 tools/alinhar_roteiro.py "projetos/<NNN. slug>/transcricao/palavras.json" "projetos/<NNN. slug>/audio/roteiro-falado.txt" "src/videos/<slug>/palavras.ts" <as trocas de audio/trocas.txt, uma por argumento; se o arquivo estiver vazio, rode sem trocas>
```

- O primeiro comando ouve o áudio e marca início/fim de cada palavra.
- O segundo troca o que o Whisper ouviu pelo **texto exato do roteiro** (a legenda nunca tem erro de digitação) e aplica as trocas `"falado=>legenda"` (números por extenso viram algarismo).
- Leia `transcricao/transcript.md` e compare com o roteiro: se a voz pulou ou trocou palavra, avise a pessoa.

No código, todo tempo vem de `const quando = criaQuando(PALAVRAS)`: `quando('trecho da fala')` (início) e `quando.fim('trecho')` (fim). Ele é **estrito**: se o trecho não existe, ou aparece mais de uma vez, o Remotion mostra o erro com o contexto de cada ocorrência — use mais palavras ou `quando('trecho', 2)`. Nunca troque por um número fixo.
