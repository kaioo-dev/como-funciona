---
name: capa-e-legenda
description: Faz a capa do Reels e a legenda curta do post. Use depois do vídeo final.
---

# Capa e legenda do post

## Capa

1. Escolha o quadro mais bonito do vídeo **sem textos**:
   `GL=angle node scripts/stills.mjs <Nome>Limpo "projetos/<NNN. slug>/capa" <segundo>`
   e renomeie o arquivo gerado para `capa/fundo-limpo-escuro.jpg`.
2. Ajuste a composição `Capa<Nome>` no `Root.tsx`: `tema` (o assunto; a série vem de `src/estilo.ts`), `linhas` (3–4 linhas curtas, ≤ 12 caracteres cada) e `destaque` (índice da linha na cor de acento, normalmente a virada). `desce` empurra o fundo para baixo se o assunto ficar atrás do título.
3. `GL=angle node scripts/stills.mjs Capa<Nome> "edicoes/<NNN. slug>" 0` → capa em 1080×1920. O título fica na faixa central 3:4, que é o recorte da grade do perfil.

Título bom = o gancho em 4 linhas: "O avião tem / 180 lugares. / Venderam / 190."

## Legenda do post (curta)

```text
<gancho em 1 linha, com a virada>
<no máximo 1 linha de informação ou aviso obrigatório>
Salva e manda pra <quem precisa ver isso> 📌
#hashtag1 #hashtag2 #hashtag3 #hashtag4
```

O vídeo já explica tudo; a legenda não repete o roteiro. Sugira também um **comentário fixado** curto (uma pergunta fácil de responder).
