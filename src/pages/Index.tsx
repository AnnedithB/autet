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

  useEffect(() => {
    if (heroRef.current) {
      gsap.fromTo(heroRef.current.children, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.2, ease: 'power2.out' });
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
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background/50"></div>
            <div className="h-full w-full">
              <div className="h-full w-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center blur-3xl transform scale-110">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.15)_0%,transparent_70%)]"></div>
              </div>
            </div>
          </div>
          
          <div className="relative z-10 flex items-center min-h-[calc(100vh-4rem)]">
            <div className="container mx-auto px-6">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-4xl md:text-6xl font-bold mb-6">Transform App Reviews into <span className="text-primary bg-clip-text bg-gradient-to-r from-primary to-secondary">Actionable Insights</span></h1>
                <p className="text-xl text-muted-foreground mb-8">Scrape, analyze, and test your app feedback — powered by AI automation</p>
                <div className="flex gap-6 justify-center">
                  <Link to="/register">
                    <Button size="lg" className="bg-primary hover:bg-secondary rounded-full px-8 shadow-lg shadow-primary/25 hover:shadow-secondary/25 transition-all">
                      Get Started
                    </Button>
                  </Link>
                  <Link to="/about">
                    <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-full px-8 transition-all">
                      Learn More
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section ref={featuresRef} className="border-t border-border bg-card/50 py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-16">Powerful Features</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="feature-card bg-card border-2 border-primary/50 p-8 rounded-lg hover:border-primary transition-all hover:shadow-xl">
                <Brain className="text-primary mb-4" size={40} />
                <h3 className="text-xl font-semibold mb-3">AI Review Scraping</h3>
                <p className="text-muted-foreground">Automatically collect and process app reviews</p>
              </div>
              <div className="feature-card bg-card border-2 border-secondary/50 p-8 rounded-lg hover:border-secondary transition-all hover:shadow-xl">
                <Zap className="text-secondary mb-4" size={40} />
                <h3 className="text-xl font-semibold mb-3">Smart Dashboard</h3>
                <p className="text-muted-foreground">Visualize insights in real-time</p>
              </div>
              <div className="feature-card bg-card border-2 border-accent/50 p-8 rounded-lg hover:border-accent transition-all hover:shadow-xl">
                <Lock className="text-accent mb-4" size={40} />
                <h3 className="text-xl font-semibold mb-3">Secure Authentication</h3>
                <p className="text-muted-foreground">Enterprise-grade security</p>
              </div>
              <div className="feature-card bg-card border-2 border-primary/50 p-8 rounded-lg hover:border-primary transition-all hover:shadow-xl">
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
