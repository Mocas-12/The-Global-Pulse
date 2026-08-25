# -*- coding: utf-8 -*-
"""Fetch real world data for The-Global-Pulse:
1. Natural Earth admin_0 countries GeoJSON (full boundaries)
2. World Bank API: population, birth rate, death rate per country
Outputs:
  public/datasets/countries.geojson  (real boundaries)
  src/data/worldBankData.json        (ISO3 -> {population, birthRate, deathRate, ...})
"""
import json
import os
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def http_get(url, retries=3):
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (data-fetch script)'})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2 * (i + 1))
    raise RuntimeError(f'failed to GET {url}: {last}')

# ---------- 1. Country boundaries ----------
print('== Downloading country boundaries (Natural Earth 110m) ==')
GEO_URLS = [
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson',
    'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson',
]
geo_bytes = None
for u in GEO_URLS:
    try:
        geo_bytes = http_get(u)
        print('OK', u, len(geo_bytes) // 1024, 'KB')
        break
    except Exception as e:  # noqa: BLE001
        print('FAIL', u, e)
if geo_bytes is None:
    sys.exit('could not download boundaries')

geo = json.loads(geo_bytes.decode('utf-8'))
feats = geo.get('features', [])
print('features:', len(feats))
sample = feats[0]['properties']
keep_candidates = ['ISO_A2_EH', 'ISO_A2', 'ADM0_A3', 'ISO_A3_EH', 'NAME', 'ADMIN', 'POP_EST', 'NAME_ZH', 'NAME_JA', 'LABEL_X', 'LABEL_Y']
print('available prop keys:', sorted(sample.keys()))
keep = [k for k in keep_candidates if k in sample]
slim = {'type': 'FeatureCollection', 'features': [
    {'type': 'Feature', 'properties': {k: f['properties'].get(k) for k in keep},
     'geometry': f['geometry']} for f in feats]}
os.makedirs(os.path.join(ROOT, 'public', 'datasets'), exist_ok=True)
out_geo = os.path.join(ROOT, 'public', 'datasets', 'countries.geojson')
with open(out_geo, 'w', encoding='utf-8') as fh:
    json.dump(slim, fh, ensure_ascii=False, separators=(',', ':'))
print('wrote', out_geo, round(os.path.getsize(out_geo) / 1048576, 2), 'MB')

# ---------- 2. World Bank indicators ----------
# SP.POP.TOTL population; SP.DYN.CBRT.IN births/1000/yr; SP.DYN.CDRT.IN deaths/1000/yr
IND = {
    'SP.POP.TOTL': 'population',
    'SP.DYN.CBRT.IN': 'birthRate',   # per 1000 per year
    'SP.DYN.CDRT.IN': 'deathRate',   # per 1000 per year
}
wb = {}
for iso_code, field in IND.items():
    print('== WB indicator', iso_code, '==')
    url = (f'https://api.worldbank.org/v2/country/all/indicator/{iso_code}'
           '?format=json&per_page=20000&date=2015:2024')
    raw = http_get(url)
    arr = json.loads(raw.decode('utf-8'))
    rows = arr[1] if len(arr) > 1 else []
    n = 0
    for row in rows:
        c = row.get('countryiso3code') or ''
        v = row.get('value')
        y = row.get('date')
        if not c or v is None or not isinstance(y, str) or not y.isdigit():
            continue
        # aggregate regions have empty iso3 or are non-country; filter obvious aggregates by name later
        rec = wb.setdefault(c, {})
        by_year = rec.setdefault(field, {})
        by_year[int(y)] = v
        n += 1
    print('rows kept:', n)

def latest(rec, field, min_year=1950):
    ys = rec.get(field) or {}
    if not ys:
        return None, None
    y = max(ys.keys())
    if y < min_year:
        return None, None
    return float(ys[y]), y

# aggregates to exclude: query World Bank country metadata for region.value == 'Aggregates'
AGG_URL = 'https://api.worldbank.org/v2/country?format=json&per_page=400'
try:
    arr = json.loads(http_get(AGG_URL).decode('utf-8'))
    AGG = {r['id'] for r in (arr[1] or []) if (r.get('region') or {}).get('value') == 'Aggregates'}
    print('aggregate codes from WB metadata:', len(AGG))
except Exception as e:  # noqa: BLE001
    print('WARN: fallback static aggregate list', e)
    AGG = set('''AFE AFR AFW ARB BEA BEC BHI BLA BMN BSS CAA CEA CEB CEU CLA CME CSA CSS DEA DEC
DLA DMN DNS DSA DSF DSS EAP EAR EAS ECA ECS EMU EUU FXS HIC HPC IBB IBD IBT IDA IDB IDX INX LAC
LCN LDC LIC LMC LMY LTE MDE MEA MIC MNA NAC NAF NRS NXS OED OSS PRE PST RRS SAS SSA SSF SST SXZ
TEA TEC TLA TMN TSA TSS UMC WLD XZN'''.split())

out = {}
for iso3, rec in wb.items():
    if iso3 in AGG:
        continue
    pop, pop_y = latest(rec, 'population')
    br, br_y = latest(rec, 'birthRate')
    dr, dr_y = latest(rec, 'deathRate')
    if pop is None:
        continue
    out[iso3] = {
        'population': int(pop),
        'populationYear': pop_y,
        'birthRate': br,      # births per 1000 people per year
        'deathRate': dr,      # deaths per 1000 people per year
        'rateYear': max(x for x in (br_y, dr_y) if x is not None) if (br_y or dr_y) else None,
    }
print('countries with WB data:', len(out))

os.makedirs(os.path.join(ROOT, 'src', 'data'), exist_ok=True)
out_json = os.path.join(ROOT, 'src', 'data', 'worldBankData.json')
with open(out_json, 'w', encoding='utf-8') as fh:
    json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))
print('wrote', out_json, round(os.path.getsize(out_json) / 1024, 1), 'KB')

# sanity print
for k in ('CHN', 'IND', 'USA', 'JPN'):
    if k in out:
        r = out[k]
        est_births = r['population'] * (r['birthRate'] or 0) / 1000 / 86400 / 365.25 if r['birthRate'] else 0
        print(k, r['population'], 'births/day~', round(est_births))
