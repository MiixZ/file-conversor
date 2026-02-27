import mammoth from 'mammoth';
import PDFDocument from 'pdfkit';

export async function docxToPdf(docxBuffer: Buffer): Promise<Buffer> {
  // Use extractRawText to get plain text without any HTML — avoids HTML
  // parsing vulnerabilities and entity double-escaping issues.
  const { value: text } = await mammoth.extractRawText({ buffer: docxBuffer });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc
      .fontSize(11)
      .font('Helvetica')
      .text(text.trim(), { lineGap: 4 });

    doc.end();
  });
}
