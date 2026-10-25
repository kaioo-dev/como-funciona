---
name: estilo
description: Cria o estilo visual do perfil da pessoa (cores, fundo, acento, nome da série) com prévias reais antes de decidir. Use no primeiro vídeo, ou quando a pessoa quiser mudar o visual.
---

# Estilo do perfil

O estilo vale para **todos** os vídeos e capas da pessoa. Ele mora em `src/estilo.ts` (`SERIE` e `MEU_ESTILO`); as paletas ficam em `src/base/tema.ts`.

## 1. Pergunte (uma vez, curto)

- Nome da série que aparece no topo dos vídeos ("SÉRIE · TEMA"). Ex.: o nome do perfil ou "POR DENTRO". Se ela não quiser série, use `SERIE = ''` (o topo mostra só o assunto). **Nunca deixe `'SUA SÉRIE'`**: o render recusa.
- Tem cor de marca? Prefere fundo claro ou escuro? Alguma referência (print, perfil)?

## 2. Proponha 3 estilos

Parta dos prontos (`ESCURO`, `CREME`, `LAVANDA`, `OCEANO`) e crie variações com as cores da pessoa. Para um estilo novo, copie o objeto mais parecido em `tema.ts`, troque as cores e registre em `ESTILOS`.

Regras que mantêm a qualidade:
- **Um acento só**, bem saturado, que contraste com o fundo. Todo o resto em neutros (tons do próprio fundo).
- `nome: 'escuro'` para fundos escuros e `'creme'` para claros (muda a lógica de luz das peças).
- `ceu` um pouco mais claro (ou mais escuro) que `fundo`; `chao` quase igual ao `fundo`.
- Objetos (`objeto`, `objetoClaro`) contrastam com o fundo; `objetoEscuro` e `pessoa` ficam no meio-termo.
- Legenda sempre legível: `legendaAceso` contra `legendaFundo` com contraste alto.
- Fundos claros: `luz` 2,3–2,6 e `sombra` baixa (0,12–0,15). Escuros: `luz` 1,8–2,0 e `sombra` 0,35.
- Nada de neon piscando nem combinações que cansam a vista (vermelho puro sobre azul puro, por exemplo).

## 3. Mostre prévias reais

```bash
PROPS='{"estilo":"lavanda"}' GL=angle node scripts/stills.mjs Overbooking "projetos/_estilos/lavanda" 6 30.5 52
```

Gere a mesma cena em cada estilo, junte lado a lado (ffmpeg `hstack`) e mostre. Pergunte qual ela prefere e ajuste ("o amarelo mais forte", "fundo menos roxo") até ela aprovar.

## 4. Salve

Em `src/estilo.ts`: `SERIE = '<nome>'` e `MEU_ESTILO = <ESTILO>`. A partir daí, todo vídeo novo usa `MEU_ESTILO` (como o exemplo faz) e a capa também.

Lembre a pessoa: **consistência vende**. Escolhido o estilo, mantenha em todos os vídeos.
