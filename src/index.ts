// for each URL in todo/toread:
// 	 fetch URL
// 	 	 from head, get author
// 	 	 from head, get title
// 	 	 from head, get keywords
// 	 	 from url and content, get type (article, book, paper, etc)
// 	 return if lite note has url metadata == URL
// 	 create note
// 	 	 using lit note template
// 	 	 title = safe($author's $title)
// 	 add metadata to note
// 	 add link to note
// 	 remove URL from todo/toread
import { RequestUrlParam } from 'obsidian';
import * as cheerio from 'cheerio';

enum SourceType {
  ARTICLE = 'article',
  PAPER = 'paper',
  BOOK = 'book',
  LIST = 'list',
  REPO = 'repo',
  TWEET = 'tweet',
  WEBSITE = 'website',
}

interface SourceMetadata {
  title: string;
  author: string | undefined;
  description: string | undefined;
  type: SourceType;
  url: string;
}

export async function fetchMetadata(
  url: string,
  fetch: (p: RequestUrlParam) => Promise<string>,
): Promise<SourceMetadata> {
  const contents = await fetch({ url });
  const $ = cheerio.load(contents);
  const canonical = getUrl($, url);
  return {
    title: getTitle($, canonical),
    author: getAuthor($, canonical),
    description: getDescription($),
    type: getType($, canonical),
    url: canonical,
  };
}

export function getTitle($: cheerio.CheerioAPI, url: string): string {
  if (/github.com/i.test(url)) {
    const match = url.match(/github.com\/([^\/]*)\/([^\/]*)/);
    if (match) {
      return match?.[2];
    }
  }
  return (
    $('meta[property="og:title"]').attr('content') ||
    $('head > title').text().trim()
  );
}

export function getAuthor(
  $: cheerio.CheerioAPI,
  url: string,
): string | undefined {
  if (/github.com/i.test(url)) {
    const match = url.match(/github.com\/([^\/]*)/);
    return match?.[1];
  }

  const meta = $('meta[name=author]')
  if (meta.length > 0) {
    return meta.attr('content')
  }

  const ldContent = $(
    'head > script[type="application/ld+json"]',
  ).text();
  if (ldContent) {
    const obj = JSON.parse(ldContent);

    if (obj['@graph']) {
      const graph = obj['@graph'];
      const article = graph?.find(
        (x: any) => x['@type'] === 'NewsArticle',
      );
      const author = graph?.find(
        (x: any) => x['@id'] == article?.author?.['@id'],
      );
      if (author) {
        return author.name;
      }
    }

    if (obj['@type'] === 'Article' && obj.author) {
      return obj.author.name;
    }
  }

  if ($('[rel=author]').length > 0) {
    return $('[rel=author]').text().trim();
  }

  return undefined;
}

export function getDescription(
  $: cheerio.CheerioAPI,
): string | undefined {
  return (
    $('meta[name=description]').attr('content') ||
    $('meta[property="og:description"]').attr('content')
  );
}

export function getUrl($: cheerio.CheerioAPI, url: string): string {
  return (
    $('head > link[rel=canonical]').attr('href') ||
    $('head > meta[property="og:url"]').attr('content') ||
    url
  );
}

export function getType(
  $: cheerio.CheerioAPI,
  url: string,
): SourceType {
  switch (true) {
    case /news.ycombinator/i.test(url):
    case /reddit.com/i.test(url):
      return SourceType.LIST;
    case /amazon\.(com|ca)/i.test(url):
      return SourceType.BOOK;
    case /github.com/i.test(url):
      return SourceType.REPO;
    case /twitter.com/i.test(url):
      return SourceType.TWEET;
    case $('meta[property="og:type"]').length > 0:
      return $('meta[property="og:type"]').attr('content') as SourceType;
    default:
      return SourceType.WEBSITE;
  }
}
