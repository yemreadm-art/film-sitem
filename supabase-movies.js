
(async function () {
  const container = document.createElement("section");
  container.id = "supabase-movies-section";
  container.style.cssText =
    "max-width:1200px;margin:40px auto;padding:20px;color:inherit;";

  const heading = document.createElement("h2");
  heading.textContent = "YENİ EKLENEN FİLMLER";
  heading.style.cssText = "margin-bottom:24px;";
  container.appendChild(heading);

  const list = document.createElement("div");
  list.style.cssText =
    "display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:20px;";
  container.appendChild(list);

  const status = document.createElement("p");
  status.textContent = "Filmler yükleniyor...";
  container.appendChild(status);

  document.body.appendChild(container);

  try {
    if (!window.supabase || !window.SUPABASE_URL ||
        !window.SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Supabase ayarları yüklenemedi.");
    }

    const client = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_PUBLISHABLE_KEY
    );

    const { data, error } = await client
      .from("movies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    list.replaceChildren();

    if (!data || data.length === 0) {
      status.textContent = "Henüz film eklenmemiş.";
      return;
    }

    status.remove();

    data.forEach(function (movie) {
      const card = document.createElement("article");
      card.style.cssText =
        "overflow:hidden;border-radius:10px;background:#202020;padding:12px;color:white;";

      if (movie.poster) {
        const poster = document.createElement("img");
        poster.src = movie.poster;
        poster.alt = movie.title || "Film afişi";
        poster.loading = "lazy";
        poster.style.cssText =
          "width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:6px;";
        card.appendChild(poster);
      }

      const title = document.createElement("h3");
      title.textContent = movie.title || "İsimsiz film";
      title.style.cssText = "font-size:17px;margin:12px 0 6px;";
      card.appendChild(title);

      const details = document.createElement("p");
      details.textContent =
        [movie.year, movie.genre, movie.rating ? "★ " + movie.rating : ""]
          .filter(Boolean).join(" · ");
      details.style.cssText = "font-size:13px;opacity:.8;";
      card.appendChild(details);

      if (movie.description) {
        const description = document.createElement("p");
        description.textContent = movie.description;
        description.style.cssText = "font-size:13px;line-height:1.5;";
        card.appendChild(description);
      }

      if (movie.youtube) {
        const link = document.createElement("a");
        link.href = movie.youtube;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "YouTube'da izle";
        link.style.cssText =
          "display:inline-block;margin-top:8px;color:#ff6b6b;";
        card.appendChild(link);
      }

      list.appendChild(card);
    });
  } catch (err) {
    status.textContent = "Filmler yüklenemedi: " + err.message;
    console.error("Film yükleme hatası:", err);
  }
})();
