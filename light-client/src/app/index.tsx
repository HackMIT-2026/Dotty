import { Redirect } from 'expo-router';

import { useStore } from '@/lib/store';

/** `/` sends each person to their own area. */
export default function Index() {
  const role = useStore((s) => s.session?.user.role);
  if (role === 'child') return <Redirect href="/child" />;
  if (role === 'parent') return <Redirect href="/parent" />;
  return <Redirect href="/auth/login" />;
}
