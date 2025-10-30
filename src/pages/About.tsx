import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Brain, Zap, FileCheck, Users } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ElementType } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';

gsap.registerPlugin(ScrollTrigger);

const About = () => {
  const missionRef = useRef<HTMLDivElement>(null);
  const processRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Mission statement animation
    if (missionRef.current) {
      gsap.fromTo(
        missionRef.current,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: missionRef.current,
            start: 'top bottom-=100',
            toggleActions: 'play none none none',
          },
        }
      );
    }

    // Process cards animation
    if (processRef.current) {
      const cards = processRef.current.querySelectorAll('.process-card');
      gsap.fromTo(
        cards,
        { opacity: 0, y: 60 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: processRef.current,
            start: 'top bottom-=150',
            toggleActions: 'play none none none',
          },
        }
      );
    }

    // Parallax effect
    if (parallaxRef.current) {
      gsap.to(parallaxRef.current, {
        backgroundPosition: '50% 100%',
        ease: 'none',
        scrollTrigger: {
          trigger: parallaxRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    }
  }, []);

  const teamMembers = [
    { name: 'Saoud Ahmed', id: 'i222467', icon: Users },
    { name: 'Abdullah Illyas', id: 'i222512', icon: Brain },
    { name: 'Muhammad Usman', id: 'i222618', icon: Zap },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Mission Statement */}
        <section className="container mx-auto px-4 py-20">
          <div
            ref={missionRef}
            className="max-w-4xl mx-auto text-center bg-gradient-to-br from-primary/10 to-secondary/10 p-12 rounded-xl border border-primary/20"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Our Mission</h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              At AuTest, we believe that every app review contains valuable insights waiting to be discovered. 
              Our mission is to empower developers and product teams with AI-driven tools that transform raw 
              feedback into actionable intelligence, helping you build better products faster.
            </p>
          </div>
        </section>

        {/* Our Process */}
        <section ref={processRef} className="border-t border-border bg-card/50 py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="process-card bg-card border-2 border-primary/50 p-8 rounded-lg text-center hover:border-primary transition-all hover:shadow-xl hover:shadow-primary/20">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="text-primary" size={32} />
                </div>
                <h3 className="text-xl font-bold mb-3">1. Scrape Reviews</h3>
                <p className="text-muted-foreground">
                  Automatically collect reviews from app stores using our intelligent scraping engine
                </p>
              </div>

              <div className="process-card bg-card border-2 border-secondary/50 p-8 rounded-lg text-center hover:border-secondary transition-all hover:shadow-xl hover:shadow-secondary/20">
                <div className="bg-secondary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="text-secondary" size={32} />
                </div>
                <h3 className="text-xl font-bold mb-3">2. Analyze with AI</h3>
                <p className="text-muted-foreground">
                  Our AI processes sentiment, categorizes feedback, and identifies key patterns
                </p>
              </div>

              <div className="process-card bg-card border-2 border-accent/50 p-8 rounded-lg text-center hover:border-accent transition-all hover:shadow-xl hover:shadow-accent/20">
                <div className="bg-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileCheck className="text-accent" size={32} />
                </div>
                <h3 className="text-xl font-bold mb-3">3. Generate Insights</h3>
                <p className="text-muted-foreground">
                  Receive actionable reports and test cases to improve your app
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Team Gallery (2x2 grid, 3 members with centered item on 2nd row) */}
        <section className="container mx-auto px-4 py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Meet Our Team</h2>

          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-3 gap-6 justify-items-center">
              {teamMembers.map((member) => {
                const Icon = member.icon as ElementType;
                return (
                    <div
                      key={member.name}
                      className="group relative bg-card border border-border w-80 h-56 flex items-center justify-center overflow-hidden"
                    >
                      <Icon size={56} className="text-primary" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors duration-300 flex items-center justify-center">
                      <div className="text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="text-white font-semibold text-lg">{member.name}</div>
                        <div className="text-white/80 text-sm mt-1">{member.id}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Parallax Section */}
        <section
          ref={parallaxRef}
          className="relative h-96 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 flex items-center justify-center"
          style={{ backgroundSize: '150%', backgroundPosition: '50% 0%' }}
        >
          <div className="relative z-10 text-center max-w-3xl px-4">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Building the Future of App Intelligence
            </h2>
            <p className="text-xl text-muted-foreground">
              Join thousands of developers who trust AuTest for their review analysis
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
