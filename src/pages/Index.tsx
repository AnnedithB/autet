import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Brain, Database, Lock, Zap } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

gsap.registerPlugin(ScrollTrigger);

const Index = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const twinklePattern = encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'>
      <rect width='240' height='240' fill='transparent'/>
      <g fill='rgba(255,255,255,0.35)'>
        <circle cx='32' cy='48' r='1.6'/>
        <circle cx='120' cy='12' r='1.2'/>
        <circle cx='210' cy='60' r='1.4'/>
        <circle cx='60' cy='160' r='1.1'/>
        <circle cx='170' cy='190' r='1.3'/>
        <circle cx='24' cy='196' r='1.2'/>
        <circle cx='200' cy='120' r='1.5'/>
      </g>
      <g fill='rgba(255,255,255,0.18)'>
        <circle cx='90' cy='90' r='0.9'/>
        <circle cx='140' cy='40' r='0.8'/>
        <circle cx='190' cy='170' r='0.8'/>
        <circle cx='45' cy='120' r='0.7'/>
      </g>
    </svg>
  `);
  const starFieldBackground = `url("data:image/svg+xml,${twinklePattern}")`;

  useEffect(() => {
    if (heroRef.current) {
      const heroElements = heroRef.current.querySelectorAll('[data-animate="hero"]');
      gsap.fromTo(heroElements, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.2, ease: 'power2.out' });
    }
    if (featuresRef.current) {
      gsap.fromTo(featuresRef.current.querySelectorAll('.feature-card'), { opacity: 0, y: 60 }, {
        opacity: 1, y: 0, duration: 0.6, stagger: 0.15, ease: 'power2.out',
        scrollTrigger: { trigger: featuresRef.current, start: 'top bottom-=100' }
      });
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col !flex !min-h-screen" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main className="flex-1 !flex-1" style={{ flex: '1 0 auto' }}>
        <section ref={heroRef} className="min-h-[calc(100vh-4rem)] relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-br from-background via-[#0b1920] to-background animate-gradient-slow" />
            <div className="absolute inset-0 opacity-40 mix-blend-screen" style={{ backgroundImage: starFieldBackground, backgroundSize: '320px 320px' }} />
            <div className="pointer-events-none absolute -top-56 -left-12 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.45),transparent_70%)] blur-[120px] opacity-70 animate-orbit" />
            <div className="pointer-events-none absolute bottom-[-45%] right-[-20%] h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(var(--secondary-rgb),0.35),transparent_70%)] blur-[140px] opacity-60 animate-orbit-slow" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12)_0%,transparent_65%)] opacity-30 animate-twinkle" />
          </div>

          <div className="relative z-10 flex items-center min-h-[calc(100vh-4rem)]">
            <div className="container mx-auto px-6">
              <div className="max-w-5xl mx-auto text-center space-y-10">
                <div data-animate="hero" className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-primary-foreground/80 backdrop-blur-sm">
                  <span className="inline-block h-2 w-2 rounded-full bg-primary animate-ping-once" />
                  <span className="uppercase tracking-[0.3em] text-xs text-primary/80">New</span>
                  <span className="text-primary/90">AI-powered test flows now live</span>
                </div>

                <h1 data-animate="hero" className="text-4xl md:text-6xl font-bold leading-tight">
                  Transform App Reviews into
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-primary/80">
                    Galactic-Scale Insights
                  </span>
                </h1>

                <p data-animate="hero" className="mx-auto max-w-2xl text-xl text-muted-foreground/90">
                  Scrape, analyze, and generate automated tests from every piece of feedback.
                  Harness our AI constellations to illuminate exactly what users need next.
                </p>

                <div data-animate="hero" className="flex flex-wrap gap-4 justify-center">
                  <Link to="/register">
                    <Button size="lg" className="bg-primary hover:bg-secondary rounded-full px-8 shadow-lg shadow-primary/25 hover:shadow-secondary/25 transition-all">
                      Start for Free
                    </Button>
                  </Link>
                  <Link to="/about">
                    <Button size="lg" variant="outline" className="border-primary/60 text-primary hover:bg-primary hover:text-primary-foreground rounded-full px-8 transition-all">
                      Explore Platform
                    </Button>
                  </Link>
                </div>

                <div data-animate="hero" className="grid gap-4 sm:grid-cols-3">
                  {[
                    { title: '1.2M+', caption: 'Reviews parsed by AuTest' },
                    { title: '87%', caption: 'Regression bugs caught pre-release' },
                    { title: '15 min', caption: 'Average test suite generation' }
                  ].map((item) => (
                    <div key={item.caption} className="rounded-2xl border border-primary/15 bg-white/5 px-6 py-6 text-left backdrop-blur-sm shadow-lg shadow-primary/5 holo-card">
                      <p className="text-3xl font-semibold text-primary">{item.title}</p>
                      <p className="mt-2 text-sm uppercase tracking-[0.2em] text-muted-foreground/80">{item.caption}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section ref={featuresRef} className="border-t border-border bg-card/50 py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-16">Powerful Features</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="feature-card bg-card border-2 border-primary/50 p-8 rounded-lg transition-all hover:shadow-xl holo-card">
                <Brain className="text-primary mb-4" size={40} />
                <h3 className="text-xl font-semibold mb-3">AI Review Scraping</h3>
                <p className="text-muted-foreground">Automatically collect and process app reviews</p>
              </div>
              <div className="feature-card bg-card border-2 border-secondary/50 p-8 rounded-lg transition-all hover:shadow-xl holo-card">
                <Zap className="text-secondary mb-4" size={40} />
                <h3 className="text-xl font-semibold mb-3">Smart Dashboard</h3>
                <p className="text-muted-foreground">Visualize insights in real-time</p>
              </div>
              <div className="feature-card bg-card border-2 border-accent/50 p-8 rounded-lg transition-all hover:shadow-xl holo-card">
                <Lock className="text-accent mb-4" size={40} />
                <h3 className="text-xl font-semibold mb-3">Secure Authentication</h3>
                <p className="text-muted-foreground">Enterprise-grade security</p>
              </div>
              <div className="feature-card bg-card border-2 border-primary/50 p-8 rounded-lg transition-all hover:shadow-xl holo-card">
                <Database className="text-primary mb-4" size={40} />
                <h3 className="text-xl font-semibold mb-3">Future Ready</h3>
                <p className="text-muted-foreground">Built to scale with your needs</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border py-32">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-4xl mx-auto bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 p-16 rounded-2xl border border-primary/20 shadow-lg shadow-primary/5">
              <h2 className="text-4xl md:text-5xl font-bold mb-8">Start your AI-driven testing journey today</h2>
              <p className="text-xl text-muted-foreground mb-10">Join thousands of developers revolutionizing their testing workflow</p>
              <Link to="/register">
                <Button size="lg" className="bg-primary hover:bg-secondary rounded-full px-12 py-6 text-lg shadow-lg shadow-primary/25 hover:shadow-secondary/25 transition-all">
                  Join Free
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
