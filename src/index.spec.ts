import { expect } from 'chai';
import { fetchMetadata } from './index';
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

describe('Module: fetchMetadata', () => {
  let fetch;
  let result;

  beforeEach(() => {
    fetch = sinon.stub();
    fetch
      .withArgs({ url: 'https://github.com/hello/world' })
      .returns(github);
    fetch
      .withArgs({ url: 'https://article1.com' })
      .returns(article1);
    fetch
      .withArgs({ url: 'https://article2.com' })
      .returns(article2);
    fetch
      .withArgs({ url: 'https://article3.com?a=b' })
      .returns(article3);
    fetch
      .withArgs({ url: 'https://article4.com' })
      .returns(article4);
    fetch
      .withArgs({ url: 'https://website.com' })
      .returns(website);
  });

  it('should return something appropriate for a GitHub repo', async () => {
    result = await fetchMetadata(
      'https://github.com/hello/world',
      fetch,
    );
    expect(result).to.eql({
      title: 'diff-match-patch',
      author: 'google',
      description:
        'Diff Match Patch is a high-performance library in multiple languages that manipulates plain text. - GitHub - google/diff-match-patch: Diff Match Patch is a high-performance library in multiple languages that manipulates plain text.',
      url: 'https://github.com/google/diff-match-patch',
      type: 'repo',
    });
  });

  it('should return something appropriate for an article', async () => {
    result = await fetchMetadata('https://article1.com', fetch);
    expect(result).to.eql({
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
    result = await fetchMetadata('https://article2.com', fetch);
    expect(result).to.eql({
      title: 'JavaScript Hydration Is a Workaround, Not a Solution',
      author: 'Miško Hevery',
      description:
        'Put simply, hydration is overhead because it duplicates work. Resumability focuses on transferring all of the information (the WHERE and WHAT) from the server to the client.',
      url: 'https://thenewstack.io/javascript-hydration-is-a-workaround-not-a-solution/',
      type: 'article',
    });
  });

  it('should return something appropriate for an article (3)', async () => {
    result = await fetchMetadata('https://article3.com?a=b', fetch);
    expect(result).to.eql({
      title: 'Donald Knuth on work habits, problem solving, and happiness',
      author: undefined,
      description: undefined,
      url: 'https://article3.com?a=b',
      type: 'website',
    });
  });

  it('should return something appropriate for an article (4)', async () => {
    result = await fetchMetadata('https://article4.com', fetch);
    expect(result).to.eql({
      title: 'How to Write Better with The Why, What, How Framework',
      author: 'Eugene Yan',
      description: 'Three documents I write (one-pager, design doc, after-action review) and how I structure them.',
      url: 'https://eugeneyan.com/writing/writing-docs-why-what-how/',
      type: 'article',
    });
  });


  it('should return something appropriate for a website', async () => {
    result = await fetchMetadata('https://website.com', fetch);
    expect(result).to.eql({
      title: 'Tools for better thinking',
      author: undefined,
      description:
        'Collection of thinking tools and frameworks to help you solve problems, make decisions and understand systems.',
      url: 'https://website.com',
      type: 'website',
    });
  });
});
