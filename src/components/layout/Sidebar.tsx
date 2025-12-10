import { useState } from 'react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  BarChart3,
  UserCircle,
  Bot,
  TestTube,
  FlaskConical,
  Clock,
  Menu,
  X,
  Inbox,
  FlaskRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const menuSections = [
  {
    title: 'Agente',
    items: [
      { title: 'Agente Luna', url: '/agent-settings', icon: Bot },
      { title: 'Disponibilidade', url: '/settings/availability', icon: Clock },
    ],
  },
  {
    title: 'Leads & Analytics',
    items: [
      { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
      { title: 'Leads', url: '/leads', icon: Users },
      { title: 'Agenda', url: '/calendar', icon: Calendar },
      { title: 'Inbox', url: '/inbox', icon: Inbox },
      { title: 'Analytics', url: '/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Testes',
    items: [
      { title: 'Teste Agente', url: '/test-agent', icon: TestTube },
      { title: 'Modo Teste', url: '/settings/test-mode', icon: FlaskRound },
      { title: 'Testes Sistema', url: '/tests', icon: FlaskConical },
    ],
  },
];

const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center px-4 border-b">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-primary">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">Luna SDR</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 p-4 overflow-y-auto">
        {menuSections.map((section) => (
          <div key={section.title} className="space-y-2">
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.url}
                  to={item.url}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    'hover:bg-accent hover:text-accent-foreground',
                    isActive(item.url)
                      ? 'bg-primary text-primary-foreground shadow-primary'
                      : 'text-muted-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span>{item.title}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t space-y-2">
        <NavLink
          to="/profile"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
            'hover:bg-accent hover:text-accent-foreground',
            location.pathname === '/profile'
              ? 'bg-primary text-primary-foreground shadow-primary'
              : 'text-muted-foreground'
          )}
        >
          <UserCircle className="h-5 w-5 shrink-0" />
          <span>Meu Perfil</span>
        </NavLink>
        
        <div className="text-xs text-muted-foreground px-3">
          <p className="font-medium">Agente SDR A2A</p>
          <p>v1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export const Sidebar = () => {
  return (
    <aside className="hidden lg:fixed lg:left-0 lg:top-0 lg:z-40 lg:block lg:h-screen lg:w-64 border-r bg-card">
      <SidebarContent />
    </aside>
  );
};

export const MobileSidebar = () => {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
};
