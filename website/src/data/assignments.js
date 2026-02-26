import {frontMatter as homework01} from '@site/docs/homework/homework-01.md';

const rawAssignments = [homework01];

const assignments = rawAssignments.map(item => ({
  id: item.id ?? item.slug ?? item.title,
  title: item.title ?? 'Untitled Assignment',
  releaseDate: item.releaseDate,
  dueDate: item.dueDate,
  link: item.slug ? `/docs${item.slug}` : '/docs/assignments',
}));

export default assignments;
