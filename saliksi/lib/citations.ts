export type Author = {
  firstName: string;
  middleName?: string;
  lastName: string;
};

export type Source = {
  id: string;
  author: string | Author[];
  year: string;
  month?: string;
  day?: string;
  title: string;
  journal: string;
};

export function formatCitation(source: Source, style: 'APA' | 'MLA') {
  let authorText = 'Unknown Author';
  if (Array.isArray(source.author)) {
    if (source.author.length === 1) {
      authorText = `${source.author[0].lastName}, ${source.author[0].firstName ? source.author[0].firstName.charAt(0) + '.' : ''}`;
    } else if (source.author.length === 2) {
      authorText = `${source.author[0].lastName}, ${source.author[0].firstName ? source.author[0].firstName.charAt(0) + '.' : ''} & ${source.author[1].lastName}, ${source.author[1].firstName ? source.author[1].firstName.charAt(0) + '.' : ''}`;
    } else if (source.author.length > 2) {
      authorText = `${source.author[0].lastName}, ${source.author[0].firstName ? source.author[0].firstName.charAt(0) + '.' : ''} et al.`;
    }
  } else {
    authorText = source.author;
  }

  const dateStr = [source.year, source.month, source.day].filter(Boolean).join(' ');

  if (style === 'APA') {
    return `${authorText}. (${dateStr}). ${source.title}. ${source.journal}.`;
  }
  return `${authorText}. "${source.title}." ${source.journal}, ${dateStr}.`;
}