import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import assignments, {assignmentCategories} from '@site/src/data/assignments';
import styles from './index.module.css';

const primaryCards = [
  {
    title: 'Syllabus',
    description: 'Policies, expectations, grading, and course logistics.',
    to: '/docs/syllabus',
  },
  {
    title: 'Schedule',
    description: 'Weekly topics, pacing, and major milestones.',
    to: '/docs/schedule',
  },
  {
    title: 'Lectures',
    description: 'Lecture index, notes, and links to demos/references.',
    to: '/docs/lectures',
  },
  {
    title: 'Assignments',
    description: 'Assignment overview and links to active work.',
    to: '/docs/assignments',
  },
];

function formatDate(dateString) {
  if (!dateString) return 'TBD';
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function getAssignmentState(item) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const release = item.releaseDate ? new Date(`${item.releaseDate}T00:00:00`) : null;
  const due = item.dueDate ? new Date(`${item.dueDate}T00:00:00`) : null;
  if (release && due && release <= today && today <= due) return 'Current';
  if (release && release > today) return 'Upcoming';
  if (due && due < today) return 'Closed';
  return 'Planned';
}

function sortByDueDate(items) {
  return [...items].sort((a, b) => {
    const aDue = a.dueDate ?? '9999-12-31';
    const bDue = b.dueDate ?? '9999-12-31';
    return aDue.localeCompare(bDue);
  });
}

function groupedAssignments() {
  const grouped = new Map(assignmentCategories.map(category => [category.key, []]));

  assignments.forEach(item => {
    if (!grouped.has(item.type)) {
      grouped.set(item.type, []);
    }
    grouped.get(item.type).push(item);
  });

  return assignmentCategories.map(category => ({
    ...category,
    items: sortByDueDate(grouped.get(category.key) ?? []),
  }));
}

function CourseCards() {
  return (
    <section className={styles.cardsSection} aria-label="Course navigation">
      <div className={clsx('container', styles.cardsGrid)}>
        {primaryCards.map(card => (
          <Link key={card.title} className={styles.navCard} to={card.to}>
            <div className={styles.navCardInner}>
              <p className={styles.navCardLabel}>Open</p>
              <Heading as="h2" className={styles.navCardTitle}>
                {card.title}
              </Heading>
              <p className={styles.navCardText}>{card.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function AssignmentPanel() {
  const categories = groupedAssignments();

  return (
    <section className={styles.assignmentsSection} aria-label="Assignment categories">
      <div className={clsx('container', styles.assignmentsLayout)}>
        <div className={styles.assignmentsPanel}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>Assignments</p>
            <Heading as="h2" className={styles.sectionTitle}>
              Assignment Categories and Due Dates
            </Heading>
          </div>

          <div className={styles.assignmentCategoryList}>
            {categories.map(category => (
              <section key={category.key} className={styles.categorySection}>
                <div className={styles.categoryHeader}>
                  <div className={styles.categoryTitleRow}>
                    <Heading as="h3" className={styles.categoryTitle}>
                      {category.label}
                    </Heading>
                    <span className={styles.weightBadge}>Weight: {category.weight}</span>
                  </div>
                  <p className={styles.categoryBlurb}>{category.blurb}</p>
                  <p className={styles.categoryMeta}>
                    <strong>Release:</strong> {category.releasePolicy}
                  </p>
                  <p className={styles.categoryMeta}>
                    <strong>Submission:</strong> {category.submissionPolicy}
                  </p>
                </div>

                {category.items.length === 0 ? (
                  <p className={styles.emptyState}>No {category.label.toLowerCase()} posted yet.</p>
                ) : (
                  <div className={styles.assignmentList}>
                    {category.items.map(item => {
                      const state = getAssignmentState(item);
                      return (
                        <Link key={item.id} className={styles.assignmentCard} to={item.link}>
                          <div className={styles.assignmentTopRow}>
                            <span className={styles.assignmentType}>{item.kind}</span>
                            <span
                              className={clsx(
                                styles.assignmentState,
                                state === 'Current' && styles.stateCurrent,
                                state === 'Upcoming' && styles.stateUpcoming,
                                state === 'Closed' && styles.stateClosed,
                              )}>
                              {state}
                            </span>
                          </div>
                          <Heading as="h4" className={styles.assignmentTitle}>
                            {item.title}
                          </Heading>
                          <div className={styles.assignmentDates}>
                            <div>
                              <span className={styles.dateLabel}>Released</span>
                              <span className={styles.dateValue}>{formatDate(item.releaseDate)}</span>
                            </div>
                            <div>
                              <span className={styles.dateLabel}>Due</span>
                              <span className={styles.dateValue}>{formatDate(item.dueDate)}</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="Course documentation hub for lectures, demos, and teaching materials">
      <header className={styles.heroBanner}>
        <div className={clsx('container', styles.heroContainer)}>
          <p className={styles.heroKicker}>Course Portal</p>
          <Heading as="h1" className={styles.heroTitle}>
            {siteConfig.title}
          </Heading>
          <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
        </div>
      </header>
      <main>
        <CourseCards />
        <AssignmentPanel />
      </main>
    </Layout>
  );
}
