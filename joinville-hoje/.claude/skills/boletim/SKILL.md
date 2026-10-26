---
name: boletim
description: Conduz a edição do dia do JOINVILLE HOJE do começo ao fim (coletar, rascunho, apuração, texto, narração, render, publicação). Use quando a pessoa pedir "o boletim de hoje", "a edição de amanhã" ou uma data.
---

# A edição do dia

## 1. Coletar e montar o rascunho

```bash
python3 tools/coletar.py 2026-10-26          # tempo, maré e combustível → projetos/2026-10-26/auto.json
python3 tools/nova_edicao.py 2026-10-26      # rascunho → projetos/2026-10-26/edicao.json
```
- Fonte que falhou: o coletor grava `erro` e o bloco não entra. Diga qual e siga.
- O rascunho já traz os blocos automáticos, cada um com a sua `manchete` (texto grande que estala no topo):
  resumo do dia, hora a hora (guarda-chuva sim/não), sol/vento/ar, maré, combustível ("etanol compensa?"), posto mais
  barato e mais caro (pins no mapa), a curiosidade do dia (`curiosidades.json`), amanhã e encerramento.
- `--manuais` acrescenta os blocos de apuração (alerta, falta de luz/água, farmácia de plantão) com PREENCHER.
- Curiosidade: só fatos conferidos em `curiosidades.json` (campo `conferido` com as fontes). Depois de publicar,
  acrescente o `id` em `curiosidades-usadas.txt` para não repetir. Ao criar curiosidades novas, pesquise e confira
  2 fontes antes de colocar no arquivo.

## 2. Completar os blocos manuais

O rascunho traz blocos com `PREENCHER` (alerta da Defesa Civil, falta de luz/água, farmácia de plantão, tema do dia).
Para cada um: skill `apuracao` (e `tema-do-dia` para o tema). Confirmou? Preencha `titulo`, `itens` (com `bairro`
quando houver: vira pin no mapa) e `fala`. Não confirmou ou não há nada hoje? **Apague o bloco.** O render recusa
enquanto houver `PREENCHER`.

Bairros aceitos no campo `bairro` (exatamente assim): os 43 de `mapa/bairros.geojson` (Centro, Bucarein, Itaum, Boa
Vista, Iririú, Aventureiro, Floresta, Glória, América, Saguaçu, Costa e Silva, Vila Nova, Pirabeiraba…).

## 3. O texto (aprovação)

Regras da `fala` de cada bloco:
- Frase curta e falada, números em algarismo (`23`, `R$ 6,02`, `13h43`); o roteiro da voz converte sozinho.
- A fala começa diferente de todas as outras (as 3 primeiras palavras localizam o bloco na narração).
- Para cada item aparecer na hora certa, cite na fala o `bairro` (lista), o período `manhã/tarde/noite` (tempo),
  a hora exata da maré (`13h43`) e o nome do combustível.
- Boletim bom: ~60 s (≈ 150 palavras no total). `tools/roteiro_da_edicao.py` avisa se passar.

Mostre as falas em tópicos e **espere a aprovação**.

## 4 a 7

`narracao` → `sincronizar` → `render` → `publicar`.
