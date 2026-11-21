import { countWords, MAX_PLAIN_WORDS } from '@/tramites/text-rules';

describe('countWords', () => {
  it('counts whitespace-separated words', () => {
    expect(countWords('Pague antes del 30 de noviembre.')).toBe(6);
  });

  it('treats runs of spaces, tabs and line breaks as one separator', () => {
    expect(countWords('uno   dos\t\ttres\n\ncuatro')).toBe(4);
  });

  it('ignores leading and trailing spaces', () => {
    expect(countWords('   uno dos  ')).toBe(2);
  });

  it('counts zero words in an empty or blank string', () => {
    expect(countWords('')).toBe(0);
    expect(countWords(' \n\t ')).toBe(0);
  });
});

describe('MAX_PLAIN_WORDS', () => {
  it('keeps the 15-word easy-read limit', () => {
    expect(MAX_PLAIN_WORDS).toBe(15);
  });
});
