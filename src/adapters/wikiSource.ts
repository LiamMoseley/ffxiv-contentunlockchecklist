import type { WikiPage } from "../log";

const API_URL = "https://ffxiv.consolegameswiki.com/mediawiki/api.php";
export const CONTENT_UNLOCK_PAGE = "Content_Unlock";

/** Wiki source adapter: fetches the Content Unlock page through the MediaWiki API. */
export async function fetchContentUnlockPage(fetchFn: typeof fetch = fetch): Promise<WikiPage> {
  const params = new URLSearchParams({
    action: "parse",
    page: CONTENT_UNLOCK_PAGE,
    prop: "text|revid",
    format: "json",
    formatversion: "2",
    origin: "*",
  });
  const response = await fetchFn(`${API_URL}?${params}`);
  if (!response.ok) throw new Error(`Wiki request failed: ${response.status}`);
  const body = (await response.json()) as { parse?: { revid: number; text: string } };
  if (!body.parse) throw new Error("Wiki response has no parsed page");
  return { revisionId: body.parse.revid, html: body.parse.text };
}
