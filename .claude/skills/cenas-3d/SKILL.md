---
name: cenas-3d
description: Programa o vídeo no Remotion + three.js no estilo 3D cinematográfico do kit, a partir do plano aprovado, usando a biblioteca pronta (src/base/kit.ts) e o modelo (src/videos/_modelo). Use para criar ou ajustar as cenas.
---

# Cenas 3D

**Antes:** leia a skill `diretor` (o critério), `src/videos/overbooking/Overbooking.tsx` (a referência) e
`.claude/skills/diretor/referencias/receitas.md` (como fazer cada tipo de cena).

## Montar o vídeo
1. Copie `src/videos/_modelo/` para `src/videos/<slug>/` e renomeie `Modelo` → `<Nome>`. Troque `palavras.ts` pelo gerado
   na skill `sincronizar`, `AUDIO_SEG` pela duração da `narracao-norm.wav` e `P` pela pasta do projeto.
2. `T`: um `quando('trecho')` por momento do plano. Se o trecho aparece mais de uma vez na fala, o `quando` dá erro e
   mostra onde: use mais palavras ou `quando('trecho', 2)`. Nunca escreva um segundo na mão.
3. O mundo: constantes com `pos` e `args` de cada coisa (as mesmas usadas no modelo e nos alvos da câmera). Peças novas
   em `src/videos/<slug>/pecas.tsx`, modeladas com partes de verdade.
4. Uma função por cena do plano. Toda cena: `camera()` (ou `sobreOmbro()`), `<CanvasCinema cam t>`, o mundo, UM
   elemento que explica, no máximo um chip + um carimbo/número.
5. `CENAS` com `em`, `plano` (tipo, alternando), `nome` e `render`; `ESTADOS` (pílula); `SONS` dos momentos-chave.
6. O componente exportado é só o `<VideoKit … />` (cortes, legenda, pílula, marca, narração, trilha e sons já vêm).
7. Registre no `src/Root.tsx` numa `Folder` com `<Nome>`, `<Nome>Guia`, `<Nome>Limpo` e `Capa<Nome>` (modelo no fim do
   `Modelo.tsx`).

Sons: copie `projetos/001. overbooking/sfx/*.wav` para `projetos/<NNN. slug>/sfx/` e gere a trilha própria:
`python3 tools/gerar_trilha.py "projetos/<NNN. slug>/sfx/trilha.wav" <AUDIO_SEG + 2> --bpm 100 --acordes Dm-Bb-F-C --clima animado`
(mude bpm, acordes e clima a cada vídeo).

## Proibido (é o que deixa amador)
- Copiar Legenda/Canvas/Chip/quando para dentro do vídeo: use o `kit`.
- Escrever a posição da câmera na mão, ou `longe()` "no chute": use `camera({alvos, de})`.
- `{t > x ? <Obj/> : null}` ou escala de 0 a 1 para algo aparecer: use `<Entra>`.
- `Easing.back` forte em objeto 3D, `lerp` de posição para andar, `Math.random`, `Date.now`, seno rápido (> 2 Hz) em luz.
- Cores fixas em hexadecimal: use `tema.*` e `CORES.*` (`escuro`, `medio`, `cinza`, `claro`, `acento`, `brilho`).
- `Particulas` grandes perto da câmera (viram bolas cinza): a poeira de fundo já vem no `CanvasCinema`.
- Superfície grande branca ou `objetoClaro` em parede/interior (estoura no bloom).

## Revisão (obrigatória antes de mostrar)
1. `npm run typecheck`.
2. `GL=angle node scripts/qa.mjs <Nome>` até **TUDO CERTO** (Windows PowerShell: `$env:GL="angle"; node scripts/qa.mjs <Nome>`).
3. `GL=angle node scripts/stills.mjs <Nome>Guia "projetos/<NNN. slug>/revisao/cenas" --cenas` → abra `folha.jpg` e
   compare com a régua da skill `diretor` (`referencias/criterios.md`).
4. Movimento: `--folha inicio-fim 6` em cada trecho com ação (skill `qualidade`).
