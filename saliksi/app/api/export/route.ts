import htmlToDocx from 'html-to-docx';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { content, title } = await req.json();
    
    const docxBlob = await htmlToDocx(content, null, {
      title: title,
      orientation: 'portrait',
      margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
    });

    return new Response(docxBlob, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${title}.docx"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
  }
}
