import { expect } from 'chai';
import {
  SourceType,
  fetchMetadata,
  getNoteTitle,
  getUrlsInDoc,
  toNote,
  updateContentsFromResults,
  Result,
} from './transform';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';

const article1 = fs.promises.readFile(
  path.join(__dirname, '../test/clustering.html'),
  'utf8',
);
const article2 = fs.promises.readFile(
  path.join(__dirname, '../test/hydration.html'),
  'utf8',
);
const article3 = fs.promises.readFile(
  path.join(__dirname, '../test/gio.html'),
  'utf8',
);
const article4 = fs.promises.readFile(
  path.join(__dirname, '../test/article4.html'),
  'utf8',
);
const website = fs.promises.readFile(
  path.join(__dirname, '../test/untools.html'),
  'utf8',
);
const github = fs.promises.readFile(
  path.join(__dirname, '../test/github.html'),
  'utf8',
);
const hnComment = fs.promises.readFile(
  path.join(__dirname, '../test/hnComment.html'),
  'utf8',
);
const hnComments = fs.promises.readFile(
  path.join(__dirname, '../test/hnComments.html'),
  'utf8',
);

describe('Module: fetchMetadata', () => {
  let fetch;
  let actual;

  beforeEach(() => {
    fetch = sinon.stub();
    fetch
      .withArgs({ url: 'https://github.com/hello/world' })
      .returns(github);
    fetch.withArgs({ url: 'https://article1.com' }).returns(article1);
    fetch.withArgs({ url: 'https://article2.com' }).returns(article2);
    fetch
      .withArgs({ url: 'https://article3.com?a=b' })
      .returns(article3);
    fetch.withArgs({ url: 'https://article4.com' }).returns(article4);
    fetch.withArgs({ url: 'https://website.com' }).returns(website);
    fetch
      .withArgs({
        url: 'https://news.ycombinator.com/item?id=22043223',
      })
      .returns(hnComment);
    fetch
      .withArgs({
        url: 'https://news.ycombinator.com/item?id=31846593',
      })
      .returns(hnComments);
  });

  it('should return something appropriate for a GitHub repo', async () => {
    actual = await fetchMetadata(
      'https://github.com/hello/world',
      fetch,
    );
    expect(actual).to.eql({
      title: 'diff-match-patch',
      author: 'google',
      description:
        'Diff Match Patch is a high-performance library in multiple languages that manipulates plain text. - GitHub - google/diff-match-patch: Diff Match Patch is a high-performance library in multiple languages that manipulates plain text.',
      url: 'https://github.com/google/diff-match-patch',
      type: 'repo',
    });
  });

  it('should return something appropriate for an article', async () => {
    actual = await fetchMetadata('https://article1.com', fetch);
    expect(actual).to.eql({
      title:
        'Combing For Insight in 10,000 Hacker News Posts With Text Clustering',
      author: 'Jay Alammar',
      description:
        'Hacker News is one of the leading online communities to discuss software and startup topics. I’ve frequented the site for over ten years and constantly admire the quality of its signal vs. noise ratio. It houses a wealth of knowledge and insightful discussions accumulated over the years. That invaluable',
      url: 'https://txt.cohere.ai/combing-for-insight-in-10-000-hacker-news-posts-with-text-clustering/',
      type: 'article',
    });
  });

  it('should return something appropriate for an article (2)', async () => {
    actual = await fetchMetadata('https://article2.com', fetch);
    expect(actual).to.eql({
      title: 'JavaScript Hydration Is a Workaround, Not a Solution',
      author: 'Miško Hevery',
      description:
        'Put simply, hydration is overhead because it duplicates work. Resumability focuses on transferring all of the information (the WHERE and WHAT) from the server to the client.',
      url: 'https://thenewstack.io/javascript-hydration-is-a-workaround-not-a-solution/',
      type: 'article',
    });
  });

  it('should return something appropriate for an article (3)', async () => {
    actual = await fetchMetadata('https://article3.com?a=b', fetch);
    expect(actual).to.eql({
      title:
        'Donald Knuth on work habits, problem solving, and happiness',
      author: undefined,
      description: undefined,
      url: 'https://article3.com?a=b',
      type: 'website',
    });
  });

  it('should return something appropriate for an article (4)', async () => {
    actual = await fetchMetadata('https://article4.com', fetch);
    expect(actual).to.eql({
      title: 'How to Write Better with The Why, What, How Framework',
      author: 'Eugene Yan',
      description:
        'Three documents I write (one-pager, design doc, after-action review) and how I structure them.',
      url: 'https://eugeneyan.com/writing/writing-docs-why-what-how/',
      type: 'article',
    });
  });

  it('should return something appropriate for a website', async () => {
    actual = await fetchMetadata('https://website.com', fetch);
    expect(actual).to.eql({
      title: 'Tools for better thinking',
      author: undefined,
      description:
        'Collection of thinking tools and frameworks to help you solve problems, make decisions and understand systems.',
      url: 'https://website.com',
      type: 'website',
    });
  });

  it('should return something appropriate for a hacker news comment', async () => {
    actual = await fetchMetadata(
      'https://news.ycombinator.com/item?id=22043223',
      fetch,
    );
    expect(actual).to.eql({
      title: 'HN comment (22043223)',
      author: 'beaker52',
      description: undefined,
      url: 'https://news.ycombinator.com/item?id=22043223',
      type: SourceType.COMMENTS,
    });
  });

  it('should return something appropriate for a hacker news link', async () => {
    actual = await fetchMetadata(
      'https://news.ycombinator.com/item?id=31846593',
      fetch,
    );
    expect(actual).to.eql({
      title: 'HN comment (31846593)',
      author: 'f311a',
      description: undefined,
      url: 'https://news.ycombinator.com/item?id=31846593',
      type: SourceType.COMMENTS,
    });
  });
});

describe('Unit: toNote', () => {
  let actual;
  let expected;
  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers({
      now: new Date(2019, 1, 1, 0, 0),
      shouldAdvanceTime: true,
      toFake: ['Date'],
    });
  });

  afterEach(() => {
    clock.restore();
  });

  it('should return a templated note', () => {
    actual = toNote({
      title: 'HN comment (31846593)',
      author: 'f311a',
      description: 'hello world\nok',
      url: 'https://news.ycombinator.com/item?id=31846593',
      type: SourceType.COMMENTS,
    });

    expected = `---
created_date: 2019-02-01T00:00:00.000Z
author: f311a
type: comments
url: "https://news.ycombinator.com/item?id=31846593"
description: >
  hello world
  ok
aliases:
  - "HN comment (31846593)"
tags:
  - toread
  - lit
---

## Source

<https://news.ycombinator.com/item?id=31846593>
`;
    expect(actual).to.eql(expected);
  });
});

describe('Unit: getUrlsInDoc', () => {
  it('should return all the urls in a doc', () => {
    const input = `
https://txt.cohere.ai/combing-for-insight-in-10-000-hacker-news-posts-with-text-clustering/

https://news.ycombinator.com/item?id=22043223
https://thenewstack.io/javascript-hydration-is-a-workaround-not-a-solution/

https://github.com/google/diff-match-patch

not an url https://untools.co/

https://shuvomoy.github.io/blogs/posts/Knuth-on-work-habits-and-problem-solving-and-happiness/?utm_source=hackernewsletter&utm_medium=email&utm_term=fav

https://github.com/PlasmoHQ/plasmo

https://en.wikipedia.org/wiki/Ship_of_Theseus
`;
    expect(getUrlsInDoc(input)).to.eql([
      'https://txt.cohere.ai/combing-for-insight-in-10-000-hacker-news-posts-with-text-clustering/',
      'https://news.ycombinator.com/item?id=22043223',
      'https://thenewstack.io/javascript-hydration-is-a-workaround-not-a-solution/',
      'https://github.com/google/diff-match-patch',
      'https://shuvomoy.github.io/blogs/posts/Knuth-on-work-habits-and-problem-solving-and-happiness/?utm_source=hackernewsletter&utm_medium=email&utm_term=fav',
      'https://github.com/PlasmoHQ/plasmo',
      'https://en.wikipedia.org/wiki/Ship_of_Theseus',
    ]);
  });
});

describe('Unit: getNoteTile', () => {
  it('should return appropriate values', () => {
    expect(
      getNoteTitle({
        title: 'hello * world?',
        url: 'hh',
        author: undefined,
        description: undefined,
        type: SourceType.COMMENTS,
      }),
    ).to.eql('hello world');

    expect(
      getNoteTitle({
        title: 'hello * world?',
        url: 'hh',
        author: 'bret@hotmail.com',
        description: undefined,
        type: SourceType.COMMENTS,
      }),
    ).to.eql('bret@hotmail.com\'s hello world');
  });
});

describe('Unit: updateContentsFromResults', () => {
  it('should do something', () => {
    const input = `
https://txt.cohere.ai/combing-for-insight-in-10-000-hacker-news-posts-with-text-clustering/

https://news.ycombinator.com/item?id=22043223
https://thenewstack.io/javascript-hydration-is-a-workaround-not-a-solution/

https://github.com/google/diff-match-patch

not an url https://untools.co/

https://shuvomoy.github.io/blogs/posts/Knuth-on-work-habits-and-problem-solving-and-happiness/?utm_source=hackernewsletter&utm_medium=email&utm_term=fav

https://github.com/PlasmoHQ/plasmo

https://en.wikipedia.org/wiki/Ship_of_Theseus
`;
    const expected = `
https://txt.cohere.ai/combing-for-insight-in-10-000-hacker-news-posts-with-text-clustering/

https://news.ycombinator.com/item?id=22043223
https://thenewstack.io/javascript-hydration-is-a-workaround-not-a-solution/

https://github.com/google/diff-match-patch

not an url https://untools.co/

https://shuvomoy.github.io/blogs/posts/Knuth-on-work-habits-and-problem-solving-and-happiness/?utm_source=hackernewsletter&utm_medium=email&utm_term=fav

- [x] https://github.com/PlasmoHQ/plasmo

https://en.wikipedia.org/wiki/Ship_of_Theseus
`;
    const actual = updateContentsFromResults(input, [
      'https://github.com/PlasmoHQ/plasmo',
      'https://en.wikipedia.org/wiki/Ship_of_Theseus',
    ], [
      Result.Ok,
      Result.Err,
    ]);
    expect(actual).to.eql(expected);
  });
});
