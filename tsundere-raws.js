import AbstractSource from "./abstract.js";

export default new (class TsundereRaws extends AbstractSource {
  url = atob("aHR0cHM6Ly90c3VuZGVyZS5hbmltZXZvc3QuZnIvanNvbi9ueWFh");

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
    const res = await fetch(this.url);
    const data = await res.json();
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
    const res = await fetch(this.url);
    return res.ok;
  }
})();
