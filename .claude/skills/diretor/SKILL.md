---
name: diretor
description: O método de direção do kit para o vídeo sair MUITO bom e dinâmico na primeira tentativa — ritmo de viral (1 cena a cada 2,5–4 s, plano diferente a cada corte), câmera de cinema que enquadra sozinha, nada surgindo do nada, diagramas que explicam, e a checagem que só libera quando está no nível do canal. Use SEMPRE que for planejar, programar, revisar ou consertar as cenas de um vídeo (antes de abrir o código), e quando a pessoa disser que ficou "parado", "amador", "estranho", "slide", "cortado", "atravessando" ou "piscando".
---

# Diretor: o vídeo bom de primeira

Você não está "fazendo uma animação": está dirigindo um Reels que precisa prender a pessoa por 60–80 s. O que prende:
**uma imagem nova a cada 3 segundos, e cada imagem explica um pedaço**. O que faz parecer amador: cena parada, câmera
que corta a cabeça do boneco, coisa que surge do nada, branco estourado, partícula gigante, objeto atravessando outro.
A biblioteca `src/base/kit.ts` já resolve o técnico; esta skill é o critério.

Leia antes de começar (nesta ordem): `src/videos/overbooking/Overbooking.tsx` (a referência, 20 cenas),
`src/videos/_modelo/Modelo.tsx` (o esqueleto que você copia), `referencias/receitas.md` (como fazer cada tipo de cena)
e `referencias/criterios.md` (a régua de qualidade).

## As 7 regras de ouro (não negociáveis)

1. **Ritmo.** 1 cena a cada 2,5–4 s. Vídeo de 70 s = 18 a 24 cenas. Nenhuma cena passa de ~6 s. Quando uma frase
   longa pede uma cena só, divida em dois planos (geral → close; esquema → número).
2. **Cada corte muda o tipo de plano** (`plano` da cena): `geral`, `medio`, `close`, `detalhe`, `macro`, `cima`,
   `contra`, `ombro`, `corte`, `esquema`, `numero`, `grafico`. Nunca dois iguais seguidos.
3. **Cada cena explica UM detalhe com um elemento só dela**: um corte com hachura, um fio que acende, uma onda de
   pontos, um número que conta, um gráfico que cresce, uma etiqueta presa na peça, uma seta. Cena "bonita mas que não
   explica nada" é cena perdida.
4. **Câmera só por `camera()` ou `sobreOmbro()`** (src/base/camera.ts). Você diz O QUE precisa aparecer (`alvos`:
   `cantos(pos, args)`, `pessoa(pos)`, `busto(pos)`) e DE ONDE olhar (`de: [azimute°, elevação°]`). Ela calcula a
   distância para tudo caber entre a pílula e a legenda, já contando o push-in e o arco. **Nunca escreva `pos` de
   câmera na mão.** Boneco no quadro? Ponha `pessoa(pos)` ou `busto(pos)` nos alvos — assim a cabeça nunca sai.
5. **Nada surge do nada.** Tudo que aparece no meio da cena entra por `<Entra t em={T.x} modo="cai|cresce|desliza|aparece">`
   na palavra certa; o que sai usa `sai={T.y}`. Gente que chega, chega andando (`andar()`).
6. **Um mundo só.** As cenas acontecem no mesmo lugar (mesmas posições em constantes no topo do arquivo), vistas de
   câmeras diferentes. Isso dá continuidade e evita objetos "aparecendo" entre cortes.
7. **Só um acento.** O laranja (ou o acento do tema) só no que importa AGORA. O resto em `CORES.escuro/medio/cinza/claro`.
   Boneco é neutro (`tema.pessoa`); o acento vai no boneco só quando ele é o assunto ("você ficou de fora").

## Os tipos de plano (o que muda de verdade entre eles)

| plano | distância | o que se vê |
|---|---|---|
| geral | longe | o lugar inteiro (onde estamos) |
| medio | média | a pessoa inteira + o objeto |
| close | perto | o objeto inteiro ocupando o quadro |
| detalhe | muito perto | UMA parte do objeto (puxador, botão, visor) |
| macro | colado | textura, gota, contato, faísca |
| cima | de cima (elevação 60–85°) | layout, caminho, mapa |
| contra | de baixo (elevação negativa) | grandeza, tensão |
| ombro | atrás da pessoa | o ponto de vista dela |
| corte | o objeto aberto | o de dentro (hachura na face serrada) |
| esquema | diagrama plano | fios, peças ligadas, fluxo |
| numero / grafico | o dado | número que conta, barras |

**Mesmo cenário em dois cortes seguidos?** Mude a DISTÂNCIA (geral → detalhe), não só o ângulo; senão parece a mesma foto.

**O gancho (1ª cena) precisa de impacto no 1º segundo:** close ou macro do momento (o dedo no botão, a luz acendendo, a
porta abrindo de perto), com movimento já no quadro 1. Plano médio parado no gancho = o espectador passa o vídeo.

## O fluxo

1. **Roteiro aprovado → `python3 tools/preparar_roteiro.py "projetos/<NNN. slug>/roteiro.txt"`** (gera a versão da voz
   com tags e números por extenso, a versão da legenda e as trocas; confere o tamanho: 1.100–1.250 caracteres).
2. **Narração e tempos** (skills `narracao`, `sincronizar`).
3. **Plano de cenas** (skill `plano-de-cenas`): uma tabela com 18–24 linhas — `início (frase) · plano · o que se vê ·
   o elemento que explica · texto na tela`. Antes de mostrar, confira: tipos de plano alternando? Alguma cena > 6 s?
   Cada linha tem um elemento que explica? Mostre e espere a aprovação.
4. **Programe copiando `src/videos/_modelo/`** para `src/videos/<slug>/`. Ordem dentro do arquivo: T → mundo →
   cenas → CENAS → ESTADOS → SONS → `VideoKit`. Peças novas (o objeto do tema) vão em `pecas.tsx` da pasta do vídeo,
   modeladas de verdade (partes, espessura, cantos arredondados) — veja `referencias/receitas.md` › "Modelar um objeto".
5. **Checagem automática:** `GL=angle node scripts/qa.mjs <Nome>` até **TUDO CERTO** (leia `criterios.md` para cada
   erro). Ela pega: atravessando, entrada/saída sem transição, cabeça cortada, câmera dentro de objeto, assunto tapado,
   z-fighting, pisca, quadro escuro, pés, ritmo lento e cena longa.
6. **Folha de cenas:** `GL=angle node scripts/stills.mjs <Nome>Guia "projetos/<NNN. slug>/revisao/cenas" --cenas`
   e abra `folha.jpg`. Olhe como diretor (régua em `criterios.md`). Corrija o que não estiver no nível da referência.
7. **Folha de movimento** de cada trecho com ação: `… stills.mjs <Nome> "…/revisao/mov1" --folha 12.0-14.0 6`.
8. Só então mostre a folha à pessoa, diga o que conferiu e peça o OK para o render (skill `render`).

## Primeira versão rápida (padrão)

A pessoa quer VER o vídeo logo. Depois do plano aprovado: programe → `npm run typecheck` → **uma** checagem rápida
(`qa.mjs <Nome>`, 1–3 min) → conserte só os ERROS → `stills.mjs <Nome>Guia … --cenas` (1 folha) → render (~3–6 min).
Nada de checagem `completo`, folhas de movimento de todas as cenas ou várias rodadas antes da primeira entrega: isso
fica para a segunda versão, com o que a pessoa pedir. Um comando pesado por vez.

## Quando a pessoa reclamar

| Ela disse | O que costuma ser | Conserto |
|---|---|---|
| "parado", "lento", "slide" | cenas de 6–10 s; câmera fixa | dividir em planos (regra 1–2); `empurra` 0,16–0,25; arco alternando `sentido` |
| "amador", "estranho" | sem diagrama (só objetos), branco estourado | um elemento que explica por cena; `focar`/`focoPuxado`; superfícies grandes em `CORES.medio`, nunca branco puro |
| "cortado", "cabeça para fora" | câmera escrita na mão | `camera({alvos: [...pessoa(pos)]})` |
| "coisa aparecendo do nada" | `{t > x ? <Obj/> : null}` ou escala de 0 → 1 | `<Entra>` |
| "atravessando" | objetos com a mesma posição; braço/objeto dentro de móvel | o erro da checagem diz quais; `Solido`; afastar; `maoD` em vez de ângulo na mão |
| "piscando" | duas faces no mesmo plano; cor trocando a cada quadro | afastar 1–3 mm; nunca `Math.random`/`Date.now`; seno ≤ 2 Hz |
| "bolas cinza" | `Particulas` grandes perto da câmera | use a poeira automática do `CanvasCinema`; `Particulas` só local, com `escala` pequena |
