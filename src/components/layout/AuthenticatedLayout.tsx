import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useLocation } from 'react-router-dom';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export const AuthenticatedLayout = ({ children }: AuthenticatedLayoutProps) => {
  const location = useLocation();
  const isInboxPage = location.pathname === '/inbox';
  
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 lg:ml-64 transition-all duration-300">
        <Header />
        <main className={isInboxPage ? "flex-1" : "flex-1 p-6"}>{children}</main>
      </div>
    </div>
  );
};
