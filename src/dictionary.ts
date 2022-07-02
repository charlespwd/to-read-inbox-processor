import { RequestUrlParam } from 'obsidian';

export interface Word {
  word: string;
  meanings: Meaning[];
  sourceUrls: string[];
}

export interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
  synonyms: string[];
  antonyms: string[];
}

export interface Definition {
  definition: string;
  example?: string;
  synonyms: string[];
  antonyms: string[];
}

export function extractWords(contents: string | undefined): string[] {
  if (!contents) return [];
  const matches = contents.match(/^> ([a-zA-Z]+)[.!?,]? \^ref-\d+/gm);
  if (!matches) return [];
  return matches.map((m) => m.match(/[a-z]+/i)![0]);
}

export async function fetchWord(
  word: string,
  fetch: (p: RequestUrlParam) => Promise<string>,
): Promise<Word> {
  return fetch({
    url: `https://api.dictionaryapi.dev/api/v2/entries/en/${word
      .toLowerCase()
      .trim()}`,
  })
    .then(JSON.parse)
    .then((x) => x[0]);
}

export function definitionFileContents(word: Word): string {
  const now = new Date();
  return `---
created_date: ${now.toISOString()}
tags:
  - flashcards
  - ref
  - todo${aliases(word)}
---

## ${word.word}

${word.meanings.map(meaning).join('\n\n')}

## Sources

${word.sourceUrls.map((s, i) => `${i + 1}. <${s}>`).join('\n')}

---

`;
}

function aliases(word: Word) {
  if (word.sourceUrls.length <= 1) return '';
  if (!word.sourceUrls.every(isWikiUrl)) return '';
  return `
aliases:
${word.sourceUrls
  .map((url) => url.match(/\/([^/]+)$/)![1])
  .filter((w) => w !== word.word)
  .map((s) => `  - ${s}`)
  .join('\n')}`;
}

function isWikiUrl(url: string) {
  return /wiktionary\.org/.test(url);
}

function meaning(wm: Meaning): string {
  return wm.definitions
    .map((def, i) => {
      return [
        `${i + 1}. *(${wm.partOfSpeech})* ${def.definition}`,
        def.example && `\t*e.g.* ${def.example}`,
        def.synonyms.length > 0 &&
          `\t*synonyms*: ${def.synonyms.join(', ')}`,
        def.antonyms.length > 0 &&
          `\t*antonyms*: ${def.antonyms.join(', ')}`,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');
}
