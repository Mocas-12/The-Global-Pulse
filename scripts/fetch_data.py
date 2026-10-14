# -*- coding: utf-8 -*-
"""Fetch real world data for The-Global-Pulse:
Natural Earth admin_0 countries GeoJSON (full boundaries)
Output:
  public/datasets/countries.geojson  (real boundaries)
"""
import ipaddress
import json
import sys
import time
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent

# 服务端请求防线：数据源全部为常量官方域名，收紧为白名单
_ALLOWED_HOSTS = frozenset({
    'raw.githubusercontent.com',
    'cdn.jsdelivr.net',
})


def _assert_public_url(url):
    """请求前校验：协议白名单 + 域名白名单 + DNS 解析后 IP 必须公网。

    覆盖环回/私网/链路本地/保留地址；重定向经 _SafeRedirect 逐跳复检。
    """
    u = urlsplit(url)
    if u.scheme not in ('http', 'https'):
        raise ValueError(f'仅允许 http/https 数据源: {url}')
    host = (u.hostname or '').strip('[]').lower()
    if not host:
        raise ValueError(f'URL 缺少主机名: {url}')
    if host not in _ALLOWED_HOSTS:
        raise ValueError(f'数据源域名不在白名单: {host}')
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        pass  # 域名走解析校验
    else:
        if not ip.is_global:
            raise ValueError(f'非公网 IP 被拒: {url}')
        return url
    try:
        infos = socket.getaddrinfo(
            host, u.port or (443 if u.scheme == 'https' else 80), proto=socket.IPPROTO_TCP
        )
    except OSError as exc:
        raise ValueError(f'域名解析失败: {host}: {exc}') from exc
    for _, _, _, _, sockaddr in infos:
        if not ipaddress.ip_address(sockaddr[0]).is_global:
            raise ValueError(f'{host} 解析到非公网地址: {sockaddr[0]}')
    return url


class _SafeRedirect(urllib.request.HTTPRedirectHandler):
    """重定向逐跳复检：跳转目标也必须过白名单与公网校验。"""

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: D102
        _assert_public_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_OPENER = urllib.request.build_opener(_SafeRedirect)


def http_get(url, retries=3):
    _assert_public_url(url)
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (data-fetch script)'})
            with _OPENER.open(req, timeout=60) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2 * (i + 1))
    raise RuntimeError(f'failed to GET {url}: {last}')


# ---------- Country boundaries ----------
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
keep = [k for k in keep_candidates if k in sample]
slim = {'type': 'FeatureCollection', 'features': [
    {'type': 'Feature', 'properties': {k: f['properties'].get(k) for k in keep},
     'geometry': f['geometry']} for f in feats]}
geo_out = (ROOT / 'public' / 'datasets' / 'countries.geojson').resolve()
assert str(geo_out).startswith(str(ROOT) + __import__('os').sep), f'输出越出项目根: {geo_out}'
geo_out.parent.mkdir(parents=True, exist_ok=True)
with geo_out.open('w', encoding='utf-8') as fh:
    json.dump(slim, fh, ensure_ascii=False, separators=(',', ':'))
print('wrote', geo_out, round(geo_out.stat().st_size / 1048576, 2), 'MB')
