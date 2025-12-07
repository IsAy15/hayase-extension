const RESOLUTIONS = ["1080", "720", "540", "480"];

export default new (class {
  url = atob(
    "aHR0cHM6Ly9jb3JzcHJveHkuaW8vP3VybD1odHRwcyUzQSUyRiUyRnRzdW5kZXJlLmFuaW1ldm9zdC5mciUyRmpzb24lMkZueWFh"
  );

  animeApiBase = "https://corsproxy.io/?https://animeapi.my.id/aniDB/";

  #normalizeResolution(value) {
    if (!value) return "";
    return String(value)
      .toLowerCase()
      .replace(/[^0-9]/g, "");
  }

  #filterItems(items, { resolution, exclusions } = {}) {
    let results = [...items];

    if (resolution && RESOLUTIONS.includes(String(resolution))) {
      const wanted = this.#normalizeResolution(resolution);
      results = results.filter((item) => {
        const fromField = this.#normalizeResolution(item.resolution);
        if (fromField) return fromField === wanted;

        const haystack =
          (item.title || "") +
          " " +
          (item.filename || "") +
          " " +
          (item.scene_filename || "");
        const match = haystack.match(/(\d{3,4})p/i);
        if (!match) return false;
        const found = this.#normalizeResolution(match[1]);
        return found === wanted;
      });
    }

    if (exclusions?.length) {
      const ex = exclusions.map((s) => s.toLowerCase());
      results = results.filter((item) => {
        const haystack = (
          (item.title || "") +
          " " +
          (item.filename || "") +
          " " +
          (item.alt_name || "")
        ).toLowerCase();

        return !ex.some((term) => haystack.includes(term));
      });
    }

    return results;
  }

  async #getMalIdFromAnidb(anidbId) {
    const id = String(anidbId).trim();
    if (!id) return null;

    const res = await fetch(this.animeApiBase + encodeURIComponent(id));
    if (!res.ok) {
      console.warn(
        `AnimeAPI request failed for AniDB ID ${id}: ${res.status} ${res.statusText}`
      );
      return null;
    }

    const data = await res.json();
    const malId = data.myanimelist;
    if (!malId && malId !== 0) return null;

    return String(malId);
  }

  async raw() {
    const res = await fetch(this.url);
    if (!res.ok) {
      throw new Error(
        `Failed to fetch Tsundere-Raws JSON feed (${res.status})`
      );
    }
    return res.json();
  }

  async feed({ resolution, exclusions } = {}) {
    const data = await this.raw();
    const items = Array.isArray(data.items) ? data.items : [];
    const filteredItems = this.#filterItems(items, { resolution, exclusions });

    return {
      ...data,
      items: filteredItems,
    };
  }

  /**
   * SINGLE ÉPISODE
   * ----------------
   * On part de :
   *  - anidbAid (anime id AniDB)
   *  - episode (numéro d’épisode)
   *
   * 1) AniDB anime id -> MAL id via AnimeAPI
   * 2) Filtre Tsundere sur malId
   * 3) Filtre Tsundere sur episode_number (ou déduit du titre/filename)
   */
  async single({ anidbAid, episode, resolution, exclusions } = {}) {
    if (!anidbAid) throw new Error("No anidbAid provided for single()");
    if (!episode && episode !== 0)
      throw new Error("No episode number provided for single()");

    const malId = await this.#getMalIdFromAnidb(anidbAid);
    if (!malId) {
      console.warn(`No MAL ID found for AniDB ID ${anidbAid}`);
      return [];
    }

    const data = await this.raw();
    const items = Array.isArray(data.items) ? data.items : [];

    // 1) Anime-level filter (MAL id)
    const byMalId = items.filter(
      (item) => String(item.malId || "").trim() === malId
    );

    // 2) Episode-level filter
    const wantedEp = String(episode).padStart(2, "0");

    const byEpisode = byMalId.filter((item) => {
      // Si l’API Tsundere fournit episode_number, on l’utilise
      if (item.episode_number != null) {
        const epField = String(item.episode_number).padStart(2, "0");
        return epField === wantedEp;
      }

      // Sinon, fallback : on essaie de parser depuis title / filename
      const haystack =
        (item.title || "") +
        " " +
        (item.filename || "") +
        " " +
        (item.scene_filename || "");

      // Très basique : récupère un nombre 1–3 chiffres
      const match = haystack.match(/\b(?:EP|E|Episode)?\s*(\d{1,3})\b/i);
      if (!match) return false;
      const parsed = String(match[1]).padStart(2, "0");
      return parsed === wantedEp;
    });

    // 3) Appliquer résolution / exclusions
    return this.#filterItems(byEpisode, { resolution, exclusions });
  }

  async batch({ anidbAid, resolution, exclusions } = {}) {
    if (!anidbAid) throw new Error("No anidbAid provided");

    const malId = await this.#getMalIdFromAnidb(anidbAid);
    if (!malId) {
      console.warn(`No MAL ID found for AniDB ID ${anidbAid}`);
      return [];
    }

    const data = await this.raw();
    const items = Array.isArray(data.items) ? data.items : [];

    const byMalId = items.filter(
      (item) => String(item.malId || "").trim() === malId
    );

    const batchLike = byMalId.filter((item) => {
      const txt = (
        (item.title || "") +
        " " +
        (item.filename || "")
      ).toLowerCase();
      return txt.includes("batch");
    });

    return this.#filterItems(batchLike, { resolution, exclusions });
  }

  async movie({ anidbAid, resolution, exclusions } = {}) {
    if (!anidbAid) throw new Error("No anidbAid provided");

    const malId = await this.#getMalIdFromAnidb(anidbAid);
    if (!malId) {
      console.warn(`No MAL ID found for AniDB ID ${anidbAid}`);
      return [];
    }

    const data = await this.raw();
    const items = Array.isArray(data.items) ? data.items : [];

    const byMalId = items.filter(
      (item) => String(item.malId || "").trim() === malId
    );

    return this.#filterItems(byMalId, { resolution, exclusions });
  }

  async test() {
    const res = await fetch(this.url);
    return res.ok;
  }
})();
