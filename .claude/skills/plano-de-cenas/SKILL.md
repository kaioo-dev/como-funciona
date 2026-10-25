---
name: plano-de-cenas
description: Transforma o roteiro narrado num plano de 18–24 cenas curtas (plano.md), com tipo de plano variando a cada corte e um elemento que explica em cada cena, para a pessoa aprovar antes de programar. Use depois do palavras.ts pronto.
---

# Plano de cenas

Leia a skill `diretor` antes. Escreva `projetos/<NNN. slug>/plano.md`:

1. **Narração:** arquivo, duração, ajustes.
2. **O mundo:** o lugar único onde tudo acontece e os objetos (com material e medidas aproximadas).
3. **Cenas** — uma tabela, 1 linha por cena, **1 cena a cada 2,5–4 s** (vídeo de 70 s ≈ 20 cenas):

   | # | começa em (frase exata da fala) | plano | o que se vê | o elemento que explica | texto na tela |
   |---|---|---|---|---|---|
   | 1 | "Você abriu o micro-ondas" | médio | você abre a porta, luz interna | — (gancho: movimento já no 1º quadro) | carimbo "TOMOU RADIAÇÃO?" |
   | 2 | "Lá dentro" | corte | o forno em corte, ondas de pontos | onda parada (Rastro com onda) | chip "2,45 GHZ" |

   - `plano`: geral, médio, close, detalhe, macro, cima, contra, ombro, corte, esquema, número, gráfico. **Nunca dois
     iguais seguidos.**
   - Toda linha tem um **elemento que explica** (corte com hachura, fio acendendo, número contando, gráfico, cota,
     etiqueta, seta, antes/depois). Se não tem, a cena está sobrando ou precisa de um.
   - Frase longa (> 4 s) = 2 cenas (ex.: geral → close).
   - Primeira cena: algo já se mexendo. Última: a câmera se afasta (grua) com a frase final.
   - Marque 2–3 **focos puxados** e os momentos de **som** (impacto na virada, pop nos detalhes, ding na conclusão).
4. **Pílula de estado:** uma palavra por bloco ("A PORTA", "AS ONDAS", "A TRAVA"…).
5. **Fatos e fontes.**
6. **Trilha:** bpm, acordes e clima (`gerar_trilha.py --bpm --acordes --clima`), diferentes do vídeo anterior.

Antes de mostrar, confira: contagem de cenas ≈ duração ÷ 3,3? Planos alternando? Toda linha explica algo?
Mostre em tópicos curtos e **espere a aprovação**. Mudanças entram no plano antes do código.
