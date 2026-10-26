---
name: apuracao
description: Apura os blocos manuais do boletim (alertas da Defesa Civil, falta de luz e água, farmácia de plantão, trânsito, eventos) com fontes oficiais do dia. Use antes de preencher qualquer bloco com PREENCHER.
---

# Apuração

Use a busca e a leitura de páginas da web. Para cada bloco:

1. **Fonte oficial primeiro** (ver skill `fontes`): prefeitura, Defesa Civil, Celesc, Águas de Joinville, Detran,
   operadoras de ônibus, CRF-SC. Imprensa local só como segunda fonte.
2. **Do dia.** A informação tem que valer para a data da edição (confira a data da publicação).
3. **Duas fontes** quando não for fonte oficial direta.
4. **Anote** o link e a hora da consulta em `projetos/<data>/apuracao.md` (fica de registro se alguém questionar).
5. **Na dúvida, fora.** Melhor um boletim mais curto do que um item errado.

Escrita:
- Alerta: o que a Defesa Civil diz, para onde e até quando. Sem exagero e sem previsão própria.
- Falta de luz/água: bairro, ruas principais e horário. `rotulo`: "FALTA DE LUZ PROGRAMADA" ou "MANUTENÇÃO NA ÁGUA".
- Farmácia de plantão: nome, bairro e horário. Se a escala não for encontrada, o bloco sai.
- Polícia/acidente: só se afetar o dia de muita gente (via interditada); sem nomes, fotos ou placas.
- `fonte` do bloco = a fonte oficial ("Defesa Civil de Joinville", "Celesc").
