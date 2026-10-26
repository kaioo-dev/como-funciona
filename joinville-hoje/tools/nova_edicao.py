"""Monta o rascunho da edição do dia (projetos/<AAAA-MM-DD>/edicao.json) a partir do auto.json.
Uso: python3 tools/nova_edicao.py [AAAA-MM-DD]

O rascunho já vem com os blocos automáticos (abertura, patrocínio se patrocinio.json existir, resumo do tempo,
hora a hora com guarda-chuva sim/não, sol/vento/ar, maré, combustível com "etanol compensa?", posto mais barato e mais
caro, a curiosidade do dia de curiosidades.json, amanhã e encerramento), cada um com a sua manchete.
Com --manuais, entram também os blocos que dependem de apuração (alerta, falta de luz/água, farmácia de plantão) com
o texto PREENCHER: o Claude completa pela apuração (skill `apuracao`) ou apaga. O render recusa enquanto houver PREENCHER.
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


def br(v, casas=2):
    return f'{v:.{casas}f}'.replace('.', ',')


def arred(x):
    return int(x + 0.5)  # meio para cima (igual ao vídeo)


def h(hhmm):
    return f'{int(hhmm[:2])}h'


def curiosidade_do_dia(pasta):
    """A próxima curiosidade de curiosidades.json que ainda não foi usada (registro em curiosidades-usadas.txt)."""
    arq = RAIZ / 'curiosidades.json'
    if not arq.exists():
        return None
    todas = json.loads(arq.read_text(encoding='utf-8'))
    usadas_arq = RAIZ / 'curiosidades-usadas.txt'
    usadas = set(usadas_arq.read_text(encoding='utf-8').split()) if usadas_arq.exists() else set()
    livres = [c for c in todas if c['id'] not in usadas] or todas
    return livres[0]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    dia = args[0] if args else dt.date.today().isoformat()
    data = dt.date.fromisoformat(dia)
    pasta = RAIZ / 'projetos' / dia
    auto = json.loads((pasta / 'auto.json').read_text(encoding='utf-8'))
    wd = data.weekday()
    ok = lambda k: k in auto and 'erro' not in auto[k]
    B = []
    B.append({'tipo': 'abertura', 'fala': f'Bom dia, Joinville! {DIAS_FALA[wd].split("-")[0].capitalize()}, {data.day} de {MESES[data.month - 1]}: seu dia em um minuto.'})
    pat = RAIZ / 'patrocinio.json'
    if pat.exists():
        p = json.loads(pat.read_text(encoding='utf-8'))
        B.append({'tipo': 'patrocinio', 'nome': p['nome'], 'frase': p['frase'], 'fala': f'Oferecimento: {p["nome"]}.', **({'imagem': p['imagem']} if p.get('imagem') else {})})
    if ok('tempo'):
        t = auto['tempo']
        cedo = next((x for x in t.get('horas', []) if x['hora'] == '07:00'), None)
        casaco = f' Às 7h, {arred(cedo["temp"])}: casaco leve.' if cedo and cedo['temp'] < 18 else ''
        B.append({'tipo': 'resumo', 'manchete': f'{t["min"]}° → {t["max"]}°', 'fala': f'{t["condicao"].capitalize()}: de {t["min"]} a {t["max"]} graus.{casaco}', 'dados': t})
        pico = t['chuva_pico']
        if t['guarda_chuva']:
            fala = f'Chuva provável: até {pico["chance"]}% às {h(pico["hora"])}. Guarda-chuva na bolsa.'
        else:
            fala = f'Chuva pouco provável, no máximo {pico["chance"]}%. Guarda-chuva pode ficar em casa.'
        B.append({'tipo': 'hora', 'manchete': 'LEVE GUARDA-CHUVA' if t['guarda_chuva'] else 'SEM GUARDA-CHUVA', 'fala': fala, 'dados': t})
        partes = []
        if t.get('uv_alto'):
            partes.append(f'UV alto das {h(t["uv_alto"][0])} às {h(t["uv_alto"][1])}, chegando a {arred(t["uv_max"])}.')
        if t.get('rajada_max') and t['rajada_max']['kmh'] >= 30:
            partes.append(f'À tarde, rajadas de {t["rajada_max"]["kmh"]} km/h.' if int(t['rajada_max']['hora'][:2]) >= 12 else f'Rajadas de {t["rajada_max"]["kmh"]} km/h.')
        if ok('ar'):
            partes.append(f'Qualidade do ar {auto["ar"]["nivel"]}.')
        if partes:
            B.append({'tipo': 'sol', 'manchete': f'UV {arred(t["uv_max"])}' + (' · PROTETOR' if t['uv_max'] >= 6 else ''), 'fala': ' '.join(partes), 'dados': t, **({'ar': auto['ar']} if ok('ar') else {})})
    if ok('mare') and auto['mare']['altas']:
        altas = [hora(a['hora']) for a in auto['mare']['altas']]
        dia_claro = [hora(a['hora']) for a in auto['mare']['altas'] if 6 <= int(a['hora'][:2]) <= 20] or altas
        art = 'à' if altas[0].startswith('1h') else 'às'
        B.append({'tipo': 'mare', 'manchete': f'MARÉ ALTA {dia_claro[0]}', 'fala': f'Maré alta na Babitonga {art} {" e às ".join(altas)}, previsão aproximada.', 'dados': auto['mare']})
    if ok('combustiveis'):
        c = auto['combustiveis']
        it = {i['nome']: i for i in c['itens']}
        g, e = it.get('Gasolina'), it.get('Etanol')
        if g and e:
            pct = e['medio'] / g['medio'] * 100
            veredito = ('compensa, por pouco' if pct > 68 else 'compensa') if pct < 70 else 'não compensa'
            B.append({'tipo': 'combustivel', 'manchete': 'ETANOL COMPENSA' if pct < 70 else 'VÁ DE GASOLINA', 'fala': f'Gasolina a {reais(g["medio"])} na média; etanol a {reais(e["medio"])}. Etanol custa {br(pct, 1)}% da gasolina: {veredito}.', 'dados': {'semana': c['semana'], 'itens': c['itens'], 'fonte': c['fonte']}})
        ps = c.get('postos', {}).get('Gasolina')
        if ps:
            dif = (ps['mais_caro']['preco'] - ps['mais_barato']['preco']) * 50
            B.append({
                'tipo': 'postos',
                'manchete': f'R$ {arred(dif)} NO TANQUE',
                'fala': f'Gasolina mais barata pesquisada: {reais(ps["mais_barato"]["preco"])}, no {ps["mais_barato"]["bairro"]}. Mais cara: {reais(ps["mais_caro"]["preco"])}, no {ps["mais_caro"]["bairro"]}. Num tanque de 50 litros, R$ {arred(dif)} de diferença.',
                'dados': {'produto': 'Gasolina', 'mais_barato': ps['mais_barato'], 'mais_caro': ps['mais_caro'], 'pesquisados': ps['pesquisados'], 'tanque': 50, 'semana': c['semana']},
            })
    cur = curiosidade_do_dia(pasta)
    if cur:
        B.append({'tipo': 'curiosidade', 'manchete': cur['manchete'], 'titulo': cur['titulo'], 'marcos': cur['marcos'], 'destaque': cur.get('destaque'), 'fonte': cur['fonte'], 'fala': cur['fala']})
    if '--manuais' in sys.argv:  # blocos que dependem de apuração (o Claude preenche ou apaga)
        B.append({'tipo': 'lista', 'alerta': True, 'rotulo': 'ALERTA DA DEFESA CIVIL', 'titulo': P, 'itens': [{'texto': P, 'bairro': P}], 'fonte': 'Defesa Civil de Joinville', 'fala': P})
        B.append({'tipo': 'lista', 'rotulo': 'FALTA DE LUZ E ÁGUA PROGRAMADA', 'titulo': P, 'itens': [{'texto': P, 'bairro': P, 'detalhe': P}], 'fonte': 'Celesc / Águas de Joinville', 'fala': P})
        B.append({'tipo': 'lista', 'rotulo': 'FARMÁCIA DE PLANTÃO', 'titulo': P, 'itens': [{'texto': P, 'bairro': P, 'detalhe': P}], 'fonte': P, 'fala': P})
    if ok('tempo') and auto['tempo'].get('amanha'):
        a = auto['tempo']['amanha']
        chuva = f' e {a["chance_max"]}% de chance de chuva' + (', mas fraca' if a['chuva_mm'] < 2 and a['chance_max'] >= 50 else '') if a['chance_max'] >= 40 else ', sem chuva prevista'
        B.append({'tipo': 'amanha', 'manchete': f'AMANHÃ {a["min"]}° → {a["max"]}°', 'fala': f'Amanhã: de {a["min"]} a {a["max"]} graus{chuva}.', 'dados': a})
    B.append({'tipo': 'encerramento', 'fala': 'Salva e manda pra quem sai cedo de casa!'})
    edicao = {'data': dia, 'diaSemana': DIAS[wd], 'sons': True, 'blocos': B}
    destino = pasta / 'edicao.json'
    destino.write_text(json.dumps(edicao, ensure_ascii=False, indent=1), encoding='utf-8')
    faltam = sum(1 for b in B if P in json.dumps(b, ensure_ascii=False))
    palavras = sum(len(b['fala'].split()) for b in B)
    print(f'rascunho: {destino.relative_to(RAIZ)} · {len(B)} blocos · ~{palavras} palavras' + (f' · {faltam} para PREENCHER (ou apagar)' if faltam else ''))


if __name__ == '__main__':
    main()
