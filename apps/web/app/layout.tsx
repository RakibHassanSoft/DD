import type { Metadata } from 'next';
import './styles.css';
import './workspace.css';
import './contacts.css';
import './templates.css';
import './campaigns.css';
import './suppressions.css';
import './deliverability.css';
import './analytics.css';

export const metadata: Metadata = {
  title: 'Mailflow | Secure outreach, thoughtfully sent',
  description: 'AI-powered Gmail campaigns with controlled scheduling and deliverability-focused safeguards.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
