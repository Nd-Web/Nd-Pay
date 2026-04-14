import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BottomNav } from '@/components/shared/BottomNav';
import { RealtimeProvider } from '@/components/shared/RealtimeProvider';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in');

  return (
    <RealtimeProvider>
      <div className="relative min-h-screen max-w-lg mx-auto">
        {/* Background decorations */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden max-w-lg mx-auto">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-violet-600/10 blur-3xl" />
          <div className="absolute top-1/2 -left-20 w-48 h-48 rounded-full bg-blue-600/8 blur-3xl" />
        </div>

        <main className="relative z-10 pb-28">
          {children}
        </main>

        <BottomNav />
      </div>
    </RealtimeProvider>
  );
}
