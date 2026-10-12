
(async function () {
  const db = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_PUBLISHABLE_KEY
  );

  const section = document.createElement("section");
  section.id = "supabase-films";
  section.style.cssText =
    "padding:40px 5%;color:#fff;background:#101010;";

  section.innerHTML = `
    <h2 style="margin-bottom:24px;">YENİ EKLENEN FİLMLER</h2>
    <p id="film-status">Filmler yükleniyor...</p>
    <div id="film-list" style="
      display:grid;
      grid-template-columns:repeat(auto-fill,minmax(180px,1fr));
      gap:24px;
    "></div>
  `;

  const footer = document.querySelector("footer");
  if (footer) {
    footer.parentNode.insertBefore(section, footer);
  } else {
    document.body.appendChild(section);
  }

  const status = section.querySelector("#film-status");
  const list = section.querySelector("#film-list");

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  function getYouTubeId(value) {
    try {
      const url = new URL(value);
      if (url.hostname.includes("youtu.be")) {
        return url.pathname.slice(1).split("/")[0];
      }
      if (url.hostname.includes("youtube.com")) {
        if (url.pathname === "/watch") {
          return url.searchParams.get("v");
        }
        const parts = url.pathname.split("/");
        if (["embed", "shorts", "live"].includes(parts[1])) {
          return parts[2];
        }
      }
    } catch (_) {}
    return null;
  }

  const { data, error } = await db
    .from("movies")
    .select("id,title,youtube,genre,year,rating,poster,description,featured")
    .order("created_at", { ascending: false });

  if (error) {
    status.textContent =
      "Filmler yüklenemedi. Supabase bağlantısını ve tablo izinlerini kontrol edin.";
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    status.textContent = "Henüz panelden film eklenmedi.";
    return;
  }

  status.remove();

  list.innerHTML = data.map(function (movie) {
    const videoId = getYouTubeId(movie.youtube);
    const poster = movie.poster ||
      (videoId
        ? "https://img.youtube.com/vi/" + encodeURIComponent(videoId) + "/hqdefault.jpg"
        : "");

    return `
      <article style="
        background:#1b1b1b;
        border-radius:8px;
        overflow:hidden;
      ">
        ${poster ? `
          <img
            src="${escapeHTML(poster)}"
            alt="${escapeHTML(movie.title)}"
            loading="lazy"
            style="width:100%;aspect-ratio:16/9;object-fit:cover;"
          >
        ` : ""}
        <div style="padding:14px;">
          <h3 style="margin:0 0 8px;">${escapeHTML(movie.title)}</h3>
          <p style="color:#bbb;font-size:13px;">
            ${escapeHTML(movie.genre)}
            ${movie.year ? " · " + escapeHTML(movie.year) : ""}
            ${movie.rating ? " · ⭐ " + escapeHTML(movie.rating) : ""}
          </p>
          <p>${escapeHTML(movie.description)}</p>
          <a
            href="${escapeHTML(movie.youtube)}"
            target="_blank"
            rel="noopener noreferrer"
            style="display:inline-block;padding:9px 14px;background:#e50914;color:#fff;text-decoration:none;border-radius:4px;"
          >Filmi İzle</a>
        </div>
      </article>
    `;
  }).join("");
})();
