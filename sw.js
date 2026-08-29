const CACHE = "iasmim-v2";
const ARQUIVOS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ARQUIVOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  // Navegações (páginas/HTML): SEMPRE tenta a versão mais nova na rede.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, copia));
          return res;
        })
        .catch(() => caches.match(req).then((h) => h || caches.match("./index.html")))
    );
    return;
  }

  // Arquivos do mesmo site (fotos, ícones, manifest): cache primeiro,
  // rede como reforço e atualização do cache em segundo plano.
  if (req.url.startsWith(self.location.origin)) {
    e.respondWith(
      caches.match(req).then((hit) => {
        const rede = fetch(req).then((res) => {
          const copia = res.clone();
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, copia));
          return res;
        });
        return hit || rede;
      })
    );
    return;
  }

  // Outros sites (YouTube, QR code, fontes): não guarda nada, só rede.
  e.respondWith(fetch(req).catch(() => new Response("", { status: 404 })));
});