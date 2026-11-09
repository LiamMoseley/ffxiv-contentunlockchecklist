import type { WikiPage } from "../log";

const API_URL = "https://ffxiv.consolegameswiki.com/mediawiki/api.php";
export const CONTENT_UNLOCK_PAGE = "Content_Unlock";

/** The Content Unlock page's current revision ID, without its text. */
export async function fetchContentUnlockRevisionId(fetchFn: typeof fetch = fetch): Promise<number> {
  const params = new URLSearchParams({
    action: "query",
    prop: "revisions",
    rvprop: "ids",
    titles: CONTENT_UNLOCK_PAGE,
    format: "json",
    formatversion: "2",
    origin: "*",
  });
  const response = await fetchFn(`${API_URL}?${params}`);
  if (!response.ok) throw new Error(`Wiki request failed: ${response.status}`);
  const body = (await response.json()) as { query?: { pages?: { revisions?: { revid: number }[] }[] } };
  const revisionId = body.query?.pages?.[0]?.revisions?.[0]?.revid;
  if (typeof revisionId !== "number") throw new Error("Wiki response has no revision");
  return revisionId;
}

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
