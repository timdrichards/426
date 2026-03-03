import {frontMatter as exercise01} from '@site/docs/assignments/exercises/exercise-01.md';

export const assignmentCategories = [
  {
    key: 'exercises',
    label: 'Exercises',
    weight: '25%',
    blurb: 'Short applied work to practice the week\'s concepts with fast feedback loops.',
    releasePolicy: 'Usually posted after lecture and listed in this section.',
    submissionPolicy: 'Submit on Canvas unless the prompt requires a GitHub repo link.',
  },
  {
    key: 'in-class-activities',
    label: 'In-Class Activities',
    weight: '15%',
    blurb: 'Live activities completed during class sessions to reinforce core concepts.',
    releasePolicy: 'Released at the start of class or immediately after the activity briefing.',
    submissionPolicy: 'Submit before class ends unless otherwise noted in the activity prompt.',
  },
  {
    key: 'exams',
    label: 'Exams',
    weight: '30%',
    blurb: 'Timed assessments that evaluate individual mastery of course learning objectives.',
    releasePolicy: 'Exam windows and study guidance are announced in advance.',
    submissionPolicy: 'Complete in the testing platform or LMS during the published window.',
  },
];

const rawAssignments = [
  {
    type: 'exercises',
    kind: 'Exercise',
    ...exercise01,
  },
];

const assignments = rawAssignments.map(item => ({
  id: item.id ?? item.slug ?? item.title,
  title: item.title ?? 'Untitled Assignment',
  type: item.type,
  kind: item.kind ?? 'Assignment',
  releaseDate: item.releaseDate,
  dueDate: item.dueDate,
  link: item.slug ? `/docs${item.slug}` : '/docs/assignments',
}));

export default assignments;
