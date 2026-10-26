---
name: fontes
description: Tabela das fontes de dados do boletim (o que é automático e o que precisa de apuração). Use para saber de onde vem cada informação ou quando uma fonte falhar.
---

# Fontes de dados

| Bloco | Fonte | Como | Situação |
|---|---|---|---|
| Tempo (chuva por período, mín/máx, UV, sol) | Open-Meteo | `tools/coletar.py` | automático |
| Maré na Baía da Babitonga | Open-Meteo Marine (modelo) | `tools/coletar.py` | automático, **aproximado**; oficial: tábua da Marinha (DHN), Porto de São Francisco do Sul |
| Combustível (média semanal) | ANP, Levantamento de Preços | `tools/coletar.py` | automático (semanal) |
| Alertas | Defesa Civil de Joinville (site e redes da prefeitura) | apuração | manual |
| Falta de luz programada | Celesc — "Avisos de Desligamentos" (site/app) | apuração | manual |
| Manutenção na água | Companhia Águas de Joinville | apuração | manual |
| Farmácia de plantão | escala divulgada pela prefeitura/CRF-SC/imprensa local | apuração | manual (confirmar a escala do dia) |
| Trânsito e obras | Prefeitura (Seinfra/Detrans), Detran | apuração | manual |
| Empregos | posto do SINE / Prefeitura | apuração | manual |
| Eventos | Prefeitura, Centreventos, Teatro Juarez Machado | apuração | manual |
| Mapa | OpenStreetMap (© colaboradores, ODbL) | `tools/baixar_mapa.py` | pronto em `mapa/` |

Ideia para depois: automatizar os manuais que tiverem página estável (ler o site da Celesc e da Águas de Joinville
todo dia), sempre com a sua conferência antes de publicar.
