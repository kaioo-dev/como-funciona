"""Baixa do OpenStreetMap (Nominatim) o contorno de Joinville, dos bairros e trechos do Rio Cachoeira para mapa/.
Uso: python3 tools/baixar_mapa.py
Respeita a política de uso do Nominatim (1 pedido por segundo, com identificação). Só precisa rodar de novo se quiser
atualizar o mapa ou acrescentar bairros. Depois rode tools/mapa_para_ts.py.
"""
import json, pathlib, time, urllib.parse, urllib.request

RAIZ = pathlib.Path(__file__).resolve().parent.parent
MAPA = RAIZ / 'mapa'
UA = 'JoinvilleHoje-kit/1.0'
BAIRROS = (
    'Adhemar Garcia|América|Anita Garibaldi|Atiradores|Aventureiro|Boa Vista|Boehmerwald|Bom Retiro|Bucarein|Centro|Comasa|'
    'Costa e Silva|Dona Francisca|Espinheiros|Fátima|Floresta|Glória|Guanabara|Iririú|Itaum|Itinga|Jardim Iririú|Jardim Paraíso|'
    'Jardim Sofia|Jarivatuba|João Costa|Morro do Meio|Nova Brasília|Paranaguamirim|Parque Guarani|Petrópolis|Pirabeiraba|Profipo|'
    'Rio Bonito|Saguaçu|Santa Catarina|Santo Antônio|São Marcos|Ulysses Guimarães|Vila Cubatão|Vila Nova|Zona Industrial Norte|Zona Industrial Tupy'
).split('|')


def busca(q, limite=1):
    p = {'q': q, 'format': 'json', 'limit': limite, 'polygon_geojson': 1, 'polygon_threshold': 0.0004}
    req = urllib.request.Request('https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode(p), headers={'User-Agent': UA})
    resp = json.load(urllib.request.urlopen(req, timeout=40))
    time.sleep(1.2)
    return resp


def main():
    MAPA.mkdir(exist_ok=True)
    c = busca('Joinville, Santa Catarina, Brasil')[0]
    (MAPA / 'joinville.geojson').write_text(json.dumps({'type': 'Feature', 'properties': {'nome': 'Joinville'}, 'geometry': c['geojson']}), encoding='utf-8')
    feats = []
    for b in BAIRROS:
        r = busca(f'{b}, Joinville, Santa Catarina, Brasil')
        if r and r[0]['geojson']['type'] in ('Polygon', 'MultiPolygon') and 'Joinville' in r[0]['display_name']:
            feats.append({'type': 'Feature', 'properties': {'nome': b, 'lat': float(r[0]['lat']), 'lon': float(r[0]['lon'])}, 'geometry': r[0]['geojson']})
        else:
            print('sem contorno:', b)
    (MAPA / 'bairros.geojson').write_text(json.dumps({'type': 'FeatureCollection', 'features': feats}, ensure_ascii=False), encoding='utf-8')
    rio = busca('Rio Cachoeira, Joinville', 5)
    (MAPA / 'rio-cachoeira.geojson').write_text(
        json.dumps({'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'properties': {'nome': 'Rio Cachoeira'}, 'geometry': x['geojson']} for x in rio if x['geojson']['type'] in ('LineString', 'MultiLineString')]}),
        encoding='utf-8',
    )
    print(f'mapa/: cidade, {len(feats)} bairros, rio. Agora rode: python3 tools/mapa_para_ts.py')


if __name__ == '__main__':
    main()
