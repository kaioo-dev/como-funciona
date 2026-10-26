---
name: tema-do-dia
description: Escolhe e apura o tema do dia do boletim conforme o dia da semana (empregos, bolso, cidade, saúde, agenda, esporte, resumo). Use ao preencher o bloco de tipo "tema".
---

# Tema do dia

| Dia | Tema | O que procurar (fonte oficial primeiro) |
|---|---|---|
| Segunda | EMPREGOS | vagas do posto do SINE/Prefeitura de Joinville; 3 áreas com mais vagas ou 3 vagas em destaque |
| Terça | BOLSO | combustível (automático, ANP) ou cesta básica (DIEESE/Procon) |
| Quarta | CIDADE | obras, mudanças no ônibus, coleta de lixo, serviços e prazos da prefeitura |
| Quinta | SAÚDE | campanhas de vacina, onde vacinar, mutirões (Secretaria da Saúde) |
| Sexta | AGENDA | eventos do fim de semana (Centreventos, teatro, feiras; prefira os gratuitos) |
| Sábado | ESPORTE | jogos e resultados dos times da cidade |
| Domingo | RESUMO | as 3 coisas mais importantes da semana em Joinville |

Bloco `tema`: `rotulo` (o tema), `titulo` (até ~40 caracteres), `linhas` (2–4, curtas; `destaque: true` em uma),
`numero` opcional (`{valor: "312", rotulo: "vagas abertas"}`), `fonte` e `fala`. Cada linha começa com uma palavra
que também está na fala (é assim que ela entra na hora certa).

Sem informação confirmada para o tema do dia? Troque por outro tema confirmado ou apague o bloco.
