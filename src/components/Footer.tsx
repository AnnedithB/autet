import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Footer = () => {
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (footerRef.current) {
      // Ensure footer is visible immediately as a fallback (in case ScrollTrigger doesn't fire)
      footerRef.current.style.opacity = '1';

      // Animate into place without forcing an initial opacity of 0 so it never stays hidden
      gsap.to(footerRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: { trigger: footerRef.current, start: 'top bottom-=100', toggleActions: 'play none none none' }
      });
    }
  }, []);

  return (
  <footer ref={footerRef} className="border-t border-border bg-card w-full !block !relative z-50 !bottom-0 !mt-auto" style={{ position: 'relative', bottom: 0, display: 'block', opacity: 1 }}>
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">© 2025 AuTest. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
