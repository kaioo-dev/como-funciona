---
name: sincronizar
description: Gera o tempo de cada palavra da narração (palavras.json), que sincroniza cartões, pins e legenda. Use depois da narracao-norm.wav.
---

# Tempo das palavras

```bash
python3 tools/transcrever.py "projetos/<data>/audio/narracao-norm.wav" "projetos/<data>/transcricao" pt
python3 tools/alinhar_roteiro.py "projetos/<data>/transcricao/palavras.json" "projetos/<data>/audio/roteiro-falado.txt" "projetos/<data>/palavras.ts" <trocas de audio/trocas.txt, uma por argumento>
python3 -c "import re,json,sys; s=open(sys.argv[1]).read(); json.dump(json.loads(re.search(r'=\s*(\[.*\])', s, re.S).group(1)), open(sys.argv[2],'w'), ensure_ascii=False)" "projetos/<data>/palavras.ts" "projetos/<data>/palavras.json"
```
O render lê `projetos/<data>/palavras.json` sozinho. Compare `transcricao/transcript.md` com as falas: se a voz
pulou ou trocou palavra, avise.
