# Data Model

## Modeling Principle

Pages should be generated from structured entities plus relationships.

Example:

Austin page = Austin location record + Texas parent record + market data + related loan officers + nearby branches + products + articles + CTA rules + disclosures.

## Core Entities

Suggested planning-level entities:

- `market_geographies`
- `public_location_pages`
- `loan_officer_public_profiles`
- `branch_public_profiles`
- `loan_products`
- `localized_product_pages`
- `articles`
- `market_metric_datasets`
- `news_feed_rules`
- `cta_rules`
- `compliance_disclosures`
- `lead_or_opportunity_records`

## Important Distinction

City/state editorial pages are not the same thing as property address records.

- A city/state page creates market and content context.
- A property address record represents a real property/place.
- A borrower journey may start from a city page and later become tied to a real property address.

## Key Relationships

Many-to-many relationships are required:

- City to loan officers.
- City to branches.
- City to products.
- City to articles.
- State to cities.
- State to licensed loan officers.
- Product to articles.
- Product to loan officers.
- Article to locations.
- Article to products.
- Loan officer to licensed states.
- Loan officer to service cities.
- Branch to cities served.

## Market Data

Market data should be structured, sourceable, and timestamped.

Useful datasets:

- Home price history.
- Property tax estimates.
- Insurance considerations.
- Inventory trends.
- Days on market.
- Monthly payment scenarios.
- Down payment scenarios.
- Rent-vs-buy scenarios.
- City comparisons.
- State comparisons.

Each metric should track:

- Value.
- Geography.
- Date range.
- Source.
- Last updated date.
- Confidence or review status.
- Manual override status.

## Lead/Opportunity Context

When a visitor converts, capture context:

- Source page.
- Location.
- Product interest.
- Calculator inputs.
- Article path.
- Selected loan officer.
- Selected branch.
- Borrower intent.
- Consent fields.
- Assigned loan officer or branch.
- Routing reason.
