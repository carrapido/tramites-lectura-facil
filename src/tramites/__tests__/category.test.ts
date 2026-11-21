import { CATEGORIES, CATEGORY_LABEL, CATEGORY_NOTICE, NOTICE_BEFORE_READING, toCategory } from '@/tramites/category';

describe('category contract (context-categories S2, S4)', () => {
  it('lists the five categories', () => {
    expect(CATEGORIES).toEqual(['tramite', 'reunion', 'salud', 'nota', 'otro']);
  });

  it.each(CATEGORIES)('keeps the known category %s', (category) => {
    expect(toCategory(category)).toBe(category);
  });

  it.each([['banco'], [''], [undefined], [null], [3], ['Tramite']])('turns %p into otro', (value) => {
    expect(toCategory(value)).toBe('otro');
  });

  it('names each category in Spanish and gives its notice', () => {
    expect(CATEGORY_LABEL).toEqual({ tramite: 'Trámite', reunion: 'Reunión', salud: 'Salud', nota: 'Nota', otro: 'Otro' });
    expect(CATEGORY_NOTICE.tramite).toBe('Esto no es asesoría legal');
    expect(CATEGORY_NOTICE.salud).toBe('No sustituye a su médico');
    expect([CATEGORY_NOTICE.reunion, CATEGORY_NOTICE.nota, CATEGORY_NOTICE.otro, NOTICE_BEFORE_READING]).toEqual(
      Array.from({ length: 4 }, () => 'Revise el papel original'),
    );
  });
});
