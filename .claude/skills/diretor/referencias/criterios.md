# Régua de qualidade (o nível do canal)

Olhe a folha de cenas (`stills.mjs … --cenas`) e confira cada quadro. Se um item falhar, conserte antes de mostrar.

## Em cada quadro
- **Leitura em 1 segundo:** dá para dizer do que a cena fala só olhando? (sem a legenda)
- **Desfoque leve:** o assunto nítido e o fundo só um pouco suave. Nada de imagem toda borrada ou "sufocada".
- **Enquadramento:** o assunto entre a pílula e a legenda, sem nada importante cortado. Boneco inteiro ou do peito
  para cima — nunca "meio corpo sem cabeça".
- **Um acento:** o laranja aponta UMA coisa. Se tem laranja em tudo, nada se destaca.
- **Sem branco estourado:** nenhuma superfície grande vira mancha branca. Use `CORES.claro` só em peças pequenas.
- **Texto:** no máximo 1 chip + 1 carimbo ou 1 número por vez. Chip: 2–4 palavras. Carimbo: a virada.
- **Objetos de verdade:** o objeto do tema tem partes (porta, puxador, visor, botões), espessura e cantos arredondados.
  Uma caixa lisa no lugar de um micro-ondas = amador.

## Na sequência (a folha inteira)
- Planos alternando (de cima, close, médio, esquema, número…), nenhum par igual seguido.
- O mesmo mundo, coerente entre os cortes (objeto não muda de lugar nem de cor sem motivo).
- O primeiro quadro já tem algo se mexendo; o último afasta a câmera (grua) com a frase final.
- 2–3 focos puxados no vídeo, na palavra que muda o assunto.

## O que cada erro da checagem quer dizer
| Erro | Causa provável | Conserto |
|---|---|---|
| ATRAVESSANDO | duas peças no mesmo espaço | afaste; ou junte as peças do MESMO objeto num `<group>`/`<Solido id>` |
| ENTRADA/SAÍDA SEM TRANSIÇÃO | `cond ? <X/> : null` | `<Entra … em={T.x}>` / `sai={T.y}` |
| SURGE DO NADA | `scale={k}` de 0 a 1 na mão | `<Entra modo="cresce">` |
| FORA DO QUADRO | câmera na mão, ou alvos sem o boneco | `camera({alvos: [...pessoa(pos)]})` |
| CÂMERA DENTRO DE OBJETO | `de` atravessa um móvel | outro `de`, ou tire o objeto do caminho |
| ASSUNTO TAPADO | algo entre a câmera e o assunto | outro `de`, ou elevação maior |
| Z-FIGHTING | faces coincidindo | afaste 1–3 mm ou diminua uma peça |
| PISCA | cor/forma mudando a cada quadro | tire `Math.random`, `t*30`, trocas por quadro |
| QUADRO ESCURO | câmera dentro de algo / luz | veja o quadro indicado |
| RITMO LENTO / CENA LONGA | poucas cenas | divida em mais planos |
| PÉ … | boneco movido na mão | `andar()` com `chao` |
