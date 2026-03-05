import {useEffect, useMemo, useState} from 'react';
import Link from '@docusaurus/Link';
import assignments, {assignmentCategories} from '@site/src/data/assignments';
import styles from './styles.module.css';

const SECOND = 1000;
const DAY_SECONDS = 24 * 60 * 60;

function parseDateOnlyEndOfDay(dateString) {
  if (typeof dateString !== 'string' || !dateString.trim()) return null;
  const d = new Date(`${dateString}T23:59:59`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseDueMoment(item) {
  if (typeof item?.dueDateTime === 'string' && item.dueDateTime.trim()) {
    const dt = new Date(item.dueDateTime);
    if (!Number.isNaN(dt.getTime())) return dt;
  }
  return parseDateOnlyEndOfDay(item?.dueDate);
}

function parseCloseMoment(item, dueMoment) {
  if (!dueMoment) return null;
  if (typeof item?.closeDate === 'string' && item.closeDate.trim()) {
    const close = parseDateOnlyEndOfDay(item.closeDate);
    if (close) return close;
  }
  const lateDaysAllowed = Number.isFinite(item?.lateDaysAllowed) ? item.lateDaysAllowed : 0;
  return new Date(dueMoment.getTime() + Math.max(0, lateDaysAllowed) * DAY_SECONDS * SECOND);
}

function formatDuration(totalSeconds) {
  const abs = Math.max(0, Math.floor(Math.abs(totalSeconds)));
  const days = Math.floor(abs / DAY_SECONDS);
  const hours = Math.floor((abs % DAY_SECONDS) / 3600);
  const minutes = Math.floor((abs % 3600) / 60);
  const seconds = abs % 60;
  const hhmmss = [hours, minutes, seconds].map((v) => String(v).padStart(2, '0')).join(':');
  return days > 0 ? `${days}d ${hhmmss}` : hhmmss;
}

function formatDueMoment(date) {
  if (!date) return 'TBD';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function computeTimerState(item, nowMs) {
  const due = parseDueMoment(item);
  if (!due) {
    return {
      dueLabel: 'TBD',
      timerLabel: 'No due date',
      policyLabel: 'No due policy',
      stateClass: styles.timerNeutral,
    };
  }

  const close = parseCloseMoment(item, due);
  const dueSeconds = (due.getTime() - nowMs) / SECOND;
  const closeSeconds = close ? (close.getTime() - nowMs) / SECOND : dueSeconds;

  if (dueSeconds >= 0) {
    const lateDaysAllowed = Number.isFinite(item?.lateDaysAllowed) ? item.lateDaysAllowed : 0;
    const policyLabel =
      lateDaysAllowed > 0 ? `${lateDaysAllowed} late day(s) allowed` : 'No late submissions';
    return {
      dueLabel: formatDueMoment(due),
      timerLabel: `${formatDuration(dueSeconds)} left`,
      policyLabel,
      stateClass: styles.timerFuture,
    };
  }

  if (close && closeSeconds >= 0 && close.getTime() > due.getTime()) {
    const lateSeconds = -dueSeconds;
    const lateDaysUsed = Math.floor(lateSeconds / DAY_SECONDS);
    const lateDaysAllowed = Number.isFinite(item?.lateDaysAllowed) ? item.lateDaysAllowed : 0;
    return {
      dueLabel: formatDueMoment(due),
      timerLabel: `-${formatDuration(lateSeconds)} late`,
      policyLabel: `${lateDaysUsed}/${lateDaysAllowed} late days used`,
      stateClass: styles.timerLate,
    };
  }

  const capSeconds = close ? Math.max(0, (close.getTime() - due.getTime()) / SECOND) : 0;
  return {
    dueLabel: formatDueMoment(due),
    timerLabel: capSeconds > 0 ? `-${formatDuration(capSeconds)} (closed)` : 'Closed',
    policyLabel: 'Submissions no longer accepted',
    stateClass: styles.timerClosed,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function timerStyle(item, nowMs) {
  const due = parseDueMoment(item);
  if (!due) return undefined;

  const close = parseCloseMoment(item, due);
  const dueSeconds = (due.getTime() - nowMs) / SECOND;

  if (dueSeconds >= 0) {
    const windowSeconds = 7 * DAY_SECONDS;
    const ratio = clamp(1 - dueSeconds / windowSeconds, 0, 1);
    const hue = Math.round(140 - 140 * ratio);
    return {
      '--timer-bg': `hsl(${hue} 85% 93%)`,
      '--timer-border': `hsl(${hue} 50% 72%)`,
      '--timer-fg': `hsl(${Math.max(10, hue - 15)} 75% 26%)`,
    };
  }

  if (close && close.getTime() > due.getTime() && close.getTime() >= nowMs) {
    const lateWindowSeconds = Math.max(1, (close.getTime() - due.getTime()) / SECOND);
    const lateUsedSeconds = Math.abs(dueSeconds);
    const ratio = clamp(lateUsedSeconds / lateWindowSeconds, 0, 1);
    const hue = Math.round(28 - 28 * ratio);
    return {
      '--timer-bg': `hsl(${hue} 92% 92%)`,
      '--timer-border': `hsl(${hue} 65% 70%)`,
      '--timer-fg': `hsl(${Math.max(2, hue - 10)} 78% 28%)`,
    };
  }

  return undefined;
}

function sortMeta(item, nowMs) {
  const due = parseDueMoment(item);
  if (!due) return {bucket: 3, seconds: Number.MAX_SAFE_INTEGER};

  const close = parseCloseMoment(item, due) ?? due;
  const dueSeconds = (due.getTime() - nowMs) / SECOND;
  const closeSeconds = (close.getTime() - nowMs) / SECOND;

  if (dueSeconds >= 0) {
    return {bucket: 0, seconds: dueSeconds};
  }
  if (closeSeconds >= 0) {
    return {bucket: 1, seconds: closeSeconds};
  }
  return {bucket: 2, seconds: Math.abs(closeSeconds)};
}

export default function AssignmentIndexLive() {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), SECOND);
    return () => clearInterval(timer);
  }, []);

  const grouped = useMemo(() => {
    const byType = new Map(assignmentCategories.map((cat) => [cat.key, []]));
    assignments.forEach((item) => {
      if (!item?.type) return;
      if (!byType.has(item.type)) byType.set(item.type, []);
      byType.get(item.type).push(item);
    });
    return assignmentCategories
      .map((cat, index) => {
        const items = (byType.get(cat.key) ?? []).sort((a, b) => {
          const aMeta = sortMeta(a, nowMs);
          const bMeta = sortMeta(b, nowMs);
          if (aMeta.bucket !== bMeta.bucket) return aMeta.bucket - bMeta.bucket;
          if (aMeta.seconds !== bMeta.seconds) return aMeta.seconds - bMeta.seconds;
          return String(a.title).localeCompare(String(b.title));
        });

        const firstMeta = items.length > 0 ? sortMeta(items[0], nowMs) : {bucket: 4, seconds: Number.MAX_SAFE_INTEGER};
        return {
          ...cat,
          _orderIndex: index,
          _sortBucket: firstMeta.bucket,
          _sortSeconds: firstMeta.seconds,
          items,
        };
      })
      .sort((a, b) => {
        if (a._sortBucket !== b._sortBucket) return a._sortBucket - b._sortBucket;
        if (a._sortSeconds !== b._sortSeconds) return a._sortSeconds - b._sortSeconds;
        return a._orderIndex - b._orderIndex;
      });
  }, [nowMs]);

  return (
    <div className={styles.wrapper}>
      {grouped.map((category) => (
        <section key={category.key} className={styles.category}>
          <div className={styles.categoryHeader}>
            <h3 className={styles.categoryTitle}>{category.label}</h3>
            <span className={styles.weight}>Weight: {category.weight ?? 'TBD'}</span>
          </div>
          {category.items.length === 0 ? (
            <p className={styles.empty}>No assignments posted yet.</p>
          ) : (
            <div className={styles.list}>
              {category.items.map((item) => {
                const timer = computeTimerState(item, nowMs);
                return (
                  <div key={item.id ?? item.title} className={styles.row}>
                    <div className={styles.main}>
                      <Link to={item.link} className={styles.link}>
                        {item.title}
                      </Link>
                      <span className={styles.due}>{timer.dueLabel}</span>
                    </div>
                    <div className={`${styles.timer} ${timer.stateClass}`} style={timerStyle(item, nowMs)}>
                      {timer.timerLabel}
                    </div>
                    <div className={styles.policy}>{timer.policyLabel}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
