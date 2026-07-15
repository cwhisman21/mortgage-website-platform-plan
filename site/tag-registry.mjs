function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizedSlug(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function idsFromIndexes(indexes, tags) {
  return asArray(indexes)
    .map((index) => tags[index]?.id)
    .filter(Boolean);
}

function normalizeAssignment(assignment, tags) {
  if (Array.isArray(assignment)) {
    const [route, primaryTagIndexes, additionalTagIndexes] = assignment;
    return {
      route,
      primaryTagIds: idsFromIndexes(primaryTagIndexes, tags),
      additionalTagIds: idsFromIndexes(additionalTagIndexes, tags),
    };
  }

  if (!assignment || typeof assignment !== "object") return null;

  return {
    route: assignment.route,
    primaryTagIds: asArray(assignment.primaryTagIds).length
      ? asArray(assignment.primaryTagIds)
      : idsFromIndexes(assignment.primaryTagIndexes, tags),
    additionalTagIds: asArray(assignment.additionalTagIds).length
      ? asArray(assignment.additionalTagIds)
      : idsFromIndexes(assignment.additionalTagIndexes, tags),
  };
}

export function normalizeTagRegistry(raw = {}) {
  const tags = asArray(raw.tags).filter((tag) => tag && typeof tag.id === "string");
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
  const tagsBySlug = new Map();

  for (const tag of tags) {
    for (const slug of [tag.slug, ...asArray(tag.redirectSlugs)]) {
      const normalized = normalizedSlug(slug);
      if (normalized && !tagsBySlug.has(normalized)) tagsBySlug.set(normalized, tag);
    }
  }

  const assignments = asArray(raw.assignments)
    .map((assignment) => normalizeAssignment(assignment, tags))
    .filter((assignment) => assignment && typeof assignment.route === "string");
  const assignmentsByRoute = new Map(assignments.map((assignment) => [assignment.route, assignment]));

  return {
    ...raw,
    tags,
    assignments,
    tagsById,
    tagsBySlug,
    assignmentsByRoute,
  };
}

export function tagForId(registry, id) {
  if (!registry || typeof id !== "string") return undefined;
  const normalized = registry.tagsById ? registry : normalizeTagRegistry(registry);
  return normalized.tagsById.get(id);
}

export function tagForSlug(registry, slug) {
  if (!registry) return undefined;
  const normalized = registry.tagsBySlug ? registry : normalizeTagRegistry(registry);
  return normalized.tagsBySlug.get(normalizedSlug(slug));
}

export function tagsForRoute(registry, route) {
  const normalized = registry?.assignmentsByRoute ? registry : normalizeTagRegistry(registry);
  const assignment = normalized.assignmentsByRoute.get(route);
  if (!assignment) return { primaryTags: [], additionalTags: [] };

  return {
    primaryTags: assignment.primaryTagIds.map((id) => normalized.tagsById.get(id)).filter(Boolean),
    additionalTags: assignment.additionalTagIds.map((id) => normalized.tagsById.get(id)).filter(Boolean),
  };
}

export function tagRoute(tag) {
  if (!tag || typeof tag !== "object") return "";
  if (typeof tag.canonicalRoute === "string" && tag.canonicalRoute) return tag.canonicalRoute;
  return typeof tag.slug === "string" && tag.slug
    ? `/learning-center/tags/${tag.slug}`
    : "";
}
