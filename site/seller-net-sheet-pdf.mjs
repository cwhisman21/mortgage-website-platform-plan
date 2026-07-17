import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "./vendor/pdf-lib.esm.min.js";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 44;
const BODY_SIZE = 11;
const SNAP_BLUE = rgb(0x15 / 255, 0x57 / 255, 1);
const DARK_INK = rgb(0x17 / 255, 0x22 / 255, 0x3b / 255);
const MUTED_INK = rgb(0x50 / 255, 0x5b / 255, 0x73 / 255);
const LIGHT_BLUE = rgb(0xed / 255, 0xf2 / 255, 1);
const RULE = rgb(0xd8 / 255, 0xde / 255, 0xea / 255);
const DISCLAIMER = "This seller net sheet is a planning estimate based on the property value, obligations, closing date, and editable cost assumptions shown. Actual charges, payoff amounts, taxes, credits, compensation, and proceeds can change through closing. Compensation is negotiable and is not set by law.";

function requireIntegerCents(value, label) {
  if (!Number.isInteger(value)) throw new TypeError(`${label} must be integer cents`);
  return value;
}

function formatCurrency(amountCents) {
  const cents = requireIntegerCents(amountCents, "Amount");
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return String(value || "Not provided");
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function resultLabel(prefix, result) {
  return `${prefix}${result.kind === "shortfall" ? "shortfall" : "proceeds"}`;
}

function normalizedRows(rows, groupLabel) {
  if (!Array.isArray(rows)) throw new TypeError(`${groupLabel} rows are required`);
  return rows.map((row) => ({
    id: String(row.id || ""),
    label: String(row.label || ""),
    amountCents: requireIntegerCents(row.amountCents, `${row.label || groupLabel} amount`),
    amount: formatCurrency(row.amountCents),
  }));
}

export function buildSellerNetSheetPdfModel(input) {
  const address = String(input?.address || "").trim();
  const netSheet = input?.netSheet;
  if (!address || !netSheet?.groups || !input?.valueRange) {
    throw new TypeError("A normalized unlocked seller net sheet is required");
  }

  const sellingExpenses = normalizedRows(netSheet.groups.sellingExpenses, "Selling expenses");
  const obligations = normalizedRows(netSheet.groups.obligations, "Existing obligations");
  const projectedLabel = netSheet.projected.kind === "shortfall"
    ? "Projected shortfall"
    : "Projected net proceeds";

  return {
    brand: "SNAP MORTGAGE",
    title: "Seller Net Sheet",
    address,
    generatedDate: formatDate(input.generatedDate),
    expectedClosingDate: formatDate(input.expectedClosingDate),
    values: [
      { label: "Low", amountCents: requireIntegerCents(input.valueRange.lowCents, "Low value"), amount: formatCurrency(input.valueRange.lowCents), dominant: false },
      { label: "Selected", amountCents: requireIntegerCents(input.valueRange.selectedCents, "Selected value"), amount: formatCurrency(input.valueRange.selectedCents), dominant: true },
      { label: "High", amountCents: requireIntegerCents(input.valueRange.highCents, "High value"), amount: formatCurrency(input.valueRange.highCents), dominant: false },
    ],
    sections: [
      { title: "Selling expenses", rows: sellingExpenses },
      { title: "Existing obligations", rows: obligations },
      {
        title: "Summary",
        rows: [
          { label: "Total selling expenses", amountCents: requireIntegerCents(netSheet.totalSellingExpensesCents, "Total selling expenses"), amount: formatCurrency(netSheet.totalSellingExpensesCents) },
          { label: "Net before obligations", amountCents: requireIntegerCents(netSheet.netBeforeObligationsCents, "Net before obligations"), amount: formatCurrency(netSheet.netBeforeObligationsCents) },
          { label: "Total obligations", amountCents: requireIntegerCents(netSheet.totalObligationsCents, "Total obligations"), amount: formatCurrency(netSheet.totalObligationsCents) },
          { label: projectedLabel, amountCents: requireIntegerCents(netSheet.projected.amountCents, "Projected result"), amount: formatCurrency(netSheet.projected.amountCents), dominant: true },
        ],
      },
    ],
    projected: {
      label: projectedLabel,
      amountCents: requireIntegerCents(netSheet.projected.amountCents, "Projected result"),
      amount: formatCurrency(netSheet.projected.amountCents),
    },
    comparison: [
      {
        label: resultLabel("Low-value ", netSheet.scenarios.low),
        amountCents: requireIntegerCents(netSheet.scenarios.low.amountCents, "Low-value result"),
        amount: formatCurrency(netSheet.scenarios.low.amountCents),
      },
      {
        label: resultLabel("High-value ", netSheet.scenarios.high),
        amountCents: requireIntegerCents(netSheet.scenarios.high.amountCents, "High-value result"),
        amount: formatCurrency(netSheet.scenarios.high.amountCents),
      },
    ],
    disclaimer: DISCLAIMER,
  };
}

function safeAddressSlug(address) {
  return String(address || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "property";
}

function wrapText(text, font, size, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const parts = [];
    let part = "";
    for (const character of [...word]) {
      const candidate = `${part}${character}`;
      if (part && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        parts.push(part);
        part = character;
      } else {
        part = candidate;
      }
    }
    if (part) parts.push(part);

    for (let index = 0; index < parts.length; index += 1) {
      const candidate = line ? `${line} ${parts[index]}` : parts[index];
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
      } else {
        if (line) lines.push(line);
        line = parts[index];
      }
      if (index < parts.length - 1) {
        lines.push(line);
        line = "";
      }
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function fontSizeToFit(text, font, preferredSize, maxWidth) {
  let size = preferredSize;
  while (size > BODY_SIZE && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.5;
  return size;
}

export async function planSellerNetSheetPdfLayout(input) {
  const model = buildSellerNetSheetPdfModel(input);
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fonts = { regular, bold };
  const operations = [];
  const continuationAddressLines = wrapText(model.address, regular, BODY_SIZE, PAGE_WIDTH - (MARGIN * 2));
  const continuationContentY = PAGE_HEIGHT - MARGIN - 75 - (continuationAddressLines.length * 14);
  let page = 0;
  let y;

  const addText = ({ text, x, y: textY, font = "regular", size = BODY_SIZE, color = DARK_INK, role, ...context }) => {
    const pdfFont = fonts[font];
    const width = pdfFont.widthOfTextAtSize(text, size);
    const height = pdfFont.heightAtSize(size, { descender: true });
    if (x < MARGIN - 0.001 || x + width > PAGE_WIDTH - MARGIN + 0.001
      || textY < MARGIN - 0.001 || textY + height > PAGE_HEIGHT - MARGIN + 0.001) {
      throw new RangeError(`${role || "text"} exceeds the PDF margins`);
    }
    operations.push({ type: "text", page, role, text, x, y: textY, width, height, font, size, color, ...context });
  };
  const addRightText = (text, options) => {
    const pdfFont = fonts[options.font || "regular"];
    addText({ ...options, text, x: options.right - pdfFont.widthOfTextAtSize(text, options.size || BODY_SIZE) });
  };
  const addLine = (start, end, thickness, color) => {
    if (Math.min(start.x, end.x) < MARGIN || Math.max(start.x, end.x) > PAGE_WIDTH - MARGIN
      || Math.min(start.y, end.y) < MARGIN || Math.max(start.y, end.y) > PAGE_HEIGHT - MARGIN) {
      throw new RangeError("Line exceeds the PDF margins");
    }
    operations.push({ type: "line", page, start, end, thickness, color });
  };
  const addRectangle = (rectangle) => {
    if (rectangle.x < MARGIN || rectangle.x + rectangle.width > PAGE_WIDTH - MARGIN
      || rectangle.y < MARGIN || rectangle.y + rectangle.height > PAGE_HEIGHT - MARGIN) {
      throw new RangeError("Rectangle exceeds the PDF margins");
    }
    operations.push({ type: "rectangle", page, ...rectangle });
  };

  const drawBrandHeader = (continuation = false) => {
    addText({ text: model.brand, x: MARGIN, y: PAGE_HEIGHT - MARGIN - 11, font: "bold", role: "brand", color: SNAP_BLUE });
    addLine(
      { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 20 },
      { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - MARGIN - 20 },
      2,
      SNAP_BLUE,
    );
    if (continuation) {
      addText({ text: "Seller Net Sheet (continued)", x: MARGIN, y: PAGE_HEIGHT - MARGIN - 46, font: "bold", size: 14, role: "continuation-title" });
      let addressY = PAGE_HEIGHT - MARGIN - 67;
      continuationAddressLines.forEach((line) => {
        addText({ text: line, x: MARGIN, y: addressY, role: "continuation-address", color: MUTED_INK, logicalText: model.address });
        addressY -= 14;
      });
      y = continuationContentY;
      if (y < MARGIN + 45) throw new RangeError("The complete continuation address leaves no printable content area");
    } else {
      y = PAGE_HEIGHT - MARGIN - 48;
    }
  };

  const addPage = (continuation = true) => {
    page += 1;
    drawBrandHeader(continuation);
  };

  addPage(false);
  addText({ text: model.title, x: MARGIN, y, font: "bold", size: 26, role: "title" });
  y -= 25;
  continuationAddressLines.forEach((line) => {
    addText({ text: line, x: MARGIN, y, role: "address", color: MUTED_INK, logicalText: model.address });
    y -= 15;
  });
  y -= 3;
  if (y - 100 < MARGIN) addPage(true);
  addText({ text: `Generated ${model.generatedDate}`, x: MARGIN, y, role: "generated-date", color: MUTED_INK });
  addRightText(`Expected closing ${model.expectedClosingDate}`, { right: PAGE_WIDTH - MARGIN, y, role: "closing-date", color: MUTED_INK });
  y -= 32;

  const stripHeight = 68;
  if (y - stripHeight < MARGIN) addPage(true);
  addRectangle({ x: MARGIN, y: y - stripHeight, width: PAGE_WIDTH - (MARGIN * 2), height: stripHeight, color: LIGHT_BLUE });
  const columnWidth = (PAGE_WIDTH - (MARGIN * 2)) / 3;
  model.values.forEach((value, index) => {
    const center = MARGIN + (columnWidth * index) + (columnWidth / 2);
    const labelWidth = regular.widthOfTextAtSize(value.label, BODY_SIZE);
    addText({ text: value.label, x: center - (labelWidth / 2), y: y - 22, role: "value-label", color: MUTED_INK, valueKind: value.label.toLowerCase() });
    const font = value.dominant ? "bold" : "regular";
    const size = fontSizeToFit(value.amount, fonts[font], value.dominant ? 18 : 14, columnWidth - 16);
    const amountWidth = fonts[font].widthOfTextAtSize(value.amount, size);
    addText({ text: value.amount, x: center - (amountWidth / 2), y: y - 47, font, size, role: "value-amount", color: value.dominant ? SNAP_BLUE : DARK_INK, valueKind: value.label.toLowerCase() });
  });
  y -= stripHeight + 24;

  const rowLines = (row) => wrapText(row.label, row.dominant ? bold : regular, BODY_SIZE, 330);
  const rowHeight = (row) => rowLines(row).length * 14 + 8;
  const sectionHeight = (section) => 31 + section.rows.reduce((height, row) => height + rowHeight(row), 0);
  const drawSectionTitle = (title, sectionTitle) => {
    addText({ text: title, x: MARGIN, y, font: "bold", size: 14, role: "section-title", section: sectionTitle });
    y -= 12;
    addLine({ x: MARGIN, y }, { x: PAGE_WIDTH - MARGIN, y }, 1, RULE);
    y -= 19;
  };
  const continueSection = (sectionTitle) => {
    addPage(true);
    drawSectionTitle(`${sectionTitle} (continued)`, sectionTitle);
  };
  const drawRow = (row, sectionTitle) => {
    const lines = rowLines(row);
    const font = row.dominant ? "bold" : "regular";
    const valueSize = row.dominant ? 13 : BODY_SIZE;
    let lineIndex = 0;
    while (lineIndex < lines.length) {
      if (y < MARGIN) continueSection(sectionTitle);
      const availableLines = Math.floor((y - MARGIN) / 14) + 1;
      if (availableLines < 1) {
        continueSection(sectionTitle);
        continue;
      }
      const chunk = lines.slice(lineIndex, lineIndex + availableLines);
      chunk.forEach((line, index) => addText({
        text: line,
        x: MARGIN,
        y: y - (index * 14),
        font,
        role: "row-label",
        rowId: row.id || row.label,
        logicalText: row.label,
        section: sectionTitle,
      }));
      addRightText(row.amount, {
        right: PAGE_WIDTH - MARGIN,
        y,
        font,
        size: valueSize,
        role: "row-value",
        color: row.dominant ? SNAP_BLUE : DARK_INK,
        rowId: row.id || row.label,
        logicalText: row.label,
        section: sectionTitle,
        continued: lineIndex > 0,
      });
      lineIndex += chunk.length;
      y -= chunk.length * 14 + 8;
      if (lineIndex < lines.length) continueSection(sectionTitle);
    }
  };

  for (const section of model.sections) {
    const measuredSectionHeight = sectionHeight(section);
    const fitsFreshPage = measuredSectionHeight <= continuationContentY - MARGIN;
    if (fitsFreshPage && y - measuredSectionHeight < MARGIN) addPage(true);
    else if (y - Math.min(measuredSectionHeight, 55) < MARGIN) addPage(true);
    drawSectionTitle(section.title, section.title);
    for (const row of section.rows) {
      if (y < MARGIN) continueSection(section.title);
      drawRow(row, section.title);
    }
    y -= 10;
  }

  const comparisonHeight = 72;
  if (y - comparisonHeight < MARGIN) addPage(true);
  addRectangle({ x: MARGIN, y: y - comparisonHeight, width: PAGE_WIDTH - (MARGIN * 2), height: comparisonHeight, borderColor: RULE, borderWidth: 1 });
  addText({ text: "Final value comparison", x: MARGIN + 14, y: y - 22, font: "bold", role: "comparison-title" });
  model.comparison.forEach((result, index) => {
    const x = MARGIN + 14 + (index * ((PAGE_WIDTH - (MARGIN * 2) - 28) / 2));
    addText({ text: result.label, x, y: y - 43, role: "comparison-label", color: MUTED_INK });
    addText({ text: result.amount, x, y: y - 61, font: "bold", size: 13, role: "comparison-value" });
  });
  y -= comparisonHeight + 18;

  const disclaimerLines = wrapText(model.disclaimer, regular, BODY_SIZE, PAGE_WIDTH - (MARGIN * 2));
  const disclaimerHeight = disclaimerLines.length * 14;
  if (y - disclaimerHeight < MARGIN) addPage(true);
  const disclaimerY = MARGIN + ((disclaimerLines.length - 1) * 14);
  disclaimerLines.forEach((line, index) => addText({
    text: line,
    x: MARGIN,
    y: disclaimerY - (index * 14),
    role: index === 0 ? "disclaimer" : "disclaimer-continuation",
    color: MUTED_INK,
    logicalText: model.disclaimer,
  }));

  return {
    pageWidth: PAGE_WIDTH,
    pageHeight: PAGE_HEIGHT,
    margin: MARGIN,
    pageCount: page,
    operations,
    model,
    document: pdf,
    fonts,
  };
}

export async function createSellerNetSheetPdf(input) {
  const layout = await planSellerNetSheetPdfLayout(input);
  const pdf = layout.document;

  pdf.setTitle(`${layout.model.title} - ${layout.model.address}`);
  pdf.setSubject("Seller net sheet planning estimate");
  pdf.setCreator("Snap Mortgage");
  pdf.setProducer("Snap Mortgage");
  const creationDate = /^\d{4}-\d{2}-\d{2}$/.test(String(input.generatedDate || ""))
    ? new Date(`${input.generatedDate}T00:00:00.000Z`)
    : new Date();
  pdf.setCreationDate(creationDate);

  const pages = Array.from({ length: layout.pageCount }, () => pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]));
  for (const operation of layout.operations) {
    const outputPage = pages[operation.page - 1];
    if (operation.type === "text") {
      outputPage.drawText(operation.text, {
        x: operation.x,
        y: operation.y,
        font: layout.fonts[operation.font],
        size: operation.size,
        color: operation.color,
      });
    } else if (operation.type === "line") {
      outputPage.drawLine({ start: operation.start, end: operation.end, thickness: operation.thickness, color: operation.color });
    } else if (operation.type === "rectangle") {
      const { type, page: operationPage, ...rectangle } = operation;
      outputPage.drawRectangle(rectangle);
    }
  }

  const bytes = await pdf.save();
  return {
    bytes,
    filename: `snap-seller-net-sheet-${safeAddressSlug(layout.model.address)}.pdf`,
  };
}

export async function downloadSellerNetSheetPdf(input, browser = window) {
  const { bytes, filename } = await createSellerNetSheetPdf(input);
  let url;
  let link;
  try {
    url = browser.URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    link = browser.document.createElement("a");
    link.href = url;
    link.download = filename;
    link.hidden = true;
    browser.document.body.append(link);
    link.click();
    return { filename };
  } finally {
    try {
      link?.remove();
    } finally {
      if (url) browser.setTimeout(() => browser.URL.revokeObjectURL(url), 0);
    }
  }
}
