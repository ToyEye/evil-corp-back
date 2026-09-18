import PDFDocument from 'pdfkit';

export type InvoicePdfLine = {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
};

export type InvoicePdfData = {
  companyName: string;
  invoiceNumber: string;
  orderNumber: string;
  clientName: string;
  clientAddress: string;
  total: number;
  paidAt: Date;
  items: InvoicePdfLine[];
};

const PAGE_MARGIN = 50;
const HEADER_COLOR = '#0F172A';
const MUTED_COLOR = '#64748B';
const LINE_COLOR = '#E2E8F0';
const ROW_ALT = '#F8FAFC';

const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);

const formatPaidAt = (value: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);

export const invoicePdfFilename = (invoiceNumber: string): string => {
  const safe = invoiceNumber
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${safe || 'invoice'}.pdf`;
};

const drawRule = (doc: PDFKit.PDFDocument, y: number) => {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  doc.save();
  doc
    .strokeColor(LINE_COLOR)
    .lineWidth(1)
    .moveTo(left, y)
    .lineTo(right, y)
    .stroke();
  doc.restore();
};

const field = (
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
) => {
  doc.font('Helvetica').fontSize(8).fillColor(MUTED_COLOR).text(label, x, y, {
    width,
  });
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(HEADER_COLOR)
    .text(value, x, y + 12, { width });

  return doc.y;
};

type Column = {
  label: string;
  width: number;
  align?: 'left' | 'right';
};

const COLUMNS: Column[] = [
  { label: 'Product', width: 210 },
  { label: 'SKU', width: 80 },
  { label: 'Qty', width: 50, align: 'right' },
  { label: 'Unit price', width: 75, align: 'right' },
  { label: 'Amount', width: 80, align: 'right' },
];

export const buildInvoicePdf = (data: InvoicePdfData): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const contentWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    const bottomLimit = () => doc.page.height - doc.page.margins.bottom;

    doc.font('Helvetica').fontSize(9).fillColor(MUTED_COLOR).text('INVOICE', {
      align: 'right',
    });
    doc
      .moveUp()
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor(HEADER_COLOR)
      .text(data.companyName, left, doc.y, { width: contentWidth * 0.7 });

    doc.moveDown(0.6);
    drawRule(doc, doc.y);
    doc.moveDown(1);

    const colWidth = (contentWidth - 24) / 2;
    const rightX = left + colWidth + 24;
    const rows: [string, string, string, string][] = [
      ['INVOICE NUMBER', data.invoiceNumber, 'CLIENT', data.clientName],
      ['ORDER NUMBER', data.orderNumber, 'ADDRESS', data.clientAddress],
      ['AMOUNT', formatMoney(data.total), 'PAID', formatPaidAt(data.paidAt)],
    ];

    for (const [leftLabel, leftValue, rightLabel, rightValue] of rows) {
      const y = doc.y;
      const leftEnd = field(doc, leftLabel, leftValue, left, y, colWidth);
      const rightEnd = field(doc, rightLabel, rightValue, rightX, y, colWidth);
      doc.y = Math.max(leftEnd, rightEnd) + 10;
    }

    drawRule(doc, doc.y);
    doc.moveDown(1);

    const drawTableHeader = () => {
      let x = left;
      const y = doc.y;
      doc.save();
      doc.rect(left, y, contentWidth, 22).fill('#EFF6FF');
      doc.restore();
      doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED_COLOR);
      for (const column of COLUMNS) {
        doc.text(column.label.toUpperCase(), x + 6, y + 7, {
          width: column.width - 12,
          align: column.align ?? 'left',
        });
        x += column.width;
      }
      doc.y = y + 22;
    };

    const ensureSpace = (height: number, redrawHeader: boolean) => {
      if (doc.y + height <= bottomLimit()) {
        return;
      }

      doc.addPage();
      if (redrawHeader) {
        drawTableHeader();
      }
    };

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(HEADER_COLOR)
      .text('Products');
    doc.moveDown(0.4);
    drawTableHeader();

    data.items.forEach((item, index) => {
      const amount = item.quantity * item.unitPrice;
      const values = [
        item.name,
        item.sku,
        String(item.quantity),
        formatMoney(item.unitPrice),
        formatMoney(amount),
      ];

      doc.font('Helvetica').fontSize(9);
      const nameHeight = doc.heightOfString(item.name, {
        width: COLUMNS[0].width - 12,
      });
      const rowHeight = Math.max(24, nameHeight + 10);

      ensureSpace(rowHeight, true);

      const y = doc.y;
      if (index % 2 === 1) {
        doc.save();
        doc.rect(left, y, contentWidth, rowHeight).fill(ROW_ALT);
        doc.restore();
      }

      let x = left;
      values.forEach((value, columnIndex) => {
        const column = COLUMNS[columnIndex];
        const isName = columnIndex === 0;
        doc
          .font(isName ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(9)
          .fillColor(HEADER_COLOR)
          .text(value, x + 6, y + 6, {
            width: column.width - 12,
            align: column.align ?? 'left',
          });
        x += column.width;
      });

      doc.y = y + rowHeight;
    });

    if (data.items.length === 0) {
      ensureSpace(28, true);
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(MUTED_COLOR)
        .text('No products on this order', left + 6, doc.y + 8);
      doc.moveDown(2);
    }

    ensureSpace(48, false);
    doc.moveDown(0.8);
    drawRule(doc, doc.y);
    doc.moveDown(0.6);
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED_COLOR)
      .text('Total', left, doc.y, {
        width: contentWidth - 90,
        align: 'right',
      });
    doc
      .moveUp()
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(HEADER_COLOR)
      .text(formatMoney(data.total), left, doc.y, {
        width: contentWidth,
        align: 'right',
      });

    doc.end();
  });
