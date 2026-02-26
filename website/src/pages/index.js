import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  const repoUrl = siteConfig.customFields?.repoUrl;

  return (
    <header className={clsx(styles.heroBanner)}>
      <div className={clsx('container', styles.heroShell)}>
        <div className={styles.heroCard}>
          <p className={styles.kicker}>Spring-ready course site baseline</p>
          <Heading as="h1" className={styles.heroTitle}>
            {siteConfig.title}
          </Heading>
          <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
          <div className={styles.buttons}>
            <Link className={clsx('button button--lg', styles.primaryButton)} to="/docs/intro">
              Open course docs
            </Link>
            <Link className={clsx('button button--lg', styles.secondaryButton)} to="/docs/site-workflow">
              Local + deploy workflow
            </Link>
            {repoUrl ? (
              <Link className={clsx('button button--lg', styles.ghostButton)} href={repoUrl}>
                Repository
              </Link>
            ) : null}
          </div>
          <div className={styles.heroMeta}>
            <div className={styles.metaCard}>
              <span className={styles.metaLabel}>Content</span>
              <span className={styles.metaValue}>Docs, demos, lecture support</span>
            </div>
            <div className={styles.metaCard}>
              <span className={styles.metaLabel}>Deploy</span>
              <span className={styles.metaValue}>GitHub Actions to Pages</span>
            </div>
          </div>
        </div>
        <aside className={styles.heroAside} aria-label="Site highlights">
          <div className={styles.asidePanel}>
            <Heading as="h2" className={styles.asideTitle}>
              Calm by default
            </Heading>
            <p className={styles.asideText}>
              A soft color palette, spacious layout, and readable typography for course materials.
            </p>
            <ul className={styles.asideList}>
              <li>Subfolder Docusaurus setup in <code>website/</code></li>
              <li>GitHub Pages deployment workflow already configured</li>
              <li>Starter docs ready for your syllabus, labs, and lecture notes</li>
            </ul>
          </div>
        </aside>
      </div>
      <div className={styles.heroBackdrop} aria-hidden="true">
        <div className={styles.orbA} />
        <div className={styles.orbB} />
        <div className={styles.orbC} />
      </div>
    </header>
  );
}

function HomeSections() {
  return (
    <section className={styles.sectionWrap}>
      <div className={clsx('container', styles.sectionGrid)}>
        <div className={styles.sectionCard}>
          <Heading as="h2" className={styles.sectionTitle}>
            Suggested next edits
          </Heading>
          <p className={styles.sectionText}>
            Start by replacing the intro docs page and homepage copy with your actual course schedule and navigation.
          </p>
          <ul className={styles.checklist}>
            <li>Update syllabus links and office hours</li>
            <li>Add lecture index pages or weekly modules</li>
            <li>Link assignments, labs, and project rubrics</li>
          </ul>
        </div>
        <div className={styles.sectionCard}>
          <Heading as="h2" className={styles.sectionTitle}>
            Local development
          </Heading>
          <p className={styles.sectionText}>
            Edit content in <code>website/docs</code> and preview changes locally with live reload.
          </p>
          <pre className={styles.commandBlock}>
            <code>{`cd website\nnpm install\nnpm start`}</code>
          </pre>
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
      <HomepageHeader />
      <main>
        <HomeSections />
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
