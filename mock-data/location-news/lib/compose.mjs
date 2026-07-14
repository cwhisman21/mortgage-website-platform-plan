import { assignMedia } from "./media.mjs";
import { slugify } from "./core.mjs";
import { authorIdForLocationNews } from "./author-assignment.mjs";

const PUBLISHER = {
  census: "U.S. Census Bureau",
  bls: "U.S. Bureau of Labor Statistics",
  fhfa: "Federal Housing Finance Agency",
  hud: "U.S. Department of Housing and Urban Development",
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

function censusRecord(articleId, key, metric) {
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
    citationLabel: `${metric.variableOrSeriesId}, ${metric.period} ACS 5-year`,
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
    geographyType: bls.geographyId.startsWith("ST") ? "state" : "city",
    geographyId: bls.geographyId,
    period,
    releasedAt: null,
    retrievedAt: bls.retrievedAt,
    estimate: bls[periodKey][measure],
    marginOfError: null,
    revisionStatus: bls.revisionStatus,
    citationLabel: `BLS LAUS ${period} ${key}`,
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
    citationLabel: `${dataset}, ${key}`,
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
    citationLabel: `FHFA state HPI ${hpi.period}, ${key}`,
  };
}

function fact(id, label, value, display, sourceRecordIds, comparison = false) {
  return { id, label, value, display, sourceRecordIds, comparison };
}

function makeSections(locationName, topic, facts, config, sourceRecordIds) {
  const [first, second, third, fourth] = facts;
  const comparison = facts.find((item) => item.comparison) || fourth;
  const sourceNote = `The figures are tied to the cited geography and period, so the useful reading is specific to ${locationName}'s ${topic}; a different release, geography, or property can support a different conclusion.`;
  const sections = [
    {
      id: "latest-evidence",
      heading: config.openingHeading,
      body: [`The latest evidence for ${locationName} puts ${first.label} at ${first.display}, while ${second.label} is ${second.display}. ${config.meaning} Reading the figures together is more useful than treating either as a verdict: the first describes one part of the market and the second supplies context for the borrower decision. ${sourceNote} This is a planning signal, not a quote, appraisal, approval decision, or forecast, and it should lead to more precise questions rather than a predetermined loan choice.`],
      sourceRecordIds,
    },
    {
      id: "comparison",
      heading: config.comparisonHeading,
      body: [`The clearest comparison in this release is ${comparison.label} at ${comparison.display}. ${config.comparisonMeaning} That difference can help a borrower identify which assumptions deserve attention first, but it cannot explain every household or property inside ${locationName}. The comparison should stay attached to its dates and definitions, especially when estimates or revised labor records are involved. ${sourceNote} A sound comparison keeps the same measure and geography aligned before drawing a conclusion, then checks the property-level facts separately.`],
      sourceRecordIds,
    },
    {
      id: "borrower-planning",
      heading: config.planningHeading,
      body: [`For a borrower, ${third.label} at ${third.display} is most useful as an input to an organized comparison. ${config.planning} In ${locationName}, that means separating the market evidence from personal inputs such as cash available, credit profile, debts, intended occupancy, property type, taxes, insurance, and time horizon. ${sourceNote} The evidence can narrow the questions for a lender or housing professional, but it does not replace verified disclosures, a property review, or an individualized affordability discussion.`],
      sourceRecordIds,
    },
    {
      id: "tradeoffs",
      heading: config.tradeoffHeading,
      body: [`Another boundary comes from ${fourth.label}, reported here as ${fourth.display}. ${config.tradeoff} A borrower comparing options in ${locationName} can use that boundary to keep unlike choices from being blended together. The objective is not to select a product from a public statistic; it is to understand which product, cash-flow, timing, and documentation questions belong in the next conversation. ${sourceNote} When the evidence changes, the worksheet should change with it rather than preserving an outdated assumption.`],
      sourceRecordIds,
    },
    {
      id: "what-data-cannot-decide",
      heading: "What the data cannot decide for you",
      body: [`Neither ${first.display} for ${first.label} nor ${third.display} for ${third.label} determines whether an individual borrower qualifies, what pricing may be available, or what a specific home is worth. ${config.cannotDecide} Public evidence also cannot see contract terms, reserves, property condition, association obligations, tax exemptions, insurance quotes, or changes after the stated period. ${sourceNote} Those limits matter because a broad local measure can be accurate for its published purpose while still being unsuitable as a substitute for underwriting, an appraisal, or personalized advice.`],
      sourceRecordIds,
    },
    {
      id: "next-comparison",
      heading: config.actionHeading,
      body: [`A practical next step is to carry ${second.display} for ${second.label} and ${comparison.display} for ${comparison.label} into a side-by-side planning conversation. ${config.action} Ask which assumptions are verified, which are estimates, which can change before closing, and which depend on the selected property. In ${locationName}, the cited evidence gives that conversation a factual starting point without promising an outcome. ${sourceNote} Borrowers should confirm current program guidance and property-specific costs with appropriately licensed professionals before acting.`],
      sourceRecordIds,
    },
  ];
  return sections;
}

function articleBase({ context, articleType, title, dek, previewText, relevanceLabel, theme, topicIds, records, facts, config, locationType }) {
  const location = context.location;
  const locationDisplayName = locationType === "city" && context.state?.abbr
    ? `${location.name}, ${context.state.abbr}`
    : location.name;
  const qualifiedTitle = locationDisplayName !== location.name && title.startsWith(location.name)
    ? `${locationDisplayName}${title.slice(location.name.length)}`
    : title;
  const articleId = `news-${location.id.replace(/^(city|state)-/, "")}-${articleType.replace(/_/g, "-")}`;
  const route = `/learning-center/market-news/${articleId.replace(/^news-/, "")}`;
  const sourceRecordIds = records.map((record) => record.sourceId);
  const image = assignMedia(articleId, theme, context.mediaAssets);
  const sections = makeSections(locationDisplayName, config.topicLabel, facts, config, sourceRecordIds);
  return {
    id: articleId,
    route,
    locationId: location.id,
    locationType,
    articleType,
    authorId: authorIdForLocationNews({ articleType, topicIds }),
    title: qualifiedTitle,
    dek,
    previewText,
    metaDescription: `${previewText} Review official evidence, comparisons, limitations, and practical mortgage-planning questions for ${locationDisplayName}.`.slice(0, 165),
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
      rows: facts.map((item) => [item.label, item.display, item.sourceRecordIds.join(",")]),
      sourceRecordIds,
    }],
    ctaPlacements: [{
      afterSectionId: "borrower-planning",
      type: "compare_options",
      label: "Compare verified loan options",
      route: "/loan-options",
    }],
    methodology: `${config.methodology} Values are assembled only from structured source records for the cited geography and period. Comparisons retain the underlying source identifiers, and no missing figure is replaced with an estimate created by this generator.`,
    limitations: `${config.limitations} The evidence is broad market context, not a property valuation, rate or payment quote, eligibility finding, underwriting decision, product recommendation, or prediction.`,
    sourceRecords: records,
    relatedRoutes: [...new Set([location.route, ...(context.relatedRoutes || [])])],
    reviewStatus: "editorial_review_required",
    complianceStatus: "compliance_review_required",
  };
}

function censusInputs(context, articleType, keys) {
  const articleId = `news-${context.location.id.replace(/^(city|state)-/, "")}-${articleType.replace(/_/g, "-")}`;
  const records = [];
  const byKey = {};
  for (const [recordKey, sourceGroup, metricKey] of keys) {
    const metric = context.census[sourceGroup].metrics[metricKey];
    const record = censusRecord(articleId, recordKey, metric);
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
  const facts = [
    fact("median-home-value", "ACS median owner-occupied home value", byKey["city-home-value-current"].estimate, formatMoney(byKey["city-home-value-current"].estimate), [byKey["city-home-value-current"].sourceId]),
    fact("median-household-income", "ACS median household income", byKey["city-income-current"].estimate, formatMoney(byKey["city-income-current"].estimate), [byKey["city-income-current"].sourceId]),
    fact("median-owner-cost", "median monthly owner cost with a mortgage", byKey["city-owner-cost-current"].estimate, formatMoney(byKey["city-owner-cost-current"].estimate), [byKey["city-owner-cost-current"].sourceId]),
    fact("home-value-change", "change from the prior ACS home-value estimate", valueChange, formatPercent(valueChange), [byKey["city-home-value-current"].sourceId, byKey["city-home-value-prior"].sourceId], true),
    fact("state-home-value", `${context.state.name} median home value`, byKey["state-home-value-current"].estimate, formatMoney(byKey["state-home-value-current"].estimate), [byKey["state-home-value-current"].sourceId], true),
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
  const facts = [
    fact("housing-units", "total housing units", byKey["housing-units"].estimate, formatNumber(byKey["housing-units"].estimate), [byKey["housing-units"].sourceId]),
    fact("occupied-units", "occupied housing units", byKey["occupied-units"].estimate, formatNumber(byKey["occupied-units"].estimate), [byKey["occupied-units"].sourceId]),
    fact("vacant-units", "vacant housing units", byKey["vacant-units"].estimate, formatNumber(byKey["vacant-units"].estimate), [byKey["vacant-units"].sourceId]),
    fact("vacancy-share", "vacant-unit share of housing stock", vacancyShare, formatPercent(vacancyShare), [byKey["vacant-units"].sourceId, byKey["housing-units"].sourceId], true),
    fact("owner-share", "owner share of occupied units", ownerShare, formatPercent(ownerShare), [byKey["owner-units"].sourceId, byKey["occupied-units"].sourceId], true),
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
    methodology: "This article uses 2024 ACS 5-year place estimates for units, occupancy, vacancy, owner and renter tenure, and gross rent, with 2019 evidence retained for comparison review.",
    limitations: "ACS vacancy includes categories beyond for-sale availability, and tenure and rent estimates carry sampling error and do not measure current listing inventory.",
  }});
}

function composeLabor(context, locationType, type, titlePrefix) {
  const articleId = `news-${context.location.id.replace(/^(city|state)-/, "")}-${type.replace(/_/g, "-")}`;
  const definitions = [["labor-force", "labor force", "latest", "laborForce", "06"], ["employment", "employment", "latest", "employment", "05"], ["unemployment", "unemployment", "latest", "unemployment", "04"], ["unemployment-rate", "unemployment rate", "latest", "unemploymentRate", "03"], ["previous-rate", "previous-month unemployment rate", "previous", "unemploymentRate", "03"], ["year-ago-rate", "year-ago unemployment rate", "yearAgo", "unemploymentRate", "03"]];
  const records = definitions.map(([key, label, periodKey, measure, code]) => laborRecord(articleId, key, context.bls, periodKey, measure, code));
  const byKey = Object.fromEntries(definitions.map(([key], index) => [key, records[index]]));
  const rateChange = Number((byKey["unemployment-rate"].estimate - byKey["year-ago-rate"].estimate).toFixed(1));
  const facts = [
    fact("labor-force", "labor force", byKey["labor-force"].estimate, formatNumber(byKey["labor-force"].estimate), [byKey["labor-force"].sourceId]),
    fact("employment", "employment", byKey.employment.estimate, formatNumber(byKey.employment.estimate), [byKey.employment.sourceId]),
    fact("unemployment", "unemployment", byKey.unemployment.estimate, formatNumber(byKey.unemployment.estimate), [byKey.unemployment.sourceId]),
    fact("unemployment-rate", "unemployment rate", byKey["unemployment-rate"].estimate, formatPercent(byKey["unemployment-rate"].estimate), [byKey["unemployment-rate"].sourceId]),
    fact("annual-rate-change", "change in unemployment rate from a year earlier", rateChange, formatPercent(rateChange), [byKey["unemployment-rate"].sourceId, byKey["year-ago-rate"].sourceId], true),
  ];
  return articleBase({ context, articleType: type, locationType, title: `${titlePrefix} labor market: latest employment evidence`, dek: `A borrower-focused reading of the latest BLS labor-force, employment, unemployment, and rate measures for ${context.location.name}.`, previewText: `See what changed in ${context.location.name}'s labor market and why broad employment data cannot determine mortgage eligibility.`, relevanceLabel: "Labor market", theme: "local_economy", topicIds: ["labor-market", "employment", "borrower-planning"], records, facts, config: {
    topicLabel: "labor-market evidence", openingHeading: "What the latest LAUS release reports", meaning: "The labor force, employment, unemployment, and unemployment rate are related measures, and reading all of them prevents a rate movement from being interpreted without its underlying counts.",
    comparisonHeading: "Month and year comparisons answer different questions", comparisonMeaning: "A monthly movement can reflect short-term change and revision, while the year-over-year comparison gives a wider reference point without predicting the next release.",
    planningHeading: "Use labor data as economic context", planning: "Broad labor evidence can help organize questions about timing and local economic conditions, but a lender evaluates documented income, employment history, debts, assets, and program rules at the borrower level.",
    tradeoffHeading: "Employment counts do not measure mortgage readiness", tradeoff: "The LAUS definition of employment is an economic statistic, not a review of income stability, job tenure, variable earnings, self-employment records, or the continuity standards used in underwriting.",
    cannotDecide: "BLS does not evaluate any applicant and cannot indicate whether a person's income is eligible, sufficient, stable, or likely to continue for mortgage purposes.",
    actionHeading: "Translate economic context into documentation questions", action: "Keep the public trend separate from the borrower's records, and ask what pay history, tax returns, contracts, reserves, or explanations may be needed for the actual loan path.",
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
  const vacancyShare = share(byKey["vacant-units"].estimate, byKey["housing-units"].estimate);
  const valueChange = percentChange(byKey["home-value"].estimate, byKey["home-value-prior"].estimate);
  const facts = [
    fact("home-value", "state median home value", byKey["home-value"].estimate, formatMoney(byKey["home-value"].estimate), [byKey["home-value"].sourceId]),
    fact("income", "state median household income", byKey.income.estimate, formatMoney(byKey.income.estimate), [byKey.income.sourceId]),
    fact("owner-cost", "median monthly owner cost with a mortgage", byKey["owner-cost"].estimate, formatMoney(byKey["owner-cost"].estimate), [byKey["owner-cost"].sourceId]),
    fact("rent", "median gross rent", byKey.rent.estimate, formatMoney(byKey.rent.estimate), [byKey.rent.sourceId]),
    fact("housing-units", "total housing units", byKey["housing-units"].estimate, formatNumber(byKey["housing-units"].estimate), [byKey["housing-units"].sourceId]),
    fact("owner-share", "owner share of occupied units", ownerShare, formatPercent(ownerShare), [byKey["owner-units"].sourceId, byKey["occupied-units"].sourceId], true),
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
