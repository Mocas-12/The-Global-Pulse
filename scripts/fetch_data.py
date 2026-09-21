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

# ---------- 3. Populated places (pulse clustering weights) ----------
print('== Downloading populated places (Natural Earth 10m) ==')
PLACES_URLS = [
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places_simple.geojson',
    'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_10m_populated_places_simple.geojson',
]
places_raw = None
for u in PLACES_URLS:
    try:
        places_raw = http_get(u)
        print('OK', u, len(places_raw) // 1024, 'KB')
        break
    except Exception as e:  # noqa: BLE001
        print('FAIL', u, e)
if places_raw is not None:
    pf = json.loads(places_raw.decode('utf-8'))
    ISO_ALIAS = {'KOS': 'XKX'}
    rows = []
    for f in pf.get('features', []):
        p = f.get('properties') or {}
        iso = p.get('adm0_a3') or p.get('adm0_a3_us') or ''
        iso = ISO_ALIAS.get(iso, iso)
        pop = p.get('pop_max') or p.get('pop_other') or 0
        geom = f.get('geometry') or {}
        coords = (geom.get('coordinates') or [None, None])[:2]
        if iso and pop and isinstance(coords[0], (int, float)):
            rows.append([iso, round(coords[0], 2), round(coords[1], 2), float(pop)])
    rows.sort(key=lambda r: -r[3])
    out_places = os.path.join(ROOT, 'public', 'datasets', 'populatedPlaces.json')
    with open(out_places, 'w', encoding='utf-8') as fh:
        json.dump(rows, fh, ensure_ascii=False, separators=(',', ':'))
    print('wrote', out_places, round(os.path.getsize(out_places) / 1024, 1), 'KB,', len(rows), 'cities')
else:
    print('WARN: populated places unavailable; pulse clustering disabled')

# ---------- 4. UN WPP historical series 1950-2023 (time axis, via OWID) ----------
print('== Downloading UN WPP historical series (OWID grapher) ==')
IND2 = {
    'population': 'p',
    'crude-birth-rate': 'b',
    'crude-death-rate': 'd',
}
YEAR_MIN, YEAR_MAX = 1950, 2023
# 只保留本项目会渲染的 ISO3(世界银行覆盖 + Natural Earth 要素), 减小体积
ne_isos = set()
for f in geo.get('features', []):
    p = f.get('properties') or {}
    iso = p.get('ISO_A3_EH') if p.get('ISO_A3_EH') not in (None, '-99') else p.get('ADM0_A3')
    if iso:
        ne_isos.add(ISO_ALIAS.get(iso, iso))
valid_iso = set(out.keys()) | ne_isos
series = {}
for slug, kind in IND2.items():
    print('== OWID', slug, '==')
    url = f'https://ourworldindata.org/grapher/{slug}.csv'
    raw = http_get(url).decode('utf-8')
    lines = raw.splitlines()
    header = lines[0].split(',')
    code_i, year_i = header.index('Code'), header.index('Year')
    val_i = 3  # 第四列为数值
    n = 0
    for line in lines[1:]:
        cols = line.split(',')
        if len(cols) <= val_i:
            continue
        code = cols[code_i]
        if code == 'OWID_KOS':
            code = 'XKX'
        if code not in valid_iso:
            continue
        try:
            year = int(cols[year_i])
            val = float(cols[val_i])
        except ValueError:
            continue
        if year < YEAR_MIN or year > YEAR_MAX:
            continue
        rec = series.setdefault(code, {})
        arr = rec.setdefault(kind, [])
        if not arr or arr[-1][0] < year:
            arr.append([year, round(val, 3)])
            n += 1
    print('  rows kept:', n)

# population CSV 的数值是整数, 统一成整数减体积
for rec in series.values():
    if rec.get('p'):
        rec['p'] = [[y, int(round(v))] for y, v in rec['p']]

out_series = os.path.join(ROOT, 'public', 'datasets', 'unSeries.json')
with open(out_series, 'w', encoding='utf-8') as fh:
    json.dump(series, fh, ensure_ascii=False, separators=(',', ':'))
print('wrote', out_series, round(os.path.getsize(out_series) / 1024, 1), 'KB,', len(series), 'countries')
chn = series.get('CHN', {})
if chn.get('p') and chn.get('b'):
    y0 = chn['p'][0]
    print('sanity CHN:', y0[0], y0[1], 'cbr', chn['b'][0])
