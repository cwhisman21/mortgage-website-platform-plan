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
    const candidate = line ? `${line} ${word}` : word;
    if (!line || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawRightAligned(page, text, { x, y, font, size, color = DARK_INK }) {
  page.drawText(text, { x: x - font.widthOfTextAtSize(text, size), y, font, size, color });
}

export async function createSellerNetSheetPdf(input) {
  const model = buildSellerNetSheetPdfModel(input);
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  pdf.setTitle(`${model.title} - ${model.address}`);
  pdf.setSubject("Seller net sheet planning estimate");
  pdf.setCreator("Snap Mortgage");
  pdf.setProducer("Snap Mortgage");
  const creationDate = /^\d{4}-\d{2}-\d{2}$/.test(String(input.generatedDate || ""))
    ? new Date(`${input.generatedDate}T00:00:00.000Z`)
    : new Date();
  pdf.setCreationDate(creationDate);

  let page;
  let y;

  const drawBrandHeader = (continuation = false) => {
    page.drawText(model.brand, { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 11, font: bold, size: BODY_SIZE, color: SNAP_BLUE });
    page.drawLine({
      start: { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 20 },
      end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - MARGIN - 20 },
      thickness: 2,
      color: SNAP_BLUE,
    });
    if (continuation) {
      page.drawText("Seller Net Sheet (continued)", { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 43, font: bold, size: 14, color: DARK_INK });
      const addressLines = wrapText(model.address, regular, BODY_SIZE, 310);
      addressLines.slice(0, 2).forEach((line, index) => {
        drawRightAligned(page, line, { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - MARGIN - 42 - (index * 14), font: regular, size: BODY_SIZE, color: MUTED_INK });
      });
      y = PAGE_HEIGHT - MARGIN - 72;
    } else {
      y = PAGE_HEIGHT - MARGIN - 48;
    }
  };

  const addPage = (continuation = true) => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawBrandHeader(continuation);
  };

  addPage(false);
  page.drawText(model.title, { x: MARGIN, y, font: bold, size: 26, color: DARK_INK });
  y -= 25;
  const addressLines = wrapText(model.address, regular, BODY_SIZE, PAGE_WIDTH - (MARGIN * 2));
  addressLines.forEach((line) => {
    page.drawText(line, { x: MARGIN, y, font: regular, size: BODY_SIZE, color: MUTED_INK });
    y -= 15;
  });
  y -= 3;
  page.drawText(`Generated ${model.generatedDate}`, { x: MARGIN, y, font: regular, size: BODY_SIZE, color: MUTED_INK });
  drawRightAligned(page, `Expected closing ${model.expectedClosingDate}`, { x: PAGE_WIDTH - MARGIN, y, font: regular, size: BODY_SIZE, color: MUTED_INK });
  y -= 32;

  const stripHeight = 68;
  page.drawRectangle({ x: MARGIN, y: y - stripHeight, width: PAGE_WIDTH - (MARGIN * 2), height: stripHeight, color: LIGHT_BLUE });
  const columnWidth = (PAGE_WIDTH - (MARGIN * 2)) / 3;
  model.values.forEach((value, index) => {
    const center = MARGIN + (columnWidth * index) + (columnWidth / 2);
    const labelWidth = regular.widthOfTextAtSize(value.label, BODY_SIZE);
    page.drawText(value.label, { x: center - (labelWidth / 2), y: y - 22, font: regular, size: BODY_SIZE, color: MUTED_INK });
    const size = value.dominant ? 18 : 14;
    const valueFont = value.dominant ? bold : regular;
    const amountWidth = valueFont.widthOfTextAtSize(value.amount, size);
    page.drawText(value.amount, { x: center - (amountWidth / 2), y: y - 47, font: valueFont, size, color: value.dominant ? SNAP_BLUE : DARK_INK });
  });
  y -= stripHeight + 24;

  const rowHeight = (row) => Math.max(24, wrapText(row.label, regular, BODY_SIZE, 330).length * 14 + 8);
  const sectionHeight = (section) => 31 + section.rows.reduce((height, row) => height + rowHeight(row), 0);
  const drawSectionTitle = (title) => {
    page.drawText(title, { x: MARGIN, y, font: bold, size: 14, color: DARK_INK });
    y -= 12;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 1, color: RULE });
    y -= 19;
  };
  const drawRow = (row) => {
    const lines = wrapText(row.label, regular, BODY_SIZE, 330);
    const height = rowHeight(row);
    lines.forEach((line, index) => page.drawText(line, { x: MARGIN, y: y - (index * 14), font: row.dominant ? bold : regular, size: BODY_SIZE, color: DARK_INK }));
    drawRightAligned(page, row.amount, { x: PAGE_WIDTH - MARGIN, y, font: row.dominant ? bold : regular, size: row.dominant ? 13 : BODY_SIZE, color: row.dominant ? SNAP_BLUE : DARK_INK });
    y -= height;
  };

  for (const section of model.sections) {
    if (y - sectionHeight(section) < MARGIN) addPage(true);
    drawSectionTitle(section.title);
    for (let index = 0; index < section.rows.length; index += 1) {
      const row = section.rows[index];
      if (y - rowHeight(row) < MARGIN) {
        addPage(true);
        drawSectionTitle(`${section.title} (continued)`);
      }
      drawRow(row);
    }
    y -= 10;
  }

  const comparisonHeight = 72;
  if (y - comparisonHeight < MARGIN) addPage(true);
  page.drawRectangle({ x: MARGIN, y: y - comparisonHeight, width: PAGE_WIDTH - (MARGIN * 2), height: comparisonHeight, borderColor: RULE, borderWidth: 1 });
  page.drawText("Final value comparison", { x: MARGIN + 14, y: y - 22, font: bold, size: BODY_SIZE, color: DARK_INK });
  model.comparison.forEach((result, index) => {
    const x = MARGIN + 14 + (index * ((PAGE_WIDTH - (MARGIN * 2) - 28) / 2));
    page.drawText(result.label, { x, y: y - 43, font: regular, size: BODY_SIZE, color: MUTED_INK });
    page.drawText(result.amount, { x, y: y - 61, font: bold, size: 13, color: DARK_INK });
  });
  y -= comparisonHeight + 18;

  const disclaimerLines = wrapText(model.disclaimer, regular, BODY_SIZE, PAGE_WIDTH - (MARGIN * 2));
  const disclaimerHeight = disclaimerLines.length * 14;
  if (y - disclaimerHeight < MARGIN) addPage(true);
  const disclaimerY = Math.min(y, MARGIN + disclaimerHeight - 11);
  disclaimerLines.forEach((line, index) => page.drawText(line, {
    x: MARGIN,
    y: disclaimerY - (index * 14),
    font: regular,
    size: BODY_SIZE,
    color: MUTED_INK,
  }));

  const bytes = await pdf.save();
  return {
    bytes,
    filename: `snap-seller-net-sheet-${safeAddressSlug(model.address)}.pdf`,
  };
}

export async function downloadSellerNetSheetPdf(input, browser = window) {
  const { bytes, filename } = await createSellerNetSheetPdf(input);
  const url = browser.URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = browser.document.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = true;
  browser.document.body.append(link);
  link.click();
  link.remove();
  browser.setTimeout(() => browser.URL.revokeObjectURL(url), 0);
  return { filename };
}
