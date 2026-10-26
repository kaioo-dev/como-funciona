"""Coleta os dados automáticos do boletim de um dia e grava em projetos/<AAAA-MM-DD>/auto.json.
Uso: python3 tools/coletar.py [AAAA-MM-DD]      (sem data = hoje, no horário de Brasília)

Fontes (todas públicas e gratuitas, sem chave):
  - Tempo: Open-Meteo (modelos de previsão) — hora a hora (temperatura, sensação, chance de chuva, UV, rajadas),
    resumo do dia, guarda-chuva sim/não, horário de UV alto e a previsão de amanhã.
  - Qualidade do ar: Open-Meteo Air Quality (CAMS) — média de PM2,5 do dia, nas faixas da OMS.
  - Maré: Open-Meteo Marine (modelo, perto da entrada da Baía da Babitonga). É APROXIMADA: a referência oficial é a
    tábua de marés da Marinha (DHN) para o Porto de São Francisco do Sul. O vídeo sempre diz "previsão aproximada".
  - Combustíveis: ANP, Levantamento de Preços (resumo semanal por município) — preço médio em Joinville e a variação
    sobre a semana anterior, e o posto mais barato e o mais caro pesquisados (arquivo de revendas da mesma semana).
    Precisa do pacote openpyxl (python3 -m pip install openpyxl).
Cada fonte que falhar vira "erro" no arquivo; o boletim simplesmente não mostra aquele bloco.
"""
import datetime as dt, io, json, pathlib, re, sys, time, urllib.request

RAIZ = pathlib.Path(__file__).resolve().parent.parent
FUSO = dt.timezone(dt.timedelta(hours=-3))
JOINVILLE = (-26.30, -48.85)
BABITONGA = (-26.24, -48.64)  # entrada da baía, perto do porto de São Francisco do Sul
UA = {'User-Agent': 'JoinvilleHoje-kit/1.0'}
ANP_PAGINA = 'https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas'


def baixar(url, binario=False, timeout=40, tentativas=4):
    for n in range(tentativas):  # conexões instáveis: tenta de novo com espera crescente
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
                dado = r.read()
            return dado if binario else dado.decode('utf-8', 'replace')
        except Exception:
            if n == tentativas - 1:
                raise
            time.sleep(2 ** (n + 1))


# código de tempo da OMM (weather_code) → texto curto
def condicao(cod):
    if cod is None:
        return 'tempo variável'
    if cod == 0:
        return 'céu limpo'
    if cod in (1, 2):
        return 'sol entre nuvens'
    if cod == 3:
        return 'nublado'
    if cod in (45, 48):
        return 'neblina'
    if 51 <= cod <= 57:
        return 'garoa'
    if 61 <= cod <= 67 or 80 <= cod <= 82:
        return 'chuva'
    if cod >= 95:
        return 'temporal'
    return 'tempo variável'


def tempo(dia):
    amanha = (dt.date.fromisoformat(dia) + dt.timedelta(days=1)).isoformat()
    url = (
        f'https://api.open-meteo.com/v1/forecast?latitude={JOINVILLE[0]}&longitude={JOINVILLE[1]}'
        '&hourly=precipitation,precipitation_probability,temperature_2m,apparent_temperature,uv_index,wind_gusts_10m,relative_humidity_2m,weather_code'
        '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,sunrise,sunset,weather_code'
        f'&timezone=America%2FSao_Paulo&start_date={dia}&end_date={amanha}'
    )
    d = json.loads(baixar(url))
    h = d['hourly']
    hoje = [i for i, t in enumerate(h['time']) if t.startswith(dia)]
    periodos = []
    for nome, a, b in (('MANHÃ', 6, 12), ('TARDE', 12, 18), ('NOITE', 18, 24)):
        idx = [i for i in hoje if a <= int(h['time'][i][11:13]) < b]
        chuva = round(sum(h['precipitation'][i] or 0 for i in idx), 1)
        prob = max((h['precipitation_probability'][i] or 0) for i in idx)
        temp = round(sum(h['temperature_2m'][i] for i in idx) / len(idx))
        periodos.append({'nome': nome, 'chuva_mm': chuva, 'chance': prob, 'temp': temp})
    # hora a hora, das 6h às 23h (o que interessa para quem vai sair de casa)
    horas = [
        {
            'hora': h['time'][i][11:16],
            'temp': round(h['temperature_2m'][i], 1),
            'sensacao': round(h['apparent_temperature'][i], 1),
            'chance': h['precipitation_probability'][i] or 0,
            'chuva_mm': h['precipitation'][i] or 0,
            'uv': round(h['uv_index'][i] or 0, 1),
            'rajada': round(h['wind_gusts_10m'][i] or 0),
            'umidade': h['relative_humidity_2m'][i],
        }
        for i in hoje
        if 6 <= int(h['time'][i][11:13]) <= 23
    ]
    uv_alto = [x['hora'] for x in horas if x['uv'] >= 6]
    chuva_dia = max(horas, key=lambda x: x['chance'])
    rajada = max(horas, key=lambda x: x['rajada'])
    dd = d['daily']
    # condição do dia = a mais comum entre 7h e 19h (o código diário pega o pior momento e exagera)
    dia_claro = [condicao(h['weather_code'][i]) for i in hoje if 7 <= int(h['time'][i][11:13]) <= 19]
    dominante = max(set(dia_claro), key=dia_claro.count) if dia_claro else condicao(dd['weather_code'][0])
    return {
        'fonte': 'Open-Meteo',
        'condicao': dominante,
        'min': round(dd['temperature_2m_min'][0]),
        'max': round(dd['temperature_2m_max'][0]),
        'chuva_mm': round(dd['precipitation_sum'][0], 1),
        'chance_max': dd['precipitation_probability_max'][0],
        'uv_max': round(dd['uv_index_max'][0], 1),
        'nascer': dd['sunrise'][0][11:16],
        'por': dd['sunset'][0][11:16],
        'periodos': periodos,
        'horas': horas,
        'uv_alto': [uv_alto[0], uv_alto[-1]] if uv_alto else None,  # das X às Y (índice >= 6)
        'chuva_pico': {'hora': chuva_dia['hora'], 'chance': chuva_dia['chance']},
        'guarda_chuva': chuva_dia['chance'] >= 40 or sum(x['chuva_mm'] for x in horas) >= 0.5,
        'rajada_max': {'hora': rajada['hora'], 'kmh': rajada['rajada']},
        'amanha': {
            'condicao': condicao(dd['weather_code'][1]),
            'min': round(dd['temperature_2m_min'][1]),
            'max': round(dd['temperature_2m_max'][1]),
            'chance_max': dd['precipitation_probability_max'][1],
            'chuva_mm': round(dd['precipitation_sum'][1], 1),
        },
    }


def ar(dia):
    url = (
        f'https://air-quality-api.open-meteo.com/v1/air-quality?latitude={JOINVILLE[0]}&longitude={JOINVILLE[1]}'
        f'&hourly=pm2_5&timezone=America%2FSao_Paulo&start_date={dia}&end_date={dia}'
    )
    d = json.loads(baixar(url))
    vals = [v for v in d['hourly']['pm2_5'] if v is not None]
    media = round(sum(vals) / len(vals), 1)
    # faixas da OMS (2021) para a média de 24 h de PM2,5
    nivel = 'boa' if media <= 15 else 'moderada' if media <= 35 else 'ruim'
    return {'fonte': 'Open-Meteo (CAMS)', 'pm25_media': media, 'nivel': nivel}


def mare(dia):
    url = (
        f'https://marine-api.open-meteo.com/v1/marine?latitude={BABITONGA[0]}&longitude={BABITONGA[1]}'
        f'&hourly=sea_level_height_msl&timezone=America%2FSao_Paulo&start_date={dia}&end_date={dia}'
    )
    d = json.loads(baixar(url))
    t = d['hourly']['time']
    v = d['hourly']['sea_level_height_msl']
    serie = [{'hora': t[i][11:16], 'nivel': round(v[i], 2)} for i in range(len(t)) if v[i] is not None]
    altas, baixas = [], []
    for i in range(1, len(v) - 1):
        if None in (v[i - 1], v[i], v[i + 1]):
            continue
        for lista, ehpico in ((altas, v[i] >= v[i - 1] and v[i] > v[i + 1]), (baixas, v[i] <= v[i - 1] and v[i] < v[i + 1])):
            if not ehpico:
                continue
            # parábola nos 3 pontos: hora e nível do extremo entre as horas cheias
            den = v[i - 1] - 2 * v[i] + v[i + 1]
            off = 0.5 * (v[i - 1] - v[i + 1]) / den if den else 0
            nivel = v[i] - 0.25 * (v[i - 1] - v[i + 1]) * off
            minutos = round((i + off) * 60)
            lista.append({'hora': f'{minutos // 60:02d}:{minutos % 60:02d}', 'nivel': round(nivel, 2)})
    return {
        'fonte': 'Open-Meteo Marine (modelo, aproximado). Oficial: tábua da Marinha, Porto de São Francisco do Sul',
        'unidade': 'm em relação ao nível médio do mar',
        'altas': altas,
        'baixas': baixas,
        'serie': serie,
    }


def nome_bairro(bruto):
    """'JARDIM PARAISO' (ANP) → 'Jardim Paraíso' (nome do mapa), para o pin cair no bairro certo."""
    import unicodedata

    n = lambda x: ''.join(c for c in unicodedata.normalize('NFD', x.lower()) if unicodedata.category(c) != 'Mn').strip()
    try:
        nomes = [f['properties']['nome'] for f in json.loads((RAIZ / 'mapa' / 'bairros.geojson').read_text(encoding='utf-8'))['features']]
    except Exception:
        return bruto.title()
    return next((x for x in nomes if n(x) == n(bruto)), bruto.title())


def combustiveis():
    import openpyxl  # noqa: só aqui (as outras fontes funcionam sem ele)

    pagina = baixar(ANP_PAGINA)
    links = re.findall(r'href="([^"]*resumo_semanal_lpc[^"]*\.xlsx)"', pagina)
    if not links:
        raise RuntimeError('não achei o resumo semanal na página da ANP')

    def ler(url):
        wb = openpyxl.load_workbook(io.BytesIO(baixar(url, binario=True, timeout=90)), read_only=True, data_only=True)
        ws = wb['MUNICIPIOS']
        out, periodo = {}, None
        for row in ws.iter_rows(values_only=True):
            if row and len(row) > 7 and isinstance(row[3], str) and row[3].strip().upper() == 'JOINVILLE' and str(row[2]).upper().startswith('SANTA CATARINA'):
                periodo = (row[0].date().isoformat(), row[1].date().isoformat())
                out[str(row[4]).strip().upper()] = {'medio': float(row[7]), 'min': float(row[9]), 'max': float(row[10]), 'postos': int(row[5]), 'unidade': row[6]}
        return periodo, out

    periodo, atual = ler(links[0])
    anterior = {}
    if len(links) > 1:
        try:
            _, anterior = ler(links[1])
        except Exception:
            pass
    itens = []
    for nome, rotulo in (('GASOLINA COMUM', 'Gasolina'), ('ETANOL HIDRATADO', 'Etanol'), ('OLEO DIESEL S10', 'Diesel S10'), ('GLP', 'Gás (13 kg)')):
        if nome in atual:
            a = atual[nome]
            var = round(a['medio'] - anterior[nome]['medio'], 2) if nome in anterior else None
            itens.append({'nome': rotulo, 'medio': a['medio'], 'min': a['min'], 'max': a['max'], 'postos': a['postos'], 'unidade': a['unidade'], 'variacao': var})
    postos = {}
    rev = links[0].replace('resumo_semanal_lpc', 'revendas_lpc')
    try:
        wb = openpyxl.load_workbook(io.BytesIO(baixar(rev, binario=True, timeout=120)), read_only=True, data_only=True)
        linhas = [r for r in wb.worksheets[0].iter_rows(values_only=True) if r and len(r) > 14 and r[8] == 'JOINVILLE' and isinstance(r[13], (int, float))]
        for prod, rotulo in (('GASOLINA COMUM', 'Gasolina'), ('ETANOL', 'Etanol')):
            ps = sorted([r for r in linhas if r[11] == prod], key=lambda r: r[13])
            if ps:
                f = lambda r: {'posto': (r[2] or r[1]).title(), 'endereco': f'{str(r[3]).title()}, {r[4]}', 'bairro': nome_bairro(str(r[6])), 'preco': float(r[13]), 'coleta': r[14].date().isoformat()}
                postos[rotulo] = {'mais_barato': f(ps[0]), 'mais_caro': f(ps[-1]), 'pesquisados': len(ps)}
    except Exception as e:
        postos = {'erro': str(e)}
    return {'fonte': 'ANP — Levantamento de Preços de Combustíveis', 'semana': periodo, 'itens': itens, 'postos': postos, 'arquivo': links[0]}


def main():
    dia = sys.argv[1] if len(sys.argv) > 1 else dt.datetime.now(FUSO).date().isoformat()
    pasta = RAIZ / 'projetos' / dia
    pasta.mkdir(parents=True, exist_ok=True)
    saida = {'data': dia, 'coletado_em': dt.datetime.now(FUSO).isoformat(timespec='minutes')}
    for nome, f in (('tempo', lambda: tempo(dia)), ('ar', lambda: ar(dia)), ('mare', lambda: mare(dia)), ('combustiveis', combustiveis)):
        try:
            saida[nome] = f()
            print(f'ok   {nome}')
        except Exception as e:  # uma fonte fora do ar não derruba o boletim
            saida[nome] = {'erro': str(e)}
            print(f'ERRO {nome}: {e}')
    (pasta / 'auto.json').write_text(json.dumps(saida, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'gravado: {(pasta / "auto.json").relative_to(RAIZ)}')


if __name__ == '__main__':
    main()
