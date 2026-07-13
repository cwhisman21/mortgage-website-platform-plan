import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

async function loadHandoffModule() {
  return import("./prequal-handoff.mjs");
}

async function loadMarketplaceModule() {
  return import("./rates-marketplace.mjs");
}

function loadFixture() {
  const source = fs.readFileSync(
    new URL("../mock-data/rates-marketplace-fixtures.json", import.meta.url),
    "utf8",
  );
  return JSON.parse(source);
}

test("builds a handoff request from explicit query state without cache dependence", async () => {
  const { buildPrequalHandoffRequest } = await loadHandoffModule();

  const request = buildPrequalHandoffRequest({
    search: new URLSearchParams(
      "offerId=loan-officer-ava-purchase-30&mortgageType=purchase&zip=02108&resultType=loanOfficer&sort=highestRating&showFha=false&showVa=true&points=0-1&propertyType=condo&occupancy=secondary&visibleCount=16&expandedOfferId=loan-officer-ava-purchase-30&expandedTab=payment&email=hidden@example.com&token=secret&bogus=1",
    ),
    cachedState: {},
  });

  assert.equal(request.offerId, "loan-officer-ava-purchase-30");
  assert.equal(request.scenario.mortgageType, "purchase");
  assert.equal(request.scenario.zip, "02108");
  assert.equal(request.scenario.resultType, "loanOfficer");
  assert.equal(request.scenario.sort, "highestRating");
  assert.equal(request.scenario.showFha, false);
  assert.equal(request.scenario.showVa, true);
  assert.equal(request.scenario.points, "0-1");
  assert.equal(request.scenario.propertyType, "condo");
  assert.equal(request.scenario.occupancy, "secondary");
  assert.equal(request.scenario.visibleCount, 16);
  assert.equal(request.scenario.expandedOfferId, "loan-officer-ava-purchase-30");
  assert.equal(request.scenario.expandedTab, "payment");
  assert.equal("email" in request.scenario, false);
  assert.equal("token" in request.scenario, false);
  assert.equal("bogus" in request.scenario, false);
});

test("creates known-offer and unknown-offer handoff views plus restorable return URLs", async () => {
  const { createPrequalHandoffView, renderPrequalHandoffMarkup, returnToRatesUrl } =
    await loadHandoffModule();
  const { createFixtureMarketplaceAdapter, normalizeMarketplaceFixture } = await loadMarketplaceModule();
  const adapter = createFixtureMarketplaceAdapter(normalizeMarketplaceFixture(loadFixture()));

  const knownView = createPrequalHandoffView({
    adapter,
    request: {
      offerId: "company-harbor-purchase-30",
      scenario: {
        mortgageType: "purchase",
        zip: "02108",
        purchasePrice: 775000,
        downPaymentAmount: 116250,
        downPaymentPercent: 15,
        creditRange: "740-779",
        term: 15,
        occupancy: "secondary",
        showFha: false,
        showVa: true,
        dti: "40plus",
        points: "0-1",
        propertyType: "condo",
        sort: "highestRating",
        resultType: "loanOfficer",
        visibleCount: 16,
        expandedOfferId: "company-harbor-purchase-30",
        expandedTab: "payment",
      },
    },
  });
  const unknownView = createPrequalHandoffView({
    adapter,
    request: {
      offerId: "missing-offer",
      scenario: {
        mortgageType: "refinance",
        zip: "33602",
        propertyValue: 880000,
        loanBalance: 510000,
        cashOut: true,
        creditRange: "780+",
        term: 30,
        occupancy: "primary",
        showFha: true,
        showVa: false,
        dti: "below40",
        points: "all",
        propertyType: "singleFamily",
        sort: "lowestApr",
        resultType: "company",
        visibleCount: 8,
        expandedOfferId: "missing-offer",
        expandedTab: "reviews",
      },
    },
  });

  assert.equal(knownView.status, "known");
  assert.equal(knownView.providerName, "Harborline Home Lending");
  assert.equal(knownView.productLabel, "30-year fixed purchase");
  assert.match(knownView.scenarioSummary, /02108/);
  assert.equal(knownView.scenarioRows[0][1], "Purchase");
  assert.equal(returnToRatesUrl(knownView), "/rates?mortgageType=purchase&zip=02108&creditRange=740-779&term=15&showFha=false&showVa=true&dti=40plus&points=0-1&propertyType=condo&occupancy=secondary&purchasePrice=775000&downPaymentAmount=116250&downPaymentPercent=15&sort=highestRating&resultType=loanOfficer&visibleCount=16&expandedOfferId=company-harbor-purchase-30&expandedTab=payment");

  assert.equal(unknownView.status, "recovery");
  assert.match(unknownView.recoveryTitle, /Return to your saved rate results/);
  assert.match(unknownView.recoveryBody, /We could not reopen that selected option/);
  assert.equal(unknownView.scenarioRows[0][1], "Refinance");
  assert.equal(returnToRatesUrl(unknownView), "/rates?mortgageType=refinance&zip=33602&creditRange=780%2B&term=30&showFha=true&showVa=false&dti=below40&points=all&propertyType=singleFamily&occupancy=primary&propertyValue=880000&loanBalance=510000&cashOut=true&sort=lowestApr&resultType=company&visibleCount=8&expandedOfferId=missing-offer&expandedTab=reviews");
  const recoveryHtml = renderPrequalHandoffMarkup(unknownView);
  assert.match(recoveryHtml, /We could not reopen that selected option/);
  assert.match(recoveryHtml, /href="\/rates\?/);
  assert.doesNotMatch(recoveryHtml, /<form|<input|data-provider-start|upload|eligib|approv|underwrit|decision|lock/i);
});

test("renders borrower-safe handoff markup without forms or decision language", async () => {
  const { createPrequalHandoffView, renderPrequalHandoffMarkup } = await loadHandoffModule();
  const { createFixtureMarketplaceAdapter, normalizeMarketplaceFixture } = await loadMarketplaceModule();
  const adapter = createFixtureMarketplaceAdapter(normalizeMarketplaceFixture(loadFixture()));
  const view = createPrequalHandoffView({
    adapter,
    request: {
      offerId: "loan-officer-ava-purchase-30",
      scenario: {
        mortgageType: "purchase",
        zip: "92109",
        purchasePrice: 1060000,
        downPaymentAmount: 212000,
        downPaymentPercent: 20,
        creditRange: "780+",
        term: 30,
        occupancy: "primary",
        showFha: true,
        showVa: true,
        dti: "below40",
        points: "all",
        propertyType: "singleFamily",
        sort: "highestRating",
        resultType: "loanOfficer",
        visibleCount: 16,
        expandedOfferId: "loan-officer-ava-purchase-30",
        expandedTab: "payment",
      },
    },
  });

  const html = renderPrequalHandoffMarkup(view);

  assert.match(html, /Your selected option is ready to continue/);
  assert.match(html, /Continue with Ava Martinez/);
  assert.match(html, /NMLS 200001/);
  assert.match(html, /No name, email, or phone number has been requested on this comparison page\./);
  assert.match(html, /Return to rate results/);
  assert.doesNotMatch(html, /<form|<input|upload|eligib|approv|underwrit|decision|lock/i);
});

test("round-trips the complete comparison view through URL values alone", async () => {
  const {
    buildPrequalHandoffRequest,
    buildPrequalHandoffUrl,
    createPrequalHandoffView,
    returnToRatesUrl,
  } = await loadHandoffModule();
  const { createFixtureMarketplaceAdapter, normalizeMarketplaceFixture, parseMarketplaceState } =
    await loadMarketplaceModule();
  const adapter = createFixtureMarketplaceAdapter(normalizeMarketplaceFixture(loadFixture()));
  const scenario = {
    mortgageType: "purchase",
    zip: "02108",
    creditRange: "740-779",
    term: 15,
    showFha: false,
    showVa: true,
    dti: "40plus",
    points: "0-1",
    propertyType: "condo",
    occupancy: "secondary",
    purchasePrice: 775000,
    downPaymentAmount: 116250,
    downPaymentPercent: 15,
    sort: "highestRating",
    resultType: "loanOfficer",
    visibleCount: 16,
    expandedOfferId: "company-harbor-purchase-30",
    expandedTab: "payment",
  };

  const handoffUrl = buildPrequalHandoffUrl({
    offerId: "company-harbor-purchase-30",
    scenario: { ...scenario, email: "hidden@example.com", token: "secret" },
  });
  const handoffSearch = new URL(handoffUrl, "https://snap.test").searchParams;
  const request = buildPrequalHandoffRequest({ search: handoffSearch });
  const view = createPrequalHandoffView({ adapter, request });
  const returnSearch = new URL(returnToRatesUrl(view), "https://snap.test").searchParams;

  assert.equal(request.offerId, "company-harbor-purchase-30");
  assert.deepEqual(request.scenario, scenario);
  assert.deepEqual(parseMarketplaceState(returnSearch), scenario);
  assert.equal(handoffSearch.get("email"), null);
  assert.equal(handoffSearch.get("token"), null);
});
