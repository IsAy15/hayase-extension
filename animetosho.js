const i = ["1080", "720", "540", "480"];
export default new (class {
  url = atob("aHR0cHM6Ly9mZWVkLmFuaW1ldG9zaG8ub3JnL2pzb24=");
  i({ resolution: t, exclusions: e }) {
    const r = "&qx=1&q=(multi*|multisub*)";
    if (!e?.length && !t) return r;
    const o = `!("${e.join('"|"')}")`;
    if (!t) return r + o;
    return r + o + `!(*${i.filter((i) => i !== t).join("*|*")}*)`;
  }
  map(i, t = !1, e = !1) {
    return i.map((i) => ({
      title: i.title || i.torrent_name,
      link: e ? i.torrent_url : i.magnet_uri,
      seeders: (i.seeders || 0) >= 3e4 ? 0 : i.seeders || 0,
      leechers: (i.leechers || 0) >= 3e4 ? 0 : i.leechers || 0,
      downloads: i.torrent_downloaded_count || 0,
      hash: i.info_hash,
      size: i.total_size,
      accuracy: i.anidb_fid && !t ? "high" : "medium",
      type: t ? "batch" : void 0,
      date: new Date(1e3 * i.timestamp),
    }));
  }
  async single({ anidbEid: i, resolution: t, exclusions: e }, r) {
    if (!navigator.onLine) return [];
    if (!i) throw new Error("No anidbEid provided");
    const o = this.i({ resolution: t, exclusions: e }),
      s = await fetch(this.url + "?eid=" + i + o),
      n = await s.json();
    return n.length ? this.map(n, !1, r?.useTorrent) : [];
  }
  async batch({ anidbAid: i, resolution: t, exclusions: e, episode: r }, o) {
    if (!navigator.onLine) return [];
    if (!i) throw new Error("No anidbAid provided");
    const s = this.i({ resolution: t, exclusions: e }),
      n = await fetch(this.url + "?order=size-d&aid=" + i + s),
      a = (await n.json()).filter(
        (i) => i.num_files >= Math.min(24, Math.max(2, r ?? 1)),
      );
    return a.length ? this.map(a, !0, o?.useTorrent) : [];
  }
  async movie({ anidbAid: i, resolution: t, exclusions: e }, r) {
    if (!navigator.onLine) return [];
    if (!i) throw new Error("No anidbAid provided");
    const o = this.i({ resolution: t, exclusions: e }),
      s = await fetch(this.url + "?aid=" + i + o),
      n = await s.json();
    return n.length ? this.map(n, !1, r?.useTorrent) : [];
  }
  async test() {
    try {
      if (!(await fetch(this.url)).ok)
        throw new Error(
          `Failed to load data from ${this.url}! Is the site down?`,
        );
      return !0;
    } catch (i) {
      throw new Error(
        `Could not reach ${this.url}! Does the site work in your region?`,
      );
    }
  }
})();
