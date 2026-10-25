---
name: qualidade
description: Revisão de diretor antes de mostrar o vídeo - checagem automática (atravessar, surgir do nada, cabeça cortada, câmera dentro de objeto, pisca, ritmo, pés), folha de cenas e de movimento, e a lista dos defeitos que mais estragam vídeo 3D. Use depois de programar as cenas e sempre que a pessoa disser que algo ficou "tosco", "estranho", "travado", "atravessando" ou "robótico".
---

# Qualidade (revisão de diretor)

Você só mostra quadros à pessoa depois que o vídeo passar nesta revisão. Seja exigente: se você não postaria, não mostre.

## 1. Checagem automática

```bash
GL=angle node scripts/qa.mjs <Nome>
```

O modo padrão (rápido) olha pares de quadros a cada 1/3 s e rajadas a cada 2 s: 2–5 min num Mac com chip M para um vídeo de 70 s. `… qa.mjs <Nome> completo` olha todos os quadros (3–4× mais lento; use uma vez antes do render, se der tempo). Ela aponta, com o segundo e a cena: ATRAVESSANDO, ENTRADA/SAÍDA SEM
TRANSIÇÃO, SURGE DO NADA, FORA DO QUADRO, CÂMERA DENTRO DE OBJETO, ASSUNTO TAPADO, Z-FIGHTING, PISCA, QUADRO ESCURO,
PÉ DESLIZANDO/FLUTUANDO/AFUNDANDO, RITMO LENTO e CENA LONGA. O que cada um quer dizer e como consertar está em
`.claude/skills/diretor/referencias/criterios.md`. Para checar só um trecho (depois de consertar uma cena): `… qa.mjs <Nome> rapido 12-20`. Um comando pesado por vez: não rode checagem e render juntos.

Repita até **TUDO CERTO**. Os avisos (plano repetido, cena curta, partícula grande, série não escolhida) você olha e decide.

## 1b. Folha de cenas

```bash
GL=angle node scripts/stills.mjs <Nome>Guia "projetos/<NNN. slug>/revisao/cenas" --cenas
```
Abra `folha.jpg` (1 quadro por cena, na ordem) e confira com a régua de `criterios.md`.

## 2. Folha de movimento

Para cada trecho com movimento (andar, pular, cair, empilhar, entrar em cena), tire uma folha de quadros seguidos (5 por segundo; a folha.jpg sai pronta):

```bash
GL=angle node scripts/stills.mjs <Nome> "projetos/<NNN. slug>/revisao/mov1" --folha 7.0-8.8 5
```

Abra a folha e confira, como diretor:

| Defeito | Como aparece | Conserto |
|---|---|---|
| Andar de robô | pernas abrem e fecham sem o corpo subir e descer | use `andar()`; nunca `passo: Math.sin(t)` |
| Patinar | pé escorrega no chão | `andar()` com `fim` real (não comprima 5 m em 1 s) |
| Flutuar sobre vão | anda reto no ar entre placas | `chao` com todas as placas; vão maior que 40 cm: o caminho desvia ou ele pula (`pular`) |
| Teletransporte | objeto/boneco some e aparece em outro lugar | sempre um movimento contínuo entre dois lugares (andar, cair, deslizar) |
| Clones | o mesmo boneco aparece duas vezes no mesmo quadro | um boneco = um componente com um `id`; não duplique na troca de cena |
| Atravessar | braço, corpo ou objeto entra em outro | `separar`, mude o caminho ou o tempo |
| Queda falsa | cai em velocidade constante e para seco | `queda()` (acelera, quica e assenta) |
| Pilha furada | moedas/fichas umas dentro das outras | `chaoY` de cada uma = topo da anterior |
| Pose quebrada | braço atrás das costas, joelho para trás, corpo torto | ombro entre -2,8 e 0,6 rad; cotovelo entre -2,2 e 0; nunca escreva pose de perna na mão |
| Plástico de brinquedo | tudo da mesma cor chapada, sem textura | `<Material tipo>` pelo que o objeto é de verdade |
| Branco estourado | objeto claro vira mancha branca brilhante | use `tema.objeto` (não `objetoClaro`) em superfícies grandes; emissivo ≤ 0,3 |
| Texto em cima do 3D | rótulo cobre o assunto ou sai da tela | `Etiqueta` com linha até o ponto; tudo dentro da área segura |

## 3. Quadros de revisão para a pessoa

Só depois de 1, 1b e 2: mostre a folha de cenas + os momentos de "aha". Diga o que você checou: "checagem automática: tudo certo; revisei cada cena e os movimentos quadro a quadro".
