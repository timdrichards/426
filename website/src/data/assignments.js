import categoryConfig from '@site/docs/config/categories.config.json';
import assignmentWeights from '@site/docs/config/weights.json';

const WEIGHTS_FILE_PATH = 'website/docs/config/weights.json';
const CATEGORY_CONFIG_PATH = 'website/docs/config/categories.config.json';

function startCase(value) {
  return value
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseWeightValue(rawValue, key) {
  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
    return rawValue;
  }

  if (typeof rawValue === 'string') {
    const cleaned = rawValue.trim().replace('%', '');
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  throw new Error(
    `Invalid assignment weight for "${key}" in ${WEIGHTS_FILE_PATH}. ` +
      `Use a number or percent string (example: "25%").`,
  );
}

function validateAssignmentWeights(weights) {
  const total = Object.entries(weights).reduce(
    (sum, [key, value]) => sum + parseWeightValue(value, key),
    0,
  );

  if (total !== 100) {
    throw new Error(
      `Assignment weights must add up to 100%, but current total is ${total}%. ` +
        `Update ${WEIGHTS_FILE_PATH}.`,
    );
  }
}

function getCategoryEntries() {
  const configuredCategories = categoryConfig.categories ?? {};

  return Object.keys(assignmentWeights)
    .map((categoryKey, index) => {
      const category = configuredCategories[categoryKey] ?? {};
      return {
        key: categoryKey,
        label: category.label ?? startCase(categoryKey),
        position: Number.isFinite(category.position) ? category.position : index + 1,
      };
    })
    .sort((a, b) => a.position - b.position || a.label.localeCompare(b.label));
}

function getAssignmentDocs() {
  const lectureContext = require.context('@site/docs/lectures', true, /\/(ex|ica)\/.*\.(md|mdx)$/);
  const homeworkContext = require.context('@site/docs/homework', true, /\.(md|mdx)$/);
  const lectureCategoryMap = {
    ex: 'exercises',
    ica: 'in-class-activities',
  };

  const lectureDocs = lectureContext
    .keys()
    .filter(key => key.replace('./', '').split('/').length === 3)
    .map(key => {
    const module = lectureContext(key);
    const frontMatter = module.frontMatter ?? {};
    const parts = key.replace('./', '').split('/');
    const lectureKey = parts[0];
      const lectureSubdir = parts[1];
    const categoryKey = frontMatter.assignmentType ?? lectureCategoryMap[lectureSubdir] ?? lectureSubdir;
    const fileSlug = parts.join('/').replace(/\.(md|mdx)$/, '');
    if (frontMatter.isAssignment !== true) return null;

    return {
      categoryKey,
      id: frontMatter.id ?? frontMatter.slug ?? frontMatter.title ?? fileSlug,
      title: frontMatter.title ?? `Lecture ${lectureKey} Assignment`,
      releaseDate: frontMatter.releaseDate,
      dueDate: frontMatter.dueDate,
      dueDateTime: frontMatter.dueDateTime,
      kind: frontMatter.kind,
      lateDaysAllowed: frontMatter.lateDaysAllowed,
      closeDate: frontMatter.closeDate,
      link: frontMatter.slug ? `/docs${frontMatter.slug}` : `/docs/lectures/${fileSlug}`,
      sourcePriority: 2,
    };
    })
    .filter(Boolean);

  const homeworkDocs = homeworkContext
    .keys()
    .map(key => {
      const module = homeworkContext(key);
      const frontMatter = module.frontMatter ?? {};
      if (frontMatter.isAssignment !== true) return null;

      const fileSlug = `homework/${key.replace('./', '').replace(/\.(md|mdx)$/, '')}`;
      const categoryKey = frontMatter.assignmentType ?? 'homework';
      return {
        categoryKey,
        id: frontMatter.id ?? frontMatter.slug ?? frontMatter.title ?? fileSlug,
        title: frontMatter.title ?? 'Untitled Assignment',
        releaseDate: frontMatter.releaseDate,
        dueDate: frontMatter.dueDate,
        dueDateTime: frontMatter.dueDateTime,
        kind: frontMatter.kind,
        lateDaysAllowed: frontMatter.lateDaysAllowed,
        closeDate: frontMatter.closeDate,
        link: frontMatter.slug ? `/docs${frontMatter.slug}` : `/docs/${fileSlug}`,
        sourcePriority: 2,
      };
    })
    .filter(Boolean);

  const docsByIdentity = new Map();
  for (const item of [...lectureDocs, ...homeworkDocs]) {
    const identity = `${item.categoryKey}::${item.id}`;
    const previous = docsByIdentity.get(identity);
    if (!previous || item.sourcePriority >= previous.sourcePriority) {
      docsByIdentity.set(identity, item);
    }
  }

  return [...docsByIdentity.values()].map(({sourcePriority, ...item}) => item);
}

validateAssignmentWeights(assignmentWeights);

const categoryEntries = getCategoryEntries();
const assignmentDocs = getAssignmentDocs();
const configDefaults = categoryConfig.defaults ?? {};
const configCategories = categoryConfig.categories ?? {};
const categoryEntryMap = new Map(categoryEntries.map(category => [category.key, category]));
const discoveredCategoryKeys = new Set([
  ...categoryEntries.map(category => category.key),
  ...assignmentDocs.map(item => item.categoryKey),
]);

export const assignmentCategories = [...discoveredCategoryKeys]
  .map(categoryKey => {
    const discovered = categoryEntryMap.get(categoryKey);
    return {
      key: categoryKey,
      label: discovered?.label ?? startCase(categoryKey),
      position: discovered?.position ?? 999,
    };
  })
  .sort((a, b) => a.position - b.position || a.label.localeCompare(b.label))
  .map(category => {
  const config = configCategories[category.key] ?? {};

  return {
    key: category.key,
    label: config.label ?? category.label,
    weight: assignmentWeights[category.key] ?? 'TBD',
    kind: config.kind ?? configDefaults.kind ?? 'Assignment',
    blurb:
      config.blurb ??
      configDefaults.blurb ??
      `Course work in the ${category.label.toLowerCase()} category.`,
    releasePolicy:
      config.releasePolicy ?? configDefaults.releasePolicy ?? 'Check the assignment prompt for release details.',
    submissionPolicy:
      config.submissionPolicy ?? configDefaults.submissionPolicy ?? 'Check the assignment prompt for submission instructions.',
  };
});

const categoriesByKey = new Map(assignmentCategories.map(category => [category.key, category]));

const assignments = assignmentDocs.map(item => {
  if (!item || typeof item !== 'object') {
    return null;
  }
  const category = categoriesByKey.get(item.categoryKey);

  return {
    id: item.id,
    title: item.title,
    type: item.categoryKey,
    kind: item.kind ?? category?.kind ?? 'Assignment',
    releaseDate: item.releaseDate,
    dueDate: item.dueDate,
    dueDateTime: item.dueDateTime,
    lateDaysAllowed: item.lateDaysAllowed,
    closeDate: item.closeDate,
    link: item.link,
  };
}).filter(Boolean);

export default assignments;
