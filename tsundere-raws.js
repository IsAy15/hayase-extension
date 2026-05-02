const RESOLUTIONS = ["1080", "720", "540", "480"];

export default new (class {
  url = atob("aHR0cHM6Ly9ueWFhLnNpLz9wYWdlPXJzcz91PVRzdW5kZXJlLVJhd3M=");

  #normalizeResolution(value) {
    if (!value) return "";
    return String(value)
      .toLowerCase()
      .replace(/[^0-9]/g, "");
  }

  #normalizeText(value) {
    return String(value || "").toLowerCase();
  }

  #getTagText(node, tagName) {
    return (
      node.getElementsByTagNameNS("*", tagName)[0]?.textContent?.trim() || ""
    );
  }

  #parseSize(sizeText) {
    const match = String(sizeText || "")
      .trim()
      .match(/^([\d.]+)\s*(B|KiB|MiB|GiB|TiB)$/i);
    if (!match) return 0;

    const value = Number(match[1]);
    if (!Number.isFinite(value)) return 0;

    const unit = match[2].toLowerCase();
    const factors = {
      b: 1,
      kib: 1024,
      mib: 1024 ** 2,
      gib: 1024 ** 3,
      tib: 1024 ** 4,
    };

    return Math.round(value * (factors[unit] || 1));
  }

  #parseItemsFromXml(xmlText) {
    const document = new DOMParser().parseFromString(
      xmlText,
      "application/xml",
    );
    if (document.querySelector("parsererror")) {
      throw new Error("Failed to parse Tsundere-Raws RSS feed");
    }

    return [...document.getElementsByTagName("item")].map((node) => {
      const title = this.#getTagText(node, "title");
      const link = this.#getTagText(node, "link");
      const guid = this.#getTagText(node, "guid");
      const description = this.#getTagText(node, "description");
      const sizeText = this.#getTagText(node, "size");
      const pubDateText = this.#getTagText(node, "pubDate");
      const infoHash = this.#getTagText(node, "infoHash");

      return {
        title,
        link,
        guid,
        seeders: Number(this.#getTagText(node, "seeders")) || 0,
        leechers: Number(this.#getTagText(node, "leechers")) || 0,
        downloads: Number(this.#getTagText(node, "downloads")) || 0,
        hash: infoHash || "",
        size: this.#parseSize(sizeText),
        accuracy: "medium",
        date: pubDateText ? new Date(pubDateText) : new Date(0),
        description,
      };
    });
  }

  #filterItems(items, { resolution, exclusions } = {}) {
    let results = [...items];

    if (resolution && RESOLUTIONS.includes(String(resolution))) {
      const wanted = this.#normalizeResolution(resolution);
      results = results.filter((item) => {
        const fromField = this.#normalizeResolution(item.resolution);
        if (fromField) return fromField === wanted;

        const haystack = `${item.title || ""} ${item.link || ""} ${item.description || ""}`;
        const match = haystack.match(/(\d{3,4})p/i);
        if (!match) return false;

        return this.#normalizeResolution(match[1]) === wanted;
      });
    }

    if (exclusions?.length) {
      const terms = exclusions.map((value) => this.#normalizeText(value));
      results = results.filter((item) => {
        const haystack = this.#normalizeText(
          `${item.title || ""} ${item.link || ""} ${item.description || ""}`,
        );
        return !terms.some((term) => haystack.includes(term));
      });
    }

    return results;
  }

  #matchesAnyTitle(item, titles = []) {
    if (!titles.length) return false;

    const haystack = this.#normalizeText(
      `${item.title || ""} ${item.description || ""} ${item.guid || ""}`,
    );

    return titles.some((title) => {
      const normalized = this.#normalizeText(title).trim();
      return normalized && haystack.includes(normalized);
    });
  }

  #matchesEpisode(item, episode) {
    const wanted = String(episode).padStart(2, "0");
    const haystack = `${item.title || ""} ${item.description || ""}`;
    const patterns = [
      /\bS\d{1,2}E(\d{1,3})\b/i,
      /\bE(?:P|pisode)?\s*(\d{1,3})\b/i,
      /\b(?:EP|Episode)\s*(\d{1,3})\b/i,
    ];

    for (const pattern of patterns) {
      const match = haystack.match(pattern);
      if (match && String(match[1]).padStart(2, "0") === wanted) {
        return true;
      }
    }

    return false;
  }

  #isBatchLike(item) {
    const haystack = this.#normalizeText(
      `${item.title || ""} ${item.description || ""}`,
    );
    return haystack.includes("batch") || haystack.includes("complete");
  }

  async raw() {
    const res = await fetch(this.url);
    if (!res.ok) {
      throw new Error(`Failed to fetch Tsundere-Raws RSS feed (${res.status})`);
    }

    const xmlText = await res.text();
    return {
      items: this.#parseItemsFromXml(xmlText),
    };
  }

  async feed({ resolution, exclusions } = {}) {
    const data = await this.raw();
    const filteredItems = this.#filterItems(data.items, {
      resolution,
      exclusions,
    });

    return {
      ...data,
      items: filteredItems,
    };
  }

  async single({ titles = [], episode, resolution, exclusions } = {}) {
    if (!episode && episode !== 0) {
      throw new Error("No episode number provided for single()");
    }

    if (!titles.length) {
      return [];
    }

    const data = await this.raw();
    const items = data.items.filter((item) =>
      this.#matchesAnyTitle(item, titles),
    );
    const byEpisode = items.filter((item) =>
      this.#matchesEpisode(item, episode),
    );

    return this.#filterItems(byEpisode, { resolution, exclusions });
  }

  async batch({ titles = [], resolution, exclusions } = {}) {
    if (!titles.length) {
      return [];
    }

    const data = await this.raw();
    const items = data.items.filter((item) =>
      this.#matchesAnyTitle(item, titles),
    );
    const batchLike = items.filter((item) => this.#isBatchLike(item));

    return this.#filterItems(batchLike, { resolution, exclusions });
  }

  async movie({ titles = [], resolution, exclusions } = {}) {
    if (!titles.length) {
      return [];
    }

    const data = await this.raw();
    const items = data.items.filter((item) =>
      this.#matchesAnyTitle(item, titles),
    );

    return this.#filterItems(items, { resolution, exclusions });
  }

  async test() {
    const res = await fetch(this.url);
    return res.ok;
  }
})();
