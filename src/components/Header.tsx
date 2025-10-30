import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const Header = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(headerRef.current, { y: -100, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' });
    }
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header ref={headerRef} className="border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-primary">AuTest</Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className={`hover:text-primary transition-colors ${isActive('/') ? 'text-primary' : 'text-foreground'}`}>Home</Link>
          <Link to="/about" className={`hover:text-primary transition-colors ${isActive('/about') ? 'text-primary' : 'text-foreground'}`}>About</Link>
          <Link to="/pricing" className={`hover:text-primary transition-colors ${isActive('/pricing') ? 'text-primary' : 'text-foreground'}`}>Pricing</Link>
          {user ? (
            <>
              <Link to="/dashboard" className={`hover:text-primary transition-colors ${isActive('/dashboard') ? 'text-primary' : 'text-foreground'}`}>Dashboard</Link>
              <Button onClick={signOut} variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-md">Logout</Button>
            </>
          ) : (
            <>
              <Link to="/login"><Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-md">Login</Button></Link>
              <Link to="/register"><Button className="bg-primary text-primary-foreground hover:bg-secondary rounded-md">Register</Button></Link>
            </>
          )}
        </nav>
        <button className="md:hidden text-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-border bg-card px-4 py-4 space-y-4">
          <Link to="/" className="block hover:text-primary" onClick={() => setMobileMenuOpen(false)}>Home</Link>
          <Link to="/about" className="block hover:text-primary" onClick={() => setMobileMenuOpen(false)}>About</Link>
          <Link to="/pricing" className="block hover:text-primary" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
          {user ? (
            <>
              <Link to="/dashboard" className="block hover:text-primary" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
              <Button onClick={() => { signOut(); setMobileMenuOpen(false); }} variant="outline" className="w-full rounded-md">Logout</Button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}><Button variant="outline" className="w-full rounded-md">Login</Button></Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)}><Button className="w-full rounded-md">Register</Button></Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
};

export default Header;
