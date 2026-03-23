import Sidebar from '@/components/Sidebar';
import { LibraryProvider } from '@/lib/libraryContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LibraryProvider>
      <div className="flex min-h-screen selection:bg-amber-100 selection:text-rose-900">
        <Sidebar />
        <div className="flex-1 bg-[#FAF8F5] flex flex-col items-center w-full relative">
          {/* Decorative Background Blur - Warm Theme */}
          <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none -z-10 overflow-hidden">
            <div className="absolute -top-20 -left-20 w-96 h-96 bg-rose-100/40 rounded-full blur-3xl opacity-60" />
            <div className="absolute top-1/2 -right-20 w-[30rem] h-[30rem] bg-amber-100/30 rounded-full blur-3xl opacity-60" />
          </div>
          {children}
          {/* Global Header Gradient */}
          <div className="fixed top-0 inset-x-0 h-96 bg-gradient-to-b from-[#521118]/8 to-transparent pointer-events-none z-40" />
        </div>
      </div>
    </LibraryProvider>
  );
}
