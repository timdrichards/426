import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Weekly Teaching Rhythm',
    description: (
      <>
        Keep a predictable structure for lectures, in-class demos, and follow-up references so students know where to look.
      </>
    ),
    href: '/docs/course-structure',
    cta: 'See the content map',
  },
  {
    title: 'Low-Friction Publishing',
    description: (
      <>
        Changes pushed to <code>main</code> can publish automatically through the configured GitHub Pages workflow.
      </>
    ),
    href: '/docs/site-workflow',
    cta: 'Deployment workflow',
  },
  {
    title: 'Docs First, Code Nearby',
    description: (
      <>
        This repo keeps the website in <code>website/</code> so your course assets in <code>lectures/</code> stay isolated.
      </>
    ),
    href: '/docs/intro',
    cta: 'Start editing',
  },
];

function Feature({title, description, href, cta}) {
  return (
    <div className={clsx('col col--4', styles.col)}>
      <div className={styles.card}>
        <div className={styles.cardGlow} aria-hidden="true" />
        <Heading as="h3" className={styles.cardTitle}>
          {title}
        </Heading>
        <p className={styles.cardText}>{description}</p>
        <Link className={styles.cardLink} to={href}>
          {cta} →
        </Link>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features} aria-label="Course site capabilities">
      <div className="container">
        <div className={styles.headingRow}>
          <p className={styles.eyebrow}>Foundation</p>
          <Heading as="h2" className={styles.sectionTitle}>
            A clean baseline for course publishing
          </Heading>
          <p className={styles.sectionText}>
            Start from something calm and structured, then customize branding and content as the semester evolves.
          </p>
        </div>
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
