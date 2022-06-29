import { RequestUrlParam, Vault } from 'obsidian';
import * as cheerio from 'cheerio';
import { PluginSettings } from './constants';

export enum SourceType {
  ARTICLE = 'article',
  PAPER = 'paper',
  BOOK = 'book',
  LIST = 'list',
  COMMENTS = 'comments',
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
  canonical: string;
}

export enum Result {
  Ok = 'Ok',
  Err = 'Err',
}

export async function processEntry(
  meta: SourceMetadata,
  vault: Vault,
  settings: PluginSettings,
): Promise<Result> {
  try {
    await vault.create(
      `${settings.distFolder}/${getNoteTitle(meta)}.md`,
      toNote(meta),
    );
    return Result.Ok;
  } catch (e) {
    return Result.Err;
  }
}

function zip<T>(a: string[], b: T[]): [string, T][] {
  let result: [string, T][] = [];
  for (let i = 0; i < a.length; i++) {
    result.push([a[i], b[i]]);
  }
  return result;
}

export function updateContentsFromResults(
  contents: string,
  urls: string[],
  results: Result[],
): string {
  let updated = contents;
  for (const [url, result] of zip(urls, results)) {
    if (result === Result.Ok) {
      updated = updated.replace(url, `- ${url}`);
    }
  }
  return updated;
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
    description: getDescription($, canonical),
    type: getType($, canonical),
    url: url,
    canonical: canonical,
  };
}

export function getTitle($: cheerio.CheerioAPI, url: string): string {
  if (isHnComment(url)) {
    const id = getHnId(url);
    return `HN comment (${id})`;
  }

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

function getHnId(url: string) {
  const tmp = new URL(url);
  const search = new URLSearchParams(tmp.search);
  return search.get('id');
}

export function getAuthor(
  $: cheerio.CheerioAPI,
  url: string,
): string | undefined {
  if (isHnComment(url)) {
    const id = getHnId(url);
    return (
      $(`#${id} .hnuser`).text().trim() ||
      $(`#${id} + tr .hnuser`).text().trim()
    );
  }

  if (/github.com/i.test(url)) {
    const match = url.match(/github.com\/([^\/]*)/);
    return match?.[1];
  }

  const meta = $('meta[name=author]');
  if (meta.length > 0) {
    return meta.attr('content');
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

function isHnComment(url: string) {
  return /news.ycombinator.com/i.test(url);
}

export function getDescription(
  $: cheerio.CheerioAPI,
  url: string,
): string | undefined {
  if (isHnComment(url)) {
    return undefined;
  }
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
      return SourceType.COMMENTS;
    case /reddit.com/i.test(url):
      return SourceType.LIST;
    case /amazon\.(com|ca)/i.test(url):
      return SourceType.BOOK;
    case /github.com/i.test(url):
      return SourceType.REPO;
    case /twitter.com/i.test(url):
      return SourceType.TWEET;
    case $('meta[property="og:type"]').length > 0:
      return $('meta[property="og:type"]').attr(
        'content',
      ) as SourceType;
    default:
      return SourceType.WEBSITE;
  }
}

export function safeTitle(s: string) {
  return s
    .replace(/[*"\/<>:|?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getNoteTitle(meta: SourceMetadata) {
  if (meta.author && meta.title) {
    return safeTitle(`${meta.author}'s ${meta.title}`);
  }
  return safeTitle(meta.title);
}

export function getUrlsInDoc(doc: string): string[] {
  return doc
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^https?/.test(l));
}

export function toNote(meta: SourceMetadata): string {
  const now = new Date();
  return `---
created_date: ${now.toISOString()}
author: ${meta.author}
type: ${meta.type}
url: "${meta.url}"
canonical: "${meta.canonical}"
description: >
  ${meta.description?.replace(/\n\s*/g, '\n  ')}
aliases:
  - "${meta.title}"
tags:
  - toread
  - lit
---

## Source

<${meta.url}>
`;
}
