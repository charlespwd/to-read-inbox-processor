import { TFile, App, request } from 'obsidian';
import { getAPI } from 'obsidian-dataview';
import { PluginSettings } from './constants';
import {
  fetchMetadata,
  getUrlsInDoc,
  processEntry,
  updateContentsFromResults,
} from './transform';

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
  await Promise.all(
    urls.map((url) =>
      fetchMetadata(url, request).then((meta) => {
        console.log(`processing new entry '${meta.title}'`);
        processEntry(meta, app.vault, settings);
      }),
    ),
  );
  // const updatedContents = updateContentsFromResults(
  //   contents,
  //   urls,
  //   statuses,
  // );
  // await app.vault.modify(file as TFile, updatedContents);
}

function logAbortReason(reason: string) {
  console.log('Early return: %s', reason);
}
