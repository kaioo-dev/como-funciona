"""Converte os contornos de mapa/ (GeoJSON do OpenStreetMap) em src/mapa/dados.ts, que o vídeo desenha.
Uso: python3 tools/mapa_para_ts.py
Rode de novo sempre que atualizar um arquivo de mapa/ (ex.: depois de tools/baixar_mapa.py).
"""
import json, pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent
MAPA = RAIZ / 'mapa'


def aneis(geom):
    """Lista de anéis externos [[lon, lat], ...] de um Polygon/MultiPolygon (furos são ignorados: é um mapa estilizado)."""
    if geom['type'] == 'Polygon':
        return [geom['coordinates'][0]]
    if geom['type'] == 'MultiPolygon':
        return [p[0] for p in geom['coordinates']]
    return []


def linhas(geom):
    if geom['type'] == 'LineString':
        return [geom['coordinates']]
    if geom['type'] == 'MultiLineString':
        return geom['coordinates']
    return []


def r(pts):
    return [[round(x, 4), round(y, 4)] for x, y in pts]


def main():
    cidade = json.loads((MAPA / 'joinville.geojson').read_text(encoding='utf-8'))
    bairros = json.loads((MAPA / 'bairros.geojson').read_text(encoding='utf-8'))
    rio = json.loads((MAPA / 'rio-cachoeira.geojson').read_text(encoding='utf-8'))
    dados = {
        'cidade': [r(a) for a in aneis(cidade['geometry'])],
        'bairros': [
            {'nome': f['properties']['nome'], 'centro': [round(f['properties']['lon'], 4), round(f['properties']['lat'], 4)], 'aneis': [r(a) for a in aneis(f['geometry'])]}
            for f in bairros['features']
        ],
        'rio': [r(l) for f in rio['features'] for l in linhas(f['geometry'])],
    }
    destino = RAIZ / 'src' / 'mapa' / 'dados.ts'
    destino.write_text(
        '// Gerado por tools/mapa_para_ts.py a partir de mapa/*.geojson (dados © colaboradores do OpenStreetMap, licença ODbL).\n'
        '// Não edite à mão.\n'
        'export type Ponto = [number, number]; // [longitude, latitude]\n'
        'export type Bairro = {nome: string; centro: Ponto; aneis: Ponto[][]};\n'
        f'export const CIDADE: Ponto[][] = {json.dumps(dados["cidade"])};\n'
        f'export const BAIRROS: Bairro[] = {json.dumps(dados["bairros"], ensure_ascii=False)};\n'
        f'export const RIO: Ponto[][] = {json.dumps(dados["rio"])};\n',
        encoding='utf-8',
    )
    print(f'{destino.relative_to(RAIZ)}: {len(dados["bairros"])} bairros, {len(dados["rio"])} trechos de rio')


if __name__ == '__main__':
    main()
