"""Coleta os dados automáticos do boletim de um dia e grava em projetos/<AAAA-MM-DD>/auto.json.
Uso: python3 tools/coletar.py [AAAA-MM-DD]      (sem data = hoje, no horário de Brasília)

Fontes (todas públicas e gratuitas, sem chave):
  - Tempo: Open-Meteo (modelos de previsão) — chuva por período, temperatura, índice UV, nascer e pôr do sol.
  - Maré: Open-Meteo Marine (modelo, perto da entrada da Baía da Babitonga). É APROXIMADA: a referência oficial é a
    tábua de marés da Marinha (DHN) para o Porto de São Francisco do Sul. O vídeo sempre diz "previsão aproximada".
  - Combustíveis: ANP, Levantamento de Preços (resumo semanal por município) — preço médio em Joinville e a variação
    sobre a semana anterior. Precisa do pacote openpyxl (python3 -m pip install openpyxl).
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


def tempo(dia):
    url = (
        f'https://api.open-meteo.com/v1/forecast?latitude={JOINVILLE[0]}&longitude={JOINVILLE[1]}'
        '&hourly=precipitation,precipitation_probability,temperature_2m,uv_index'
        '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,sunrise,sunset'
        f'&timezone=America%2FSao_Paulo&start_date={dia}&end_date={dia}'
    )
    d = json.loads(baixar(url))
    h = d['hourly']
    periodos = []
    for nome, a, b in (('MANHÃ', 6, 12), ('TARDE', 12, 18), ('NOITE', 18, 24)):
        idx = [i for i, t in enumerate(h['time']) if a <= int(t[11:13]) < b]
        chuva = round(sum(h['precipitation'][i] or 0 for i in idx), 1)
        prob = max((h['precipitation_probability'][i] or 0) for i in idx)
        temp = round(sum(h['temperature_2m'][i] for i in idx) / len(idx))
        periodos.append({'nome': nome, 'chuva_mm': chuva, 'chance': prob, 'temp': temp})
    dd = d['daily']
    return {
        'fonte': 'Open-Meteo',
        'min': round(dd['temperature_2m_min'][0]),
        'max': round(dd['temperature_2m_max'][0]),
        'chuva_mm': round(dd['precipitation_sum'][0], 1),
        'chance_max': dd['precipitation_probability_max'][0],
        'uv_max': round(dd['uv_index_max'][0], 1),
        'nascer': dd['sunrise'][0][11:16],
        'por': dd['sunset'][0][11:16],
        'periodos': periodos,
    }


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
    return {'fonte': 'ANP — Levantamento de Preços de Combustíveis', 'semana': periodo, 'itens': itens, 'arquivo': links[0]}


def main():
    dia = sys.argv[1] if len(sys.argv) > 1 else dt.datetime.now(FUSO).date().isoformat()
    pasta = RAIZ / 'projetos' / dia
    pasta.mkdir(parents=True, exist_ok=True)
    saida = {'data': dia, 'coletado_em': dt.datetime.now(FUSO).isoformat(timespec='minutes')}
    for nome, f in (('tempo', lambda: tempo(dia)), ('mare', lambda: mare(dia)), ('combustiveis', combustiveis)):
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
