import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Check } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';

gsap.registerPlugin(ScrollTrigger);

const Pricing = () => {
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Header animation
    if (headerRef.current) {
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: -50 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }
      );
    }

    // Pricing cards stagger
    if (cardsRef.current) {
      const cards = cardsRef.current.querySelectorAll('.pricing-card');
      gsap.fromTo(
        cards,
        { opacity: 0, y: 60 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: cardsRef.current,
            start: 'top bottom-=100',
            toggleActions: 'play none none none',
          },
        }
      );
    }

    // Testimonials animation
    if (testimonialsRef.current) {
      gsap.fromTo(
        testimonialsRef.current,
        { opacity: 0, scale: 0.9 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: testimonialsRef.current,
            start: 'top bottom-=100',
            toggleActions: 'play none none none',
          },
        }
      );
    }

    // CTA animation
    if (ctaRef.current) {
      gsap.fromTo(
        ctaRef.current,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: ctaRef.current,
            start: 'top bottom-=100',
            toggleActions: 'play none none none',
          },
        }
      );
    }
  }, []);

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: '/month',
      features: [
        'Up to 100 reviews/month',
        'Basic sentiment analysis',
        'Email support',
        '7-day data retention',
      ],
      cta: 'Get Started',
      highlight: false,
    },
    {
      name: 'Pro',
      price: '$15',
      period: '/month',
      features: [
        'Up to 10,000 reviews/month',
        'Advanced AI analysis',
        'Priority support',
        '90-day data retention',
        'Custom reports',
        'API access',
      ],
      cta: 'Start Pro Trial',
      highlight: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      features: [
        'Unlimited reviews',
        'Dedicated AI models',
        '24/7 phone support',
        'Unlimited data retention',
        'White-label options',
        'Custom integrations',
      ],
      cta: 'Contact Sales',
      highlight: false,
    },
  ];

  const testimonials = [
    {
      quote: 'AuTest transformed how we handle user feedback. We caught critical issues 3x faster.',
      author: 'Sarah M., Product Manager',
    },
    {
      quote: 'The AI insights are incredibly accurate. It\'s like having a data scientist on the team.',
      author: 'James K., Indie Developer',
    },
    {
      quote: 'ROI was immediate. We reduced our review analysis time from hours to minutes.',
      author: 'Lisa T., CTO',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Header */}
        <section ref={headerRef} className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free. Scale as you grow.
          </p>
        </section>

        {/* Pricing Cards */}
        <section ref={cardsRef} className="container mx-auto px-4 pb-20">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`pricing-card bg-card border-2 p-8 rounded-lg relative ${
                  plan.highlight
                    ? 'border-primary shadow-2xl shadow-primary/30 scale-105'
                    : 'border-border hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10'
                } transition-all`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-4">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="text-primary flex-shrink-0 mt-0.5" size={20} />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="block">
                  <Button
                    className={`w-full rounded-md ${
                      plan.highlight
                        ? 'bg-primary text-primary-foreground hover:bg-secondary'
                        : 'bg-card border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials Carousel */}
        <section ref={testimonialsRef} className="border-t border-border bg-card/50 py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              What Our Users Say
            </h2>
            <Swiper
              modules={[Autoplay]}
              spaceBetween={30}
              slidesPerView={1}
              autoplay={{ delay: 4000, disableOnInteraction: false }}
              breakpoints={{
                768: { slidesPerView: 2 },
                1024: { slidesPerView: 3 },
              }}
              className="max-w-6xl mx-auto"
            >
              {testimonials.map((testimonial, index) => (
                <SwiperSlide key={index}>
                  <div className="bg-card border border-primary/30 p-8 rounded-xl h-full hover:border-primary transition-colors">
                    <p className="text-lg mb-6 italic">"{testimonial.quote}"</p>
                    <p className="text-muted-foreground font-semibold">— {testimonial.author}</p>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container mx-auto px-4 py-20">
          <div
            ref={ctaRef}
            className="bg-gradient-to-r from-primary/20 to-secondary/20 p-12 rounded-xl text-center max-w-4xl mx-auto border border-primary/30"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of developers using AuTest today
            </p>
            <Link to="/register">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-secondary text-lg px-8 rounded-full hover:scale-110 transition-transform"
              >
                Try it Free
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
