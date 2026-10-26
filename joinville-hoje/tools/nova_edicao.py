"""Monta o rascunho da edição do dia (projetos/<AAAA-MM-DD>/edicao.json) a partir do auto.json.
Uso: python3 tools/nova_edicao.py [AAAA-MM-DD]

O rascunho já vem com: abertura, patrocínio (se patrocinio.json existir), tempo, maré, combustível (às terças, ou
quando --combustivel), encerramento, e os blocos MANUAIS do dia com o texto PREENCHER (alertas, falta de luz/água,
farmácia de plantão, tema do dia). O Claude completa esses blocos pela apuração (skill `apuracao`) ou apaga os que não
tiverem informação confirmada. O render recusa a edição enquanto houver PREENCHER.
"""
import datetime as dt, json, pathlib, sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
DIAS = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO', 'DOMINGO']
DIAS_FALA = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo']
MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
# tema do dia por dia da semana (skill `tema-do-dia`)
TEMAS = {0: ('EMPREGOS', 'Vagas abertas hoje'), 1: ('BOLSO', 'Combustível em Joinville'), 2: ('CIDADE', 'O que muda na cidade'), 3: ('SAÚDE', 'Saúde e vacina'),
         4: ('AGENDA', 'O que fazer no fim de semana'), 5: ('ESPORTE', 'Esporte de Joinville'), 6: ('RESUMO', 'A semana em Joinville')}
P = 'PREENCHER'


def reais(v):
    return f'R$ {v:.2f}'.replace('.', ',')


def hora(h):
    hh, mm = h.split(':')
    return f'{int(hh)}h{mm}'


def fala_tempo(d):
    ps = d['periodos']
    chove = [p['nome'].lower() for p in ps if p['chuva_mm'] >= 0.5 or p['chance'] >= 60]
    if not chove:
        chuva = 'Pouca chance de chuva: manhã, tarde e noite com tempo firme.'
    elif len(chove) == 3:
        chuva = f'Chuva ao longo do dia, na manhã, na tarde e na noite, com até {round(d["chuva_mm"])} milímetros.'
    else:
        resto = [p['nome'].lower() for p in ps if p['nome'].lower() not in chove]
        chuva = f'Chance de chuva {" e ".join("na " + c for c in chove)}; {" e ".join(resto)} mais firmes.'
    uv = ' Índice UV muito alto: use protetor.' if d['uv_max'] >= 8 else (' Índice UV alto.' if d['uv_max'] >= 6 else '')
    return f'No tempo, mínima de {d["min"]} e máxima de {d["max"]} graus. {chuva}{uv}'


def fala_mare(d):
    altas = [hora(a['hora']) for a in d['altas']]
    if not altas:
        return None
    lista = ' e às '.join(altas) if len(altas) > 1 else altas[0]
    artigo = 'à' if altas[0].startswith('1h') else 'às'
    return f'Na Baía da Babitonga, maré alta {artigo} {lista}, pela previsão aproximada.'


def fala_combustivel(d):
    it = {i['nome']: i for i in d['itens']}
    g = it.get('Gasolina')
    if not g:
        return None
    var = ''
    if g['variacao']:
        cent = round(abs(g['variacao']) * 100)
        var = f', {cent} centavos {"mais barata" if g["variacao"] < 0 else "mais cara"} que na semana anterior'
    e = it.get('Etanol')
    eta = f' Etanol a {reais(e["medio"])}.' if e else ''
    return f'Combustível em Joinville: gasolina a {reais(g["medio"])} na média{var}.{eta}'


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    dia = args[0] if args else dt.date.today().isoformat()
    data = dt.date.fromisoformat(dia)
    pasta = RAIZ / 'projetos' / dia
    auto = json.loads((pasta / 'auto.json').read_text(encoding='utf-8'))
    wd = data.weekday()
    blocos = [{'tipo': 'abertura', 'fala': f'Bom dia, Joinville! {DIAS_FALA[wd].capitalize()}, {data.day} de {MESES[data.month - 1]}. Veja o que muda no seu dia.'}]
    pat = RAIZ / 'patrocinio.json'
    if pat.exists():
        p = json.loads(pat.read_text(encoding='utf-8'))
        blocos.append({'tipo': 'patrocinio', 'nome': p['nome'], 'frase': p['frase'], 'fala': f'O Joinville Hoje é oferecido por {p["nome"]}.', **({'imagem': p['imagem']} if p.get('imagem') else {})})
    if 'erro' not in auto.get('tempo', {'erro': 1}):
        blocos.append({'tipo': 'tempo', 'fala': fala_tempo(auto['tempo']), 'dados': auto['tempo']})
    if 'erro' not in auto.get('mare', {'erro': 1}) and fala_mare(auto['mare']):
        blocos.append({'tipo': 'mare', 'fala': fala_mare(auto['mare']), 'dados': auto['mare']})
    # blocos manuais: o Claude apura e preenche, ou apaga
    blocos.append({'tipo': 'lista', 'alerta': True, 'rotulo': 'ALERTA DA DEFESA CIVIL', 'titulo': P, 'itens': [{'texto': P, 'bairro': P}], 'fonte': 'Defesa Civil de Joinville', 'fala': P})
    blocos.append({'tipo': 'lista', 'rotulo': 'FALTA DE LUZ E ÁGUA PROGRAMADA', 'titulo': P, 'itens': [{'texto': P, 'bairro': P, 'detalhe': P}], 'fonte': 'Celesc / Águas de Joinville', 'fala': P})
    blocos.append({'tipo': 'lista', 'rotulo': 'FARMÁCIA DE PLANTÃO', 'titulo': P, 'itens': [{'texto': P, 'bairro': P, 'detalhe': P}], 'fonte': P, 'fala': P})
    rot, tit = TEMAS[wd]
    comb = auto.get('combustiveis', {})
    if (wd == 1 or '--combustivel' in sys.argv) and 'erro' not in comb and fala_combustivel(comb):
        blocos.append({'tipo': 'combustivel', 'fala': fala_combustivel(comb), 'dados': {'semana': comb['semana'], 'itens': comb['itens'], 'fonte': comb['fonte']}})
    else:
        blocos.append({'tipo': 'tema', 'rotulo': rot, 'titulo': tit, 'linhas': [{'texto': P}], 'fonte': P, 'fala': P})
    blocos.append({'tipo': 'encerramento', 'fala': 'Salva e manda pra quem sai cedo de casa. Até amanhã!'})
    edicao = {'data': dia, 'diaSemana': DIAS[wd], 'blocos': blocos}
    destino = pasta / 'edicao.json'
    destino.write_text(json.dumps(edicao, ensure_ascii=False, indent=1), encoding='utf-8')
    faltam = sum(1 for b in blocos if P in json.dumps(b, ensure_ascii=False))
    print(f'rascunho: {destino.relative_to(RAIZ)} · {len(blocos)} blocos · {faltam} para PREENCHER (ou apagar)')


if __name__ == '__main__':
    main()
