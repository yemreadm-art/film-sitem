
(function () {
  "use strict";

  const TABLO = "movie_watch_presence";
  const AKTIFLIK_MS = 90 * 1000;
  const YENILEME_MS = 25 * 1000;

  let istemci = null;
  let kanal = null;
  let aktifFilm = null;
  let oturumId = "";

  function kimlikOlustur() {
    try {
      let id = sessionStorage.getItem("bengusflix_watch_session");
      if (!id) {
        id = crypto.randomUUID
          ? crypto.randomUUID()
          : "oturum-" + Date.now() + "-" +
            Math.random().toString(36).slice(2);
        sessionStorage.setItem("bengusflix_watch_session", id);
      }
      return id;
    } catch (_) {
      return "oturum-" + Date.now() + "-" +
        Math.random().toString(36).slice(2);
    }
  }

  function supabaseBaglan() {
    if (istemci) return istemci;

    if (
      !window.supabase ||
      !window.SUPABASE_URL ||
      !window.SUPABASE_PUBLISHABLE_KEY
    ) {
      throw new Error("Supabase yapılandırması bulunamadı.");
    }

    istemci = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_PUBLISHABLE_KEY
    );
    return istemci;
  }

  function takmaAd() {
    try {
      const ad = localStorage.getItem("bengusflix_chat_nickname");
      return (ad || "").trim().slice(0, 30) || "İzleyici";
    } catch (_) {
      return "İzleyici";
    }
  }

  async function kaydiGuncelle() {
    if (!aktifFilm || document.visibilityState === "hidden") return;

    const kayit = {
      session_id: oturumId,
      movie_id: String(aktifFilm.id),
      movie_title: String(aktifFilm.title).slice(0, 200),
      nickname: takmaAd(),
      last_seen: new Date().toISOString()
    };

    const { error } = await supabaseBaglan()
      .from(TABLO)
      .upsert(kayit, { onConflict: "session_id" });

    if (error) {
      console.warn("İzleyici bilgisi güncellenemedi:", error.message);
    }
  }

  async function oturumuKapat() {
    if (!istemci || !oturumId) return;
    try {
      await istemci.from(TABLO).delete().eq("session_id", oturumId);
    } catch (_) {}
  }

  function filmIzlemeyiBaslat(filmId, filmBaslik) {
    aktifFilm = {
      id: String(filmId),
      title: String(filmBaslik || "İsimsiz film")
    };

    kaydiGuncelle();
    clearInterval(window.__bengusflixPresenceTimer);
    window.__bengusflixPresenceTimer =
      setInterval(kaydiGuncelle, YENILEME_MS);
  }

  async function aktifIzleyicileriYukle() {
    const alan = document.getElementById("canli-izleyiciler");
    const durum = document.getElementById("canli-izleyici-durum");
    if (!alan) return;

    try {
      const db = supabaseBaglan();
      const sinir = new Date(Date.now() - AKTIFLIK_MS).toISOString();

      const { data, error } = await db
        .from(TABLO)
        .select("session_id,movie_id,movie_title,nickname,last_seen")
        .gt("last_seen", sinir)
        .order("last_seen", { ascending: false });

      if (error) throw error;

      const filmler = new Map();

      (data || []).forEach(function (izleyici) {
        const id = String(izleyici.movie_id);
        if (!filmler.has(id)) {
          filmler.set(id, {
            id: id,
            title: izleyici.movie_title || "İsimsiz film",
            viewers: []
          });
        }

        const film = filmler.get(id);
        if (!film.viewers.some(v => v.session_id === izleyici.session_id)) {
          film.viewers.push({
            session_id: izleyici.session_id,
            nickname: izleyici.nickname || "İzleyici"
          });
        }
      });

      alan.replaceChildren();

      if (!filmler.size) {
        const bos = document.createElement("p");
        bos.className = "canli-bos";
        bos.textContent =
          "Şu anda izleyen görünmüyor. İlk filmi sen aç! 🍿";
        alan.appendChild(bos);
      } else {
        filmler.forEach(function (film) {
          const kart = document.createElement("article");
          kart.className = "canli-film-karti";

          const baslik = document.createElement("h3");
          baslik.className = "canli-film-adi";
          baslik.textContent = film.title;

          const sayi = document.createElement("p");
          sayi.className = "canli-film-sayi";
          sayi.textContent =
            "🔴 " + film.viewers.length + " kişi izliyor";

          const isimler = document.createElement("div");
          isimler.className = "canli-isimler";

          film.viewers.forEach(function (izleyici) {
            const etiket = document.createElement("span");
            etiket.className = "canli-isim";
            etiket.textContent = izleyici.nickname;
            isimler.appendChild(etiket);
          });

          const baglanti = document.createElement("a");
          baglanti.className = "canli-filme-git";
          baglanti.href = "./watch.html?id=" +
            encodeURIComponent(film.id);
          baglanti.textContent = "Filmi aç →";

          kart.append(baslik, sayi, isimler, baglanti);
          alan.appendChild(kart);
        });
      }

      if (durum) {
        durum.textContent =
          (data || []).length + " aktif izleyici kaydı güncellendi.";
      }
    } catch (error) {
      console.error("Canlı izleyiciler yüklenemedi:", error);
      if (durum) {
        durum.textContent =
          "İzleyici listesi yüklenemedi. Supabase tablo ve izinlerini kontrol et.";
      }
    }
  }

  function anaSayfayiBaslat() {
    const alan = document.getElementById("canli-izleyiciler");
    if (!alan) return;

    aktifIzleyicileriYukle();

    try {
      kanal = supabaseBaglan()
        .channel("bengusflix-watch-presence")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: TABLO
          },
          aktifIzleyicileriYukle
        )
        .subscribe();
    } catch (error) {
      console.warn("Canlı güncelleme başlatılamadı:", error);
    }

    window.__bengusflixPresenceRefresh =
      setInterval(aktifIzleyicileriYukle, YENILEME_MS);
  }

  oturumId = kimlikOlustur();

  window.BengusPresence = {
    start: filmIzlemeyiBaslat,
    refreshNickname: kaydiGuncelle
  };

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      kaydiGuncelle();
    }
  });

  window.addEventListener("pagehide", oturumuKapat);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", anaSayfayiBaslat);
  } else {
    anaSayfayiBaslat();
  }
})();
