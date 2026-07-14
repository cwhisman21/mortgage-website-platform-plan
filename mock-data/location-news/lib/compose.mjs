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

function formatNumber(value) {
  return Number(value).toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function formatMoney(value) {
  return `$${Math.round(Number(value)).toLocaleString("en-US")}`;
}

function formatPercent(value) {
  return `${Number(value).toFixed(1)}%`;
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
  const valueChange = byId.get("home-value-change");
  const stateValue = byId.get("state-home-value");
  const stateGap = byId.get("state-home-value-gap");
  const direction = trendWord(valueChange.value, "increased", "decreased");
  const statePosition = homeValue.value >= stateValue.value ? "above" : "below";
  return [
    evidenceSection(byId, "local-baseline", "The local value, income, and owner-cost baseline", `In ${locationName}, the 2024 ACS reports a median owner-occupied home value of ${homeValue.display} and median household income of ${income.display}; these are separate medians, not the finances of one representative household. The same release reports ${ownerCost.display} in median selected monthly owner costs for owners with a mortgage, a measure that combines recurring ownership expenses rather than real estate taxes alone. For ${locationName}, reading ${homeValue.display}, ${income.display}, and ${ownerCost.display} together identifies the cost categories that deserve verification without converting public medians into a payment quote. An affordability review can start with the local ${homeValue.display}, ${income.display}, and ${ownerCost.display} reference points, then replace them with the borrower's income, cash, debts, property taxes, insurance, association charges, loan terms, and intended occupancy.`, ["median-home-value", "median-household-income", "median-owner-cost"]),
    evidenceSection(byId, "change-over-time", "What changed between the ACS periods", `${locationName}'s median home-value estimate ${direction} from ${priorValue.display} in the prior ACS period to ${homeValue.display} in the current release, a reported change of ${valueChange.display}. Because each ACS 5-year estimate summarizes a multi-year survey window, the ${valueChange.display} comparison describes a change between published estimates rather than appreciation for a particular home. The move from ${priorValue.display} to ${homeValue.display} can help a borrower test whether an older search budget still reflects the broad local evidence, but it cannot identify a current asking price or future resale value in ${locationName}. Before the ${valueChange.display} change is treated as precise, the analysis still needs margins of error, property type, neighborhood, condition, and the timing of an actual transaction.`, ["prior-home-value", "median-home-value", "home-value-change"]),
    evidenceSection(byId, "state-comparison", "How the city estimate sits within the state", `${locationName}'s ${homeValue.display} median home-value estimate is ${statePosition} the statewide ${stateValue.display} estimate, with a reported city-to-state gap of ${stateGap.display}. That ${stateGap.display} gap is useful for showing that a statewide midpoint may be a poor substitute for a local search range in ${locationName}. It does not mean every local property is ${stateGap.display} away from a comparable property elsewhere in the state, because the medians reflect different housing mixes and geographies. A borrower can use ${homeValue.display} and ${stateValue.display} to decide which assumptions need local replacement first, then compare actual properties and current financing disclosures on the same basis.`, ["median-home-value", "state-home-value", "state-home-value-gap"]),
    evidenceSection(byId, "owner-cost-boundary", "What the owner-cost estimate includes and excludes", `The ${ownerCost.display} owner-cost estimate gives ${locationName} borrowers a broader monthly reference than principal and interest alone, while the ${income.display} income estimate supplies separate household context. The two medians should not be divided to claim that a typical household spends a particular share of income, because ACS does not say the household at ${income.display} is the owner household at ${ownerCost.display}. The ${homeValue.display} local home-value estimate adds market context, but it also cannot supply a down payment, interest rate, mortgage insurance amount, tax bill, or insurance quote. Keeping ${homeValue.display}, ${income.display}, and ${ownerCost.display} in their published roles prevents a local affordability worksheet from acquiring false precision before a property and borrower are known.`, ["median-owner-cost", "median-household-income", "median-home-value"]),
    evidenceSection(byId, "decision-limits", "What these local medians cannot decide", `Neither ${homeValue.display} nor ${ownerCost.display} determines the value of a specific ${locationName} home, what a borrower will pay each month, or an underwriting result. The ${income.display} median describes the local household distribution, not the stability, continuity, documentation, or eligible amount of an applicant's income. Even the observed ${valueChange.display} between ACS periods cannot forecast the next market move or establish a safe purchase horizon. Those boundaries keep the accurate ${homeValue.display}, ${ownerCost.display}, and ${income.display} statistics from being misused as an appraisal, rate quote, underwriting result, or recommendation about how much debt one household should carry.`, ["median-home-value", "median-owner-cost", "median-household-income", "home-value-change"]),
    evidenceSection(byId, "next-comparison", "Build a property-specific comparison", `A practical ${locationName} worksheet can begin with ${homeValue.display} as broad value context, ${ownerCost.display} as a reminder to include recurring ownership expenses, and ${income.display} as a local economic reference. After noting those ${homeValue.display}, ${ownerCost.display}, and ${income.display} medians, substitute a real property price, down-payment plan, current loan disclosures, taxes, insurance, association obligations, maintenance allowance, and cash reserves. The ${stateGap.display} city-to-state difference is a prompt to keep the analysis local, while the ${valueChange.display} period change is a prompt to date every assumption. A licensed professional can use the ${stateGap.display} and ${valueChange.display} comparisons to explain which inputs are verified, which may change, and which loan options fit the documented borrower and property without presenting the ACS figures as an outcome.`, ["median-home-value", "median-owner-cost", "median-household-income", "state-home-value-gap", "home-value-change"]),
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
  const tenureLead = ownerShare.value >= renterShare.value ? "owner-occupied" : "renter-occupied";
  return [
    evidenceSection(byId, "stock-baseline", "The size and use of the local housing stock", `${locationName}'s current ACS housing baseline includes ${units.display} total housing units, ${occupied.display} occupied units, and ${vacant.display} vacant units. Those counts describe the housing stock across the survey period; they do not say that ${vacant.display} homes were listed for sale or available to rent at one moment. The difference between ${units.display} total units and ${occupied.display} occupied units is useful for checking the internal scale of the release, while ${vacant.display} provides the numerator for a more careful vacancy reading. For a borrower researching ${locationName}, the counts establish how large the measured housing base is before tenure, rent, current listings, property condition, and financing questions are added.`, ["housing-units", "occupied-units", "vacant-units"]),
    evidenceSection(byId, "vacancy-comparison", "Vacancy changed, but it is not listing inventory", `Vacant units in ${locationName} ${vacancyDirection} from ${priorVacant.display} in the prior ACS period to ${vacant.display} in the current release, a reported change of ${vacancyChange.display}. In the current housing stock, ${vacant.display} units equal ${vacancyShare.display} of the ${units.display} total. ACS vacancy covers several statuses, so the ${vacancyShare.display} share cannot be read as the share of homes a buyer can purchase today or the share of rentals immediately available. The movement from ${priorVacant.display} to ${vacant.display} can still prompt better questions about current for-sale and rental inventory in ${locationName}, provided those questions are answered with timely listing and property data rather than the survey count alone.`, ["prior-vacant-units", "vacant-units", "vacancy-count-change", "vacancy-share", "housing-units"]),
    evidenceSection(byId, "tenure-mix", "Ownership and renting within occupied housing", `Among ${occupied.display} occupied units in ${locationName}, the ACS-derived owner share is ${ownerShare.display} and the renter share is ${renterShare.display}, making ${tenureLead} housing the larger measured tenure group. The ${ownerShare.display} and ${renterShare.display} figures describe how occupied units were distributed; they do not measure how many households are ready to buy, how many owners plan to sell, or which properties can qualify for a mortgage. This local tenure mix helps a borrower avoid assuming that one housing path dominates every segment of ${locationName}. The ${ownerShare.display} and ${renterShare.display} mix is most useful when paired with actual choices at a similar property type, location, condition, and time horizon rather than used as a signal to buy or rent by itself.`, ["occupied-units", "owner-share", "renter-share"]),
    evidenceSection(byId, "rent-context", "Use rent as a matched comparison, not a shortcut", `${locationName}'s ACS median gross rent is ${rent.display}, while renter-occupied units account for ${renterShare.display} of occupied housing and owner-occupied units account for ${ownerShare.display}. The ${rent.display} median includes rent and certain utilities for the measured rental stock; it does not identify a lease offer comparable to a home under consideration. Comparing ${rent.display} with only a mortgage's principal and interest would omit taxes, insurance, maintenance, association charges, transaction costs, and differences between the properties. A more useful ${locationName} comparison matches real lease and ownership choices over the same expected horizon, then treats the tenure shares as market context instead of a break-even calculation.`, ["median-rent", "renter-share", "owner-share"]),
    evidenceSection(byId, "supply-limits", "What the housing-stock evidence cannot show", `The ${vacancyShare.display} vacant-unit share and ${ownerShare.display} owner share cannot determine competition for a specific ${locationName} listing, seller flexibility, inspection risk, appraisal results, insurance availability, or future supply. Likewise, ${units.display} total units say nothing about how many properties fit a borrower's price, location, accessibility, unit-count, or condition requirements. The ACS period behind the ${vacancyShare.display} vacancy share can accurately describe the broad stock while lagging a fast-moving listing market. Borrowers should therefore keep ${vacant.display} vacant units separate from active inventory and keep the ${rent.display} median separate from a current lease quote, using each figure only for the question its definition can answer.`, ["vacancy-share", "owner-share", "housing-units", "vacant-units", "median-rent"]),
    evidenceSection(byId, "matched-options", "Compare current local choices on the same terms", `A grounded ${locationName} comparison starts with current listings and lease offers, then uses the ACS evidence to check whether the sample is being interpreted in the context of ${units.display} total units, a ${vacancyShare.display} vacancy share, and a ${ownerShare.display} owner share. For renting, replace the ${rent.display} median with the actual lease, utilities, deposits, and expected changes. For ownership, keep the ${ownerShare.display} share as market context while adding the selected property's price, taxes, insurance, maintenance, association obligations, loan disclosures, and cash-to-close. The resulting worksheet will not turn ${renterShare.display} or ${ownerShare.display} into a recommendation, but it will keep the two paths comparable and make the remaining assumptions visible before a decision.`, ["housing-units", "vacancy-share", "owner-share", "renter-share", "median-rent"]),
  ];
}

function buildLaborSections({ locationName, facts, context }) {
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
  return [
    evidenceSection(byId, "labor-baseline", "The latest labor-force counts", `The latest LAUS release reports a ${locationName} labor force of ${laborForce.display}, with ${employment.display} people employed and ${unemployment.display} unemployed under the program's definitions. Those three counts belong together: ${employment.display} plus ${unemployment.display} explains the scale behind the published ${rate.display} unemployment rate. For mortgage planning, the ${laborForce.display} ${scope}-level labor force describes the surrounding market rather than the income or employment record of an applicant. A borrower can use the ${laborForce.display} labor-force baseline to understand the size of the measured market, but qualification still depends on documented income, employment continuity, debts, assets, and the rules of the loan being considered.`, ["labor-force", "employment", "unemployment", "unemployment-rate"]),
    evidenceSection(byId, "monthly-movement", "What changed from the prior month", `${locationName}'s unemployment rate ${monthlyDirection} from ${previousRate.display} in the prior month to ${rate.display} in the latest month, a change of ${monthlyChange.display}. A ${monthlyChange.display} move can reflect current conditions, normal sampling movement, and later revisions, so it should be read with the underlying ${unemployment.display} unemployment count and ${laborForce.display} labor force. The ${monthlyChange.display} comparison does not show that a particular employer is hiring or cutting jobs, and it cannot predict the next release. For a ${locationName} borrower, the monthly change is a prompt to date economic assumptions and verify personal employment documentation, not a reason to assume approval, denial, or a particular loan price.`, ["previous-rate", "unemployment-rate", "monthly-rate-change", "unemployment", "labor-force"]),
    evidenceSection(byId, "annual-movement", "The year-over-year comparison", `Compared with ${yearAgoRate.display} a year earlier, the latest ${locationName} unemployment rate of ${rate.display} ${annualDirection} by ${annualChange.display}. The year-over-year window reduces the risk of interpreting only one monthly step, but the ${annualChange.display} difference still describes a population estimate rather than an individual's job stability. Reading ${yearAgoRate.display}, ${previousRate.display}, and ${rate.display} together shows whether the latest month sits within a wider movement without forecasting what follows. A borrower should keep that broad ${locationName} pattern separate from pay history, variable compensation, self-employment records, contracts, leave, job changes, and other facts a lender may need to document.`, ["year-ago-rate", "previous-rate", "unemployment-rate", "annual-rate-change"]),
    evidenceSection(byId, "counts-and-rate", "Why the rate needs its underlying counts", `At ${rate.display}, ${locationName}'s unemployment rate summarizes ${unemployment.display} unemployed people within a ${laborForce.display} labor force; the rate should not be discussed without those counts. The ${employment.display} employment estimate is an economic measure and does not distinguish borrowers by hours, tenure, pay structure, industry, or the documentation available for a loan file. That makes ${employment.display} useful for local context but unsuitable as evidence that one household's income is stable or sufficient. Keeping the ${rate.display} rate attached to ${laborForce.display}, ${employment.display}, and ${unemployment.display} prevents a small percentage movement from carrying more borrower-level meaning than the LAUS release supports.`, ["unemployment-rate", "unemployment", "labor-force", "employment"]),
    evidenceSection(byId, "borrower-boundary", "Labor statistics are not an income review", `Neither ${employment.display} employed people nor a ${rate.display} unemployment rate tells a lender what one ${locationName} applicant earns, whether that income is eligible, or whether it is likely to continue. The ${monthlyChange.display} monthly rate change also cannot substitute for pay stubs, tax returns, business records, contracts, benefit documentation, or an explanation of a recent job transition. The ${rate.display} rate can be relevant to timing and local economic questions while remaining outside the underwriting decision. That boundary protects borrowers from treating a favorable ${annualChange.display} year-over-year change as an approval signal or an unfavorable movement as a conclusion about their own documented capacity.`, ["employment", "unemployment-rate", "monthly-rate-change", "annual-rate-change"]),
    evidenceSection(byId, "documentation-next-step", "Turn the trend into documentation questions", `A practical next step for a ${locationName} borrower is to note the latest ${rate.display} unemployment rate and the ${annualChange.display} year-over-year change, then move immediately to the records that describe the household. After noting the ${rate.display} rate, compare current base pay, variable earnings, self-employment history, contracts, assets, debts, and expected changes with the documentation requirements for the loan path. The ${laborForce.display} local labor force and ${employment.display} employment count can frame the economic conversation, but they should not alter verified borrower inputs. The ${monthlyChange.display} monthly movement remains a population measure even when it appears consistent with a borrower's personal experience. A licensed professional can explain which documents and time periods matter while keeping ${locationName}'s ${rate.display} LAUS rate in its proper role as dated local economic context.`, ["unemployment-rate", "annual-rate-change", "monthly-rate-change", "labor-force", "employment"]),
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
    evidenceSection(byId, "published-limits", "The published one-unit limits for the matched area", `${locationName} is connected to ${geographyName} for this 2026 source comparison. The published one-unit conforming limit is ${conformingOne.display}, while the published one-unit FHA limit is ${fhaOne.display}. Those figures organize different program categories; ${conformingOne.display} is not a conventional loan offer, and ${fhaOne.display} is not an FHA eligibility finding. For ${locationName}, starting with ${geographyName} keeps the limits attached to the county or county-equivalent area used in the official files. A ${locationName} borrower still needs to confirm the selected property's location and legal unit count, because the relevant ${geographyName} row follows the property rather than the city label or mailing address alone. Around ${locationName}, mailing cities and ZIP codes can cross county boundaries, so the official property jurisdiction should be verified instead of inferred from a familiar place name. Keep ${geographyName} as ${locationName}'s confirmed county row before comparing the ${conformingOne.display} and ${fhaOne.display} program boundaries.`, ["conforming-one", "fha-one"]),
    evidenceSection(byId, "one-unit-comparison", "How the one-unit program boundaries compare", `For the matched ${locationName} area, the difference between the ${conformingOne.display} one-unit conforming limit and the ${fhaOne.display} one-unit FHA limit is ${difference.display}. ${sameOneUnitLimit ? `In this release the two one-unit figures are equal at ${conformingOne.display}, so the comparison does not create a larger published boundary for either program.` : `The ${difference.display} gap marks different published program boundaries, not a pricing advantage or a recommendation to borrow more.`} A needed loan amount can be compared with ${conformingOne.display} and ${fhaOne.display} only after price, down payment, financed items, and the applicable base-loan definition are established. Even when ${difference.display} is material, it cannot determine approval, mortgage insurance, cash requirements, rates, fees, or whether either program suits the borrower.`, ["conforming-one", "fha-one", "one-unit-difference"]),
    evidenceSection(byId, "unit-count", "Unit count changes the published ceiling", `${geographyName}'s conforming limit rises from ${conformingOne.display} for one unit to ${conformingFour.display} for four units, while the FHA figures move from ${fhaOne.display} to ${fhaFour.display}. The higher ${conformingFour.display} and ${fhaFour.display} amounts apply to the published four-unit category; they do not apply to a one-unit home merely because a borrower wants a larger loan. In ${locationName}, a legal unit count should be verified from reliable property information before a multi-unit limit is used. The ${conformingFour.display} and ${fhaFour.display} ceilings do not resolve occupancy, appraisal, rental-income treatment, reserves, or other multi-unit program rules, so the amount in the table is only one part of the product discussion.`, ["conforming-one", "conforming-four", "fha-one", "fha-four"]),
    evidenceSection(byId, "category-boundary", "A limit is a category boundary, not borrowing power", `The ${conformingOne.display} conforming ceiling and ${fhaOne.display} FHA ceiling classify a loan amount within their respective 2026 county tables; neither amount increases a ${locationName} household's income or reduces its debts. A borrower seeking less than ${conformingOne.display} can still have important conventional requirements to review, and a request below ${fhaOne.display} can still require FHA-specific eligibility, property, mortgage-insurance, and occupancy analysis. The ${difference.display} program gap is therefore best used to route questions, not to rank products. Regardless of the ${difference.display} gap, borrowing capacity comes from the documented borrower, property, transaction, and current underwriting rules rather than the largest number available in a public limit file.`, ["conforming-one", "fha-one", "one-unit-difference"]),
    evidenceSection(byId, "limit-boundaries", "What the county limits cannot decide", `Neither ${conformingFour.display} nor ${fhaFour.display} indicates what a four-unit property in ${locationName} is worth, what income its units may produce, or whether a borrower can qualify to purchase it. The one-unit ${conformingOne.display} and ${fhaOne.display} limits likewise cannot establish a down payment, debt-to-income result, appraisal, reserves, mortgage insurance, interest rate, fees, or final approval. The ${conformingOne.display} and ${fhaOne.display} official limits can change by year, and a corrected property geography or unit count can change the applicable row. That is why ${locationName}'s connection to ${geographyName} and the 2026 period must remain visible whenever these figures are carried into a planning worksheet or product conversation.`, ["conforming-four", "fha-four", "conforming-one", "fha-one"]),
    evidenceSection(byId, "verify-next", "Verify the property before comparing products", `A useful ${locationName} next step is to document the property address, ${geographyName} geography, legal unit count, price, down-payment plan, and expected base loan amount. Compare that amount with ${conformingOne.display} and ${fhaOne.display} for a one-unit property, or with ${conformingFour.display} and ${fhaFour.display} only when the four-unit category is actually applicable. After the ${conformingOne.display} and ${fhaOne.display} comparison, ask a licensed professional to verify the current official row and explain the borrower, property, occupancy, insurance, and documentation rules attached to each option. The ${conformingOne.display} conforming figure and ${fhaOne.display} FHA figure should remain dated to 2026 throughout that review. This sequence uses the ${difference.display} one-unit gap as planning context while avoiding any promise that a published ceiling is available, affordable, or appropriate.`, ["conforming-one", "fha-one", "conforming-four", "fha-four", "one-unit-difference"]),
  ];
}

function buildStateHpiSections({ locationName, facts }) {
  const byId = factMap(facts);
  const index = byId.get("hpi-index");
  const quarterly = byId.get("quarterly-change");
  const annual = byId.get("annual-change");
  const fiveYear = byId.get("five-year-change");
  const quarterDirection = trendWord(quarterly.value, "rose", "fell");
  const annualDirection = trendWord(annual.value, "rose", "fell");
  const longDirection = trendWord(fiveYear.value, "rose", "fell");
  return [
    evidenceSection(byId, "latest-index", "The latest statewide index reading", `${locationName}'s latest FHFA purchase-only HPI is ${index.display}, accompanied by a quarterly change of ${quarterly.display}. For ${locationName}, the ${index.display} index level is a benchmark for repeat-sale price movement, not a dollar-denominated typical home price. A quarter in which the index ${quarterDirection} by ${quarterly.display} can help a borrower date the statewide market context, but it cannot identify the value or asking price of a selected property. Reading ${index.display} with ${quarterly.display} also keeps the level separate from the rate of change. Alongside the ${index.display} state index, local inventory, property type, condition, concessions, taxes, insurance, and financing costs still need current evidence before the trend informs a decision.`, ["hpi-index", "quarterly-change"]),
    evidenceSection(byId, "short-and-annual", "Quarterly and annual windows tell different stories", `Over the latest quarter, ${locationName}'s purchase-only HPI ${quarterDirection} by ${quarterly.display}; over the latest year, it ${annualDirection} by ${annual.display}. The ${quarterly.display} figure is more sensitive to recent movement, while ${annual.display} compares the latest quarter with the matching quarter a year earlier. A borrower should not choose between the ${quarterly.display} and ${annual.display} windows based only on which looks more favorable, because the comparisons answer different timing questions. Together they show whether recent statewide movement is aligned with or different from the broader year without predicting the next quarter, a local bidding environment, or the price path of one home in ${locationName}.`, ["quarterly-change", "annual-change"]),
    evidenceSection(byId, "longer-run", "Place the latest movement in a longer sequence", `Across the five-year comparison, the ${locationName} HPI ${longDirection} by ${fiveYear.display}, compared with the latest annual movement of ${annual.display}. The ${fiveYear.display} change places the current ${index.display} index reading in a longer repeat-sale sequence, but it can span very different rate, inventory, and economic conditions. The ${fiveYear.display} change should not be applied to an old purchase price to estimate a current property value. For a borrower, the contrast between ${fiveYear.display} and ${annual.display} is most useful as a reminder that search assumptions can age at different speeds. Even when the ${fiveYear.display} direction is clear, current comparable properties and a property-specific payment worksheet remain necessary.`, ["five-year-change", "annual-change", "hpi-index"]),
    evidenceSection(byId, "market-context", "Use the index to test local assumptions", `The combination of a ${quarterly.display} quarterly change, ${annual.display} annual change, and ${fiveYear.display} five-year change gives ${locationName} borrowers three dated views of the same statewide index. If the ${quarterly.display}, ${annual.display}, and ${fiveYear.display} windows point in different directions, the divergence shows that timing matters; if they point together, statewide consistency still does not erase local variation. A ${locationName} search plan can use those three changes to ask whether current listings, seller concessions, and property types resemble the broad state movement. It should not use ${index.display} as a sale price or use any of the percentage changes as a forecast, because FHFA HPI measures repeat-sale movement rather than the complete set of homes available to one borrower.`, ["quarterly-change", "annual-change", "five-year-change", "hpi-index"]),
    evidenceSection(byId, "valuation-boundary", "The HPI cannot value a property or set a payment", `An HPI level of ${index.display} does not establish a ${locationName} property's dollar value, and an ${annual.display} annual movement does not establish how much any home gained or lost. The ${index.display} index excludes the borrower's down payment, loan amount, interest rate, taxes, insurance, association costs, repairs, and time horizon. FHFA can also revise published values, so the ${quarterly.display} and ${fiveYear.display} comparisons should retain their release period. The ${index.display} index level must remain separate from the dollar figures used in a property review. Those limits make the ${index.display} state index useful for orientation but unsuitable as an appraisal, offer recommendation, equity calculation, promised appreciation claim, payment quote, or underwriting conclusion.`, ["hpi-index", "annual-change", "quarterly-change", "five-year-change"]),
    evidenceSection(byId, "local-next-step", "Connect the state trend to current property evidence", `A practical ${locationName} borrower review can record ${quarterly.display}, ${annual.display}, and ${fiveYear.display} as statewide trend markers, then compare them with current local listings and recent property-level evidence. For a purchase, keep the ${quarterly.display} state change as context while adding the selected price, inspection findings, appraisal process, taxes, insurance, cash-to-close, and loan disclosures. For a refinance or equity question, begin with a defensible property review rather than multiplying a prior value by ${annual.display} or ${fiveYear.display}. This approach preserves the information in the ${index.display} HPI while giving current local and borrower-specific facts the decision-making role that a statewide repeat-sale index cannot fill.`, ["quarterly-change", "annual-change", "five-year-change", "hpi-index"]),
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
  const valueChange = byId.get("home-value-change");
  const valueDirection = trendWord(valueChange.value, "increased", "decreased");
  const tenureLead = ownerShare.value >= renterShare.value ? "owner-occupied" : "renter-occupied";
  return [
    evidenceSection(byId, "state-cost-baseline", "Statewide value, income, and owner costs", `${locationName}'s 2024 ACS housing baseline reports a median owner-occupied home value of ${homeValue.display}, median household income of ${income.display}, and median selected monthly owner costs of ${ownerCost.display} for owners with a mortgage. The ${homeValue.display}, ${income.display}, and ${ownerCost.display} values are separate statewide medians, so they should not be treated as the price, income, and monthly budget of one typical household. The ${ownerCost.display} measure combines recurring ownership expenses and is not a real-estate-tax figure or a current mortgage quote. For planning, ${homeValue.display}, ${income.display}, and ${ownerCost.display} identify statewide reference points and cost categories, while a real decision still requires local property, borrower, tax, insurance, and loan information.`, ["home-value", "income", "owner-cost"]),
    evidenceSection(byId, "owner-and-renter-costs", "Keep owner costs and rent comparable", `The same ${locationName} release reports ${rent.display} in median gross rent alongside ${ownerCost.display} in median selected monthly owner costs for owners with a mortgage. The two measures cover different housing populations and cost definitions, so ${rent.display} should not be compared with only principal and interest or used to declare a statewide break-even point. A useful comparison replaces the ${rent.display} and ${ownerCost.display} medians with a current lease and a current property budget, including utilities, taxes, insurance, maintenance, association obligations, transaction costs, and the expected time horizon. The ${income.display} statewide median can provide economic context, but dividing it by either ${rent.display} or ${ownerCost.display} would still combine medians that do not represent the same household.`, ["rent", "owner-cost", "income"]),
    evidenceSection(byId, "state-tenure", "How occupied housing is divided by tenure", `Across ${locationName}'s measured housing stock of ${units.display} units, the owner share of occupied housing is ${ownerShare.display} and the renter share is ${renterShare.display}, making ${tenureLead} housing the larger statewide tenure group. The ${ownerShare.display} and ${renterShare.display} shares describe how occupied units were distributed during the survey period; they do not measure current buyer demand, owner willingness to sell, or renter readiness to purchase. The ${ownerShare.display} and ${renterShare.display} statewide tenure split is useful for understanding scale and checking assumptions about the housing mix. It remains too broad to select a product or characterize a particular city, county, property type, or household inside ${locationName}.`, ["housing-units", "owner-share", "renter-share"]),
    evidenceSection(byId, "state-vacancy", "Vacancy is broader than homes for sale", `${locationName}'s vacant-unit share is ${vacancyShare.display} within a statewide stock of ${units.display} housing units. ACS vacancy includes categories beyond property currently offered for sale or rent, so ${vacancyShare.display} is not a live inventory rate and cannot measure competition for a selected home. Read beside the ${ownerShare.display} owner share and ${renterShare.display} renter share, the vacancy figure helps describe how the broad stock was classified without predicting near-term supply. Borrowers should use current listings, property condition, days on market, concessions, and local professional context to answer transaction questions that ${vacancyShare.display} and ${units.display} were not designed to resolve.`, ["vacancy-share", "housing-units", "owner-share", "renter-share"]),
    evidenceSection(byId, "state-change", "The statewide home-value estimate changed across periods", `${locationName}'s median home-value estimate ${valueDirection} from ${priorValue.display} in the prior ACS period to ${homeValue.display} in the current release, a reported change of ${valueChange.display}. Because both estimates summarize multi-year survey windows, ${valueChange.display} is not a point-to-point appreciation rate for a property purchased at ${priorValue.display}. The ${valueChange.display} comparison can show that an old statewide reference may need updating, but it cannot explain the value path in each local market or price segment. Margins of error, changes in the housing mix, and current property evidence should be reviewed before the move from ${priorValue.display} to ${homeValue.display} influences a purchase, refinance, or equity assumption.`, ["prior-home-value", "home-value", "home-value-change"]),
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
    evidenceSection(byId, "statewide-conforming-range", "The conforming range across county records", `${locationName}'s statewide summary covers ${countyCount.display} county or county-equivalent records. Within those records, the 2026 one-unit conforming limit runs from ${conformingLow.display} to ${conformingHigh.display}. ${conformingVaries ? `The ${conformingLow.display} to ${conformingHigh.display} range confirms that one conforming ceiling does not apply uniformly across ${locationName}.` : `The matched records share a one-unit conforming figure of ${conformingLow.display}, but the applicable county row still must be verified for a property.`} The ${countyCount.display} record count keeps the range tied to the statewide source coverage rather than an assumed national rule. The ${conformingLow.display} to ${conformingHigh.display} amounts classify loan size within the published program table; they do not establish a borrower's capacity, a property's value, or the price of financing. Before using the ${conformingHigh.display} statewide maximum, county, legal unit count, and expected base loan amount must be known.`, ["county-count", "conforming-range-low", "conforming-range-high"]),
    evidenceSection(byId, "statewide-fha-range", "The FHA range follows its own county table", `Across the same ${countyCount.display} ${locationName} records, the 2026 one-unit FHA limit spans ${fhaLow.display} to ${fhaHigh.display}. ${fhaVaries ? `The ${fhaLow.display} low and ${fhaHigh.display} high show that FHA's published boundary also varies within the state.` : `The matched FHA rows share ${fhaLow.display}, although property geography and current program guidance still require confirmation.`} The ${fhaLow.display} floor and ${fhaHigh.display} high remain county-table values even when they match conforming amounts elsewhere. The FHA range should not be merged with the ${conformingLow.display} to ${conformingHigh.display} conforming range, because the programs use different authorities and requirements. A ${fhaLow.display} to ${fhaHigh.display} comparison can route loan-amount and product-category questions, but it cannot determine FHA eligibility, mortgage insurance, appraisal acceptability, occupancy compliance, cash needs, or approval.`, ["county-count", "fha-range-low", "fha-range-high", "conforming-range-low", "conforming-range-high"]),
    evidenceSection(byId, "high-cost-counties", "Why county verification matters", `${countiesAbove.display} ${locationName} counties sit above the conforming baseline in this summary, while the full conforming range reaches from ${conformingLow.display} to ${conformingHigh.display}. That count shows where a statewide shortcut can fail: a property in a higher-limit county may use a different published ceiling than one at ${conformingLow.display}. The ${countiesAbove.display} figure does not mean those counties are more affordable, more desirable, or more likely to approve a loan. It only describes how many matched county rows exceed the baseline. The ${conformingHigh.display} maximum should therefore be treated as evidence that county lookup matters, not as the default ${locationName} limit. Before treating ${conformingHigh.display} as relevant, a borrower should identify the property's official county or county-equivalent area and then attach conventional, jumbo, or FHA labels to the desired loan amount.`, ["counties-above", "conforming-range-low", "conforming-range-high"]),
    evidenceSection(byId, "program-comparison", "Conforming and FHA ranges answer different questions", `The highest one-unit conforming amount in ${locationName} is ${conformingHigh.display}, while the highest FHA amount is ${fhaHigh.display}; at the low end, the figures are ${conformingLow.display} and ${fhaLow.display}. These pairs show program boundaries, not competing offers. A requested amount below ${conformingHigh.display} may still fall outside the applicable county's conforming limit, and an amount below ${fhaHigh.display} may still face FHA borrower and property requirements. Comparing ${conformingLow.display}, ${conformingHigh.display}, ${fhaLow.display}, and ${fhaHigh.display} is useful only when county and unit count are held constant. The ${conformingHigh.display} and ${fhaHigh.display} ceilings leave rates, fees, mortgage insurance, appraisal, reserves, debt capacity, and product suitability as separate questions for the documented transaction.`, ["conforming-range-high", "fha-range-high", "conforming-range-low", "fha-range-low"]),
    evidenceSection(byId, "state-limit-boundaries", "A larger county limit is not greater affordability", `A ${conformingHigh.display} conforming ceiling or ${fhaHigh.display} FHA ceiling does not make that loan amount affordable to a ${locationName} household, and the lower ${conformingLow.display} or ${fhaLow.display} figures do not describe home prices. Published ${conformingHigh.display} and ${fhaHigh.display} limits cannot establish borrower income, debts, credit, assets, occupancy, property condition, appraisal, insurance, reserves, rates, fees, or final approval. The ${conformingHigh.display} and ${fhaHigh.display} figures can also change with a new calendar year or corrected property geography. Keeping the ${countyCount.display} county-record scope and 2026 period attached to the figures prevents the statewide summary from being mistaken for a personalized product recommendation or a single amount that applies everywhere.`, ["conforming-range-high", "fha-range-high", "conforming-range-low", "fha-range-low", "county-count"]),
    evidenceSection(byId, "county-lookup", "Use the range to reach the correct county row", `The next step is to verify the selected property's ${locationName} county or county-equivalent area, legal unit count, price, down-payment plan, and expected base loan amount. Then compare that amount with the exact official row, using the ${conformingLow.display} to ${conformingHigh.display} conforming range and ${fhaLow.display} to ${fhaHigh.display} FHA range only as orientation. The ${countiesAbove.display} above-baseline count explains why this lookup matters, but it does not replace it. Keep the selected county row with the worksheet so the ${conformingHigh.display} and ${fhaHigh.display} statewide maximums cannot be mistaken for property-specific figures. After the ${countiesAbove.display} count prompts that county lookup, a licensed professional can explain current limits and borrower, property, mortgage-insurance, and documentation rules without presenting the largest statewide figure as available borrowing power.`, ["conforming-range-low", "conforming-range-high", "fha-range-low", "fha-range-high", "counties-above"]),
  ];
}

function makeSections(locationName, facts, config, context) {
  if (typeof config.buildSections !== "function") throw new Error(`Missing evidence-led section builder for ${config.topicLabel}`);
  return config.buildSections({ locationName, facts, context });
}

function qualifyLocationCopy(value, locationName, locationDisplayName) {
  if (locationName === locationDisplayName) return value;
  return String(value)
    .replaceAll(`${locationName}'s`, `${locationDisplayName}'s`)
    .replaceAll(locationName, locationDisplayName);
}

function completeMetaDescription(value, maximumLength = 160) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "");
  if (normalized.length + 1 <= maximumLength) return `${normalized}.`;
  const cutoff = normalized.lastIndexOf(" ", maximumLength - 1);
  const completeWords = normalized.slice(0, cutoff > 40 ? cutoff : maximumLength - 1).replace(/[,:;-]+$/, "");
  return `${completeWords}.`;
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
  const sections = makeSections(locationDisplayName, facts, config, context);
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
    metaDescription: completeMetaDescription(`${qualifiedTitle}. ${qualifiedPreviewText}`),
    publishedAt: context.publishedAt || "2026-07-10",
    updatedAt: context.publishedAt || "2026-07-10",
    relevanceLabel,
    topicIds,
    productIds: context.productIds || [],
    sourceLabels: [...new Set(records.map((record) => record.publisher))],
    imageId: image.id,
    keyTakeaways: facts.slice(0, 5).map((item) => `${item.label}: ${item.display}.`),
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
      columns: ["Measure", "Value", "Source"],
      rows: facts.map((item) => [item.label, item.display, visibleSourceLabel(item, recordsById)]),
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
  const valueChange = percentChange(byKey["city-home-value-current"].estimate, byKey["city-home-value-prior"].estimate);
  const stateGapValue = percentChange(byKey["city-home-value-current"].estimate, byKey["state-home-value-current"].estimate);
  const stateGapPosition = stateGapValue >= 0 ? "above the state estimate" : "below the state estimate";
  const facts = [
    fact("median-home-value", "ACS median owner-occupied home value", byKey["city-home-value-current"].estimate, formatMoney(byKey["city-home-value-current"].estimate), [byKey["city-home-value-current"].sourceId]),
    fact("prior-home-value", "prior ACS median owner-occupied home value", byKey["city-home-value-prior"].estimate, formatMoney(byKey["city-home-value-prior"].estimate), [byKey["city-home-value-prior"].sourceId], true),
    fact("median-household-income", "ACS median household income", byKey["city-income-current"].estimate, formatMoney(byKey["city-income-current"].estimate), [byKey["city-income-current"].sourceId]),
    fact("median-owner-cost", "median monthly owner cost with a mortgage", byKey["city-owner-cost-current"].estimate, formatMoney(byKey["city-owner-cost-current"].estimate), [byKey["city-owner-cost-current"].sourceId]),
    fact("home-value-change", "change from the prior ACS home-value estimate", valueChange, formatPercent(valueChange), [byKey["city-home-value-current"].sourceId, byKey["city-home-value-prior"].sourceId], true),
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
    methodology: "This article uses 2024 and 2019 ACS 5-year estimates for the Census place and a 2024 parent-state comparison, including published margins of error.",
    limitations: "ACS estimates represent survey periods rather than point-in-time prices, and apparent changes may not be statistically meaningful without a margin-of-error test.",
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
    fact("monthly-rate-change", "change in unemployment rate from the prior month", monthlyRateChange, formatPercent(monthlyRateChange), [byKey["unemployment-rate"].sourceId, byKey["previous-rate"].sourceId], true),
    fact("annual-rate-change", "change in unemployment rate from a year earlier", rateChange, formatPercent(rateChange), [byKey["unemployment-rate"].sourceId, byKey["year-ago-rate"].sourceId], true),
  ];
  return articleBase({ context, articleType: type, locationType, title: `${titlePrefix} labor market: latest employment evidence`, dek: `A borrower-focused reading of the latest BLS labor-force, employment, unemployment, and rate measures for ${context.location.name}.`, previewText: `See what changed in ${context.location.name}'s labor market and why broad employment data cannot determine mortgage eligibility.`, relevanceLabel: "Labor market", theme: "local_economy", topicIds: ["labor-market", "employment", "borrower-planning"], records, facts, config: {
    topicLabel: "labor-market evidence", openingHeading: "What the latest LAUS release reports", meaning: "The labor force, employment, unemployment, and unemployment rate are related measures, and reading all of them prevents a rate movement from being interpreted without its underlying counts.",
    comparisonHeading: "Month and year comparisons answer different questions", comparisonMeaning: "A monthly movement can reflect short-term change and revision, while the year-over-year comparison gives a wider reference point without predicting the next release.",
    planningHeading: "Use labor data as economic context", planning: "Broad labor evidence can help organize questions about timing and local economic conditions, but a lender evaluates documented income, employment history, debts, assets, and program rules at the borrower level.",
    tradeoffHeading: "Employment counts do not measure mortgage readiness", tradeoff: "The LAUS definition of employment is an economic statistic, not a review of income stability, job tenure, variable earnings, self-employment records, or the continuity standards used in underwriting.",
    cannotDecide: "BLS does not evaluate any applicant and cannot indicate whether a person's income is eligible, sufficient, stable, or likely to continue for mortgage purposes.",
    actionHeading: "Translate economic context into documentation questions", action: "Keep the public trend separate from the borrower's records, and ask what pay history, tax returns, contracts, reserves, or explanations may be needed for the actual loan path.",
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
  const valueChange = percentChange(byKey["home-value"].estimate, byKey["home-value-prior"].estimate);
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
    fact("home-value-change", "change from the prior ACS home-value estimate", valueChange, formatPercent(valueChange), [byKey["home-value"].sourceId, byKey["home-value-prior"].sourceId], true),
  ];
  return articleBase({ context, articleType: type, locationType: "state", title: `${context.location.name} housing costs, ownership, and rent in the latest ACS`, dek: `Statewide evidence on home value, income, owner costs, housing stock, tenure, vacancy, and rent for borrower planning.`, previewText: `Read statewide housing-cost, ownership, vacancy, and rent evidence for ${context.location.name} with survey limitations and practical questions.`, relevanceLabel: "State housing costs", theme: "housing_supply", topicIds: ["state-housing", "owner-costs", "tenure", "rent"], records, facts, config: {
    topicLabel: "state housing-cost and ownership evidence", openingHeading: "Statewide values, income, and recurring housing costs", meaning: "Value, income, owner-cost, and rent estimates describe different parts of the housing budget, while housing-stock and tenure records show the scale and use of the statewide inventory.",
    comparisonHeading: "Tenure, vacancy, and change need separate readings", comparisonMeaning: "Owner share, vacant-unit share, and change across survey periods answer different questions and should not be collapsed into a claim about current for-sale supply or future prices.",
    planningHeading: "Build comparable owner and renter budgets", planning: "Compare actual property and lease choices over the intended time horizon, including taxes, insurance, maintenance, association obligations, utilities, transaction costs, and cash reserves.",
    tradeoffHeading: "State medians do not describe every local market", tradeoff: "A statewide midpoint can provide orientation while still sitting far from the conditions in a particular city, county, property type, or price segment.",
    cannotDecide: "The ACS cannot select a product, value a property, predict appreciation or rent, establish a payment, or determine whether an applicant meets underwriting requirements.",
    actionHeading: "Move from statewide context to a local worksheet", action: "Use the state evidence to identify cost categories and comparison questions, then replace statewide medians with current local, property-specific, and borrower-specific information.",
    buildSections: buildStateHousingSections,
    methodology: "This article uses 2024 ACS 5-year state estimates for home value, household income, selected owner costs, rent, total and occupied housing units, vacancy, and owner and renter tenure, plus a 2019 value comparison.",
    limitations: "ACS estimates cover multi-year survey periods, carry margins of error, and do not measure current listings, current financing terms, or a specific household's housing costs.",
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
