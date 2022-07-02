import * as sinon from 'sinon';
import { expect } from 'chai';
import { definitionFileContents, extractWords } from './dictionary';

describe('Module: extractWords', () => {
  it('should extract the words from the kindle-sync output', () => {
    const input = `---
creation_date: '2022-05-19 07:16'
tags:
  - lit
kindle-sync:
  ...
---
# Rhythm of War
## Metadata
* Author: [Brandon Sanderson](https://www.amazon.com/Brandon-Sanderson/e/B001IGFHW6/ref=dp_byline_cont_ebooks_1)
* ASIN: B0826NKZHR
* ISBN: 0765326388
* Reference: https://www.amazon.com/dp/B0826NKZHR
* [Kindle link](kindle://book?action=open&asin=B0826NKZHR)

## Highlights

> scuttled ^ref-41067
---
> gaudy. ^ref-11548
---
> some long quote ^ref-12123
`;
    expect(extractWords(input)).to.eql(['scuttled', 'gaudy']);
  });
});

describe('Module: definitionFileContents', () => {
  let clock: any;

  beforeEach(() => {
    process.env.TZ = 'Europe/London';
    clock = sinon.useFakeTimers({
      now: new Date(2019, 1, 1, 0, 0),
      shouldAdvanceTime: true,
      toFake: ['Date'],
    });
  });

  afterEach(() => {
    clock.restore();
  });

  it('should return a def as expected', () => {
    const input = {
      word: 'scuttled',
      phonetics: [],
      meanings: [
        {
          partOfSpeech: 'verb',
          definitions: [
            {
              definition:
                'To cut a hole or holes through the bottom, deck, or sides of (as of a ship), for any purpose.',
              synonyms: [],
              antonyms: [],
            },
            {
              definition:
                "To deliberately sink one's ship or boat by any means, usually by order of the vessel's commander or owner.",
              synonyms: [],
              antonyms: [],
            },
            {
              definition:
                "(by extension, in figurative use) Undermine or thwart oneself (sometimes intentionally), or denigrate or destroy one's position or property; compare scupper.",
              synonyms: [],
              antonyms: [],
              example:
                'The candidate had scuttled his chances with his unhinged outburst.',
            },
          ],
          synonyms: ['hatch', 'roof'],
          antonyms: [],
        },
        {
          partOfSpeech: 'verb',
          definitions: [
            {
              definition: 'To move hastily, to scurry.',
              synonyms: [],
              antonyms: [],
            },
          ],
          synonyms: [],
          antonyms: [],
        },
      ],
      license: {
        name: 'CC BY-SA 3.0',
        url: 'https://creativecommons.org/licenses/by-sa/3.0',
      },
      sourceUrls: [
        'https://en.wiktionary.org/wiki/scuttle',
        'https://en.wiktionary.org/wiki/scuttled',
      ],
    };
    const expected = `---
created_date: 2019-02-01T00:00:00.000Z
tags:
  - flashcards
  - ref
  - todo
aliases:
  - scuttle
---

## scuttled

1. *(verb)* To cut a hole or holes through the bottom, deck, or sides of (as of a ship), for any purpose.
2. *(verb)* To deliberately sink one's ship or boat by any means, usually by order of the vessel's commander or owner.
3. *(verb)* (by extension, in figurative use) Undermine or thwart oneself (sometimes intentionally), or denigrate or destroy one's position or property; compare scupper.
\t*e.g.* The candidate had scuttled his chances with his unhinged outburst.

1. *(verb)* To move hastily, to scurry.

## Sources

1. <https://en.wiktionary.org/wiki/scuttle>
2. <https://en.wiktionary.org/wiki/scuttled>

---

`;
    expect(definitionFileContents(input)).to.eql(expected);
  });
});
