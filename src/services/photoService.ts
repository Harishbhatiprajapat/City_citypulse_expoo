import type { PlacePhoto } from '@/types';

// In-memory cache for photos to minimize API calls and respect rate limits
const photoCache = new Map<string, PlacePhoto[]>();

/**
 * Fetches real photographs from Wikimedia Commons and Wikipedia APIs.
 * Complies with user requirement:
 * - Genuine photographs from legitimate sources (Wikimedia Commons / Wikipedia)
 * - Do not scrape Google Maps
 * - Do not fabricate photographs or display unrelated images
 * - Returns empty array gracefully if no photograph is found
 */
export async function fetchPlacePhotos(
  placeName: string,
  city = '',
  extratags?: Record<string, string>,
  signal?: AbortSignal
): Promise<PlacePhoto[]> {
  const cleanName = placeName
    .replace(/\(.*?\)/g, '')
    .replace(/[^\w\s\u0900-\u097F]/gi, ' ')
    .trim();

  if (!cleanName || cleanName.length < 2) return [];

  const cacheKey = `${cleanName.toLowerCase()}_${city.toLowerCase()}`;
  if (photoCache.has(cacheKey)) {
    return photoCache.get(cacheKey)!;
  }

  const results: PlacePhoto[] = [];

  // Strategy 1: Check OpenStreetMap direct image or wikimedia_commons tag
  if (extratags?.image && extratags.image.startsWith('http')) {
    results.push({
      url: extratags.image,
      thumbnailUrl: extratags.image,
      title: placeName,
      attribution: 'OpenStreetMap Contributor / Direct Reference',
      license: 'CC-BY-SA / Public Domain',
      sourceUrl: extratags.image,
    });
  }

  // Strategy 2: If OSM has a wikipedia tag (e.g., "en:Hawa Mahal" or "hi:हवा महल")
  const wikiTag = extratags?.wikipedia || extratags?.wikidata;
  let targetWikiTitle = '';
  if (wikiTag && wikiTag.includes(':')) {
    targetWikiTitle = wikiTag.split(':')[1];
  } else if (wikiTag) {
    targetWikiTitle = wikiTag;
  }

  try {
    // If we have a specific Wikipedia title from OSM tags, use it
    if (targetWikiTitle) {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
        targetWikiTitle
      )}&prop=pageimages|imageinfo&piprop=original|thumbnail&pithumbsize=640&format=json&origin=*`;

      const res = await fetch(wikiUrl, { signal });
      if (res.ok) {
        const data = await res.json();
        const pages = data.query?.pages;
        if (pages) {
          for (const key of Object.keys(pages)) {
            const page = pages[key];
            if (page.thumbnail || page.original) {
              results.push({
                url: page.original?.source || page.thumbnail?.source,
                thumbnailUrl: page.thumbnail?.source || page.original?.source,
                title: page.title || placeName,
                attribution: 'Wikimedia Commons / Wikipedia',
                license: 'Creative Commons / Wikimedia Foundation',
                sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title || targetWikiTitle)}`,
              });
            }
          }
        }
      }
    }

    // Strategy 3: Search Wikipedia API with place name + city if no photo found yet
    if (results.length === 0) {
      const searchTerms = [
        `${cleanName} ${city}`.trim(),
        cleanName,
      ];

      for (const query of searchTerms) {
        if (results.length > 0) break;

        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
          query
        )}&gsrlimit=3&prop=pageimages&piprop=original|thumbnail&pithumbsize=640&format=json&origin=*`;

        const searchRes = await fetch(searchUrl, { signal });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const pages = searchData.query?.pages;
          if (pages) {
            for (const key of Object.keys(pages)) {
              const page = pages[key];
              if (page.thumbnail?.source) {
                // Verify title relevance to avoid unrelated random article matches
                const titleLower = (page.title || '').toLowerCase();
                const nameWords = cleanName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
                const hasOverlap = nameWords.some(w => titleLower.includes(w)) || titleLower.includes(city.toLowerCase());

                if (hasOverlap) {
                  results.push({
                    url: page.original?.source || page.thumbnail.source,
                    thumbnailUrl: page.thumbnail.source,
                    title: page.title,
                    attribution: `Wikimedia Commons / Wikipedia (${page.title})`,
                    license: 'Creative Commons Attribution-ShareAlike',
                    sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
                  });
                }
              }
            }
          }
        }
      }
    }
  } catch {
    // Fail gracefully: network error or aborted request. Never crash or fabricate images.
  }

  // Deduplicate results
  const uniqueUrls = new Set<string>();
  const finalPhotos = results.filter((p) => {
    if (uniqueUrls.has(p.url)) return false;
    uniqueUrls.add(p.url);
    return true;
  });

  photoCache.set(cacheKey, finalPhotos);
  return finalPhotos;
}
