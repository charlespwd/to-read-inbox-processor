import { TFile, App, request } from 'obsidian';
import { getAPI } from 'obsidian-dataview';
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
export async function processToReadInbox(app: App) {
  const dv = getAPI(app);
  if (!dv) return;
  const toread = dv.page('todo/read');
  if (!toread) return;
  const contents = await dv.io.load(toread.file.path);
  if (!contents) return;
  const file = app.vault.getAbstractFileByPath('todo/read');
  if (!file || 'children' in file) return;
  const knownUrls = new Set(
    dv.pages('#toread').url.filter(Boolean).array(),
  );
  const urls = getUrlsInDoc(contents).filter(
    (x) => !knownUrls.has(x),
  );
  const statuses = await Promise.all(
    urls.map((url) =>
      fetchMetadata(url, request).then((meta) =>
        processEntry(meta, app.vault),
      ),
    ),
  );
  const updatedContents = updateContentsFromResults(
    contents,
    urls,
    statuses,
  );
  await app.vault.modify(file as TFile, updatedContents);
}
