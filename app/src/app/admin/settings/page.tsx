import SettingsClient from './SettingsClient';
import { getTenantProfile } from '@/actions/settings';

export default async function SettingsPage() {
  const initProfile = await getTenantProfile().catch(() => null);

  return (
    <SettingsClient
      initProfile={initProfile}
    />
  );
}
