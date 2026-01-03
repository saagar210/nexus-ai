import {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
} from "react";
import {
  Menu,
  X,
  ChevronLeft,
  MessageSquare,
  FileText,
  Settings,
} from "lucide-react";

// Mobile breakpoint detection hook
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = (): void => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [breakpoint]);

  return isMobile;
}

// Mobile navigation context
interface MobileNavContextType {
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  activeView: "chat" | "documents" | "settings";
  setActiveView: (view: "chat" | "documents" | "settings") => void;
}

const MobileNavContext = createContext<MobileNavContextType | null>(null);

export function useMobileNav(): MobileNavContextType {
  const context = useContext(MobileNavContext);
  if (!context) {
    throw new Error("useMobileNav must be used within MobileNavProvider");
  }
  return context;
}

interface MobileNavProviderProps {
  children: React.ReactNode;
}

export function MobileNavProvider({
  children,
}: MobileNavProviderProps): React.ReactElement {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<
    "chat" | "documents" | "settings"
  >("chat");

  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const toggleSidebar = useCallback(
    () => setIsSidebarOpen((prev) => !prev),
    [],
  );

  // Close sidebar when view changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [activeView]);

  return (
    <MobileNavContext.Provider
      value={{
        isSidebarOpen,
        openSidebar,
        closeSidebar,
        toggleSidebar,
        activeView,
        setActiveView,
      }}
    >
      {children}
    </MobileNavContext.Provider>
  );
}

// Mobile header component
interface MobileHeaderProps {
  title: string;
  onMenuClick?: () => void;
  onBackClick?: () => void;
  showBack?: boolean;
  rightContent?: React.ReactNode;
}

export function MobileHeader({
  title,
  onMenuClick,
  onBackClick,
  showBack = false,
  rightContent,
}: MobileHeaderProps): React.ReactElement {
  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-card sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {showBack ? (
          <button
            onClick={onBackClick}
            className="p-2 -ml-2 hover:bg-muted rounded-lg"
          >
            <ChevronLeft size={20} />
          </button>
        ) : (
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 hover:bg-muted rounded-lg"
          >
            <Menu size={20} />
          </button>
        )}
        <h1 className="font-semibold truncate">{title}</h1>
      </div>
      {rightContent && <div className="flex items-center">{rightContent}</div>}
    </header>
  );
}

// Mobile sidebar overlay
interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function MobileSidebar({
  isOpen,
  onClose,
  children,
}: MobileSidebarProps): React.ReactElement | null {
  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Sidebar */}
      <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-card border-r border-border animate-in slide-in-from-left duration-200">
        <div className="flex items-center justify-between h-14 px-4 border-b border-border">
          <span className="font-semibold">Menu</span>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-3.5rem)]">{children}</div>
      </div>
    </div>
  );
}

// Mobile bottom navigation
interface BottomNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface MobileBottomNavProps {
  items?: BottomNavItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
}

export function MobileBottomNav({
  items = [
    { id: "chat", label: "Chat", icon: <MessageSquare size={20} /> },
    { id: "documents", label: "Docs", icon: <FileText size={20} /> },
    { id: "settings", label: "Settings", icon: <Settings size={20} /> },
  ],
  activeId = "chat",
  onSelect,
}: MobileBottomNavProps): React.ReactElement {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-30 pb-safe">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect?.(item.id)}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            activeId === item.id
              ? "text-nexus-500"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {item.icon}
          <span className="text-xs">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

// Responsive container that switches between mobile and desktop layouts
interface ResponsiveLayoutProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  sidebarWidth?: number;
}

export function ResponsiveLayout({
  sidebar,
  main,
  sidebarWidth = 280,
}: ResponsiveLayoutProps): React.ReactElement {
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen">
        <MobileSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        >
          {sidebar}
        </MobileSidebar>
        <div className="flex-1 overflow-hidden">{main}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <div
        className="border-r border-border overflow-hidden"
        style={{ width: sidebarWidth }}
      >
        {sidebar}
      </div>
      <div className="flex-1 overflow-hidden">{main}</div>
    </div>
  );
}

// Touch-friendly swipe gesture hook
interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export function useSwipeGesture(
  handlers: SwipeHandlers,
  threshold = 50,
): {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
} {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null,
  );

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    });
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart) return;

      const touchEnd = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
      };

      const deltaX = touchEnd.x - touchStart.x;
      const deltaY = touchEnd.y - touchStart.y;

      // Determine dominant direction
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > threshold) {
          handlers.onSwipeRight?.();
        } else if (deltaX < -threshold) {
          handlers.onSwipeLeft?.();
        }
      } else {
        if (deltaY > threshold) {
          handlers.onSwipeDown?.();
        } else if (deltaY < -threshold) {
          handlers.onSwipeUp?.();
        }
      }

      setTouchStart(null);
    },
    [touchStart, handlers, threshold],
  );

  return { onTouchStart, onTouchEnd };
}

// Pull to refresh hook
export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  threshold = 100,
): {
  pullDistance: number;
  isRefreshing: boolean;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
} {
  const [startY, setStartY] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
    }
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (startY === null || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, (currentY - startY) * 0.5);
      setPullDistance(Math.min(distance, threshold * 1.5));
    },
    [startY, isRefreshing, threshold],
  );

  const onTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    setStartY(null);
    setPullDistance(0);
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  return {
    pullDistance,
    isRefreshing,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
