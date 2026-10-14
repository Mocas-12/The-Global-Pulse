# -*- coding: utf-8 -*-
"""Fetch live layers for The-Global-Pulse (designed for an hourly CI job):
1. OpenSky global aircraft snapshot -> public/datasets/flights.json
   (客户端用 track/gs 航位推算逐秒外推, 快照每小时刷新一次)
2. Abuse.ch FeodoTracker C2 + OpenPhish 钓鱼 -> ip-api 地理定位
   -> public/datasets/threats.json

零密钥; 输出直接提交进仓库, 由 GitHub Pages 部署。
"""
import ipaddress
import json
import socket
import sys
import time
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit, urlparse

ROOT = Path(__file__).resolve().parent.parent

_ALLOWED_HOSTS = frozenset({
    'opensky-network.org',
    'feodotracker.abuse.ch',
    'openphish.com',
    'ip-api.com',
    'raw.githubusercontent.com',
})


def _assert_public_url(url):
    u = urlsplit(url)
    if u.scheme not in ('http', 'https'):
        raise ValueError(f'仅允许 http/https 数据源: {url}')
    host = (u.hostname or '').strip('[]').lower()
    if not host or host not in _ALLOWED_HOSTS:
        raise ValueError(f'数据源域名不在白名单: {host}')
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        if not ip.is_global:
            raise ValueError(f'非公网 IP 被拒: {url}')
        return url
    try:
        infos = socket.getaddrinfo(host, u.port or 80, proto=socket.IPPROTO_TCP)
    except OSError as exc:
        raise ValueError(f'域名解析失败: {host}: {exc}') from exc
    for _, _, _, _, sockaddr in infos:
        if not ipaddress.ip_address(sockaddr[0]).is_global:
            raise ValueError(f'{host} 解析到非公网地址: {sockaddr[0]}')
    return url


def http_get(url, retries=2, timeout=45):
    _assert_public_url(url)
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (data-fetch script)'})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2)
    raise RuntimeError(f'failed to GET {url}: {last}')


def write_json(rel, payload):
    out = (ROOT / rel).resolve()
    assert str(out).startswith(str(ROOT) + os.sep), f'输出越出项目根: {out}'
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open('w', encoding='utf-8') as fh:
        json.dump(payload, fh, ensure_ascii=False, separators=(',', ':'))
    print('wrote', rel, round(out.stat().st_size / 1024, 1), 'KB')


import os  # noqa: E402

# ---------- 1. OpenSky 全球航班快照 ----------
print('== OpenSky global snapshot ==')
flights_payload = None
try:
    raw = http_get('https://opensky-network.org/api/states/all', timeout=60)
    data = json.loads(raw.decode('utf-8'))
    states = data.get('states') or []
    flights = []
    # states: [icao24, callsign, origin_country, time_position, last_contact,
    #          lon, lat, baro_alt, on_ground, velocity(m/s), true_track(deg), ...]
    for st in states:
        try:
            if st[8]:  # on_ground
                continue
            lon, lat = st[5], st[6]
            if lat is None or lon is None:
                continue
            flights.append({
                'lat': round(lat, 3),
                'lng': round(lon, 3),
                'alt': st[7] or st[13] or 0,
                'track': round(st[10] or 0, 1),
                'gs': round(st[9] or 0, 1),  # m/s
                'cs': (st[1] or '').strip(),
                'cc': st[2] or '',
            })
        except (IndexError, TypeError):
            continue
    # 全球全量太大(1.1 万), 抽样上限 2000 保持流畅
    if len(flights) > 2000:
        step = len(flights) / 2000
        flights = [flights[int(i * step)] for i in range(2000)]
    flights_payload = {'fetchedAt': int(time.time() * 1000), 'flights': flights}
    print('aircraft kept:', len(flights))
except Exception as e:  # noqa: BLE001
    print('WARN: OpenSky unavailable:', e)

if flights_payload:
    write_json('public/datasets/flights.json', flights_payload)
else:
    print('WARN: keep previous flights.json')

# ---------- 2. 网络威胁: FeodoTracker C2 + OpenPhish 钓鱼 ----------
print('== Cyber threats ==')
ips = {}  # ip -> {kind, name}

try:
    raw = http_get('https://feodotracker.abuse.ch/downloads/ipblocklist.json', timeout=30)
    blocklist = json.loads(raw.decode('utf-8'))
    for item in blocklist[:400]:
        ip = item.get('ip_address')
        if ip:
            ips[ip] = {'kind': 'c2', 'name': item.get('malware') or 'C2'}
    print('feodo ips:', len(ips))
except Exception as e:  # noqa: BLE001
    print('WARN: feodotracker unavailable:', e)

try:
    raw = http_get('https://openphish.com/feed.txt', timeout=30)
    import socket as sk
    count = 0
    for line in raw.decode('utf-8').splitlines():
        if count >= 120:
            break
        url = line.strip().split(' ')[0]
        if not url.startswith('http'):
            continue
        host = urlparse(url).hostname or ''
        if not host:
            continue
        try:
            ip = sk.gethostbyname(host)
            if ip and ip not in ips:
                ips[ip] = {'kind': 'phish', 'name': host[:60]}
                count += 1
        except OSError:
            continue
    print('phish ips:', count)
except Exception as e:  # noqa: BLE001
    print('WARN: openphish unavailable:', e)

if ips:
    # ip-api batch 地理定位(免费端点仅 http, 服务端调用可接受)
    targets = list(ips.keys())[:500]
    points = []
    for i in range(0, len(targets), 100):
        chunk = targets[i:i + 100]
        payload = json.dumps([{'query': ip, 'fields': 'status,country,lat,lon'} for ip in chunk]).encode()
        try:
            req = urllib.request.Request('http://ip-api.com/batch', data=payload,
                                         headers={'Content-Type': 'application/json'})
            res = json.loads(urllib.request.urlopen(req, timeout=30).read().decode('utf-8'))
            for ip, meta in zip(chunk, res):
                if meta.get('status') == 'success':
                    info = ips[ip]
                    points.append({
                        'lat': meta['lat'], 'lng': meta['lon'],
                        'kind': info['kind'], 'name': info['name'], 'cc': meta.get('country', ''),
                    })
        except Exception as e:  # noqa: BLE001
            print('WARN: ip-api batch failed:', e)
        time.sleep(1)
    threats = {'updated': int(time.time() * 1000), 'points': points}
    print('threat points:', len(points))
    write_json('public/datasets/threats.json', threats)
else:
    print('WARN: keep previous threats.json')
