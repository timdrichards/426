import categoryConfig from '@site/docs/assignments/categories.config.json';
import assignmentWeights from '@site/docs/assignments/weights.json';

const WEIGHTS_FILE_PATH = 'website/docs/assignments/weights.json';
const CATEGORY_CONFIG_PATH = 'website/docs/assignments/categories.config.json';

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
  const context = require.context('@site/docs/assignments', true, /_category_\.json$/);

  return context
    .keys()
    .map(key => {
      const parts = key.replace('./', '').split('/');
      const categoryKey = parts[0];
      const categoryData = context(key);
      const category = categoryData.default ?? categoryData;

      return {
        key: categoryKey,
        label: category.label ?? startCase(categoryKey),
        position: Number.isFinite(category.position) ? category.position : 999,
      };
    })
    .sort((a, b) => a.position - b.position || a.label.localeCompare(b.label));
}

function getAssignmentDocs() {
  const context = require.context('@site/docs/assignments', true, /\.(md|mdx)$/);

  return context
    .keys()
    .filter(key => {
      const filePath = key.replace('./', '');
      return filePath.includes('/') && !filePath.endsWith('/_category_.md') && !filePath.endsWith('/_category_.mdx');
    })
    .map(key => {
      const module = context(key);
      const frontMatter = module.frontMatter ?? {};
      const parts = key.replace('./', '').split('/');
      const categoryKey = parts[0];
      const fileSlug = parts.join('/').replace(/\.(md|mdx)$/, '');

      return {
        categoryKey,
        id: frontMatter.id ?? frontMatter.slug ?? frontMatter.title ?? fileSlug,
        title: frontMatter.title ?? 'Untitled Assignment',
        releaseDate: frontMatter.releaseDate,
        dueDate: frontMatter.dueDate,
        kind: frontMatter.kind,
        link: frontMatter.slug ? `/docs${frontMatter.slug}` : `/docs/${fileSlug}`,
      };
    });
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
  const category = categoriesByKey.get(item.categoryKey);

  return {
    id: item.id,
    title: item.title,
    type: item.categoryKey,
    kind: item.kind ?? category?.kind ?? 'Assignment',
    releaseDate: item.releaseDate,
    dueDate: item.dueDate,
    link: item.link,
  };
});

export default assignments;
