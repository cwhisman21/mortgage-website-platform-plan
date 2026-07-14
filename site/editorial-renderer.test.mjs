import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { normalizeEditorialContent } from "./editorial-content.mjs";
import {
  renderProductionArticle,
  renderProductionTopicHub,
} from "./editorial-renderer.mjs";

const contributor = {
  id: "contributor-maya-brooks",
  slug: "maya-brooks",
  name: "Maya Brooks",
  beat: "Local markets",
  shortBio: "Local market coverage.",
  bio: "Local market coverage for borrowers.",
  portrait: {
    src: "/maya.jpg",
    alt: "Maya Brooks",
  },
};

const source = {
  id: "freddie-mac-pmms-2026-07-09",
  publisher: "Freddie Mac",
  title: "Primary Mortgage Market Survey",
  url: "https://www.freddiemac.com/pmms",
  dataPeriod: "Week of 2026-07-09",
  accessedAt: "2026-07-13",
  geographicScope: "United States",
  claimSupported: "National weekly benchmark context.",
  authoritative: true,
};

const relatedRoutes = new Map([
  ["/locations/texas/austin", { title: "Austin mortgage guide", text: "Local market dashboard", type: "Location" }],
  ["/calculators/mortgage-payment", { title: "Mortgage payment calculator", text: "Estimate a payment", type: "Calculator" }],
]);

const route = (href) => href;

const compiledEditorialPath = new URL("../mock-data/editorial-content.json", import.meta.url);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function count(markup, fragment) {
  return markup.split(fragment).length - 1;
}

test("topic hub normalization preserves every production hub field for rendering", () => {
  const content = normalizeEditorialContent({
    contributors: [contributor],
    topicHubs: [{
      id: "blog-local-market-updates",
      slug: "local-market-updates",
      name: "Local Market Updates",
      route: "/learning-center/local-market-updates",
      public: true,
      contributorId: contributor.id,
      contributorIds: [contributor.id],
      heroSummary: "Follow dated housing evidence for cities and states before deciding what to compare next.",
      overviewParagraphs: ["First unique overview paragraph for borrowers.", "Second unique overview paragraph for borrowers."],
      whyItMatters: "Local ownership costs can change the payment conversation.",
      startHere: [{ title: "Choose a market", text: "Open the place you are researching.", linkId: "article-austin-market-update" }],
      comparisonPoints: [{ title: "Price and supply", text: "Read price and supply with their dates." }],
      featuredLinkIds: ["article-austin-market-update"],
      closingCta: {
        eyebrow: "Put the market in context",
        title: "Check your shortlist",
        text: "Open a city guide before comparing a payment.",
        label: "Browse locations",
        href: "/locations",
      },
    }],
    sources: [source],
  });

  assert.equal(content.topicHubs[0].name, "Local Market Updates");
  assert.equal(content.topicHubs[0].overviewParagraphs.length, 2);
  assert.equal(content.topicHubs[0].whyItMatters, "Local ownership costs can change the payment conversation.");
  assert.equal(content.topicHubs[0].startHere[0].title, "Choose a market");
  assert.equal(content.topicHubs[0].comparisonPoints[0].title, "Price and supply");
  assert.deepEqual(content.topicHubs[0].featuredLinkIds, ["article-austin-market-update"]);
  assert.equal(content.topicHubs[0].closingCta.label, "Browse locations");
  assert.equal(content.sources[0].id, source.id);
});

test("renders a public topic hub with all unique production fields and featured links", () => {
  const hub = {
    id: "blog-local-market-updates",
    name: "Local Market Updates",
    route: "/learning-center/local-market-updates",
    heroSummary: "Follow dated housing evidence for cities and states before deciding what to compare next.",
    overviewParagraphs: ["Use the evidence date before carrying a market figure into a budget.", "Compare the local facts with a property-specific payment before acting."],
    whyItMatters: "The same loan amount can feel different once taxes and insurance enter the monthly payment.",
    startHere: [{ title: "Choose a market", text: "Open the place you are researching.", linkId: "article-austin-market-update" }],
    comparisonPoints: [{ title: "Price and supply", text: "Separate asking-price movement from closed-sale evidence." }],
    featuredLinkIds: ["article-austin-market-update"],
    closingCta: {
      eyebrow: "Put the market in context",
      title: "Check the places on your shortlist.",
      text: "Open a city or state page to compare current local context.",
      label: "Browse locations",
      href: "/locations",
    },
  };
  const html = renderProductionTopicHub(hub, {
    articlesById: new Map([["article-austin-market-update", {
      id: "article-austin-market-update",
      route: "/learning-center/austin-market-update",
      title: "Austin market update",
      summary: "A dated borrower-facing market update.",
      authorId: contributor.id,
    }]]),
    contributors: [contributor],
    route,
    renderArticleCard: (article) => `<article class="editorial-article-card"><a href="${article.route}">${article.title}</a></article>`,
  });

  assert.match(html, /Follow dated housing evidence/);
  assert.match(html, /Use the evidence date/);
  assert.match(html, /The same loan amount/);
  assert.match(html, /Choose a market/);
  assert.match(html, /Price and supply/);
  assert.match(html, /Austin market update/);
  assert.match(html, /Browse locations/);
});

test("renders the compiled Editorial Team hub with all public fields and six contributor cards", () => {
  const content = JSON.parse(fs.readFileSync(compiledEditorialPath, "utf8"));
  const hub = content.topicHubs.find(({ id }) => id === "blog-editorial-team");
  const contributorsById = new Map(content.contributors.map((entry) => [entry.id, entry]));
  assert.ok(hub, "compiled Editorial Team hub is missing");

  const html = renderProductionTopicHub(hub, {
    contributors: content.contributors,
    route,
    linkResolver: (id) => {
      if (contributorsById.has(id)) return { kind: "contributor", item: contributorsById.get(id) };
      if (id === "directory-loan-officers") {
        return {
          kind: "route",
          item: {
            route: "/loan-officers",
            title: "Find a loan officer",
            text: "Browse licensed loan officers.",
            type: "Directory",
          },
        };
      }
      return null;
    },
    featuredTitle: "Meet the contributors",
    renderFeaturedLink: (link) => link.kind === "contributor"
      ? `<a class="contributor-directory-card editorial-contributor-card" href="${escapeHtml(link.item.route)}"><h3>${escapeHtml(link.item.name)}</h3><p>${escapeHtml(link.item.shortBio)}</p></a>`
      : "",
  });

  assert.ok(html.includes(escapeHtml(hub.heroSummary)), "missing heroSummary");
  for (const paragraph of hub.overviewParagraphs || []) {
    assert.ok(html.includes(escapeHtml(paragraph)), `missing overview paragraph: ${paragraph}`);
  }
  assert.ok(html.includes(escapeHtml(hub.whyItMatters)), "missing whyItMatters");
  for (const step of hub.startHere || []) {
    assert.ok(html.includes(escapeHtml(step.title)), `missing startHere title: ${step.title}`);
    assert.ok(html.includes(escapeHtml(step.text)), `missing startHere text: ${step.text}`);
  }
  for (const point of hub.comparisonPoints || []) {
    assert.ok(html.includes(escapeHtml(point.title)), `missing comparison title: ${point.title}`);
    assert.ok(html.includes(escapeHtml(point.text)), `missing comparison text: ${point.text}`);
  }
  assert.ok(html.includes("Meet the contributors"), "missing custom featured title");
  assert.equal(count(html, 'class="contributor-directory-card editorial-contributor-card"'), 6);
  for (const contributorId of hub.featuredLinkIds || []) {
    const featuredContributor = contributorsById.get(contributorId);
    assert.ok(featuredContributor, `missing contributor ${contributorId}`);
    assert.ok(html.includes(escapeHtml(featuredContributor.name)), `missing featured contributor name ${featuredContributor.name}`);
    assert.ok(html.includes(`href="${escapeHtml(featuredContributor.route)}"`), `missing featured contributor route ${featuredContributor.route}`);
  }
  assert.ok(html.includes('href="/learning-center/authors/rowan-hale"'), "missing contributor startHere route");
  assert.ok(html.includes('href="/learning-center/authors/maya-brooks"'), "missing second contributor startHere route");
  assert.ok(html.includes('href="/loan-officers"'), "missing directory startHere route");
  assert.ok(html.includes(escapeHtml(hub.closingCta.eyebrow)), "missing closing CTA eyebrow");
  assert.ok(html.includes(escapeHtml(hub.closingCta.title)), "missing closing CTA title");
  assert.ok(html.includes(escapeHtml(hub.closingCta.text)), "missing closing CTA text");
  assert.ok(html.includes(escapeHtml(hub.closingCta.label)), "missing closing CTA label");
  assert.ok(html.includes(`href="${escapeHtml(hub.closingCta.href)}"`), "missing closing CTA href");
});

test("renders structured production article content with citations, CTAs, TOC, dates, FAQs, and related routes", () => {
  const article = {
    id: "article-austin-market-update",
    route: "/learning-center/austin-market-update",
    title: "Austin market update",
    type: "local_market_update",
    authorId: contributor.id,
    summary: "Austin borrowers should connect dated market evidence to a payment plan.",
    dek: "A borrower guide to prices, rates, local costs, and next-step comparisons.",
    publishedAt: "2026-07-10",
    asOf: "2026-07-09",
    keyTakeaways: ["Use the as-of date.", "Compare the full payment.", "Confirm property-specific costs."],
    sections: [
      {
        heading: "Start with the evidence date",
        paragraphs: ["Austin market evidence should be read with its measurement date before it enters a budget."],
        table: {
          caption: "Austin planning inputs",
          headers: ["Input", "Why it matters"],
          rows: [["Rate benchmark", "Shows national context"], ["Local costs", "Shapes the payment"]],
          sourceIds: [source.id],
          note: "This table organizes questions, not loan terms.",
        },
      },
      {
        heading: "Build the full payment",
        body: "Taxes, insurance, association dues, and mortgage insurance can change the monthly number.",
      },
    ],
    ctaBreaks: [{
      afterSection: "Start with the evidence date",
      eyebrow: "Run the numbers",
      title: "Estimate the payment",
      text: "Use a payment calculator before treating market evidence as a personal answer.",
      label: "Estimate payment",
      href: "/calculators/mortgage-payment",
    }],
    conclusion: "Keep the dated market evidence separate from property-specific and borrower-specific decisions.",
    faqs: [{ question: "Is this a quote?", answer: "No. It is educational market context and not a personalized rate or approval." }],
    sourceIds: [source.id],
    relatedRoutes: ["/locations/texas/austin", "/calculators/mortgage-payment"],
  };

  const html = renderProductionArticle(article, {
    contributors: [contributor],
    sources: [source],
    relatedRoutes,
    route,
  });

  assert.match(html, /<nav class="production-article-toc" aria-label="On this page">/);
  assert.match(html, /href="#start-with-the-evidence-date"/);
  assert.match(html, /Published Jul 10, 2026/);
  assert.match(html, /As of Jul 9, 2026/);
  assert.match(html, /Use the as-of date/);
  assert.match(html, /Austin planning inputs/);
  assert.match(html, /Freddie Mac/);
  assert.match(html, /Estimate the payment/);
  assert.match(html, /Keep the dated market evidence/);
  assert.match(html, /Is this a quote/);
  assert.match(html, /Austin mortgage guide/);
  assert.equal(count(html, 'data-cta-action="leadForm"'), 1, "the contextual CTA should not duplicate the persistent lead action");
  assert.doesNotMatch(html, /placeholder|scaffold|wireframe|dummy|mock/i);
});

test("renders every structured field from the compiled production article schema", () => {
  const content = JSON.parse(fs.readFileSync(compiledEditorialPath, "utf8"));
  const sourcesById = new Map(content.sources.map((entry) => [entry.id, entry]));
  assert.equal(content.articles.length, 24);

  for (const article of content.articles) {
    const relatedRoutes = new Map((article.relatedRoutes || []).map((href, index) => [href, {
      title: `Compiled route ${index + 1} for ${article.id}`,
      text: `Compiled related route ${index + 1} for ${article.id}`,
      type: `Related ${index + 1}`,
    }]));
    const html = renderProductionArticle(article, {
      contributors: content.contributors,
      sources: content.sources,
      relatedRoutes,
      route,
    });

    const publicTypeLabels = {
      local_market_update: "Local market update",
      state_tax_insurance_explainer: "Taxes and insurance",
      product_explainer: "Loan options",
      borrower_intent_guide: "Mortgage planning guide",
    };
    const expectedEyebrow = article.eyebrow || publicTypeLabels[article.type] || "Mortgage guide";
    assert.ok(html.includes(escapeHtml(expectedEyebrow)), `${article.id} missing borrower-facing eyebrow`);
    assert.ok(!html.includes(escapeHtml(String(article.type || "").replaceAll("_", " "))), `${article.id} exposes its internal article type`);

    assert.ok(html.includes(escapeHtml(article.summary)), `${article.id} missing summary`);
    assert.ok(html.includes(escapeHtml(article.dek)), `${article.id} missing dek`);

    for (const paragraph of article.introduction || []) {
      assert.ok(html.includes(escapeHtml(paragraph)), `${article.id} missing introduction paragraph`);
    }

    for (const takeaway of article.keyTakeaways || []) {
      assert.ok(html.includes(escapeHtml(takeaway)), `${article.id} missing takeaway: ${takeaway}`);
    }

    for (const section of article.sections || []) {
      assert.ok(html.includes(`id="${escapeHtml(section.id)}"`), `${article.id} missing original section id ${section.id}`);
      assert.ok(html.includes(escapeHtml(section.heading)), `${article.id} missing section ${section.heading}`);
      for (const paragraph of section.paragraphs || []) {
        assert.ok(html.includes(escapeHtml(paragraph)), `${article.id} missing section paragraph`);
      }
      if (section.table) {
        assert.ok(html.includes(escapeHtml(section.table.caption)), `${article.id} missing table caption`);
        for (const column of section.table.columns || section.table.headers || []) {
          assert.ok(html.includes(escapeHtml(column)), `${article.id} missing table column ${column}`);
        }
        for (const row of section.table.rows || []) {
          for (const cell of row) {
            assert.ok(html.includes(escapeHtml(cell)), `${article.id} missing table cell ${cell}`);
          }
        }
      }
    }

    assert.ok(html.includes(escapeHtml(article.conclusion)), `${article.id} missing conclusion`);

    for (const faq of article.faqs || []) {
      assert.ok(html.includes(escapeHtml(faq.question)), `${article.id} missing FAQ question: ${faq.question}`);
      assert.ok(html.includes(escapeHtml(faq.answer)), `${article.id} missing FAQ answer for ${faq.question}`);
    }

    for (const cta of article.ctaBreaks || []) {
      assert.ok(html.includes(escapeHtml(cta.heading)), `${article.id} missing CTA heading`);
      assert.ok(html.includes(escapeHtml(cta.body)), `${article.id} missing CTA body`);
      assert.ok(html.includes(escapeHtml(cta.label)), `${article.id} missing CTA label`);
      assert.ok(html.includes(`href="${escapeHtml(cta.route)}"`), `${article.id} missing CTA route`);
      const sectionIndex = html.indexOf(`id="${escapeHtml(cta.afterSectionId)}"`);
      const ctaIndex = html.indexOf(escapeHtml(cta.heading));
      assert.ok(sectionIndex >= 0 && ctaIndex > sectionIndex, `${article.id} CTA ${cta.heading} is not rendered after original section id ${cta.afterSectionId}`);
    }

    const articleSourceIds = new Set([
      ...(article.sourceIds || []),
      ...(article.sections || []).flatMap((section) => section.table?.sourceIds || []),
    ].filter((sourceId) => sourcesById.has(sourceId)));
    assert.equal(count(html, 'class="production-source-card"'), articleSourceIds.size, `${article.id} source card count mismatch`);
    for (const sourceId of articleSourceIds) {
      const resolvedSource = sourcesById.get(sourceId);
      assert.ok(html.includes(escapeHtml(resolvedSource.publisher)), `${article.id} missing source publisher ${resolvedSource.publisher}`);
      assert.ok(html.includes(escapeHtml(resolvedSource.title)), `${article.id} missing source title ${resolvedSource.title}`);
      assert.ok(html.includes(escapeHtml(resolvedSource.dataPeriod)), `${article.id} missing source data period ${resolvedSource.dataPeriod}`);
      assert.ok(html.includes(escapeHtml(resolvedSource.accessedAt)), `${article.id} missing source accessed date ${resolvedSource.accessedAt}`);
      assert.ok(html.includes(escapeHtml(resolvedSource.geographicScope)), `${article.id} missing source geography ${resolvedSource.geographicScope}`);
      assert.ok(html.includes(escapeHtml(resolvedSource.claimSupported)), `${article.id} missing source claim for ${sourceId}`);
    }

    const citedTableCount = (article.sections || []).filter((section) => {
      if (!section.table) return false;
      const citationIds = section.table.sourceIds?.length ? section.table.sourceIds : (section.sourceIds || article.sourceIds || []);
      return citationIds.some((sourceId) => sourcesById.has(sourceId));
    }).length;
    assert.equal(count(html, 'class="production-source-citation"'), citedTableCount, `${article.id} table citation count mismatch`);

    assert.equal(count(html, 'class="production-related-card"'), (article.relatedRoutes || []).length, `${article.id} related card count mismatch`);
    for (const [href, entry] of relatedRoutes.entries()) {
      assert.ok(html.includes(`href="${escapeHtml(href)}"`), `${article.id} missing related route href ${href}`);
      assert.ok(html.includes(escapeHtml(entry.title)), `${article.id} missing related route title ${entry.title}`);
      assert.ok(html.includes(escapeHtml(entry.text)), `${article.id} missing related route text ${entry.text}`);
      assert.ok(html.includes(escapeHtml(entry.type)), `${article.id} missing related route type ${entry.type}`);
    }
  }
});
