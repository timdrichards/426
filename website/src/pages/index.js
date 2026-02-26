import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import assignments from '@site/src/data/assignments';
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
    description: 'Assignment overview and links to current homework.',
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

function sortedAssignments() {
  return [...assignments].sort((a, b) => {
    const aDue = a.dueDate ?? '9999-12-31';
    const bDue = b.dueDate ?? '9999-12-31';
    return aDue.localeCompare(bDue);
  });
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
  const items = sortedAssignments();

  return (
    <section className={styles.assignmentsSection} aria-label="Current assignments">
      <div className={clsx('container', styles.assignmentsLayout)}>
        <div className={styles.assignmentsPanel}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>Assignments</p>
            <Heading as="h2" className={styles.sectionTitle}>
              Current and upcoming work
            </Heading>
            <p className={styles.sectionSubtitle}>
              This list is generated from assignment files in <code>website/docs/homework/</code>.
            </p>
          </div>

          {items.length === 0 ? (
            <p className={styles.emptyState}>No homework items yet.</p>
          ) : (
            <div className={styles.assignmentList}>
              {items.map(item => (
                <Link key={item.id} className={styles.assignmentCard} to={item.link}>
                  <div className={styles.assignmentTopRow}>
                    <span className={styles.assignmentType}>Homework</span>
                    <span
                      className={clsx(
                        styles.assignmentState,
                        getAssignmentState(item) === 'Current' && styles.stateCurrent,
                        getAssignmentState(item) === 'Upcoming' && styles.stateUpcoming,
                        getAssignmentState(item) === 'Closed' && styles.stateClosed,
                      )}>
                      {getAssignmentState(item)}
                    </span>
                  </div>
                  <Heading as="h3" className={styles.assignmentTitle}>
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
              ))}
            </div>
          )}
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
