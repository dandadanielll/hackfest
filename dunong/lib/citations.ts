export type Source = {
  id: string;
  author: string;
  year: string;
  title: string;
  journal: string;
};

export function formatCitation(source: Source, style: 'APA' | 'MLA') {
  if (style === 'APA') {
    return `${source.author}. (${source.year}). ${source.title}. ${source.journal}.`;
  }
  return `${source.author}. "${source.title}." ${source.journal}, ${source.year}.`;
}