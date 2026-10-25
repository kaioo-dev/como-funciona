---
name: variacoes
description: Ideias e variações do que dá para fazer com o kit — estilos e cores, tipos de vídeo (como funciona, comparação, "e se…", história, lista), visual de diagrama ou mais realista, personagens, cenários e peças próprias. Use quando a pessoa perguntar "o que mais dá pra fazer?", quiser variar, sair do padrão, criar algo dela, ou parecer presa a um jeito só.
---

# Ideias e variações

O kit é uma base: estilo, formato de história, personagens e objetos mudam. Ofereça 2–3 caminhos concretos com a frase
pronta que ela pode usar, e faça. Cada mudança segue o método da skill `diretor` (ritmo, câmera, nada surgindo do nada).

## Estilo e cores (skill `estilo`)
- Prontos: `ESCURO` (padrão), `CREME` (claro e quente), `LAVANDA` (claro e moderno), `OCEANO` (azul com amarelo).
- O dela: cores da marca, fundo claro ou escuro, um acento só. Prévias reais antes de escolher.
- Frases: "faz no estilo creme", "quero com as cores da minha marca: azul e amarelo", "mostra os 4 estilos lado a lado".

## Tipos de vídeo
| Tipo | Como fica | Frase |
|---|---|---|
| Como funciona | o objeto/serviço por dentro: corte, esquema, o detalhe escondido | "como funciona o airbag?" |
| Comparação | A × B lado a lado, placar, quem ganha em cada critério | "quero um vídeo de comparação: pix × cartão" |
| "E se…" | uma hipótese levada até o fim, com números | "e se a Terra parasse de girar?" |
| História/bastidor | uma linha do tempo, o caso real, a virada | "conta a história de como surgiu o código de barras" |
| Lista/top 3 | 3 itens, um bloco de cenas para cada, o melhor por último | "top 3 coisas que o seu celular faz sem você saber" |
| Mito × verdade | a crença, o teste, o resultado | "é verdade que micro-ondas tira nutriente?" |

## Visual
- **Diagrama estilizado (padrão):** objetos foscos arredondados, um acento, cortes, setas, números. Explica rápido.
- **Mais realista:** `<Material tipo="metal|vidro|madeira|…">` em tudo, objetos com mais partes, luz mais suave, menos
  interface na tela. Frase: "faz esse mais realista, com materiais de verdade".
- **Mais interface ou menos:** só chips e legenda, ou números grandes e cartões em toda cena.

## Personagens e cenários
- Boneco manequim (cor, quantos, poses, andando, apontando, levantando a mão: `maoD`), multidão, "você" em destaque.
- Cenários: cozinha, rua, escritório, aeroporto, hospital, fábrica, corpo humano em escala, espaço — tudo modelado com
  `Caixa`, `Material` e peças do vídeo.
- Frases: "o personagem pode ser uma pessoa mais baixa e de cor clara?", "quero o cenário numa farmácia".

## Peças próprias
Qualquer objeto modelado num vídeo (`src/videos/<slug>/pecas.tsx`) pode virar peça do kit: mova para `src/base/` e
reaproveite. Frase: "transforma esse micro-ondas numa peça minha para outros vídeos".

## Formato
O kit é feito para vertical 9:16 (Reels, TikTok, Shorts): a área segura, a legenda e a câmera são calculadas para ele.
