import AbstractSource from "./abstract.js";

function getTsundereUrl() {
  // URL d'origine encodée
  const origin = atob("aHR0cHM6Ly90c3VuZGVyZS5hbmltZXZvc3QuZnIvanNvbi9ueWFh");
  // URL proxy encodée
  const proxy = atob(
    "aHR0cHM6Ly9jb3JzcHJveHkuaW8vP3VybD1odHRwcyUzQSUyRiUyRnRzdW5kZXJlLmFuaW1ldm9zdC5mciUyRmpzb24lMkZueWFh"
  );
  // Si on est dans Node.js, utilise l'URL d'origine, sinon toujours le proxy
  if (
    typeof process !== "undefined" &&
    process.versions &&
    process.versions.node
  ) {
    return origin;
  }
  return proxy;
}

export default new (class TsundereRaws extends AbstractSource {
  url = getTsundereUrl();

  /**
   * @param {any[]} entries
   * @returns {import('./').TorrentResult[]}
   **/
  map(entries) {
    return entries.map((entry) => ({
      title: entry.title || entry.name || entry.alt_name,
      link: entry.link, // lien nyaa
      seeders: 0, // non fourni
      leechers: 0, // non fourni
      downloads: 0, // non fourni
      hash: entry.filename || entry.scene_filename,
      size: undefined, // non fourni
      accuracy: "medium",
      date: entry.pubDateUnix ? new Date(entry.pubDateUnix * 1000) : undefined,
      resolution: entry.resolution,
      episode: entry.episode_number,
      season: entry.episode_season,
      malId: entry.malId,
      platform: entry.platform,
      team: entry.team,
      subtitles: entry.subtitles_lang,
      dubbing: entry.dubbing_lang,
    }));
  }

  /** @type {import('./').SearchFunction} */
  async single({ malId, titles, resolution, episode, season }) {
    console.log("[tsundere-raws] URL utilisée pour fetch:", this.url);
    let res, data;
    try {
      res = await fetch(this.url);
      data = await res.json();
    } catch (e) {
      console.error("[tsundere-raws] Erreur fetch:", e);
      throw new Error(
        "Erreur réseau ou CORS lors de la récupération des données Tsundere-Raws."
      );
    }
    let filtered = data.items;
    if (malId) filtered = filtered.filter((e) => e.malId == malId);
    if (titles?.length)
      filtered = filtered.filter((e) =>
        titles.some(
          (t) =>
            e.title?.includes(t) ||
            e.name?.includes(t) ||
            e.alt_name?.includes(t)
        )
      );
    if (resolution)
      filtered = filtered.filter((e) => e.resolution === resolution);
    if (episode) filtered = filtered.filter((e) => e.episode_number == episode);
    if (season) filtered = filtered.filter((e) => e.episode_season == season);
    return this.map(filtered);
  }

  /** @type {import('./').SearchFunction} */
  async batch(opts) {
    return this.single(opts);
  }

  /** @type {import('./').SearchFunction} */
  async movie(opts) {
    return this.single(opts);
  }

  async test() {
    try {
      const res = await fetch(this.url);
      return res.ok;
    } catch (e) {
      console.error("[tsundere-raws] Erreur fetch test:", e);
      return false;
    }
  }
})();
