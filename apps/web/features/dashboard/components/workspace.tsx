'use client';

import type { User } from '../../auth/types';
import { signOut } from '../../auth/auth.api';
import { SenderPanel } from '../../senders/components/sender-panel';
import { ContactImporter } from '../../contacts/components/contact-importer';
import { TemplateStudio } from '../../templates/components/template-studio';
import { CampaignManager } from '../../campaigns/components/campaign-manager';
import { SuppressionPanel } from '../../suppressions/components/suppression-panel';
import { CustomTemplateComposer } from '../../templates/components/custom-template-composer';
import { AnalyticsDashboard } from '../../analytics/components/analytics-dashboard';

export function Workspace({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  async function logout() { await signOut(); onSignOut(); }
  return <section className="workspace"><header className="workspace-header"><div className="brand"><span className="brand-mark">M</span> mailflow</div><div className="account-menu"><span>{user.name}</span><button className="text-button" onClick={logout}>Sign out</button></div></header><main><div className="welcome"><span className="eyebrow">WORKSPACE SETUP</span><h1>Welcome, {user.name.split(' ')[0]}.</h1><p>Your account is protected. Connect a sender, import prospects, choose an AI or your own template, then run campaigns with controlled delivery.</p></div><div className="workspace-stack"><SenderPanel /><ContactImporter /><CustomTemplateComposer /><TemplateStudio /><CampaignManager /><SuppressionPanel /><AnalyticsDashboard /></div></main></section>;
}
