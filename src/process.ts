import { TFile, App, request, Vault } from 'obsidian';
import { getAPI } from 'obsidian-dataview';
import { PluginSettings } from './constants';
import {
  fetchMetadata,
  getUrlsInDoc,
  processEntry,
  updateContentsFromResults,
} from './transform';
import {
  extractWords,
  fetchWord,
  definitionFileContents,
} from './dictionary';

// for each URL in todo/toread:
// 	 fetch URL
// 	 	 from head, get author
// 	 	 from head, get title
// 	 	 from head, get keywords
// 	 	 from url and content, get type (article, book, paper, etc)
// 	 return if lite there exists a file with url metadata == URL
// 	 create note
// 	 	 using lit note template
// 	 	 title = safe($author's $title)
// 	 change todo/toread entry to link to note (to be cleaned manually)
export async function processToReadInbox(
  app: App,
  settings: PluginSettings,
) {
  const dv = getAPI(app);
  if (!dv) return logAbortReason('no dv');
  const toread = dv.page('todo/read');
  if (!toread) return logAbortReason('no toread');
  const contents = await dv.io.load(toread.file.path);
  if (!contents) return logAbortReason('no contents');
  const file = app.vault.getAbstractFileByPath('todo/read.md');
  if (!file || 'children' in file)
    return logAbortReason('cant find todo/read');
  const knownUrls = new Set(
    dv.pages('#toread').url.filter(Boolean).array(),
  );
  const urls = getUrlsInDoc(contents).filter(
    (x) => !knownUrls.has(x),
  );
  if (urls.length === 0) return;
  const statuses = await Promise.all(
    urls.map((url) =>
      fetchMetadata(url, request).then((meta) => {
        console.log(`processing new entry '${meta.title}'`);
        return processEntry(meta, app.vault, settings);
      }),
    ),
  );
  const updatedContents = updateContentsFromResults(
    contents,
    urls,
    statuses,
  );
  if (updatedContents === contents) return;
  await app.vault.modify(file as TFile, updatedContents);
}

function logAbortReason(reason: string) {
  console.log('Early return: %s', reason);
}

export async function processDictionaryItems(
  app: App,
  _settings: PluginSettings,
) {
  const dv = getAPI(app);
  if (!dv) return logAbortReason('no dv'), 0;
  const files = dv
    .pages('"notes"')
    .filter((x) => !!x['kindle-sync'])
    .file.path.array();
  const knownWords = new Set(
    dv
      .pages('"notes"')
      .file.name.array()
      .filter((x: string) => /^\w+$/.test(x))
      .map((x: string) => x.toLowerCase()),
  );
  const words = await Promise.all(
    files.map((path: string) => dv.io.load(path).then(extractWords)),
  ).then((w) => w.flatMap((x) => x));
  const newWords = words.filter((w) => !knownWords.has(w));
  await Promise.all(
    newWords.map(async (word) => {
      const definition = await fetchWord(word, request);
      if (!definition) {
        console.error('did not find definition for %s', word)
        return;
      }
      return app.vault.create(
        `notes/${word}.md`,
        definitionFileContents(definition),
      );
    }),
  );
  return newWords;
}

export function defineWord(
  app: App,
  _settings: PluginSettings,
  checking: boolean,
): boolean {
  const file = app.workspace.getActiveFile();
  if (!file) return logAbortReason('no file'), false;
  const word = file.basename.replace(/\.md$/, '');
  if (!/^\w+$/i.test(word))
    return logAbortReason('not a word'), false;
  if (checking) return true;
  processWord(file, word);
  return true;
}

async function processWord(file: TFile, word: string) {
  const definition = await fetchWord(word, request);
  app.vault.modify(file, definitionFileContents(definition));
}

export interface Stats {
  eases: Record<number, number>;
  intervals: Record<number, number>;
  newCount: number;
  youngCount: number;
  matureCount: number;
}

const path = 'notes/spaced repetition data.csv';
const header = [['date', 'total']];

export async function updateCardCount(
  app: any,
  settings: PluginSettings,
  force = false,
) {
  const srp: any =
    app?.plugins?.plugins?.['obsidian-spaced-repetition'];
  if (!srp) return logAbortReason('no srp');
  const stats = srp.cardStats as Stats;
  if (!stats) return logAbortReason('no card stats');
  const total = stats.newCount + stats.youngCount + stats.matureCount;
  if (total === 0) return logAbortReason('total is 0');
  if (settings.total === 0) settings.total = total;
  if (!force && total === settings.total) return;
  settings.total = total;
  const dv = getAPI(app);
  if (!dv) return logAbortReason('no dv');
  const vault: Vault = app.vault;
  const file = vault.getAbstractFileByPath(path);
  if (file && 'children' in file)
    return logAbortReason(`cant find "${path}"`);

  console.log('updating card count');

  if (!file) {
    const now = dv.luxon.DateTime.now().toISODate();
    const lines = [];
    lines.push([now, total.toString()]);
    await vault.create(
      path,
      header
        .concat(lines)
        .map((x) => x.join(','))
        .join('\n'),
    );
    return;
  }

  const csv = await dv.io.csv(path);
  if (!csv) return logAbortReason('no data??');
  const now = dv.luxon.DateTime.now().set({ hour: 12 }).toISODate();
  const lines = csv
    .array()
    .filter(({ date }) => date.set({ hour: 12 }).toISODate() !== now)
    .map(({ date, total }) => [date.toISODate(), total]);
  lines.push([now, total.toString()]);
  vault.modify(
    file as TFile,
    header
      .concat(lines)
      .map((x) => x.join(','))
      .join('\n'),
  );

  console.log('adding %s %s', now, total.toString());
}

export async function backfillCardCount(app: any) {
  const dv = getAPI();
  if (!dv) return logAbortReason('no dv');

  const p = dv.pages('#flashcards AND -"templates"').array();

  async function toCards(page: any) {
    const contents = await dv!.io.load(page.file.path);
    return {
      path: page.file.path,
      cday: dv!.date(page.file.cday),
      count: getNumberOfCardsInFile(contents),
    };
  }

  function getNumberOfCardsInFile(contents: any) {
    const regex = /<!--SR/g;
    const matches = contents.match(regex);
    if (!matches) return 0;
    return matches.length;
  }

  const groupBy = (fn: any) => (col: any) => {
    const result: any = {};
    for (const el of col) {
      const key = fn(el);
      result[key] ||= [];
      result[key].push(el);
    }
    return result;
  };

  const sortBy = (fn: any) => (col: any) => {
    return col.sort((a: any, b: any) => dv.compare(fn(a), fn(b)));
  };

  const pipe =
    (...fns: any) =>
    (data: any) => {
      return fns.reduce((prev: any, fn: any) => fn(prev), data);
    };

  const map = (fn: any) => (data: any) => {
    return data.map(fn);
  };

  const sortedDataByDate = pipe(
    groupBy((x: any) => x.cday),
    Object.entries,
    sortBy((x: any) => x[0]),
  );

  const add = (a: number, b: number) => a + b;

  const getCount = (x: any) => x.count;

  const countByDate = pipe(
    sortedDataByDate,
    map(([date, cards]: any) => [
      dv!.date(date).toISODate(),
      cards.map(getCount).reduce(add, 0),
    ]),
    function cumsum(data: [string, number][]) {
      const result = [];
      let cumsum = 0;
      for (const [date, count] of data) {
        result.push([date, (cumsum += count)]);
      }
      return result;
    },
  );

  const data = await Promise.all(p.map(toCards));
  const series = countByDate(data);

  const csv = await dv.io.load(path);
  if (!csv) return logAbortReason('no data??');
  const srp: any =
    app?.plugins?.plugins?.['obsidian-spaced-repetition'];
  const vault = app.vault;
  if (!srp) return logAbortReason('no srp');
  const stats = srp.cardStats as Stats;
  if (!stats) return logAbortReason('no card stats');
  const cutoff = dv.luxon.DateTime.fromISO('2022-07-02');
  const lines = parseCSV(csv).filter(
    ([date]) => dv.date(date) >= cutoff,
  );
  const file = vault.getAbstractFileByPath(path);
  if (!file || 'children' in file)
    return logAbortReason(`cant find "${path}"`);

  vault.modify(
    file as TFile,
    header
      .concat(series)
      .concat(lines)
      .map((x: any) => x.join(','))
      .join('\n'),
  );
}

function parseCSV(contents: string) {
  return contents
    .split('\n')
    .slice(1, -1)
    .map((x) => x.split(','));
}
