import { assignMedia } from "./media.mjs";
import { slugify } from "./core.mjs";
import { authorIdForLocationNews } from "./author-assignment.mjs";

const PUBLISHER = {
  census: "U.S. Census Bureau",
  bls: "U.S. Bureau of Labor Statistics",
  fhfa: "Federal Housing Finance Agency",
  hud: "U.S. Department of Housing and Urban Development",
};

const CENSUS_MEASURE_LABELS = {
  population: "population",
  medianHouseholdIncome: "median household income",
  totalHousingUnits: "total housing units",
  occupiedUnits: "occupied housing units",
  vacantUnits: "vacant housing units",
  ownerOccupiedUnits: "owner-occupied housing units",
  renterOccupiedUnits: "renter-occupied housing units",
  medianGrossRent: "median gross rent",
  medianHomeValue: "median owner-occupied home value",
  medianOwnerCostWithMortgage: "median selected monthly owner costs for owners with a mortgage",
};

const PROGRAM_MEASURE_LABELS = {
  "conforming-oneUnit": "one-unit conforming limit",
  "conforming-twoUnit": "two-unit conforming limit",
  "conforming-threeUnit": "three-unit conforming limit",
  "conforming-fourUnit": "four-unit conforming limit",
  "fha-oneUnit": "one-unit FHA limit",
  "fha-twoUnit": "two-unit FHA limit",
  "fha-threeUnit": "three-unit FHA limit",
  "fha-fourUnit": "four-unit FHA limit",
  "county-count": "counties in the statewide summary",
  "conforming-min": "lowest one-unit conforming limit",
  "conforming-max": "highest one-unit conforming limit",
  "conforming-above": "counties above the conforming baseline",
  "fha-min": "lowest one-unit FHA limit",
  "fha-max": "highest one-unit FHA limit",
  "fha-above": "counties above the FHA floor",
};

const HPI_MEASURE_LABELS = {
  "hpi-index": "purchase-only HPI",
  "quarterly-change": "quarterly HPI change",
  "annual-change": "annual HPI change",
  "five-year-change": "five-year HPI change",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function sourcePeriodAsOf(record) {
  const period = String(record?.period || "").trim();
  const monthly = period.match(/^(\d{4})-M(\d{2})$/);
  if (monthly) return `${MONTH_NAMES[Number(monthly[2]) - 1]} ${monthly[1]}`;
  const quarterly = period.match(/^(\d{4})Q([1-4])$/);
  if (quarterly) return `${quarterly[1]} Q${quarterly[2]}`;
  if (/^\d{4}$/.test(period) && /ACS/i.test(record?.dataset || "")) return `${period} ACS 5-year estimates`;
  if (/^\d{4}$/.test(period) && /limit/i.test(record?.dataset || "")) return `${period} limits`;
  return period;
}

function governingEvidence(records) {
  const record = records[0];
  if (!record?.period) throw new Error("Location-news article requires governing evidence with a source period");
  return { sourcePeriod: String(record.period), asOf: sourcePeriodAsOf(record) };
}

function indefiniteArticleForLocation(locationName, capitalize = false) {
  const article = /^[aeio]/i.test(String(locationName || "").trim()) ? "an" : "a";
  return capitalize ? `${article[0].toUpperCase()}${article.slice(1)}` : article;
}

function formatNumber(value) {
  return Number(value).toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function formatMoney(value) {
  return `$${Math.round(Number(value)).toLocaleString("en-US")}`;
}

function formatPercent(value) {
  return `${Number(value).toFixed(1)}%`;
}

function formatPercentagePoints(value) {
  return `${Number(value).toFixed(1)} percentage points`;
}

function magnitudeDisplay(item) {
  return item?.value < 0 ? String(item.display).replace(/^-/, "") : String(item?.display || "");
}

function percentChange(current, prior) {
  if (!Number.isFinite(current) || !Number.isFinite(prior) || prior === 0) return null;
  return Number((((current / prior) - 1) * 100).toFixed(1));
}

function share(part, whole) {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole === 0) return null;
  return Number(((part / whole) * 100).toFixed(1));
}

function censusRecord(articleId, key, metric, metricKey) {
  return {
    sourceId: `${articleId}-source-${slugify(key)}`,
    publisher: PUBLISHER.census,
    dataset: metric.dataset || "Census ACS 5-year detailed tables",
    sourceUrl: metric.sourceUrl,
    variableOrSeriesId: metric.variableOrSeriesId,
    geographyType: metric.geographyType,
    geographyId: metric.geographyId,
    period: metric.period,
    releasedAt: metric.period === "2024" ? "2026-01-29" : null,
    retrievedAt: "2026-07-10",
    estimate: metric.estimate,
    marginOfError: metric.marginOfError,
    revisionStatus: "ACS estimates include sampling error and should be compared with their margins of error",
    citationLabel: `${PUBLISHER.census}, ${metric.period} ACS 5-year: ${CENSUS_MEASURE_LABELS[metricKey] || "housing estimate"}`,
  };
}

function laborRecord(articleId, key, bls, periodKey, measure, measureCode) {
  const period = bls[periodKey].period;
  return {
    sourceId: `${articleId}-source-${slugify(`${periodKey}-${key}`)}`,
    publisher: PUBLISHER.bls,
    dataset: "Local Area Unemployment Statistics",
    sourceUrl: bls.sourceUrl,
    variableOrSeriesId: bls.seriesIds.find((seriesId) => seriesId.endsWith(measureCode)) || `${bls.geographyId}-${measureCode}`,
    geographyType: bls.geographyType || (bls.geographyId.startsWith("ST") ? "state" : "city"),
    geographyId: bls.geographyId,
    period,
    releasedAt: null,
    retrievedAt: bls.retrievedAt,
    estimate: bls[periodKey][measure],
    marginOfError: null,
    revisionStatus: bls.revisionStatus,
    citationLabel: `${PUBLISHER.bls}, LAUS ${period}: ${key}`,
  };
}

function programRecord(articleId, key, publisher, dataset, sourceUrl, geographyId, estimate) {
  return {
    sourceId: `${articleId}-source-${slugify(key)}`,
    publisher,
    dataset,
    sourceUrl,
    variableOrSeriesId: key,
    geographyType: geographyId.length === 5 ? "county" : "state_counties",
    geographyId,
    period: "2026",
    releasedAt: null,
    retrievedAt: "2026-07-10",
    estimate,
    marginOfError: null,
    revisionStatus: "Current published program limit; verify the applicable county and unit count at comparison time",
    citationLabel: `${publisher}, ${dataset}: ${PROGRAM_MEASURE_LABELS[key] || key}`,
  };
}

function hpiRecord(articleId, key, hpi, estimate) {
  return {
    sourceId: `${articleId}-source-${slugify(key)}`,
    publisher: PUBLISHER.fhfa,
    dataset: "FHFA purchase-only state House Price Index",
    sourceUrl: hpi.sourceUrl,
    variableOrSeriesId: key,
    geographyType: "state",
    geographyId: hpi.state || null,
    period: hpi.period,
    releasedAt: null,
    retrievedAt: hpi.retrievedAt,
    estimate,
    marginOfError: null,
    revisionStatus: hpi.revisionStatus,
    citationLabel: `${PUBLISHER.fhfa}, state HPI ${hpi.period}: ${HPI_MEASURE_LABELS[key] || key}`,
  };
}

function fact(id, label, value, display, sourceRecordIds, comparison = false) {
  return { id, label, value, display, sourceRecordIds, comparison };
}

function factMap(facts) {
  return new Map(facts.map((item) => [item.id, item]));
}

function evidenceSection(byId, id, heading, body, evidenceFactIds) {
  const boundFacts = evidenceFactIds.map((factId) => byId.get(factId));
  if (boundFacts.some((item) => !item)) throw new Error(`Unknown evidence fact in section ${id}`);
  return {
    id,
    heading,
    body: [body],
    evidenceFactIds,
    sourceRecordIds: [...new Set(boundFacts.flatMap((item) => item.sourceRecordIds))],
  };
}

function trendWord(value, rising = "increased", falling = "decreased") {
  if (value > 0) return rising;
  if (value < 0) return falling;
  return "was unchanged";
}

function stableIndex(key, length) {
  let hash = 2166136261;
  for (const character of String(key)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % length;
}

function deterministicChoice(key, choices) {
  return choices[stableIndex(key, choices.length)];
}

function lowerSentenceStart(value) {
  const text = String(value || "");
  if (/^[A-Z]{2,}\b/.test(text)) return text;
  if (/^[A-Z][^,.]{0,80}(?:County|Parish|Borough|Municipality|Census Area|District of Columbia)(?:'s|\b)/.test(text)) return text;
  return text ? `${text[0].toLowerCase()}${text.slice(1)}` : text;
}

function sentenceAfterLocalFrame(value) {
  const withoutGenericTransition = String(value || "").replace(
    /^(?:In practical terms|For borrower planning|For the decision at hand),\s+/,
    "",
  );
  return lowerSentenceStart(withoutGenericTransition);
}

const PHRASE_VARIANTS = [
  ["A practical next step is to", ["A practical next step is to", "One useful next step is to", "Next, borrowers can"]],
  ["The next step is to", ["The next step is to", "Next, borrowers should", "A useful next step is to"]],
  ["A borrower can", ["A borrower can", "A borrower may", "Borrowers can"]],
  ["A borrower should", ["A borrower should", "Borrowers should", "The borrower should"]],
  ["Borrowers should", ["Borrowers should", "A borrower should", "The borrower should"]],
  ["For mortgage planning,", ["For mortgage planning,", "In mortgage planning,", "For a mortgage decision,"]],
  ["For planning,", ["For planning,", "As planning context,", "In a borrower worksheet,"]],
  ["For ownership,", ["For ownership,", "On the ownership side,", "For the ownership budget,"]],
  ["For renting,", ["For renting,", "On the rental side,", "For the rental budget,"]],
  ["can help", ["can help", "may help", "can still help"]],
  ["can use", ["can use", "may use", "can apply"]],
  ["can still", ["can still", "may still", "can nevertheless"]],
  ["does not establish", ["does not establish", "cannot establish", "does not prove"]],
  ["cannot establish", ["cannot establish", "does not establish", "cannot prove"]],
  ["does not determine", ["does not determine", "cannot determine", "does not decide"]],
  ["cannot determine", ["cannot determine", "does not determine", "cannot decide"]],
  ["does not identify", ["does not identify", "cannot identify", "does not reveal"]],
  ["cannot identify", ["cannot identify", "does not identify", "cannot reveal"]],
  ["does not show", ["does not show", "cannot show", "does not reveal"]],
  ["cannot show", ["cannot show", "does not show", "cannot reveal"]],
  ["do not show", ["do not show", "cannot show", "do not reveal"]],
  ["should not be treated as", ["should not be treated as", "should not serve as", "is not a substitute for"]],
  ["rather than", ["rather than", "instead of", "in place of"]],
  ["still requires", ["still requires", "continues to require", "still needs"]],
  ["remain necessary", ["remain necessary", "are still needed", "remain required"]],
  ["should therefore", ["should therefore", "therefore should", "should, as a result,"]],
  ["A practical", ["A practical", "One practical", "A useful"]],
];

function varySentence(sentence, key) {
  let output = sentence;
  for (const [needle, choices] of PHRASE_VARIANTS) {
    if (!output.includes(needle)) continue;
    output = output.replaceAll(needle, deterministicChoice(`${key}:phrase:${needle}`, choices));
  }
  return output;
}

function headingChoices(section) {
  const lower = lowerSentenceStart(section.heading);
  if (/(?:next|verify|lookup|matched|local-next|state-to-local|documentation)/i.test(section.id)) {
    return [section.heading, `Next step: ${lower}`, `Put the evidence to work: ${lower}`, `Borrower action: ${lower}`];
  }
  if (/(?:limit|boundary|cannot)/i.test(section.id)) {
    return [section.heading, `Evidence limits: ${lower}`, `Where the evidence stops: ${lower}`, `Keep the boundary clear: ${lower}`];
  }
  if (/(?:comparison|movement|change|program)/i.test(section.id)) {
    return [section.heading, `Read the comparison: ${lower}`, `What the comparison adds: ${lower}`, `Comparison view: ${lower}`];
  }
  if (/(?:baseline|published|latest|stock|cost|range)/i.test(section.id)) {
    return [section.heading, `Start with the evidence: ${lower}`, `The dated finding: ${lower}`, `Evidence at a glance: ${lower}`];
  }
  return [section.heading, `Borrower view: ${lower}`, `Planning context: ${lower}`, `Evidence check: ${lower}`];
}

const SECTION_ORDER_PATTERNS = [
  [0, 1, 2, 3, 4, 5],
  [0, 2, 1, 3, 4, 5],
  [0, 1, 3, 2, 4, 5],
  [0, 3, 1, 2, 4, 5],
  [0, 2, 3, 1, 4, 5],
  [0, 1, 2, 4, 3, 5],
];
const ANSWER_FIRST_ORDER_PATTERNS = SECTION_ORDER_PATTERNS.filter((pattern) => pattern[1] === 1);
const ANSWER_FIRST_ARTICLE_TYPES = new Set(["local_labor_market", "state_labor_market", "state_home_price_movement"]);

function varySections(sections, variationKey, articleType, facts, locationName) {
  const factsById = new Map(facts.map((fact) => [fact.id, fact]));
  const headingStructureCode = stableIndex(`${variationKey}:heading-structure`, 4 ** sections.length);
  const varied = sections.map((section, sectionIndex) => {
    const sentences = (section.body || [])
      .join(" ")
      .split(/(?<=[.!?])\s+/)
      .map((sentence, sentenceIndex) => varySentence(sentence, `${variationKey}:${section.id}:${sentenceIndex}`));
    if (sectionIndex === 0 && sentences.length) {
      const frame = deterministicChoice(`${variationKey}:lead-frame`, [
        "",
        "Start with the dated local finding: ",
        "The published evidence provides the starting point: ",
        "The local figures answer the first question: ",
      ]);
      if (frame) sentences[0] = `${frame}${sentences[0]}`;
    }
    for (const sentenceIndex of [1, 3]) {
      if (!sentences[sentenceIndex]) continue;
      if (/^(?:For|In|As|After|Before|On|At)\b/.test(sentences[sentenceIndex])) continue;
      const transition = deterministicChoice(`${variationKey}:${section.id}:${sentenceIndex}:transition`, [
        "",
        "In practical terms, ",
        "For borrower planning, ",
        "For the decision at hand, ",
      ]);
      if (transition) sentences[sentenceIndex] = `${transition}${lowerSentenceStart(sentences[sentenceIndex])}`;
    }
    let body = [sentences.join(" ")];
    if (sectionIndex > 0 && sentences.length >= 4) {
      const evidenceDisplays = (section.evidenceFactIds || [])
        .map((id) => factsById.get(id)?.display)
        .filter(Boolean)
        .flatMap((display) => [String(display), String(display).replace(/^-/, "")]);
      const splitCandidates = [2, Math.ceil(sentences.length / 2), 1]
        .filter((splitAt, index, candidates) => splitAt < sentences.length && candidates.indexOf(splitAt) === index)
        .filter((splitAt) => {
          const before = sentences.slice(0, splitAt).join(" ");
          const after = sentences.slice(splitAt).join(" ");
          return evidenceDisplays.some((display) => before.includes(display))
            && evidenceDisplays.some((display) => after.includes(display));
        });
      const splitAt = deterministicChoice(`${variationKey}:${section.id}:paragraphs`, [sentences.length, ...splitCandidates]);
      if (splitAt < sentences.length) {
        const continuationFrame = deterministicChoice(`${variationKey}:${section.id}:continuation`, [
          `For borrowers reviewing evidence from ${locationName}, `,
          `In a borrower review centered on ${locationName}, `,
          `Applied to a decision in ${locationName}, `,
          `For the next comparison in ${locationName}, `,
        ]);
        const continuation = sentences.slice(splitAt).join(" ");
        const framedContinuation = continuation.includes(locationName)
          ? continuation
          : `${continuationFrame}${sentenceAfterLocalFrame(continuation)}`;
        body = [sentences.slice(0, splitAt).join(" "), framedContinuation];
      }
    }
    body = body.map((paragraph, paragraphIndex) => {
      if (paragraph.includes(locationName)) return paragraph;
      const localFrame = deterministicChoice(`${variationKey}:${section.id}:${paragraphIndex}:local-frame`, [
        `For borrowers in ${locationName}, `,
        `In borrower planning for ${locationName}, `,
        `For a decision in ${locationName}, `,
        `As local context for ${locationName}, `,
      ]);
      return `${localFrame}${sentenceAfterLocalFrame(paragraph)}`;
    });
    const headings = headingChoices(section);
    const headingIndex = Math.floor(headingStructureCode / (4 ** sectionIndex)) % headings.length;
    return {
      ...section,
      heading: headings[headingIndex],
      body,
    };
  });
  const orderPatterns = ANSWER_FIRST_ARTICLE_TYPES.has(articleType) ? ANSWER_FIRST_ORDER_PATTERNS : SECTION_ORDER_PATTERNS;
  const order = deterministicChoice(`${variationKey}:section-order`, orderPatterns);
  return order.map((index) => varied[index]);
}

function displayPublishedGeography(value) {
  const text = String(value || "").trim();
  if (!text) return "the matched county or county-equivalent area";
  if (text !== text.toUpperCase()) return text;
  return text.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function buildAffordabilitySections({ locationName, facts }) {
  const byId = factMap(facts);
  const homeValue = byId.get("median-home-value");
  const priorValue = byId.get("prior-home-value");
  const income = byId.get("median-household-income");
  const ownerCost = byId.get("median-owner-cost");
  const stateValue = byId.get("state-home-value");
  const stateGap = byId.get("state-home-value-gap");
  const statePosition = homeValue.value >= stateValue.value ? "above" : "below";
  return [
    evidenceSection(byId, "local-baseline", "The local value, income, and owner-cost baseline", `In ${locationName}, the 2024 ACS reports a median owner-occupied home value of ${homeValue.display}, median household income of ${income.display}, and median selected monthly owner costs of ${ownerCost.display} for owners with a mortgage. Together, those three reference points can help a borrower identify which search-price, income, and recurring-cost assumptions need current verification first. They remain separate medians, not the finances of one representative household, and the ${ownerCost.display} measure combines recurring ownership expenses rather than real estate taxes alone. A useful affordability review starts with ${homeValue.display}, ${income.display}, and ${ownerCost.display}, then replaces them with the borrower's documented income, cash, debts, property taxes, insurance, association charges, loan terms, and intended occupancy.`, ["median-home-value", "median-household-income", "median-owner-cost"]),
    evidenceSection(byId, "vintage-observations", "Read the ACS vintages as separate nominal observations", `The 2019 ACS published ${priorValue.display} as ${locationName}'s median owner-occupied home-value estimate, while the 2024 ACS published ${homeValue.display}. These dated nominal observations can help a borrower notice that a search budget built around the older release needs current property evidence. They are not inflation-adjusted, and the ACS home-value methodology changed between these vintages, so the two dollar figures are not a like-for-like appreciation series and should not be converted into a precise percentage change. Each estimate also summarizes a multi-year survey window and carries sampling error. Keep ${priorValue.display} attached to 2019 and ${homeValue.display} attached to 2024, then use current listings, comparable properties, and financing disclosures for the decision at hand.`, ["prior-home-value", "median-home-value"]),
    evidenceSection(byId, "state-comparison", "How the city estimate sits within the state", `${locationName}'s ${homeValue.display} median home-value estimate is ${statePosition} the statewide ${stateValue.display} estimate, with a reported city-to-state gap of ${stateGap.display}. That ${stateGap.display} gap is useful for showing that a statewide midpoint may be a poor substitute for a local search range in ${locationName}. It does not mean every local property is ${stateGap.display} away from a comparable property elsewhere in the state, because the medians reflect different housing mixes and geographies. A borrower can use ${homeValue.display} and ${stateValue.display} to decide which assumptions need local replacement first, then compare actual properties and current financing disclosures on the same basis.`, ["median-home-value", "state-home-value", "state-home-value-gap"]),
    evidenceSection(byId, "owner-cost-boundary", "What the owner-cost estimate includes and excludes", `The ${ownerCost.display} owner-cost estimate gives ${locationName} borrowers a broader monthly reference than principal and interest alone, while the ${income.display} income estimate supplies separate household context. The two medians should not be divided to claim that a typical household spends a particular share of income, because ACS does not say the household at ${income.display} is the owner household at ${ownerCost.display}. The ${homeValue.display} local home-value estimate adds market context, but it also cannot supply a down payment, interest rate, mortgage insurance amount, tax bill, or insurance quote. Keeping ${homeValue.display}, ${income.display}, and ${ownerCost.display} in their published roles prevents a local affordability worksheet from acquiring false precision before a property and borrower are known.`, ["median-owner-cost", "median-household-income", "median-home-value"]),
    evidenceSection(byId, "decision-limits", "What these local medians cannot decide", `Neither the 2024 ${homeValue.display} estimate nor the ${ownerCost.display} owner-cost median determines the value of a specific ${locationName} home, a borrower's payment, or an underwriting result. The ${income.display} median describes the local household distribution, not the stability, continuity, documentation, or eligible amount of an applicant's income. The separate 2019 observation of ${priorValue.display} also cannot forecast the next market move or establish a safe purchase horizon. Those boundaries keep the published value, owner-cost, and income statistics from being misused as an appraisal, rate quote, underwriting result, or recommendation about how much debt one household should carry.`, ["median-home-value", "prior-home-value", "median-owner-cost", "median-household-income"]),
    evidenceSection(byId, "next-comparison", "Build a property-specific comparison", `A practical ${locationName} worksheet can begin with ${homeValue.display} as dated value context, ${ownerCost.display} as a reminder to include recurring ownership expenses, and ${income.display} as a local economic reference. After noting those published medians, substitute a real property price, down-payment plan, current loan disclosures, taxes, insurance, association obligations, maintenance allowance, and cash reserves. The ${stateGap.display} city-to-state difference is a prompt to keep the analysis local, while the separate ${priorValue.display} 2019 observation is a prompt to date every assumption without calculating a cross-vintage growth rate. A licensed professional can explain which inputs are verified, which may change, and which loan options fit the documented borrower and property without presenting the ACS figures as an outcome.`, ["median-home-value", "prior-home-value", "median-owner-cost", "median-household-income", "state-home-value-gap"]),
  ];
}

function buildHousingSupplySections({ locationName, facts }) {
  const byId = factMap(facts);
  const units = byId.get("housing-units");
  const occupied = byId.get("occupied-units");
  const vacant = byId.get("vacant-units");
  const priorVacant = byId.get("prior-vacant-units");
  const vacancyShare = byId.get("vacancy-share");
  const vacancyChange = byId.get("vacancy-count-change");
  const ownerShare = byId.get("owner-share");
  const renterShare = byId.get("renter-share");
  const rent = byId.get("median-rent");
  const vacancyDirection = trendWord(vacancyChange.value, "increased", "decreased");
  const vacancyMovement = magnitudeDisplay(vacancyChange);
  const tenureLead = ownerShare.value >= renterShare.value ? "owner-occupied" : "renter-occupied";
  return [
    evidenceSection(byId, "stock-baseline", "The size and use of the local housing stock", `${locationName}'s current ACS housing baseline includes ${units.display} total housing units, ${occupied.display} occupied units, and ${vacant.display} vacant units. Those counts can help a borrower establish the scale of the measured housing base before comparing tenure, rent, current listings, property condition, and financing. The figures describe stock across the survey period; they do not say that ${vacant.display} homes were listed for sale or available to rent at one moment. Reading ${units.display} total units with ${occupied.display} occupied and ${vacant.display} vacant units keeps the release internally grounded while leaving live availability to current listing and property evidence.`, ["housing-units", "occupied-units", "vacant-units"]),
    evidenceSection(byId, "vacancy-comparison", "Vacancy changed, but it is not listing inventory", `Vacant units in ${locationName} ${vacancyDirection} from ${priorVacant.display} in the prior ACS period to ${vacant.display} in the current release, a reported movement of ${vacancyMovement}. In the current housing stock, ${vacant.display} units equal ${vacancyShare.display} of the ${units.display} total. ACS vacancy covers several statuses, so the ${vacancyShare.display} share cannot be read as the share of homes a buyer can purchase today or the share of rentals immediately available. The movement from ${priorVacant.display} to ${vacant.display} can still prompt better questions about current for-sale and rental inventory in ${locationName}, provided those questions are answered with timely listing and property data rather than the survey count alone.`, ["prior-vacant-units", "vacant-units", "vacancy-count-change", "vacancy-share", "housing-units"]),
    evidenceSection(byId, "tenure-mix", "Ownership and renting within occupied housing", `Among ${occupied.display} occupied units in ${locationName}, the ACS-derived owner share is ${ownerShare.display} and the renter share is ${renterShare.display}, making ${tenureLead} housing the larger measured tenure group. The ${ownerShare.display} and ${renterShare.display} figures describe how occupied units were distributed; they do not measure how many households are ready to buy, how many owners plan to sell, or which properties can qualify for a mortgage. This local tenure mix helps a borrower avoid assuming that one housing path dominates every segment of ${locationName}. The ${ownerShare.display} and ${renterShare.display} mix is most useful when paired with actual choices at a similar property type, location, condition, and time horizon rather than used as a signal to buy or rent by itself.`, ["occupied-units", "owner-share", "renter-share"]),
    evidenceSection(byId, "rent-context", "Use rent as a matched comparison, not a shortcut", `${locationName}'s ACS median gross rent is ${rent.display}, while renter-occupied units account for ${renterShare.display} of occupied housing and owner-occupied units account for ${ownerShare.display}. The ${rent.display} median includes rent and certain utilities for the measured rental stock; it does not identify a lease offer comparable to a home under consideration. Comparing ${rent.display} with only a mortgage's principal and interest would omit taxes, insurance, maintenance, association charges, transaction costs, and differences between the properties. A more useful ${locationName} comparison matches real lease and ownership choices over the same expected horizon, then treats the tenure shares as market context instead of a break-even calculation.`, ["median-rent", "renter-share", "owner-share"]),
    evidenceSection(byId, "supply-limits", "What the housing-stock evidence cannot show", `The ${vacancyShare.display} vacant-unit share and ${ownerShare.display} owner share cannot determine competition for a specific ${locationName} listing, seller flexibility, inspection risk, appraisal results, insurance availability, or future supply. Likewise, ${units.display} total units say nothing about how many properties fit a borrower's price, location, accessibility, unit-count, or condition requirements. The ACS period behind the ${vacancyShare.display} vacancy share can accurately describe the broad stock while lagging a fast-moving listing market. Borrowers should therefore keep ${vacant.display} vacant units separate from active inventory and keep the ${rent.display} median separate from a current lease quote, using each figure only for the question its definition can answer.`, ["vacancy-share", "owner-share", "housing-units", "vacant-units", "median-rent"]),
    evidenceSection(byId, "matched-options", "Compare current local choices on the same terms", `A grounded ${locationName} comparison starts with current listings and lease offers, then uses the ACS evidence to check whether the sample is being interpreted in the context of ${units.display} total units, a vacancy share of ${vacancyShare.display}, and an owner share of ${ownerShare.display}. For renting, replace the ${rent.display} median with the actual lease, utilities, deposits, and expected changes. For ownership, keep the ${ownerShare.display} share as market context while adding the selected property's price, taxes, insurance, maintenance, association obligations, loan disclosures, and cash-to-close. The resulting worksheet will not turn ${renterShare.display} or ${ownerShare.display} into a recommendation, but it will keep the two paths comparable and make the remaining assumptions visible before a decision.`, ["housing-units", "vacancy-share", "owner-share", "renter-share", "median-rent"]),
  ];
}

function buildLaborSections({ locationName, facts, context, asOf }) {
  const byId = factMap(facts);
  const laborForce = byId.get("labor-force");
  const employment = byId.get("employment");
  const unemployment = byId.get("unemployment");
  const rate = byId.get("unemployment-rate");
  const previousRate = byId.get("previous-rate");
  const yearAgoRate = byId.get("year-ago-rate");
  const monthlyChange = byId.get("monthly-rate-change");
  const annualChange = byId.get("annual-rate-change");
  const scope = context.location.id.startsWith("city-") ? "city" : "state";
  const monthlyDirection = trendWord(monthlyChange.value, "rose", "fell");
  const annualDirection = trendWord(annualChange.value, "rose", "fell");
  const monthlyMovement = magnitudeDisplay(monthlyChange);
  const annualMovement = magnitudeDisplay(annualChange);
  const previousAsOf = sourcePeriodAsOf({ period: context.bls.previous.period });
  const yearAgoAsOf = sourcePeriodAsOf({ period: context.bls.yearAgo.period });
  return [
    evidenceSection(byId, "monthly-movement", "What changed in the latest month", `As of ${asOf}, ${locationName}'s unemployment rate ${monthlyDirection} from ${previousRate.display} in ${previousAsOf} to ${rate.display} in ${asOf}, a change of ${monthlyMovement}. That movement may matter when a borrower is pressure-testing timing, reserves, or the documentation needed after a job or income change. It does not show that a particular employer is hiring or cutting jobs, and it cannot establish one applicant's income stability, mortgage eligibility, or loan price. The release also estimates ${unemployment.display} people unemployed within a labor force of ${laborForce.display}, which shows the scale of the movement without turning a ${scope}-level statistic into a borrower-level conclusion. Because LAUS values can be revised, keep the ${asOf} source period attached to the comparison and verify household records separately.`, ["previous-rate", "unemployment-rate", "monthly-rate-change", "unemployment", "labor-force"]),
    evidenceSection(byId, "annual-movement", "What changed over the year", `Over the year ending ${asOf}, ${locationName}'s unemployment rate ${annualDirection} from ${yearAgoRate.display} in ${yearAgoAsOf} to ${rate.display}, a change of ${annualMovement}. That wider window helps show whether ${locationName}'s latest monthly movement sits inside a longer pattern, while the one-month movement of ${monthlyMovement} answers a shorter timing question. Neither comparison predicts the next labor-market release for ${locationName} or describes the stability of one household's earnings. For mortgage planning in ${locationName}, the practical consequence is to date broad economic assumptions and then return to current pay history, variable compensation, self-employment records, contracts, leave, job changes, assets, and debts. Those borrower records carry more weight in a loan review than movement in ${locationName}'s broad labor-market estimates.`, ["year-ago-rate", "unemployment-rate", "annual-rate-change", "monthly-rate-change"]),
    evidenceSection(byId, "labor-baseline", "The counts behind the published rate", `For the ${asOf} source period, BLS estimated ${laborForce.display} people in the ${locationName} labor force, including ${employment.display} employed and ${unemployment.display} unemployed under LAUS definitions. The employment and unemployment counts belong together because they establish the scale behind the published ${rate.display} rate. For mortgage planning, that ${scope}-level labor force describes the surrounding economy rather than the income or employment record of an applicant. It can help a borrower understand the size of the measured market, but qualification still depends on documented income, employment continuity, debts, assets, property facts, and the rules of the loan being considered. The counts should therefore follow the change summary instead of replacing the borrower answer.`, ["labor-force", "employment", "unemployment", "unemployment-rate"]),
    evidenceSection(byId, "counts-and-rate", "Why the rate needs its underlying counts", `At ${rate.display}, ${locationName}'s unemployment rate summarizes ${unemployment.display} unemployed people within a labor force of ${laborForce.display}; the rate should not be discussed without those counts. The ${employment.display} employment estimate is an economic measure and does not distinguish borrowers by hours, tenure, pay structure, industry, or the documentation available for a loan file. That makes ${employment.display} useful for local context but unsuitable as evidence that one household's income is stable or sufficient. Keeping the ${rate.display} rate attached to ${laborForce.display}, ${employment.display}, and ${unemployment.display} prevents a small percentage movement from carrying more borrower-level meaning than the LAUS release supports.`, ["unemployment-rate", "unemployment", "labor-force", "employment"]),
    evidenceSection(byId, "borrower-boundary", "Labor statistics are not an income review", `Neither ${employment.display} employed people nor an unemployment rate of ${rate.display} tells a lender what an applicant in ${locationName} earns, whether that income is eligible, or whether it is likely to continue. The monthly movement of ${monthlyMovement} also cannot substitute for pay stubs, tax returns, business records, contracts, benefit documentation, or an explanation of a recent job transition. The ${rate.display} rate can be relevant to timing and local economic questions while remaining outside the underwriting decision. That boundary protects borrowers from treating the year-over-year movement of ${annualMovement} in either direction as an approval signal or as a conclusion about their own documented capacity.`, ["employment", "unemployment-rate", "monthly-rate-change", "annual-rate-change"]),
    evidenceSection(byId, "documentation-next-step", "Turn the trend into documentation questions", `A practical next step for borrowers in ${locationName} is to note the latest ${rate.display} unemployment rate and the year-over-year movement of ${annualMovement}, then move immediately to the records that describe the household. After noting the ${rate.display} rate, compare current base pay, variable earnings, self-employment history, contracts, assets, debts, and expected changes with the documentation requirements for the loan path. The ${laborForce.display} local labor force and ${employment.display} employment count can frame the economic conversation, but they should not alter verified borrower inputs. The monthly movement of ${monthlyMovement} remains a population measure even when it appears consistent with a borrower's personal experience. A licensed professional can explain which documents and time periods matter while keeping ${locationName}'s ${rate.display} LAUS rate in its proper role as dated local economic context.`, ["unemployment-rate", "annual-rate-change", "monthly-rate-change", "labor-force", "employment"]),
  ];
}

function buildCityLoanLimitSections({ locationName, facts, context }) {
  const byId = factMap(facts);
  const conformingOne = byId.get("conforming-one");
  const conformingFour = byId.get("conforming-four");
  const fhaOne = byId.get("fha-one");
  const fhaFour = byId.get("fha-four");
  const difference = byId.get("one-unit-difference");
  const geographyName = displayPublishedGeography(context.limits?.conforming?.countyName || context.limits?.fha?.countyName);
  const sameOneUnitLimit = conformingOne.value === fhaOne.value;
  return [
    evidenceSection(byId, "published-limits", "The published one-unit limits for the matched area", `${locationName} is connected to ${geographyName} for this 2026 source comparison. The published one-unit conforming limit is ${conformingOne.display}, while the published one-unit FHA limit is ${fhaOne.display}. Those figures organize different program categories; ${conformingOne.display} is not a conventional loan offer, and ${fhaOne.display} is not an FHA eligibility finding. For ${locationName}, starting with ${geographyName} keeps the limits attached to the county or county-equivalent area used in the official files. Borrowers in ${locationName} still need to confirm the selected property's location and legal unit count, because the relevant ${geographyName} row follows the property rather than the city label or mailing address alone. Around ${locationName}, mailing cities and ZIP codes can cross county boundaries, so the official property jurisdiction should be verified instead of inferred from a familiar place name. Keep ${geographyName} as ${locationName}'s confirmed county row before comparing the ${conformingOne.display} and ${fhaOne.display} program boundaries.`, ["conforming-one", "fha-one"]),
    evidenceSection(byId, "one-unit-comparison", "How the one-unit program boundaries compare", `For the matched ${locationName} area, the difference between the ${conformingOne.display} one-unit conforming limit and the ${fhaOne.display} one-unit FHA limit is ${difference.display}. ${sameOneUnitLimit ? `In this release the two one-unit figures are equal at ${conformingOne.display}, so the comparison does not create a larger published boundary for either program.` : `The ${difference.display} gap marks different published program boundaries, not a pricing advantage or a recommendation to borrow more.`} A needed loan amount can be compared with ${conformingOne.display} and ${fhaOne.display} only after price, down payment, financed items, and the applicable base-loan definition are established. Even when ${difference.display} is material, it cannot determine approval, mortgage insurance, cash requirements, rates, fees, or whether either program suits the borrower.`, ["conforming-one", "fha-one", "one-unit-difference"]),
    evidenceSection(byId, "unit-count", "Unit count changes the published ceiling", `${geographyName}'s conforming limit rises from ${conformingOne.display} for one unit to ${conformingFour.display} for four units, while the FHA figures move from ${fhaOne.display} to ${fhaFour.display}. The higher ${conformingFour.display} and ${fhaFour.display} amounts apply to the published four-unit category; they do not apply to a one-unit home merely because a borrower wants a larger loan. In ${locationName}, a legal unit count should be verified from reliable property information before a multi-unit limit is used. The ${conformingFour.display} and ${fhaFour.display} ceilings do not resolve occupancy, appraisal, rental-income treatment, reserves, or other multi-unit program rules, so the amount in the table is only one part of the product discussion.`, ["conforming-one", "conforming-four", "fha-one", "fha-four"]),
    evidenceSection(byId, "category-boundary", "A limit is a category boundary, not borrowing power", `The ${conformingOne.display} conforming ceiling and ${fhaOne.display} FHA ceiling classify a loan amount within their respective 2026 county tables; neither amount increases household income in ${locationName} or reduces household debts. A borrower seeking less than ${conformingOne.display} can still have important conventional requirements to review, and a request below ${fhaOne.display} can still require FHA-specific eligibility, property, mortgage-insurance, and occupancy analysis. The ${difference.display} program gap is therefore best used to route questions, not to rank products. Regardless of the ${difference.display} gap, borrowing capacity comes from the documented borrower, property, transaction, and current underwriting rules rather than the largest number available in a public limit file.`, ["conforming-one", "fha-one", "one-unit-difference"]),
    evidenceSection(byId, "limit-boundaries", "What the county limits cannot decide", `Neither ${conformingFour.display} nor ${fhaFour.display} indicates what a four-unit property in ${locationName} is worth, what income its units may produce, or whether a borrower can qualify to purchase it. The one-unit ${conformingOne.display} and ${fhaOne.display} limits likewise cannot establish a down payment, debt-to-income result, appraisal, reserves, mortgage insurance, interest rate, fees, or final approval. The ${conformingOne.display} and ${fhaOne.display} official limits can change by year, and a corrected property geography or unit count can change the applicable row. That is why ${locationName}'s connection to ${geographyName} and the 2026 period must remain visible whenever these figures are carried into a planning worksheet or product conversation.`, ["conforming-four", "fha-four", "conforming-one", "fha-one"]),
    evidenceSection(byId, "verify-next", "Verify the property before comparing products", `A useful ${locationName} next step is to document the property address, ${geographyName} geography, legal unit count, price, down-payment plan, and expected base loan amount. Compare that amount with ${conformingOne.display} and ${fhaOne.display} for a one-unit property, or with ${conformingFour.display} and ${fhaFour.display} only when the four-unit category is actually applicable. After the ${conformingOne.display} and ${fhaOne.display} comparison, ask a licensed professional to verify the current official row and explain the borrower, property, occupancy, insurance, and documentation rules attached to each option. The ${conformingOne.display} conforming figure and ${fhaOne.display} FHA figure should remain dated to 2026 throughout that review. This sequence uses the ${difference.display} one-unit gap as planning context while avoiding any promise that a published ceiling is available, affordable, or appropriate.`, ["conforming-one", "fha-one", "conforming-four", "fha-four", "one-unit-difference"]),
  ];
}

function buildStateHpiSections({ locationName, facts, asOf }) {
  const byId = factMap(facts);
  const index = byId.get("hpi-index");
  const quarterly = byId.get("quarterly-change");
  const annual = byId.get("annual-change");
  const fiveYear = byId.get("five-year-change");
  const quarterDirection = trendWord(quarterly.value, "rose", "fell");
  const annualDirection = trendWord(annual.value, "rose", "fell");
  const longDirection = trendWord(fiveYear.value, "rose", "fell");
  const quarterlyMovement = magnitudeDisplay(quarterly);
  const annualMovement = magnitudeDisplay(annual);
  const fiveYearMovement = magnitudeDisplay(fiveYear);
  const locationArticle = indefiniteArticleForLocation(locationName, true);
  return [
    evidenceSection(byId, "short-and-annual", "What changed over the quarter and year", `As of ${asOf}, ${locationName}'s purchase-only HPI ${quarterDirection} ${quarterlyMovement} over the latest quarter and ${annualDirection} ${annualMovement} over the year. The quarterly window is more sensitive to recent movement, while the annual window compares the latest quarter with the matching quarter one year earlier. That difference may matter when a borrower checks whether search, offer, or refinance assumptions still fit the broad direction of the state market. If the two windows diverge, timing is part of the answer; if they align, local variation still remains. Neither change identifies a home's value, a competitive offer, an affordable payment, or what the index will do next, so current property and financing evidence must carry the decision.`, ["quarterly-change", "annual-change"]),
    evidenceSection(byId, "longer-run", "Place the latest movement in a longer sequence", `Over the five years ending ${asOf}, the ${locationName} HPI ${longDirection} ${fiveYearMovement}, compared with the latest annual movement of ${annualMovement}. The longer window shows how far the repeat-sale index moved across several market cycles, while the one-year figure gives more weight to recent conditions. That contrast may help a borrower recognize when an older search budget, equity assumption, or comparable sale needs fresh evidence. It does not justify applying the five-year percentage to an old purchase price, and it cannot forecast a future sale. Even when the long and short directions agree, current comparable properties, taxes, insurance, financing costs, condition, and a property-specific payment worksheet remain necessary before the trend informs a mortgage decision.`, ["five-year-change", "annual-change", "hpi-index"]),
    evidenceSection(byId, "latest-index", "The index level is context, not a home price", `${locationName}'s latest FHFA purchase-only HPI level is ${index.display}. That number is a benchmark for repeat-sale price movement, not a dollar-denominated typical home price, listing price, or appraisal. Reading the ${index.display} level with the ${quarterly.display} quarterly change keeps the index itself separate from its rate of movement. A borrower can use the dated level to identify the release being discussed, but not to value a selected property. Local inventory, property type, condition, concessions, taxes, insurance, maintenance, association costs, and financing terms still need current evidence. This boundary is especially important when broad statewide movement differs from the neighborhood, price band, or property type involved in an actual purchase, refinance, or equity review.`, ["hpi-index", "quarterly-change"]),
    evidenceSection(byId, "market-context", "Use the index to test local assumptions", `${locationArticle} ${locationName} search plan can use the quarterly, annual, and five-year windows to ask whether current listings, seller concessions, and property types resemble the broad state movement. At an annual movement of ${annualMovement}, the dated ${index.display} index level provides a reference point for that question without supplying a sale price. If the windows point in different directions, the divergence shows why the selected period matters; if they point together, statewide consistency still does not erase local variation. The plan should therefore compare the broad pattern with current listings and recent property-level evidence rather than treating any percentage as a forecast. FHFA HPI measures repeat-sale movement, not the complete set of homes available to one borrower.`, ["quarterly-change", "annual-change", "five-year-change", "hpi-index"]),
    evidenceSection(byId, "valuation-boundary", "The HPI cannot value a property or set a payment", `An HPI level of ${index.display} does not establish the dollar value of a property in ${locationName}, and an annual movement of ${annualMovement} does not establish how much any home gained or lost. The index excludes the borrower's down payment, loan amount, interest rate, taxes, insurance, association costs, repairs, and time horizon. FHFA can also revise published values, so the ${quarterlyMovement} and ${fiveYearMovement} comparisons should retain their source period. The ${index.display} level must remain separate from the dollar figures used in a property review. Those limits make the state index useful for orientation but unsuitable as an appraisal, offer recommendation, equity calculation, promised appreciation claim, payment quote, or underwriting conclusion.`, ["hpi-index", "annual-change", "quarterly-change", "five-year-change"]),
    evidenceSection(byId, "local-next-step", "Connect the state trend to current property evidence", `A practical ${locationName} borrower review can record ${quarterlyMovement}, ${annualMovement}, and ${fiveYearMovement} as statewide trend markers, then compare them with current local listings and recent property-level evidence. For a purchase, keep the ${quarterlyMovement} state movement as context while adding the selected price, inspection findings, appraisal process, taxes, insurance, cash-to-close, and loan disclosures. For a refinance or equity question, begin with a defensible property review rather than multiplying a prior value by ${annualMovement} or ${fiveYearMovement}. This approach preserves the information in the ${index.display} HPI while giving current local and borrower-specific facts the decision-making role that a statewide repeat-sale index cannot fill.`, ["quarterly-change", "annual-change", "five-year-change", "hpi-index"]),
  ];
}

function buildStateHousingSections({ locationName, facts }) {
  const byId = factMap(facts);
  const homeValue = byId.get("home-value");
  const priorValue = byId.get("prior-home-value");
  const income = byId.get("income");
  const ownerCost = byId.get("owner-cost");
  const rent = byId.get("rent");
  const units = byId.get("housing-units");
  const ownerShare = byId.get("owner-share");
  const renterShare = byId.get("renter-share");
  const vacancyShare = byId.get("vacancy-share");
  const tenureLead = ownerShare.value >= renterShare.value ? "owner-occupied" : "renter-occupied";
  return [
    evidenceSection(byId, "state-cost-baseline", "Statewide value, income, and owner costs", `${locationName}'s 2024 ACS housing baseline reports a median owner-occupied home value of ${homeValue.display}, median household income of ${income.display}, and median selected monthly owner costs of ${ownerCost.display} for owners with a mortgage. Those three reference points can help a borrower identify which statewide value, income, and recurring-cost assumptions need local replacement first. They remain separate medians, not the price, income, and monthly budget of one typical household, and the ${ownerCost.display} measure is not a real-estate-tax figure or a current mortgage quote. A real decision still requires local property evidence, borrower documentation, taxes, insurance, maintenance, association obligations, and current loan information.`, ["home-value", "income", "owner-cost"]),
    evidenceSection(byId, "owner-and-renter-costs", "Keep owner costs and rent comparable", `The same ${locationName} release reports ${rent.display} in median gross rent alongside ${ownerCost.display} in median selected monthly owner costs for owners with a mortgage. The two measures cover different housing populations and cost definitions, so ${rent.display} should not be compared with only principal and interest or used to declare a statewide break-even point. A useful comparison replaces the ${rent.display} and ${ownerCost.display} medians with a current lease and a current property budget, including utilities, taxes, insurance, maintenance, association obligations, transaction costs, and the expected time horizon. The ${income.display} statewide median can provide economic context, but dividing it by either ${rent.display} or ${ownerCost.display} would still combine medians that do not represent the same household.`, ["rent", "owner-cost", "income"]),
    evidenceSection(byId, "state-tenure", "How occupied housing is divided by tenure", `Across ${locationName}'s measured housing stock of ${units.display} units, the owner share of occupied housing is ${ownerShare.display} and the renter share is ${renterShare.display}, making ${tenureLead} housing the larger statewide tenure group. The ${ownerShare.display} and ${renterShare.display} shares describe how occupied units were distributed during the survey period; they do not measure current buyer demand, owner willingness to sell, or renter readiness to purchase. The ${ownerShare.display} and ${renterShare.display} statewide tenure split is useful for understanding scale and checking assumptions about the housing mix. It remains too broad to select a product or characterize a particular city, county, property type, or household inside ${locationName}.`, ["housing-units", "owner-share", "renter-share"]),
    evidenceSection(byId, "state-vacancy", "Vacancy is broader than homes for sale", `${locationName}'s vacant-unit share is ${vacancyShare.display} within a statewide stock of ${units.display} housing units. ACS vacancy includes categories beyond property currently offered for sale or rent, so ${vacancyShare.display} is not a live inventory rate and cannot measure competition for a selected home. Read beside the ${ownerShare.display} owner share and ${renterShare.display} renter share, the vacancy figure helps describe how the broad stock was classified without predicting near-term supply. Borrowers should use current listings, property condition, days on market, concessions, and local professional context to answer transaction questions that ${vacancyShare.display} and ${units.display} were not designed to resolve.`, ["vacancy-share", "housing-units", "owner-share", "renter-share"]),
    evidenceSection(byId, "state-vintage-observations", "Keep the statewide ACS vintages separate", `The 2019 ACS published ${priorValue.display} as ${locationName}'s median owner-occupied home-value estimate, while the 2024 ACS published ${homeValue.display}. These nominal statewide observations can help show why an older planning reference needs current local evidence. They are not inflation-adjusted, and the ACS home-value methodology changed between the vintages, so the two dollar figures are not a like-for-like appreciation series and should not be converted into a precise percentage change. Both values summarize multi-year survey windows and carry sampling error. Keep ${priorValue.display} attached to 2019 and ${homeValue.display} attached to 2024, then use current local and property-specific evidence for purchase, refinance, or equity assumptions.`, ["prior-home-value", "home-value"]),
    evidenceSection(byId, "state-to-local", "Move from statewide context to a local worksheet", `A borrower can carry ${homeValue.display}, ${ownerCost.display}, ${rent.display}, and the ${vacancyShare.display} vacancy share into a local comparison as dated statewide context, then replace each with evidence matched to the actual decision. For ownership, replace the ${homeValue.display} and ${ownerCost.display} medians with a selected price, down payment, current loan disclosures, taxes, insurance, maintenance, association obligations, and cash reserves. For renting, replace the ${rent.display} median with a comparable lease, utilities, deposits, and expected changes over the same horizon. The ${renterShare.display} renter share is useful for describing the statewide tenure mix, not for predicting which local option will be available. The ${ownerShare.display} tenure measure can help explain the statewide housing mix, but it cannot decide whether buying, renting, refinancing, or using equity is suitable for one ${locationName} household.`, ["home-value", "owner-cost", "rent", "vacancy-share", "owner-share", "renter-share"]),
  ];
}

function buildStateLoanLimitSections({ locationName, facts }) {
  const byId = factMap(facts);
  const countyCount = byId.get("county-count");
  const conformingLow = byId.get("conforming-range-low");
  const conformingHigh = byId.get("conforming-range-high");
  const fhaLow = byId.get("fha-range-low");
  const fhaHigh = byId.get("fha-range-high");
  const countiesAbove = byId.get("counties-above");
  const conformingVaries = conformingLow.value !== conformingHigh.value;
  const fhaVaries = fhaLow.value !== fhaHigh.value;
  return [
    evidenceSection(byId, "statewide-conforming-range", "The conforming range across county records", `${locationName}'s statewide summary covers ${countyCount.display} county or county-equivalent records. Within those records, the 2026 one-unit conforming limit runs from ${conformingLow.display} to ${conformingHigh.display}. That range can help borrowers see why the property county must be identified before a loan amount is assigned a conforming or jumbo category. ${conformingVaries ? `The ${conformingLow.display} to ${conformingHigh.display} range confirms that one conforming ceiling does not apply uniformly across ${locationName}.` : `The matched records share a one-unit conforming figure of ${conformingLow.display}, but the applicable county row still must be verified for a property.`} The ${countyCount.display} record count keeps the range tied to the statewide source coverage rather than an assumed national rule. The ${conformingLow.display} to ${conformingHigh.display} amounts classify loan size within the published program table; they do not establish a borrower's capacity, a property's value, or the price of financing. Before using the ${conformingHigh.display} statewide maximum, county, legal unit count, and expected base loan amount must be known.`, ["county-count", "conforming-range-low", "conforming-range-high"]),
    evidenceSection(byId, "statewide-fha-range", "The FHA range follows its own county table", `Across the same ${countyCount.display} ${locationName} records, the 2026 one-unit FHA limit spans ${fhaLow.display} to ${fhaHigh.display}. ${fhaVaries ? `The ${fhaLow.display} low and ${fhaHigh.display} high show that FHA's published boundary also varies within the state.` : `The matched FHA rows share ${fhaLow.display}, although property geography and current program guidance still require confirmation.`} The ${fhaLow.display} floor and ${fhaHigh.display} high remain county-table values even when they match conforming amounts elsewhere. The FHA range should not be merged with the ${conformingLow.display} to ${conformingHigh.display} conforming range, because the programs use different authorities and requirements. A ${fhaLow.display} to ${fhaHigh.display} comparison can route loan-amount and product-category questions, but it cannot determine FHA eligibility, mortgage insurance, appraisal acceptability, occupancy compliance, cash needs, or approval.`, ["county-count", "fha-range-low", "fha-range-high", "conforming-range-low", "conforming-range-high"]),
    evidenceSection(byId, "high-cost-counties", "Why county verification matters", `${countiesAbove.display} ${locationName} counties sit above the conforming baseline in this summary, while the full conforming range reaches from ${conformingLow.display} to ${conformingHigh.display}. That count shows where a statewide shortcut can fail: a property in a higher-limit county may use a different published ceiling than one at ${conformingLow.display}. The ${countiesAbove.display} figure does not mean those counties are more affordable, more desirable, or more likely to approve a loan. It only describes how many matched county rows exceed the baseline. The ${conformingHigh.display} maximum should therefore be treated as evidence that county lookup matters, not as the default ${locationName} limit. Before treating ${conformingHigh.display} as relevant, a borrower should identify the property's official county or county-equivalent area and then attach conventional, jumbo, or FHA labels to the desired loan amount.`, ["counties-above", "conforming-range-low", "conforming-range-high"]),
    evidenceSection(byId, "program-comparison", "Conforming and FHA ranges answer different questions", `The highest one-unit conforming amount in ${locationName} is ${conformingHigh.display}, while the highest FHA amount is ${fhaHigh.display}; at the low end, the figures are ${conformingLow.display} and ${fhaLow.display}. These pairs show program boundaries, not competing offers. A requested amount below ${conformingHigh.display} may still fall outside the applicable county's conforming limit, and an amount below ${fhaHigh.display} may still face FHA borrower and property requirements. Comparing ${conformingLow.display}, ${conformingHigh.display}, ${fhaLow.display}, and ${fhaHigh.display} is useful only when county and unit count are held constant. The ${conformingHigh.display} and ${fhaHigh.display} ceilings leave rates, fees, mortgage insurance, appraisal, reserves, debt capacity, and product suitability as separate questions for the documented transaction.`, ["conforming-range-high", "fha-range-high", "conforming-range-low", "fha-range-low"]),
    evidenceSection(byId, "state-limit-boundaries", "A larger county limit is not greater affordability", `A ${conformingHigh.display} conforming ceiling or ${fhaHigh.display} FHA ceiling does not make that loan amount affordable to a household in ${locationName}, and the lower ${conformingLow.display} or ${fhaLow.display} figures do not describe home prices. Published ${conformingHigh.display} and ${fhaHigh.display} limits cannot establish borrower income, debts, credit, assets, occupancy, property condition, appraisal, insurance, reserves, rates, fees, or final approval. The ${conformingHigh.display} and ${fhaHigh.display} figures can also change with a new calendar year or corrected property geography. Keeping the ${countyCount.display} county-record scope and 2026 period attached to the figures prevents the statewide summary from being mistaken for a personalized product recommendation or a single amount that applies everywhere.`, ["conforming-range-high", "fha-range-high", "conforming-range-low", "fha-range-low", "county-count"]),
    evidenceSection(byId, "county-lookup", "Use the range to reach the correct county row", `The next step is to verify the selected property's ${locationName} county or county-equivalent area, legal unit count, price, down-payment plan, and expected base loan amount. Then compare that amount with the exact official row, using the ${conformingLow.display} to ${conformingHigh.display} conforming range and ${fhaLow.display} to ${fhaHigh.display} FHA range only as orientation. The ${countiesAbove.display} above-baseline count explains why this lookup matters, but it does not replace it. Keep the selected county row with the worksheet so the ${conformingHigh.display} and ${fhaHigh.display} statewide maximums cannot be mistaken for property-specific figures. After the ${countiesAbove.display} count prompts that county lookup, a licensed professional can explain current limits and borrower, property, mortgage-insurance, and documentation rules without presenting the largest statewide figure as available borrowing power.`, ["conforming-range-low", "conforming-range-high", "fha-range-low", "fha-range-high", "counties-above"]),
  ];
}

function makeSections(locationName, facts, config, context, evidencePeriod, articleType) {
  if (typeof config.buildSections !== "function") throw new Error(`Missing evidence-led section builder for ${config.topicLabel}`);
  const sections = config.buildSections({ locationName, facts, context, ...evidencePeriod });
  if (sections.length !== 6) throw new Error(`${articleType} requires six evidence-led content beats`);
  return varySections(sections, `${context.location.id}:${articleType}`, articleType, facts, locationName);
}

function qualifyLocationCopy(value, locationName, locationDisplayName) {
  if (locationName === locationDisplayName) return value;
  return String(value).replaceAll(locationName, locationDisplayName);
}

function completeMetaDescription(value, maximumLength = 160) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  const complete = /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
  if (complete.length < 50 || complete.length > maximumLength) {
    throw new Error(`Location-news meta description must be a complete 50-${maximumLength} character sentence`);
  }
  return complete;
}

function visibleSourceLabel(fact, recordsById) {
  const sources = fact.sourceRecordIds.map((id) => recordsById.get(id)).filter(Boolean);
  const grouped = new Map();
  for (const source of sources) {
    if (!grouped.has(source.publisher)) grouped.set(source.publisher, new Set());
    grouped.get(source.publisher).add(source.period);
  }
  return [...grouped]
    .map(([publisher, periods]) => `${publisher}, ${[...periods].sort().join(" and ")}`)
    .join("; ");
}

function visibleSourceAsOf(fact, recordsById) {
  const labels = fact.sourceRecordIds
    .map((id) => recordsById.get(id))
    .filter(Boolean)
    .map(sourcePeriodAsOf);
  return [...new Set(labels)].join("; ");
}

function borrowerRelatedRoutes(locationDisplayName, locationRoute, relatedRoutes) {
  const normalized = [
    { route: locationRoute, label: `${locationDisplayName} mortgage and housing guide` },
    ...(relatedRoutes || []).map((item) => typeof item === "string"
      ? { route: item, label: item.split("/").filter(Boolean).at(-1).replaceAll("-", " ") }
      : item),
  ];
  const seen = new Set();
  return normalized.filter((item) => {
    if (!item?.route || seen.has(item.route)) return false;
    seen.add(item.route);
    return true;
  });
}

function articleBase({ context, articleType, title, dek, previewText, relevanceLabel, theme, topicIds, records, facts, config, locationType }) {
  const location = context.location;
  const locationDisplayName = locationType === "city" && context.state?.abbr
    ? `${location.name}, ${context.state.abbr}`
    : location.name;
  const qualifiedTitle = locationDisplayName !== location.name && title.startsWith(location.name)
    ? `${locationDisplayName}${title.slice(location.name.length)}`
    : title;
  const qualifiedDek = qualifyLocationCopy(dek, location.name, locationDisplayName);
  const qualifiedPreviewText = qualifyLocationCopy(previewText, location.name, locationDisplayName);
  const articleId = `news-${location.id.replace(/^(city|state)-/, "")}-${articleType.replace(/_/g, "-")}`;
  const route = `/learning-center/market-news/${articleId.replace(/^news-/, "")}`;
  const sourceRecordIds = records.map((record) => record.sourceId);
  const recordsById = new Map(records.map((record) => [record.sourceId, record]));
  const image = assignMedia(articleId, theme, context.mediaAssets);
  const evidencePeriod = governingEvidence(records);
  const sections = makeSections(locationDisplayName, facts, config, context, evidencePeriod, articleType);
  const factsById = factMap(facts);
  const takeawayFacts = (config.takeawayFactIds || facts.slice(0, 3).map((item) => item.id))
    .map((id) => factsById.get(id))
    .filter(Boolean);
  return {
    id: articleId,
    route,
    locationId: location.id,
    locationType,
    articleType,
    authorId: authorIdForLocationNews({ articleType, topicIds }),
    title: qualifiedTitle,
    dek: qualifiedDek,
    previewText: qualifiedPreviewText,
    metaDescription: completeMetaDescription(qualifiedPreviewText),
    publishedAt: context.publishedAt || "2026-07-10",
    updatedAt: context.publishedAt || "2026-07-10",
    asOf: evidencePeriod.asOf,
    sourcePeriod: evidencePeriod.sourcePeriod,
    relevanceLabel,
    topicIds,
    productIds: context.productIds || [],
    sourceLabels: [...new Set(records.map((record) => record.publisher))],
    imageId: image.id,
    keyTakeaways: [
      `As of: ${evidencePeriod.asOf}. Source period: ${evidencePeriod.sourcePeriod}.`,
      ...takeawayFacts.map((item) => `${item.label}: ${item.display}.`),
    ],
    evidenceFacts: facts,
    sections,
    visuals: [{
      id: `${articleId}-comparison-chart`,
      type: "bar",
      title: `${location.name} evidence comparison`,
      sourceRecordIds,
      data: facts.slice(0, 5).map((item) => ({ label: item.label, value: item.value, display: item.display })),
    }],
    tables: [{
      id: `${articleId}-evidence-table`,
      title: `${location.name} evidence table`,
      columns: ["Measure", "Value", "Source", "As of"],
      rows: facts.map((item) => [item.label, item.display, visibleSourceLabel(item, recordsById), visibleSourceAsOf(item, recordsById)]),
      sourceRecordIds,
    }],
    ctaPlacements: [{
      afterSectionId: sections[1]?.id || sections[0].id,
      type: "review_options",
      label: "Review loan options",
      route: "/loan-options",
    }],
    methodology: `${config.methodology} Figures are reported as published for each cited geography and period. Derived percentages and differences use only the displayed source values; unavailable figures are omitted rather than estimated.`,
    limitations: `${config.limitations} The evidence is broad market context, not a property valuation, rate or payment quote, eligibility finding, underwriting decision, product recommendation, or prediction.`,
    sourceRecords: records,
    relatedRoutes: borrowerRelatedRoutes(locationDisplayName, location.route, context.relatedRoutes),
    reviewStatus: "editorial_reviewed",
    complianceStatus: "compliance_approved",
  };
}

function censusInputs(context, articleType, keys) {
  const articleId = `news-${context.location.id.replace(/^(city|state)-/, "")}-${articleType.replace(/_/g, "-")}`;
  const records = [];
  const byKey = {};
  for (const [recordKey, sourceGroup, metricKey] of keys) {
    const metric = context.census[sourceGroup].metrics[metricKey];
    const record = censusRecord(articleId, recordKey, metric, metricKey);
    records.push(record);
    byKey[recordKey] = record;
  }
  return { articleId, records, byKey };
}

export function composeCityAffordability(context) {
  const type = "affordability_home_values";
  const { records, byKey } = censusInputs(context, type, [
    ["city-home-value-current", "current", "medianHomeValue"],
    ["city-income-current", "current", "medianHouseholdIncome"],
    ["city-owner-cost-current", "current", "medianOwnerCostWithMortgage"],
    ["city-home-value-prior", "prior", "medianHomeValue"],
    ["state-home-value-current", "stateCurrent", "medianHomeValue"],
  ]);
  const stateGapValue = percentChange(byKey["city-home-value-current"].estimate, byKey["state-home-value-current"].estimate);
  const stateGapPosition = stateGapValue >= 0 ? "above the state estimate" : "below the state estimate";
  const facts = [
    fact("median-home-value", "ACS median owner-occupied home value", byKey["city-home-value-current"].estimate, formatMoney(byKey["city-home-value-current"].estimate), [byKey["city-home-value-current"].sourceId]),
    fact("prior-home-value", "prior ACS median owner-occupied home value", byKey["city-home-value-prior"].estimate, formatMoney(byKey["city-home-value-prior"].estimate), [byKey["city-home-value-prior"].sourceId], true),
    fact("median-household-income", "ACS median household income", byKey["city-income-current"].estimate, formatMoney(byKey["city-income-current"].estimate), [byKey["city-income-current"].sourceId]),
    fact("median-owner-cost", "median monthly owner cost with a mortgage", byKey["city-owner-cost-current"].estimate, formatMoney(byKey["city-owner-cost-current"].estimate), [byKey["city-owner-cost-current"].sourceId]),
    fact("state-home-value", `${context.state.name} median home value`, byKey["state-home-value-current"].estimate, formatMoney(byKey["state-home-value-current"].estimate), [byKey["state-home-value-current"].sourceId], true),
    fact("state-home-value-gap", `local median home-value gap ${stateGapPosition}`, Math.abs(stateGapValue), formatPercent(Math.abs(stateGapValue)), [byKey["city-home-value-current"].sourceId, byKey["state-home-value-current"].sourceId], true),
  ];
  return articleBase({ context, articleType: type, locationType: "city", title: `${context.location.name} home values, income, and owner costs`, dek: `A borrower-focused reading of the latest ACS value, income, and owner-cost evidence for ${context.location.name}.`, previewText: `See how home value, household income, and owner-cost estimates frame a payment conversation in ${context.location.name}.`, relevanceLabel: "Affordability evidence", theme: "home_values", topicIds: ["affordability", "home-values", "owner-costs"], records, facts, config: {
    topicLabel: "home-value and affordability evidence",
    openingHeading: "Home values and income in the latest ACS release",
    meaning: "Together, home value, household income, and selected owner costs describe different sides of the local payment conversation without assuming that a typical household is buying a typical home.",
    comparisonHeading: "How the current estimate compares",
    comparisonMeaning: "A change between ACS periods can show direction, but margins of error and the multi-year survey windows must be considered before treating the difference as precise.",
    planningHeading: "Use the evidence to test payment assumptions",
    planning: "Compare a realistic purchase range with verified principal, interest, taxes, insurance, association charges, and cash-to-close rather than converting the median value directly into a promised payment.",
    tradeoffHeading: "Owner costs are broader than principal and interest",
    tradeoff: "Selected owner costs help keep the monthly discussion connected to recurring housing expenses, but the ACS measure is not a lender worksheet and is not tailored to a property under consideration.",
    cannotDecide: "The ACS does not contain a borrower's credit, debts, down payment, loan term, current rate options, or the taxes and insurance for a selected property.",
    actionHeading: "Build a property-specific affordability comparison",
    action: "Use the local figures to challenge assumptions, then replace broad estimates with current property and loan information before deciding what range is comfortable.",
    buildSections: buildAffordabilitySections,
    methodology: "This article uses 2024 and 2019 ACS 5-year estimates for the Census place and a 2024 parent-state comparison, including published margins of error. The two home-value vintages are retained as separate nominal observations rather than converted into a percentage change.",
    limitations: "ACS estimates represent survey periods rather than point-in-time prices. The 2019 and 2024 dollar values are not inflation-adjusted, and the home-value methodology changed between vintages, so they are not a like-for-like appreciation series.",
  }});
}

export function composeCityHousingSupply(context) {
  const type = "housing_supply_tenure";
  const { records, byKey } = censusInputs(context, type, [
    ["housing-units", "current", "totalHousingUnits"], ["occupied-units", "current", "occupiedUnits"], ["vacant-units", "current", "vacantUnits"],
    ["owner-units", "current", "ownerOccupiedUnits"], ["renter-units", "current", "renterOccupiedUnits"], ["median-rent", "current", "medianGrossRent"],
    ["vacant-units-prior", "prior", "vacantUnits"],
  ]);
  const vacancyShare = share(byKey["vacant-units"].estimate, byKey["housing-units"].estimate);
  const ownerShare = share(byKey["owner-units"].estimate, byKey["occupied-units"].estimate);
  const renterShare = share(byKey["renter-units"].estimate, byKey["occupied-units"].estimate);
  const vacancyCountChange = percentChange(byKey["vacant-units"].estimate, byKey["vacant-units-prior"].estimate);
  const facts = [
    fact("housing-units", "total housing units", byKey["housing-units"].estimate, formatNumber(byKey["housing-units"].estimate), [byKey["housing-units"].sourceId]),
    fact("occupied-units", "occupied housing units", byKey["occupied-units"].estimate, formatNumber(byKey["occupied-units"].estimate), [byKey["occupied-units"].sourceId]),
    fact("vacant-units", "vacant housing units", byKey["vacant-units"].estimate, formatNumber(byKey["vacant-units"].estimate), [byKey["vacant-units"].sourceId]),
    fact("prior-vacant-units", "prior ACS vacant housing units", byKey["vacant-units-prior"].estimate, formatNumber(byKey["vacant-units-prior"].estimate), [byKey["vacant-units-prior"].sourceId], true),
    fact("vacancy-share", "vacant-unit share of housing stock", vacancyShare, formatPercent(vacancyShare), [byKey["vacant-units"].sourceId, byKey["housing-units"].sourceId], true),
    fact("vacancy-count-change", "change in vacant units from the prior ACS period", vacancyCountChange, formatPercent(vacancyCountChange), [byKey["vacant-units"].sourceId, byKey["vacant-units-prior"].sourceId], true),
    fact("owner-share", "owner share of occupied units", ownerShare, formatPercent(ownerShare), [byKey["owner-units"].sourceId, byKey["occupied-units"].sourceId], true),
    fact("renter-share", "renter share of occupied units", renterShare, formatPercent(renterShare), [byKey["renter-units"].sourceId, byKey["occupied-units"].sourceId], true),
    fact("median-rent", "median gross rent", byKey["median-rent"].estimate, formatMoney(byKey["median-rent"].estimate), [byKey["median-rent"].sourceId]),
  ];
  return articleBase({ context, articleType: type, locationType: "city", title: `${context.location.name} housing supply, ownership, and rent`, dek: `What the latest ACS housing mix can and cannot tell buyers and renters comparing options in ${context.location.name}.`, previewText: `Review housing units, occupancy, tenure, vacancy, and rent evidence before comparing buying and renting in ${context.location.name}.`, relevanceLabel: "Housing mix", theme: "housing_supply", topicIds: ["housing-supply", "tenure", "rent"], records, facts, config: {
    topicLabel: "housing supply, tenure, and rent evidence", openingHeading: "The size and occupancy of the local housing stock",
    meaning: "Unit counts establish the broad housing base, while occupancy and tenure measures show how that stock was being used across the ACS survey period.",
    comparisonHeading: "Vacancy and ownership need careful definitions", comparisonMeaning: "A vacant-unit share is not the same as homes listed for sale, and an owner share is not a forecast of buyer competition or future inventory.",
    planningHeading: "Compare buying and renting on the same horizon", planning: "A useful worksheet aligns expected time in the home, maintenance responsibility, rent changes, transaction costs, and property-specific monthly costs instead of comparing rent with principal and interest alone.",
    tradeoffHeading: "Rent is context, not a break-even answer", tradeoff: "Median gross rent reflects the occupied rental stock measured by ACS and does not identify an equivalent property, lease offer, or future rent for a particular household.",
    cannotDecide: "Housing-stock counts do not show the condition, price, financing eligibility, insurance availability, or seller terms of homes currently offered to a borrower.",
    actionHeading: "Match the broad housing mix to real choices", action: "Use the local mix to frame questions, then compare actual listings, lease terms, taxes, insurance, maintenance, and financing disclosures over a consistent period.",
    buildSections: buildHousingSupplySections,
    methodology: "This article uses 2024 ACS 5-year place estimates for units, occupancy, vacancy, owner and renter tenure, and gross rent, with 2019 evidence retained for comparison review.",
    limitations: "ACS vacancy includes categories beyond for-sale availability, and tenure and rent estimates carry sampling error and do not measure current listing inventory.",
  }});
}

function composeLabor(context, locationType, type, titlePrefix) {
  const articleId = `news-${context.location.id.replace(/^(city|state)-/, "")}-${type.replace(/_/g, "-")}`;
  const definitions = [["labor-force", "labor force", "latest", "laborForce", "06"], ["employment", "employment", "latest", "employment", "05"], ["unemployment", "unemployment", "latest", "unemployment", "04"], ["unemployment-rate", "unemployment rate", "latest", "unemploymentRate", "03"], ["previous-rate", "previous-month unemployment rate", "previous", "unemploymentRate", "03"], ["year-ago-rate", "year-ago unemployment rate", "yearAgo", "unemploymentRate", "03"]];
  const records = definitions.map(([key, label, periodKey, measure, code]) => laborRecord(articleId, key, context.bls, periodKey, measure, code));
  const byKey = Object.fromEntries(definitions.map(([key], index) => [key, records[index]]));
  const monthlyRateChange = Number((byKey["unemployment-rate"].estimate - byKey["previous-rate"].estimate).toFixed(1));
  const rateChange = Number((byKey["unemployment-rate"].estimate - byKey["year-ago-rate"].estimate).toFixed(1));
  const facts = [
    fact("labor-force", "labor force", byKey["labor-force"].estimate, formatNumber(byKey["labor-force"].estimate), [byKey["labor-force"].sourceId]),
    fact("employment", "employment", byKey.employment.estimate, formatNumber(byKey.employment.estimate), [byKey.employment.sourceId]),
    fact("unemployment", "unemployment", byKey.unemployment.estimate, formatNumber(byKey.unemployment.estimate), [byKey.unemployment.sourceId]),
    fact("unemployment-rate", "unemployment rate", byKey["unemployment-rate"].estimate, formatPercent(byKey["unemployment-rate"].estimate), [byKey["unemployment-rate"].sourceId]),
    fact("previous-rate", "previous-month unemployment rate", byKey["previous-rate"].estimate, formatPercent(byKey["previous-rate"].estimate), [byKey["previous-rate"].sourceId], true),
    fact("year-ago-rate", "year-ago unemployment rate", byKey["year-ago-rate"].estimate, formatPercent(byKey["year-ago-rate"].estimate), [byKey["year-ago-rate"].sourceId], true),
    fact("monthly-rate-change", "change in unemployment rate from the prior month", monthlyRateChange, formatPercentagePoints(monthlyRateChange), [byKey["unemployment-rate"].sourceId, byKey["previous-rate"].sourceId], true),
    fact("annual-rate-change", "change in unemployment rate from a year earlier", rateChange, formatPercentagePoints(rateChange), [byKey["unemployment-rate"].sourceId, byKey["year-ago-rate"].sourceId], true),
  ];
  return articleBase({ context, articleType: type, locationType, title: `${titlePrefix} labor market: latest employment evidence`, dek: `A borrower-focused reading of the latest BLS labor-force, employment, unemployment, and rate measures for ${context.location.name}.`, previewText: `See what changed in ${context.location.name}'s labor market and why broad employment data cannot determine mortgage eligibility.`, relevanceLabel: "Labor market", theme: "local_economy", topicIds: ["labor-market", "employment", "borrower-planning"], records, facts, config: {
    topicLabel: "labor-market evidence", openingHeading: "What the latest LAUS release reports", meaning: "The labor force, employment, unemployment, and unemployment rate are related measures, and reading all of them prevents a rate movement from being interpreted without its underlying counts.",
    comparisonHeading: "Month and year comparisons answer different questions", comparisonMeaning: "A monthly movement can reflect short-term change and revision, while the year-over-year comparison gives a wider reference point without predicting the next release.",
    planningHeading: "Use labor data as economic context", planning: "Broad labor evidence can help organize questions about timing and local economic conditions, but a lender evaluates documented income, employment history, debts, assets, and program rules at the borrower level.",
    tradeoffHeading: "Employment counts do not measure mortgage readiness", tradeoff: "The LAUS definition of employment is an economic statistic, not a review of income stability, job tenure, variable earnings, self-employment records, or the continuity standards used in underwriting.",
    cannotDecide: "BLS does not evaluate any applicant and cannot indicate whether a person's income is eligible, sufficient, stable, or likely to continue for mortgage purposes.",
    actionHeading: "Translate economic context into documentation questions", action: "Keep the public trend separate from the borrower's records, and ask what pay history, tax returns, contracts, reserves, or explanations may be needed for the actual loan path.",
    takeawayFactIds: ["unemployment-rate", "monthly-rate-change", "annual-rate-change"],
    buildSections: buildLaborSections,
    methodology: `This article uses BLS LAUS ${locationType === "city" ? "unadjusted city" : "state"} monthly series for labor force, employment, unemployment, and unemployment rate, with prior-month and year-ago comparisons.`,
    limitations: "LAUS estimates can be revised, city series are unadjusted, and local labor statistics describe a population rather than an individual applicant's income or employment.",
  }});
}

export function composeCityLabor(context) { return composeLabor(context, "city", "local_labor_market", `${context.location.name}`); }
export function composeStateLabor(context) { return composeLabor(context, "state", "state_labor_market", `${context.location.name} statewide`); }

export function composeCityLoanLimits(context) {
  const type = "county_loan_limits";
  const articleId = `news-${context.location.id.replace(/^city-/, "")}-${type.replace(/_/g, "-")}`;
  const limitCountyFips = context.limitCountyFips || context.limits.conforming.countyFips || context.location.sourceGeography.countyFips;
  const definitions = [];
  for (const [program, limits, publisher, dataset, sourceUrl] of [
    ["conforming", context.limits.conforming, PUBLISHER.fhfa, "2026 conforming county loan limits", context.limits.conforming.sourceUrl || "https://www.fhfa.gov/data/conforming-loan-limit"],
    ["fha", context.limits.fha, PUBLISHER.hud, "2026 FHA forward mortgage limits", context.limits.fha.sourceUrl || "https://apps.hud.gov/pub/chums/cy2026-forward-limits.txt"],
  ]) {
    for (const unit of ["oneUnit", "twoUnit", "threeUnit", "fourUnit"]) definitions.push([`${program}-${unit}`, program, unit, limits[unit], publisher, dataset, sourceUrl]);
  }
  const records = definitions.map(([key, , , value, publisher, dataset, sourceUrl]) => programRecord(articleId, key, publisher, dataset, sourceUrl, limitCountyFips, value));
  const byKey = Object.fromEntries(definitions.map(([key], index) => [key, records[index]]));
  const difference = byKey["conforming-oneUnit"].estimate - byKey["fha-oneUnit"].estimate;
  const facts = [
    fact("conforming-one", "one-unit conforming limit", byKey["conforming-oneUnit"].estimate, formatMoney(byKey["conforming-oneUnit"].estimate), [byKey["conforming-oneUnit"].sourceId]),
    fact("conforming-four", "four-unit conforming limit", byKey["conforming-fourUnit"].estimate, formatMoney(byKey["conforming-fourUnit"].estimate), [byKey["conforming-fourUnit"].sourceId]),
    fact("fha-one", "one-unit FHA limit", byKey["fha-oneUnit"].estimate, formatMoney(byKey["fha-oneUnit"].estimate), [byKey["fha-oneUnit"].sourceId]),
    fact("fha-four", "four-unit FHA limit", byKey["fha-fourUnit"].estimate, formatMoney(byKey["fha-fourUnit"].estimate), [byKey["fha-fourUnit"].sourceId]),
    fact("one-unit-difference", "difference between one-unit conforming and FHA limits", difference, formatMoney(difference), [byKey["conforming-oneUnit"].sourceId, byKey["fha-oneUnit"].sourceId], true),
  ];
  return articleBase({ context, articleType: type, locationType: "city", title: `${context.location.name} loan limits: 2026 conforming and FHA context`, dek: `How 2026 conforming and FHA loan-limit figures organize conventional, jumbo, and FHA questions without determining eligibility.`, previewText: `Compare 2026 conforming and FHA loan-limit figures associated with ${context.location.name}, including unit-count differences and important limits.`, relevanceLabel: "2026 loan limits", theme: "loan_limits", topicIds: ["loan-limits", "conventional", "fha", "jumbo"], records, facts, config: {
    topicLabel: "loan-limit evidence", openingHeading: "The published loan-limit figures", meaning: "Conforming and FHA limits come from different programs and should be read by the published county or county-equivalent geography and unit count before they are used to organize financing questions.",
    comparisonHeading: "Why the one-unit limits differ", comparisonMeaning: "The gap marks different program boundaries, not a pricing advantage, approval result, required loan amount, or recommendation for a borrower.",
    planningHeading: "Start with geography, unit count, and loan amount", planning: "Confirm the property's county or county-equivalent geography and number of legal units, then compare the needed base loan amount with the current program tables before discussing product fit.",
    tradeoffHeading: "A higher limit is not additional borrowing power", tradeoff: "Published ceilings describe the maximum loan size within a program category for that geography; they do not increase income, reduce required cash, or waive underwriting standards.",
    cannotDecide: "A loan limit cannot determine credit eligibility, debt-to-income acceptance, appraisal results, mortgage insurance, occupancy rules, cash requirements, rates, fees, or approval.",
    actionHeading: "Use limits to route the next product questions", action: "Bring the property geography, unit count, price, down-payment plan, and desired loan amount to a licensed professional who can verify current limits and applicable program rules.",
    buildSections: buildCityLoanLimitSections,
    methodology: "This article joins the official 2026 FHFA all-county conforming file and HUD 2026 FHA forward-limit file by the published five-digit county or county-equivalent FIPS and retains one- through four-unit amounts.",
    limitations: "The location mapping identifies a published source geography for this location record, but a specific property can require separate geography verification and current program guidance.",
  }});
}

export function composeStateHpi(context) {
  const type = "state_home_price_movement";
  const articleId = `news-${context.location.id.replace(/^state-/, "")}-${type.replace(/_/g, "-")}`;
  const definitions = [["hpi-index", context.hpi.index], ["quarterly-change", context.hpi.quarterlyChange], ["annual-change", context.hpi.annualChange], ["five-year-change", context.hpi.fiveYearChange]];
  const records = definitions.map(([key, value]) => hpiRecord(articleId, key, { ...context.hpi, state: context.location.abbr }, value));
  const byKey = Object.fromEntries(definitions.map(([key], index) => [key, records[index]]));
  const facts = [
    fact("hpi-index", "FHFA purchase-only HPI", byKey["hpi-index"].estimate, formatNumber(byKey["hpi-index"].estimate), [byKey["hpi-index"].sourceId]),
    fact("quarterly-change", "quarterly HPI change", byKey["quarterly-change"].estimate, formatPercent(byKey["quarterly-change"].estimate), [byKey["quarterly-change"].sourceId], true),
    fact("annual-change", "annual HPI change", byKey["annual-change"].estimate, formatPercent(byKey["annual-change"].estimate), [byKey["annual-change"].sourceId], true),
    fact("five-year-change", "five-year HPI change", byKey["five-year-change"].estimate, formatPercent(byKey["five-year-change"].estimate), [byKey["five-year-change"].sourceId], true),
  ];
  return articleBase({ context, articleType: type, locationType: "state", title: `${context.location.name} home-price movement in the latest FHFA HPI`, dek: `Quarterly, annual, and longer-run state HPI comparisons with a clear boundary between market movement and property value.`, previewText: `Review the latest FHFA home-price movement for ${context.location.name} and why an index cannot value a specific property.`, relevanceLabel: "Home-price movement", theme: "home_values", topicIds: ["home-price-index", "state-market", "home-values"], records, facts, config: {
    topicLabel: "state home-price index evidence", openingHeading: "What the latest state index shows", meaning: "The purchase-only index tracks broad price movement in repeat transactions and is designed to show direction over time rather than a typical sale price.",
    comparisonHeading: "Quarterly and annual changes use different windows", comparisonMeaning: "The shorter comparison can be more sensitive to recent movement, while the annual and longer-run figures place the latest quarter in a broader sequence.",
    planningHeading: "Use an index to frame, not price, a search", planning: "A borrower can use the trend to ask how current listings, concessions, inventory, and property types compare with the statewide pattern, then rely on property-specific evidence for an offer or valuation.",
    tradeoffHeading: "Index movement and affordability are not the same", tradeoff: "An index does not include the borrower's income, financing costs, taxes, insurance, maintenance, or the mix of homes available at a chosen price point.",
    cannotDecide: "FHFA HPI cannot establish the market value of a home, predict a future sale price, identify a competitive offer, or determine a mortgage payment or approval.",
    actionHeading: "Connect the state trend to current local evidence", action: "Compare the state index with recent property-level information, a realistic payment worksheet, and current disclosures instead of multiplying a prior home value by the index change.",
    takeawayFactIds: ["quarterly-change", "annual-change", "five-year-change"],
    buildSections: buildStateHpiSections,
    methodology: "This article uses the official FHFA purchase-only state quarterly HPI and calculates changes from matching prior-quarter, prior-year, and five-year index observations when available.",
    limitations: "FHFA may revise index values, statewide movement can mask local and property-type differences, and an index level is not a dollar-denominated home value.",
  }});
}

export function composeStateHousing(context) {
  const type = "state_housing_costs";
  const { records, byKey } = censusInputs(context, type, [
    ["home-value", "current", "medianHomeValue"], ["income", "current", "medianHouseholdIncome"],
    ["owner-cost", "current", "medianOwnerCostWithMortgage"], ["rent", "current", "medianGrossRent"],
    ["housing-units", "current", "totalHousingUnits"], ["occupied-units", "current", "occupiedUnits"],
    ["vacant-units", "current", "vacantUnits"], ["owner-units", "current", "ownerOccupiedUnits"],
    ["renter-units", "current", "renterOccupiedUnits"], ["home-value-prior", "prior", "medianHomeValue"],
  ]);
  const ownerShare = share(byKey["owner-units"].estimate, byKey["occupied-units"].estimate);
  const renterShare = share(byKey["renter-units"].estimate, byKey["occupied-units"].estimate);
  const vacancyShare = share(byKey["vacant-units"].estimate, byKey["housing-units"].estimate);
  const facts = [
    fact("home-value", "state median home value", byKey["home-value"].estimate, formatMoney(byKey["home-value"].estimate), [byKey["home-value"].sourceId]),
    fact("prior-home-value", "prior ACS state median home value", byKey["home-value-prior"].estimate, formatMoney(byKey["home-value-prior"].estimate), [byKey["home-value-prior"].sourceId], true),
    fact("income", "state median household income", byKey.income.estimate, formatMoney(byKey.income.estimate), [byKey.income.sourceId]),
    fact("owner-cost", "median monthly owner cost with a mortgage", byKey["owner-cost"].estimate, formatMoney(byKey["owner-cost"].estimate), [byKey["owner-cost"].sourceId]),
    fact("rent", "median gross rent", byKey.rent.estimate, formatMoney(byKey.rent.estimate), [byKey.rent.sourceId]),
    fact("housing-units", "total housing units", byKey["housing-units"].estimate, formatNumber(byKey["housing-units"].estimate), [byKey["housing-units"].sourceId]),
    fact("owner-share", "owner share of occupied units", ownerShare, formatPercent(ownerShare), [byKey["owner-units"].sourceId, byKey["occupied-units"].sourceId], true),
    fact("renter-share", "renter share of occupied units", renterShare, formatPercent(renterShare), [byKey["renter-units"].sourceId, byKey["occupied-units"].sourceId], true),
    fact("vacancy-share", "vacant-unit share of housing stock", vacancyShare, formatPercent(vacancyShare), [byKey["vacant-units"].sourceId, byKey["housing-units"].sourceId], true),
  ];
  return articleBase({ context, articleType: type, locationType: "state", title: `${context.location.name} housing costs, ownership, and rent in the latest ACS`, dek: `Statewide evidence on home value, income, owner costs, housing stock, tenure, vacancy, and rent for borrower planning.`, previewText: `Read statewide housing-cost, ownership, vacancy, and rent evidence for ${context.location.name} with survey limitations and practical questions.`, relevanceLabel: "State housing costs", theme: "housing_supply", topicIds: ["state-housing", "owner-costs", "tenure", "rent"], records, facts, config: {
    topicLabel: "state housing-cost and ownership evidence", openingHeading: "Statewide values, income, and recurring housing costs", meaning: "Value, income, owner-cost, and rent estimates describe different parts of the housing budget, while housing-stock and tenure records show the scale and use of the statewide inventory.",
    comparisonHeading: "Tenure, vacancy, and change need separate readings", comparisonMeaning: "Owner share, vacant-unit share, and change across survey periods answer different questions and should not be collapsed into a claim about current for-sale supply or future prices.",
    planningHeading: "Build comparable owner and renter budgets", planning: "Compare actual property and lease choices over the intended time horizon, including taxes, insurance, maintenance, association obligations, utilities, transaction costs, and cash reserves.",
    tradeoffHeading: "State medians do not describe every local market", tradeoff: "A statewide midpoint can provide orientation while still sitting far from the conditions in a particular city, county, property type, or price segment.",
    cannotDecide: "The ACS cannot select a product, value a property, predict appreciation or rent, establish a payment, or determine whether an applicant meets underwriting requirements.",
    actionHeading: "Move from statewide context to a local worksheet", action: "Use the state evidence to identify cost categories and comparison questions, then replace statewide medians with current local, property-specific, and borrower-specific information.",
    buildSections: buildStateHousingSections,
    methodology: "This article uses 2024 ACS 5-year state estimates for home value, household income, selected owner costs, rent, total and occupied housing units, vacancy, and owner and renter tenure, plus a separate 2019 nominal home-value observation. It does not calculate a percentage change between home-value vintages.",
    limitations: "ACS estimates cover multi-year survey periods, carry margins of error, and do not measure current listings, current financing terms, or a specific household's housing costs. The 2019 and 2024 home-value dollars are not inflation-adjusted, and their methodology is not directly comparable.",
  }});
}

export function composeStateLoanLimits(context) {
  const type = "state_loan_limit_landscape";
  const articleId = `news-${context.location.id.replace(/^state-/, "")}-${type.replace(/_/g, "-")}`;
  const summary = context.limitSummary;
  const definitions = [
    ["county-count", summary.countyCount, PUBLISHER.fhfa, "2026 county loan-limit landscape"],
    ["conforming-min", summary.conforming.minimumOneUnit, PUBLISHER.fhfa, "2026 conforming county loan limits"],
    ["conforming-max", summary.conforming.maximumOneUnit, PUBLISHER.fhfa, "2026 conforming county loan limits"],
    ["conforming-above", summary.conforming.countiesAboveBaseline, PUBLISHER.fhfa, "2026 conforming county loan limits"],
    ["fha-min", summary.fha.minimumOneUnit, PUBLISHER.hud, "2026 FHA forward mortgage limits"],
    ["fha-max", summary.fha.maximumOneUnit, PUBLISHER.hud, "2026 FHA forward mortgage limits"],
    ["fha-above", summary.fha.countiesAboveFloor, PUBLISHER.hud, "2026 FHA forward mortgage limits"],
  ];
  const records = definitions.map(([key, value, publisher, dataset]) => programRecord(articleId, key, publisher, dataset, publisher === PUBLISHER.fhfa ? "https://www.fhfa.gov/data/conforming-loan-limit" : "https://apps.hud.gov/pub/chums/cy2026-forward-limits.txt", summary.geographyId, value));
  const byKey = Object.fromEntries(definitions.map(([key], index) => [key, records[index]]));
  const facts = [
    fact("county-count", "counties in the statewide limit summary", byKey["county-count"].estimate, formatNumber(byKey["county-count"].estimate), [byKey["county-count"].sourceId]),
    fact("conforming-range-low", "lowest one-unit conforming limit", byKey["conforming-min"].estimate, formatMoney(byKey["conforming-min"].estimate), [byKey["conforming-min"].sourceId]),
    fact("conforming-range-high", "highest one-unit conforming limit", byKey["conforming-max"].estimate, formatMoney(byKey["conforming-max"].estimate), [byKey["conforming-max"].sourceId], true),
    fact("fha-range-low", "lowest one-unit FHA limit", byKey["fha-min"].estimate, formatMoney(byKey["fha-min"].estimate), [byKey["fha-min"].sourceId]),
    fact("fha-range-high", "highest one-unit FHA limit", byKey["fha-max"].estimate, formatMoney(byKey["fha-max"].estimate), [byKey["fha-max"].sourceId], true),
    fact("counties-above", "counties above the conforming baseline", byKey["conforming-above"].estimate, formatNumber(byKey["conforming-above"].estimate), [byKey["conforming-above"].sourceId], true),
  ];
  return articleBase({ context, articleType: type, locationType: "state", title: `${context.location.name} 2026 county loan-limit landscape`, dek: `How conforming and FHA one-unit limits vary across ${context.location.name} counties and how borrowers can use them responsibly.`, previewText: `See the range of 2026 conforming and FHA county limits across ${context.location.name} without treating a limit as eligibility or pricing.`, relevanceLabel: "State loan-limit landscape", theme: "loan_limits", topicIds: ["loan-limits", "state-counties", "fha", "conventional"], records, facts, config: {
    topicLabel: "statewide county loan-limit evidence", openingHeading: "The statewide range begins with county records", meaning: "A statewide summary is a map of county program boundaries, not a single limit that applies uniformly to every property in the state.",
    comparisonHeading: "High-cost counties create a range", comparisonMeaning: "The low and high ends show why the property county must be confirmed before conventional, jumbo, or FHA categories are discussed.",
    planningHeading: "County and unit count come before product labels", planning: "Start with the property's county, legal unit count, price, down-payment plan, and expected loan amount, then look up the applicable official row.",
    tradeoffHeading: "County ceilings do not measure affordability", tradeoff: "A program can permit a larger loan category in a county without making that amount suitable, affordable, or available to a particular borrower.",
    cannotDecide: "The statewide range cannot establish approval, pricing, debt capacity, appraisal, mortgage insurance, cash requirements, occupancy compliance, or which product is appropriate.",
    actionHeading: "Verify the applicable county row", action: "Use the range to understand why location matters, then confirm the current county and unit-count limits with a licensed professional before comparing disclosures.",
    buildSections: buildStateLoanLimitSections,
    methodology: "This article joins official 2026 FHFA conforming and HUD FHA county files by five-digit county FIPS, then summarizes the observed one-unit range and county counts for the state.",
    limitations: "State summaries can conceal special exceptions and multi-unit differences, and official program updates or property-location corrections can change the applicable row.",
  }});
}

export const cityComposers = {
  affordability_home_values: composeCityAffordability,
  housing_supply_tenure: composeCityHousingSupply,
  local_labor_market: composeCityLabor,
  county_loan_limits: composeCityLoanLimits,
};

export const stateComposers = {
  state_home_price_movement: composeStateHpi,
  state_labor_market: composeStateLabor,
  state_housing_costs: composeStateHousing,
  state_loan_limit_landscape: composeStateLoanLimits,
};

export function composeCityArticles(context) {
  return Object.values(cityComposers).map((composer) => composer(context));
}

export function composeStateArticles(context) {
  return Object.values(stateComposers).map((composer) => composer(context));
}
