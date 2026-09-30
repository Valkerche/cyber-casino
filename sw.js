/* 赛博赌场 · 离线缓存 Service Worker
 * 策略：联网时优先走网络（有更新立刻生效），断网时回退到缓存。
 * 改版本号（CACHE 里的 v1）可以强制换新缓存。
 */
var CACHE = 'casino-v1';
var ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ASSETS)['catch'](function () {});
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;      // 外部资源一律不拦

  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.status === 200 && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy)['catch'](function () {}); });
      }
      return res;
    })['catch'](function () {
      return caches.match(req).then(function (hit) {
        if (hit) return hit;
        if (req.mode === 'navigate') {
          return caches.match('./index.html').then(function (page) {
            return page || new Response('离线，且没有缓存到页面', { status: 504, statusText: 'Offline' });
          });
        }
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    })
  );
});
