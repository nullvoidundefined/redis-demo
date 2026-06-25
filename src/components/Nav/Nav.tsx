/** Primary navigation across the four Redis pattern demos. */
import Link from 'next/link';
import styles from './Nav.module.scss';

const LINKS = [
    { href: '/', label: 'Home' },
    { href: '/caching', label: 'Caching' },
    { href: '/rate-limit', label: 'Rate Limit' },
    { href: '/queue', label: 'Queue' },
    { href: '/pubsub', label: 'Pub/Sub' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/session', label: 'Session' },
];

export function Nav() {
    return (
        <nav className={styles.nav}>
            {LINKS.map((link) => (
                <Link key={link.href} href={link.href} className={styles.link}>
                    {link.label}
                </Link>
            ))}
        </nav>
    );
}
