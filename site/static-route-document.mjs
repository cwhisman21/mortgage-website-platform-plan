import {
  applyArticleAuthorIds,
  mergeEditorialArticles,
  normalizeEditorialContent,
} from "./editorial-content.mjs";
import { renderProductionArticle, renderProductionTopicHub } from "./editorial-renderer.mjs";
import { DEFAULT_SITE_ORIGIN, resolveDocumentMetadata } from "./document-metadata.mjs";
import { productContentById } from "./product-content.mjs";
import { createPublicRouteManifest } from "./public-route-manifest.mjs";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function mapById(items = []) {
  return new Map(items.filter((item) => item?.id).map((item) => [item.id, item]));
}

function recordsForIds(ids, itemMap, recordsByRoute) {
  return (ids || [])
    .map((id) => itemMap.get(id))
    .map((item) => item && recordsByRoute.get(item.route))
    .filter(Boolean);
}

function itemForEntry(entry, maps) {
  const typeMaps = {
    home: maps.siteEntryPages,
    locations: maps.directories,
    state: maps.states,
    city: maps.cities,
    branch: maps.branches,
    loanOfficer: maps.loanOfficers,
    product: maps.products,
    rates: maps.ratesPages,
    blog: maps.blogPages,
    article: maps.articles,
    calculator: maps.calculators,
    directory: maps.directories,
    contributor: maps.contributors,
  };
  if (entry.type === "prequalHandoff") return { id: entry.itemId, route: entry.route };
  return typeMaps[entry.type]?.get(entry.itemId) || null;
}

export function createStaticRouteContext({
  seed = {},
  editorialBundle = {},
  productCopyBundle = { products: [] },
  mediaManifest = { media: [] },
  ratesMarketplaceFixture = {},
} = {}) {
  const editorialContent = normalizeEditorialContent(editorialBundle);
  const articles = applyArticleAuthorIds(
    editorialContent,
    mergeEditorialArticles(seed.articles || [], editorialBundle),
  );
  const data = { ...seed, articles };
  const manifest = createPublicRouteManifest({ seed: data, editorialContent });
  const maps = {
    siteEntryPages: mapById(data.siteEntryPages),
    states: mapById(data.states),
    cities: mapById(data.cities),
    branches: mapById(data.branches),
    loanOfficers: mapById(data.loanOfficers),
    products: mapById(data.products),
    ratesPages: mapById(data.ratesPages),
    blogPages: mapById(data.blogPages),
    articles: mapById(data.articles),
    calculators: mapById(data.calculators),
    directories: mapById(data.directoryPages),
    contributors: mapById(editorialContent.contributors),
    topicHubs: mapById(editorialContent.topicHubs),
    media: mapById(mediaManifest.media || mediaManifest.assets || []),
  };
  const recordsByRoute = new Map();
  const recordsById = new Map();
  for (const entry of manifest) {
    const item = itemForEntry(entry, maps);
    if (!item) throw new Error(`No ${entry.type} item found for ${entry.route} (${entry.itemId})`);
    const record = { entry, found: { type: entry.type, item } };
    recordsByRoute.set(entry.route, record);
    recordsById.set(entry.itemId, record);
  }
  const relatedRoutes = new Map(
    [...recordsByRoute.entries()].map(([route, record]) => [route, {
      ...record.found.item,
      type: record.entry.type,
    }]),
  );
  const publicTopicHubsByRoute = new Map(
    editorialContent.topicHubs
      .filter((hub) => hub.public === true && hub.route)
      .map((hub) => [hub.route, hub]),
  );

  const context = {
    manifest,
    data,
    maps,
    editorialContent,
    productCopyBundle,
    ratesMarketplaceFixture,
    recordsByRoute,
    recordsById,
    relatedRoutes,
    publicTopicHubsByRoute,
    metadataFor(record, { siteOrigin = DEFAULT_SITE_ORIGIN } = {}) {
      return resolveDocumentMetadata(record.found, {
        path: record.entry.route,
        siteOrigin,
        statesById: maps.states,
        productCopyBundle,
        mediaById: maps.media,
        contributorsById: maps.contributors,
      });
    },
  };
  return context;
}

function pageIntro(eyebrow, title, lead, paragraphs = []) {
  return `
    <section class="section static-route-intro">
      <div class="content-layout"><div class="main-stack">
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="lead">${escapeHtml(lead)}</p>
        ${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
      </div></div>
    </section>`;
}

function recordLabel(record) {
  if (!record) return "Mortgage resource";
  if (record.entry.route === "/") return "Snap Mortgage home";
  if (record.entry.route === "/prequal/start") return "Start prequalification";
  return record.found.item.name || record.found.item.title || "Mortgage resource";
}

function recordDescription(record) {
  const item = record?.found?.item || {};
  if (record?.entry?.type === "calculator") {
    return `Compare ${humanList((item.captures || []).map(humanize)) || "mortgage assumptions"}.`;
  }
  if (record?.entry?.type === "loanOfficer") {
    return `${item.nmls || "Licensed mortgage professional"}. ${humanList(item.specialties || [])}.`;
  }
  if (record?.entry?.type === "rates") {
    return "Compare rate, APR, points, payment assumptions, fees, and borrowing costs.";
  }
  return item.metaDescription || item.dek || item.shortBio || item.coverageNote || item.marketPositioning || item.stateNarrative || item.borrowerGoal || "Open this related Snap Mortgage resource.";
}

function linkedCards(title, records, { limit = 24 } = {}) {
  const unique = [];
  const seen = new Set();
  for (const record of records || []) {
    if (!record || seen.has(record.entry.route)) continue;
    seen.add(record.entry.route);
    unique.push(record);
  }
  if (!unique.length) return "";
  return `
    <section class="section compact static-route-links">
      <div class="content-layout"><div class="main-stack">
        <h2>${escapeHtml(title)}</h2>
        <div class="grid three">
          ${unique.slice(0, limit).map((record) => `
            <article>
              <h3><a href="${escapeHtml(record.entry.route)}">${escapeHtml(recordLabel(record))}</a></h3>
              <p>${escapeHtml(recordDescription(record))}</p>
            </article>`).join("")}
        </div>
      </div></div>
    </section>`;
}

function humanize(value) {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
}

function humanList(values = []) {
  const items = values.filter(Boolean);
  if (items.length < 2) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function snapshotList(entries) {
  return `
    <dl class="stats-grid">
      ${entries.filter(([, value]) => value).map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
    </dl>`;
}

function renderLocations(record, context) {
  const stateRecords = context.data.states.map((state) => context.recordsByRoute.get(state.route));
  return `${pageIntro(
    "Local mortgage planning",
    "Mortgage guides by location",
    "Compare state and city housing context before turning a broad budget into a property-specific mortgage review.",
    [
      `Browse ${context.data.states.length} state guides and ${context.data.cities.length} city guides with consistent price, payment, inventory, tax, insurance, and loan-option context.`,
      "Use the same categories across markets, note each source date, and replace broad estimates with property details, current insurance quotes, tax records, and reviewed loan terms before making a decision.",
    ],
  )}${linkedCards("Browse state mortgage guides", stateRecords, { limit: stateRecords.length })}`;
}

function renderState(record, context) {
  const state = record.found.item;
  const snapshot = state.marketSnapshot || {};
  const cityRecords = recordsForIds(state.cityIds, context.maps.cities, context.recordsByRoute);
  const productRecords = recordsForIds(state.featuredProductIds, context.maps.products, context.recordsByRoute);
  return `${pageIntro(
    "State mortgage guide",
    `${state.name} mortgage and housing guide`,
    state.stateNarrative,
    [
      `${state.name} borrowers can use the statewide ${snapshot.medianHomePrice || "home-price"} reference, ${snapshot.paymentScenario || "payment"} scenario, and ${snapshot.inventory || "inventory"} measure as a starting point rather than a quote or property valuation.`,
      `${snapshot.propertyTaxContext || "Property taxes vary by jurisdiction and property."} ${snapshot.insuranceContext || "Insurance needs a property-specific review."} The current snapshot is dated ${snapshot.lastUpdated || "on the source record"}.`,
    ],
  )}
    <section class="section compact"><div class="content-layout"><div class="main-stack">
      <h2>${escapeHtml(state.name)} market snapshot</h2>
      ${snapshotList([
        ["Median home price", snapshot.medianHomePrice],
        ["Payment scenario", snapshot.paymentScenario],
        ["Inventory", snapshot.inventory],
        ["Last updated", snapshot.lastUpdated],
      ])}
      <p>Compare these statewide measures with the city and property you are considering. Loan limits, taxes, insurance, association charges, and available financing can change the usable budget.</p>
    </div></div></section>
    ${linkedCards(`${state.name} city guides`, cityRecords, { limit: cityRecords.length })}
    ${linkedCards("Loan paths to compare", productRecords)}`;
}

function renderCity(record, context) {
  const city = record.found.item;
  const state = context.maps.states.get(city.stateId);
  const snapshot = city.marketSnapshot || {};
  const products = recordsForIds(city.productIds, context.maps.products, context.recordsByRoute);
  const nearby = recordsForIds(city.nearbyCityIds, context.maps.cities, context.recordsByRoute);
  const officers = recordsForIds(city.loanOfficerIds, context.maps.loanOfficers, context.recordsByRoute);
  const branches = recordsForIds(city.branchIds, context.maps.branches, context.recordsByRoute);
  const articles = recordsForIds(city.articleIds, context.maps.articles, context.recordsByRoute);
  return `${pageIntro(
    "Local mortgage market",
    `${city.name}, ${state?.abbr || ""} mortgage market guide`,
    city.marketPositioning,
    [
      `The current structured snapshot shows a ${snapshot.medianHomePrice || "local home-price"} median price, a ${snapshot.paymentScenario || "monthly payment"} planning scenario, ${snapshot.inventory || "local inventory"}, and ${snapshot.daysOnMarket || "a dated days-on-market measure"}.`,
      `For a ${city.name} property, replace these broad references with the actual price, down payment, loan terms, tax record, insurance quote, association dues, condition, and closing-cost details. A citywide measure cannot predict one home's value or financing result.`,
    ],
  )}
    <section class="section compact"><div class="content-layout"><div class="main-stack">
      <h2>Local payment and market inputs</h2>
      ${snapshotList([
        ["Median home price", snapshot.medianHomePrice],
        ["Payment scenario", snapshot.paymentScenario],
        ["Inventory", snapshot.inventory],
        ["Property tax", snapshot.taxRate],
        ["Insurance", snapshot.insurance],
        ["Days on market", snapshot.daysOnMarket],
      ])}
      <p>Read the figures together. Price affects the loan amount, while taxes, insurance, mortgage insurance, association dues, and financing terms can materially change the full monthly obligation and cash needed to close.</p>
    </div></div></section>
    ${linkedCards(`Loan options connected to ${city.name}`, products)}
    ${linkedCards("Nearby markets to compare", nearby)}
    ${linkedCards("Licensed help and local branches", [...officers, ...branches])}
    ${linkedCards("Related borrower guidance", articles)}`;
}

function renderProduct(record, context) {
  const product = record.found.item;
  const content = productContentById(context.productCopyBundle, product.id);
  if (!content) throw new Error(`Missing product content for ${product.id}`);
  const calculators = recordsForIds(product.relatedCalculatorIds, context.maps.calculators, context.recordsByRoute);
  return `${pageIntro(
    "Loan option guide",
    product.name,
    content.summary,
    [
      `Use this ${product.name} guide to organize the borrower, property, payment, cash, and timing questions that belong in a written comparison. Program availability and terms depend on the complete scenario and lender review.`,
    ],
  )}
    <section class="section compact"><div class="content-layout"><div class="main-stack">
      <h2>${escapeHtml(content.title)}</h2>
      <p>${escapeHtml(content.summary)}</p>
    </div></div></section>
    ${(content.sections || []).map((section) => `
      <section class="section compact"><div class="content-layout"><div class="main-stack">
        <p class="eyebrow">${escapeHtml(section.eyebrow)}</p>
        <h2>${escapeHtml(section.heading)}</h2>
        ${(section.paragraphs || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
      </div></div></section>`).join("")}
    <section class="section compact"><div class="content-layout"><div class="main-stack">
      <h2>Questions to settle before you choose</h2>
      ${(content.questions || []).map((question) => `<article><h3>${escapeHtml(question.question)}</h3><p>${escapeHtml(question.answer)}</p></article>`).join("")}
    </div></div></section>
    ${linkedCards("Calculators for this comparison", calculators)}`;
}

function renderRates(record, context) {
  const rates = record.found.item;
  const disclosure = context.ratesMarketplaceFixture.disclosure || "Mortgage pricing depends on current market, borrower, property, and loan details.";
  const sampleDisclosure = context.ratesMarketplaceFixture.sampleOfferDisclosure || "Exploring a comparison does not submit an application or make a credit decision.";
  return `${pageIntro(
    "Mortgage rates",
    "Compare mortgage rates and borrowing costs",
    "Review rate, APR, points, lender credits, estimated payment, upfront costs, and longer-run borrowing cost together before choosing a mortgage direction.",
    [
      "A lower note rate is not automatically the lower-cost option. Ask what points, credits, fees, lock period, loan type, occupancy, property details, credit assumptions, and cash-to-close inputs produced each written scenario.",
      "Keep taxes, homeowners insurance, mortgage insurance, association dues, and third-party settlement costs visible. Some are not controlled by the lender, but they still affect the amount a household pays or brings to closing.",
    ],
  )}
    <section class="section compact"><div class="content-layout"><div class="main-stack">
      <h2>Rate types available for comparison</h2>
      <ul>${(rates.rateTypes || []).map((type) => `<li>${escapeHtml(type)}</li>`).join("")}</ul>
      <p>${escapeHtml(disclosure)}</p>
      <p>${escapeHtml(sampleDisclosure)}</p>
    </div></div></section>
    ${linkedCards("Tools and guides for the next comparison", [
      context.recordsByRoute.get("/calculators/mortgage-payment"),
      context.recordsByRoute.get("/buy"),
      context.recordsByRoute.get("/refinance"),
      context.recordsByRoute.get("/loan-officers"),
    ])}`;
}

function renderLearningHome(record, context) {
  const topics = context.data.blogPages
    .filter((page) => page.route !== record.entry.route)
    .map((page) => context.recordsByRoute.get(page.route));
  const articles = context.data.articles.slice(0, 12).map((article) => context.recordsByRoute.get(article.route));
  const contributors = context.editorialContent.contributors.map((contributor) => context.recordsByRoute.get(contributor.route));
  return `${pageIntro(
    "Borrower education",
    "Mortgage learning center",
    "Read mortgage guidance organized around buying, refinancing, equity, loan programs, local markets, rates, taxes, insurance, and evidence-based decision questions.",
    [
      "Start with the decision you are making, then compare the same borrower and property facts across products, calculators, market guides, and written loan scenarios. Dates and source context matter whenever a rule, limit, price, rate, or local cost can change.",
      "Educational material can help you prepare questions, but it cannot determine eligibility, property acceptability, available terms, or the right choice for a household. Bring current documents and property details into a licensed review when you are ready.",
    ],
  )}${linkedCards("Explore learning topics", topics)}${linkedCards("Featured mortgage articles", articles)}${linkedCards("Meet the editorial contributors", contributors)}`;
}

function renderBlog(record, context) {
  if (record.entry.route === "/learning-center") return renderLearningHome(record, context);
  const hub = context.publicTopicHubsByRoute.get(record.entry.route);
  if (!hub) {
    return pageIntro(
      "Mortgage learning topic",
      record.found.item.name,
      record.found.item.metaDescription || "Review related borrower guidance and practical comparison questions.",
      ["Use dated sources, visible assumptions, and property-specific details before applying broad mortgage education to a personal decision."],
    );
  }
  return renderProductionTopicHub(hub, {
    articlesById: context.maps.articles,
    contributors: context.editorialContent.contributors,
    route: (href) => href,
    linkResolver: (id) => {
      const linked = context.recordsById.get(id);
      return linked ? { kind: linked.entry.type, item: linked.found.item } : null;
    },
  });
}

function renderArticle(record, context) {
  return renderProductionArticle(record.found.item, {
    contributors: context.editorialContent.contributors,
    sources: context.editorialContent.sources,
    relatedRoutes: context.relatedRoutes,
    route: (href) => href,
  });
}

function renderContributor(record, context) {
  const contributor = record.found.item;
  const articles = context.data.articles
    .filter((article) => article.authorId === contributor.id)
    .map((article) => context.recordsByRoute.get(article.route));
  return `${pageIntro(
    contributor.title,
    contributor.name,
    contributor.shortBio || contributor.bio,
    [
      contributor.bio,
      `${contributor.name}'s coverage includes ${humanList(contributor.topics || [])}. Contributor material is educational and does not replace licensed advice based on a borrower's finances, property, eligibility, or available terms.`,
    ],
  )}${linkedCards(`Articles by ${contributor.name}`, articles)}`;
}

function renderLoanOfficer(record, context) {
  const officer = record.found.item;
  const cities = recordsForIds(officer.priorityCityIds, context.maps.cities, context.recordsByRoute);
  const branch = context.maps.branches.get(officer.branchId);
  const branchRecord = branch && context.recordsByRoute.get(branch.route);
  return `${pageIntro(
    "Loan officer profile",
    officer.name,
    `${officer.name} is a Snap Mortgage loan officer listed as ${officer.nmls}, with licensing shown for ${humanList(officer.licensedStates || [])}.`,
    [
      `Specialty areas include ${humanList(officer.specialties || [])}. Languages listed for this profile are ${humanList(officer.languages || [])}. Confirm current licensing and availability before relying on profile placement.`,
      "Prepare the property location, purchase or refinance goal, timing, income and asset documentation, existing debts, down-payment plan, and questions about payment or cash to close. A conversation can clarify which details still need verification without promising eligibility or terms.",
    ],
  )}
    <section class="section compact"><div class="content-layout"><div class="main-stack">
      <h2>Profile details</h2>
      ${snapshotList([
        ["NMLS", officer.nmls],
        ["Licensed states", humanList(officer.licensedStates || [])],
        ["Languages", humanList(officer.languages || [])],
        ["Specialties", humanList(officer.specialties || [])],
      ])}
    </div></div></section>
    ${linkedCards("Priority markets and branch", [...cities, branchRecord])}`;
}

function renderBranch(record, context) {
  const branch = record.found.item;
  const state = context.maps.states.get(branch.stateId);
  const cities = recordsForIds(branch.cityIds, context.maps.cities, context.recordsByRoute);
  const officers = recordsForIds(branch.loanOfficerIds, context.maps.loanOfficers, context.recordsByRoute);
  return `${pageIntro(
    "Mortgage branch",
    branch.name,
    branch.coverageNote,
    [
      `${branch.name} is connected to ${state?.name || "its licensed service area"} market guidance and the public loan officer profiles listed below. Branch coverage does not guarantee that every product or professional is available for every borrower or property.`,
      "Use a branch page to identify a local starting point, then confirm licensing, availability, product fit, property location, and the details needed for a written mortgage comparison. Rates, fees, approval, and closing timelines depend on the reviewed scenario.",
    ],
  )}${linkedCards("Markets served", cities)}${linkedCards("Branch loan officers", officers)}`;
}

function renderCalculator(record, context) {
  const calculator = record.found.item;
  const inputs = (calculator.captures || []).map(humanize);
  const peers = context.data.calculators
    .filter((item) => item.id !== calculator.id)
    .map((item) => context.recordsByRoute.get(item.route));
  return `${pageIntro(
    "Mortgage calculator",
    calculator.name,
    `Use ${humanList(inputs)} to build an educational planning scenario before comparing written loan terms.`,
    [
      "Change one assumption at a time and keep taxes, insurance, mortgage insurance, association dues, closing costs, and the expected ownership timeline visible. The result is not an approval, rate quote, appraisal, or commitment to lend.",
      "When a real property and borrower file are available, replace broad estimates with current records and reviewed terms. Ask which inputs came from you, which came from a public source, and which still need verification by a lender or other qualified professional.",
    ],
  )}
    <section class="section compact"><div class="content-layout"><div class="main-stack">
      <h2>Inputs used by this calculator</h2>
      <ul>${inputs.map((input) => `<li>${escapeHtml(input)}</li>`).join("")}</ul>
      <p>Keep the saved assumptions with any later rate or loan-option comparison so differences in payment and cash estimates can be explained.</p>
    </div></div></section>
    ${linkedCards("Other mortgage calculators", peers)}`;
}

function renderDirectory(record, context) {
  const route = record.entry.route;
  const configurations = {
    "/loan-officers": {
      eyebrow: "Licensed guidance",
      title: "Find a Snap Mortgage loan officer",
      lead: "Compare public loan officer profiles by licensed state, priority market, language, branch, and mortgage specialty.",
      records: context.data.loanOfficers.map((item) => context.recordsByRoute.get(item.route)),
      sectionTitle: "Loan officer profiles",
    },
    "/branches": {
      eyebrow: "Local mortgage teams",
      title: "Find a Snap Mortgage branch",
      lead: "Browse branch coverage, connected city guides, and public loan officer profiles before requesting local mortgage help.",
      records: context.data.branches.map((item) => context.recordsByRoute.get(item.route)),
      sectionTitle: "Branch locations",
    },
    "/calculators": {
      eyebrow: "Planning tools",
      title: "Mortgage calculators",
      lead: "Estimate payments, affordability, refinancing, down payments, and rent-versus-buy scenarios with visible inputs and limitations.",
      records: context.data.calculators.map((item) => context.recordsByRoute.get(item.route)),
      sectionTitle: "Choose a calculator",
    },
    "/loan-options": {
      eyebrow: "Loan comparison",
      title: "Compare mortgage loan options",
      lead: "Review purchase, refinance, FHA, VA, conventional, jumbo, cash-out, and home-equity paths before choosing a direction.",
      records: context.data.products.map((item) => context.recordsByRoute.get(item.route)),
      sectionTitle: "Mortgage product guides",
    },
    "/learning-center/search": {
      eyebrow: "Learning center",
      title: "Search mortgage learning resources",
      lead: "Browse borrower guides, local market analysis, loan-program explainers, and evidence-based mortgage planning articles.",
      records: [
        ...context.data.blogPages.map((item) => context.recordsByRoute.get(item.route)),
        ...context.data.articles.map((item) => context.recordsByRoute.get(item.route)),
        ...context.editorialContent.contributors.map((item) => context.recordsByRoute.get(item.route)),
      ],
      sectionTitle: "Mortgage learning resources",
    },
  };
  const config = configurations[route];
  if (!config) throw new Error(`Unsupported directory route ${route}`);
  return `${pageIntro(
    config.eyebrow,
    config.title,
    config.lead,
    [
      "Open a result to see its full context and related resources. Compare dates, assumptions, location, product fit, and the facts that still need borrower- or property-specific review.",
      "Directory placement and educational content do not promise eligibility, approval, terms, availability, or a particular outcome. Use the public information to prepare a more focused next conversation.",
    ],
  )}${linkedCards(config.sectionTitle, config.records, { limit: config.records.length })}`;
}

function renderPrequal() {
  return `${pageIntro(
    "Mortgage prequalification",
    "Start mortgage prequalification",
    "Begin with a general review of your mortgage goal, property plans, timing, and contact information when you are ready to continue.",
    [
      "Prequalification is an early review based on the information you provide and any documentation requested later. It is not an approval, commitment to lend, verified property valuation, or guarantee of available terms.",
      "Have a purchase or refinance goal, estimated price or balance, down-payment or equity plan, income and asset information, recurring debts, property location, occupancy, and timeline available. Exact requirements depend on the scenario and licensed team reviewing it.",
      "You can also return to public rate comparisons, loan-option guides, calculators, or loan officer profiles before starting. Those resources remain educational until borrower and property details are reviewed.",
    ],
  )}`;
}

function renderRouteBody(record, context) {
  const renderers = {
    locations: renderLocations,
    state: renderState,
    city: renderCity,
    product: renderProduct,
    rates: renderRates,
    blog: renderBlog,
    article: renderArticle,
    contributor: renderContributor,
    loanOfficer: renderLoanOfficer,
    branch: renderBranch,
    calculator: renderCalculator,
    directory: renderDirectory,
    prequalHandoff: renderPrequal,
  };
  const renderer = renderers[record.entry.type];
  if (!renderer) throw new Error(`Static rendering is not available for ${record.entry.type}`);
  return renderer(record, context);
}

function relatedRecords(record, context) {
  const item = record.found.item;
  const candidates = [];
  const add = (...records) => candidates.push(...records.filter(Boolean));
  const addIds = (ids, map) => add(...recordsForIds(ids, map, context.recordsByRoute));

  if (record.entry.type === "city") {
    add(context.recordsByRoute.get(context.maps.states.get(item.stateId)?.route));
    addIds(item.productIds, context.maps.products);
    addIds(item.loanOfficerIds, context.maps.loanOfficers);
  } else if (record.entry.type === "state") {
    add(context.recordsByRoute.get("/locations"));
    addIds(item.cityIds, context.maps.cities);
    addIds(item.featuredProductIds, context.maps.products);
  } else if (record.entry.type === "product") {
    add(context.recordsByRoute.get("/loan-options"));
    addIds(item.relatedCalculatorIds, context.maps.calculators);
  } else if (record.entry.type === "loanOfficer") {
    add(context.recordsByRoute.get("/loan-officers"));
    add(context.recordsByRoute.get(context.maps.branches.get(item.branchId)?.route));
    addIds(item.priorityCityIds, context.maps.cities);
  } else if (record.entry.type === "branch") {
    add(context.recordsByRoute.get("/branches"));
    addIds(item.cityIds, context.maps.cities);
    addIds(item.loanOfficerIds, context.maps.loanOfficers);
  } else if (record.entry.type === "calculator") {
    add(context.recordsByRoute.get("/calculators"));
    add(...context.data.products.slice(0, 3).map((product) => context.recordsByRoute.get(product.route)));
  } else if (["blog", "article", "contributor"].includes(record.entry.type)) {
    add(context.recordsByRoute.get("/learning-center"));
    for (const route of item.relatedRoutes || []) add(context.recordsByRoute.get(route));
    if (item.authorId) add(context.recordsByRoute.get(context.maps.contributors.get(item.authorId)?.route));
  }
  add(
    context.recordsByRoute.get("/locations"),
    context.recordsByRoute.get("/rates"),
    context.recordsByRoute.get("/loan-options"),
    context.recordsByRoute.get("/calculators/mortgage-payment"),
    context.recordsByRoute.get("/learning-center"),
    context.recordsByRoute.get("/loan-officers"),
  );

  const unique = [];
  const seen = new Set([record.entry.route]);
  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate.entry.route)) continue;
    seen.add(candidate.entry.route);
    unique.push(candidate);
    if (unique.length === 6) break;
  }
  return unique;
}

function renderRelatedNavigation(record, context) {
  const related = relatedRecords(record, context);
  return `
    <nav class="section compact static-related-navigation" aria-label="Related mortgage pages" data-static-related-links>
      <div class="content-layout"><div class="main-stack">
        <h2>Related mortgage resources</h2>
        <ul>${related.map((candidate) => `<li><a href="${escapeHtml(candidate.entry.route)}">${escapeHtml(recordLabel(candidate))}</a></li>`).join("")}</ul>
      </div></div>
    </nav>`;
}

function jsonForScript(value) {
  return value ? JSON.stringify(value).replace(/</g, "\\u003c") : "";
}

function renderHead(metadata) {
  return `<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(metadata.title)}</title>
  <meta name="description" content="${escapeHtml(metadata.description)}" />
  <link rel="canonical" href="${escapeHtml(metadata.canonical)}" />
  <meta property="og:type" content="${escapeHtml(metadata.openGraph.type)}" />
  <meta property="og:title" content="${escapeHtml(metadata.openGraph.title)}" />
  <meta property="og:description" content="${escapeHtml(metadata.openGraph.description)}" />
  <meta property="og:url" content="${escapeHtml(metadata.openGraph.url)}" />
  <meta property="og:image" content="${escapeHtml(metadata.openGraph.image)}" />
  <meta name="twitter:card" content="${escapeHtml(metadata.twitter.card)}" />
  <meta name="twitter:title" content="${escapeHtml(metadata.twitter.title)}" />
  <meta name="twitter:description" content="${escapeHtml(metadata.twitter.description)}" />
  <meta name="twitter:image" content="${escapeHtml(metadata.twitter.image)}" />
  <script type="application/ld+json" data-document-jsonld>${jsonForScript(metadata.jsonLd)}</script>
  <link rel="stylesheet" href="/site/styles.css" />
</head>`;
}

export function renderStaticRouteDocument(record, context, { siteOrigin = DEFAULT_SITE_ORIGIN } = {}) {
  if (!record?.entry || !record?.found) throw new Error("A static route record is required");
  if (record.entry.route === "/") throw new Error("The root document is owned by the homepage workstream");
  const metadata = context.metadataFor(record, { siteOrigin });
  const body = renderRouteBody(record, context);
  const document = `<!doctype html>
<html lang="en">
${renderHead(metadata)}
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <div id="app" data-static-route="${escapeHtml(record.entry.route)}">
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="/" aria-label="Snap Mortgage home"><img class="brand-logo" src="/site/assets/images/snap-loans.svg" alt="Snap Loans" /></a>
        <nav aria-label="Primary"><a href="/locations">Locations</a><a href="/rates">Rates</a><a href="/loan-options">Loan options</a><a href="/calculators">Calculators</a><a href="/learning-center">Learning center</a><a href="/loan-officers">Loan officers</a></nav>
      </div>
    </header>
    <div class="page" id="main" role="main">
      ${body}
      ${renderRelatedNavigation(record, context)}
    </div>
    <footer class="site-footer"><div class="footer-inner"><a href="/locations">Locations</a><a href="/learning-center">Learning center</a><a href="/branches">Branches</a><a href="/prequal/start">Start prequalification</a></div></footer>
  </div>
  <script type="module" src="/site/app.js"></script>
</body>
</html>
`;
  return document.replace(/[ \t]+(?=\r?\n)/g, "");
}
