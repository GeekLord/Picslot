/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef } from 'react';
import { SparkleIcon, BrushIcon, MagicWandIcon, PortraitIcon, ExpandIcon, ThreeViewIcon, LayoutGridIcon, BookmarkIcon, CheckIcon, CompCardIcon, XMarkIcon, Bars3Icon, ArrowRightIcon, UsersIcon, ChartBarIcon, RectangleStackIcon, SwitchHorizontalIcon, PhotoIcon, TicketIcon, ShoppingBagIcon, SwatchIcon, SunIcon, MoonIcon } from './icons';

interface HomePageProps {
  onOpenAuthModal: (view: 'login' | 'register') => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const NavLink: React.FC<{ href: string; children: React.ReactNode; isMobile?: boolean }> = ({ href, children, isMobile }) => (
    <a href={href} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${isMobile ? 'block text-base' : ''} text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white`}>
        {children}
    </a>
);

const FeatureHighlight: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode; }> = ({ icon, title, children }) => (
    <div className="flex flex-col items-center text-center">
        <div className="flex items-center justify-center w-12 h-12 bg-slate-200 dark:bg-slate-800/50 rounded-lg text-violet-500 mb-4">
            {icon}
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{children}</p>
    </div>
);


const HomePage: React.FC<HomePageProps> = ({ onOpenAuthModal, theme, onToggleTheme }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const heroGridRef = useRef<HTMLDivElement>(null);
    const scrollAnimRefs = useRef<(HTMLElement | null)[]>([]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!heroGridRef.current) return;
            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;
            const x = (clientX / innerWidth - 0.5) * 2;
            const y = (clientY / innerHeight - 0.5) * 2;

            const items = heroGridRef.current.querySelectorAll('.hero-grid-item');
            items.forEach((item, index) => {
                const depth = (index % 5) + 1;
                const moveX = -x * 10 * depth;
                const moveY = -y * 10 * depth;
                (item as HTMLElement).style.transform = `translate(${moveX}px, ${moveY}px)`;
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                    }
                });
            },
            { threshold: 0.1 }
        );

        scrollAnimRefs.current.forEach((ref) => {
            if (ref) observer.observe(ref);
        });

        return () => {
            scrollAnimRefs.current.forEach((ref) => {
                if (ref) observer.unobserve(ref);
            });
        };
    }, []);

    const addToScrollRefs = (el: HTMLElement | null) => {
        if (el && !scrollAnimRefs.current.includes(el)) {
            scrollAnimRefs.current.push(el);
        }
    };
    
    const navLinks = [
        { href: "#features", label: "Features" },
        { href: "#pricing", label: "Pricing" },
        { href: "#", label: "Community" },
        { href: "#", label: "Blog" },
    ];


  return (
    <div className="text-slate-900 dark:text-slate-50 font-sans overflow-x-hidden">
      {/* Header */}
      <header className="w-full py-4 px-4 md:px-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800/50">
        <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
          <a href="#" className="flex items-center gap-3">
            <SparkleIcon className="w-7 h-7 text-violet-500" />
            <h1 className="text-2xl font-bold tracking-tight">Picslot</h1>
          </a>
          <nav className="hidden lg:flex items-center gap-2">
            {navLinks.map(link => <NavLink key={link.href} href={link.href}>{link.label}</NavLink>)}
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={() => onOpenAuthModal('login')}
              className="hidden sm:block px-4 py-2 rounded-md text-sm font-semibold text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => onOpenAuthModal('register')}
              className="px-4 py-2 rounded-md text-sm font-semibold text-white bg-violet-500 hover:bg-violet-600 transition-colors flex items-center gap-2"
            >
              Get Started Free <ArrowRightIcon className="w-4 h-4" />
            </button>
            <div className="lg:hidden">
                <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                    <Bars3Icon className="w-6 h-6"/>
                </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Mobile Menu */}
      <div className={`fixed inset-0 bg-slate-50 dark:bg-slate-950 z-[100] p-4 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex justify-between items-center mb-8">
               <a href="#" className="flex items-center gap-3">
                    <SparkleIcon className="w-7 h-7 text-violet-500" />
                    <h1 className="text-2xl font-bold tracking-tight">Picslot</h1>
                </a>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                  <XMarkIcon className="w-7 h-7"/>
              </button>
          </div>
          <nav className="flex flex-col gap-4">
               {navLinks.map(link => <NavLink key={link.href} href={link.href} isMobile>{link.label}</NavLink>)}
          </nav>
      </div>

      <main>
        {/* Hero Section */}
        <section className="relative text-center py-20 md:py-32 px-4 overflow-hidden">
            <div className="absolute inset-0 z-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]">
                <div ref={heroGridRef} className="absolute inset-[-20px] grid grid-cols-6 grid-rows-6 gap-4 opacity-10 dark:opacity-20">
                    {[...Array(36)].map((_, i) => (
                        <div key={i} className="hero-grid-item bg-slate-300 dark:bg-slate-800/50 rounded-lg" style={{transitionDelay: `${i*10}ms`}}></div>
                    ))}
                </div>
            </div>
          <div className="relative max-w-4xl mx-auto z-10">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight animated-tagline">
              <span>Studio-Grade</span>{' '}
              <span className="text-violet-500 animated-glow">AI Editing,</span>
              <br/>
              <span>Right in Your</span>{' '}
              <span className="text-violet-500 animated-glow">Browser.</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-slate-600 dark:text-slate-400">
              Go from idea to professional-quality image faster than ever. Retouch photos, generate assets, and manage your entire creative workflow in the cloud. No downloads required.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => onOpenAuthModal('register')}
                className="w-full sm:w-auto bg-gradient-to-br from-violet-500 to-cyan-500 text-white font-bold py-4 px-8 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-violet-500/20 hover:shadow-xl hover:shadow-violet-500/40 hover:-translate-y-px active:scale-95"
              >
                Start Editing for Free
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-500">Free forever plan, no credit card required.</p>
          </div>
        </section>

        {/* Feature Highlights Section */}
        <section className="py-20 md:py-24 px-4" id="features">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16" ref={addToScrollRefs}>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight scroll-anim">A Complete Creative Suite</h2>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-600 dark:text-slate-400 scroll-anim" style={{transitionDelay: '100ms'}}>
                From one-click enhancements to advanced multi-image compositions, Picslot is more than just an editor—it's your AI creative partner.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div ref={addToScrollRefs} className="scroll-anim" style={{transitionDelay: '0ms'}}><FeatureHighlight icon={<MagicWandIcon className="w-6 h-6"/>} title="One-Click Tools">Instantly restore photos, remove backgrounds, create studio portraits, and more.</FeatureHighlight></div>
                <div ref={addToScrollRefs} className="scroll-anim" style={{transitionDelay: '100ms'}}><FeatureHighlight icon={<RectangleStackIcon className="w-6 h-6"/>} title="Creative Studios">Generate images, thumbnails, and composite scenes in dedicated workspaces.</FeatureHighlight></div>
                <div ref={addToScrollRefs} className="scroll-anim" style={{transitionDelay: '200ms'}}><FeatureHighlight icon={<LayoutGridIcon className="w-6 h-6"/>} title="Cloud Projects">Save your entire non-destructive edit history to the cloud and never lose your work.</FeatureHighlight></div>
                <div ref={addToScrollRefs} className="scroll-anim" style={{transitionDelay: '300ms'}}><FeatureHighlight icon={<UsersIcon className="w-6 h-6"/>} title="Team Ready">Scale your workflow with shared asset libraries, projects, and centralized billing.</FeatureHighlight></div>
            </div>
          </div>
        </section>
        
        {/* Pricing Section */}
        <section id="pricing" className="py-20 md:py-24 px-4 bg-slate-100 dark:bg-slate-900/40">
            <div className="max-w-7xl mx-auto text-center" ref={addToScrollRefs}>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight scroll-anim">Powerful, Fair Pricing</h2>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-600 dark:text-slate-400 scroll-anim" style={{transitionDelay: '100ms'}}>
                    Start for free, and scale as you grow. Choose the plan that fits your creative needs.
                </p>

                <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {/* Free Tier */}
                    <div ref={addToScrollRefs} className="scroll-anim glass-card p-8 rounded-2xl flex flex-col text-left">
                        <h3 className="text-2xl font-bold">Free</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">Perfect for getting started and casual use.</p>
                        <p className="text-4xl font-extrabold mt-6">$0<span className="text-lg font-medium text-slate-500 dark:text-slate-400">/mo</span></p>
                        <ul className="space-y-4 mt-8 text-slate-600 dark:text-slate-300 flex-grow">
                            <li className="flex items-center gap-3"><CheckIcon className="w-5 h-5 text-green-500"/>10 AI Credits / month</li>
                            <li className="flex items-center gap-3"><CheckIcon className="w-5 h-5 text-green-500"/>Core AI Editing Tools</li>
                            <li className="flex items-center gap-3"><CheckIcon className="w-5 h-5 text-green-500"/>Cloud Project Storage</li>
                            <li className="flex items-center gap-3"><CheckIcon className="w-5 h-5 text-green-500"/>Standard Resolution Exports</li>
                        </ul>
                        <button onClick={() => onOpenAuthModal('register')} className="w-full mt-8 bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-200 dark:hover:bg-slate-300 dark:text-slate-900 font-bold py-3 px-6 rounded-lg transition-colors">Get Started Free</button>
                    </div>
                    {/* Pro Tier */}
                    <div ref={addToScrollRefs} className="scroll-anim glass-card p-8 rounded-2xl flex flex-col text-left border-2 border-violet-500 relative" style={{transitionDelay: '200ms'}}>
                        <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-violet-500 text-white text-xs font-bold uppercase px-3 py-1 rounded-full">Most Popular</div>
                        <h3 className="text-2xl font-bold text-violet-500 dark:text-violet-400">Pro</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">For professionals and power users.</p>
                        <p className="text-4xl font-extrabold mt-6">$15<span className="text-lg font-medium text-slate-500 dark:text-slate-400">/mo</span></p>
                        <ul className="space-y-4 mt-8 text-slate-600 dark:text-slate-300 flex-grow">
                            <li className="flex items-center gap-3"><CheckIcon className="w-5 h-5 text-green-500"/>500 AI Credits / month</li>
                            <li className="flex items-center gap-3"><CheckIcon className="w-5 h-5 text-green-500"/>All Core AI Tools</li>
                            <li className="flex items-center gap-3"><CheckIcon className="w-5 h-5 text-green-500"/>Access to All Creative Studios</li>
                            <li className="flex items-center gap-3"><CheckIcon className="w-5 h-5 text-green-500"/>High-Resolution Exports</li>
                            <li className="flex items-center gap-3"><CheckIcon className="w-5 h-5 text-green-500"/>No Watermarks</li>
                            <li className="flex items-center gap-3"><CheckIcon className="w-5 h-5 text-green-500"/>Prompt & Asset Libraries</li>
                        </ul>
                        <button onClick={() => onOpenAuthModal('register')} className="w-full mt-8 bg-violet-500 hover:bg-violet-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">Upgrade to Pro</button>
                    </div>
                    {/* Teams Tier */}
                    <div ref={addToScrollRefs} className="scroll-anim glass-card p-8 rounded-2xl flex flex-col text-left" style={{transitionDelay: '400ms'}}>
                        <h3 className="text-2xl font-bold">Teams</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">For collaborative creative workflows.</p>
                        <p className="text-4xl font-extrabold mt-6">Custom</p>
                        <ul className="space-y-4 mt-8 text-slate-600 dark:text-slate-300 flex-grow">
                            <li className="flex items-center gap-3"><CheckIcon className="w-5 h-5 text-green-500"/>Custom Credit Allowances</li>
                            <li className="flex items-center gap-3"><CheckIcon className="w-5 h-5 text-green-500"/>Everything in Pro, plus:</li>
                            <li className="flex items-center gap-3"><CheckIcon className="w-5 h-5 text-green-500"/>Shared Workspaces & Projects</li>
                            <li className="flex items-center gap-3"><CheckIcon className="w-5 h-5 text-green-500"/>Centralized Billing</li>
                            <li className="flex items-center gap-3"><CheckIcon className="w-5 h-5 text-green-500"/>Role-Based Access Control</li>
                            <li className="flex items-center gap-3"><CheckIcon className="w-5 h-5 text-green-500"/>Priority Support</li>
                        </ul>
                        <button onClick={() => {}} className="w-full mt-8 bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-200 dark:hover:bg-slate-300 dark:text-slate-900 font-bold py-3 px-6 rounded-lg transition-colors">Contact Sales</button>
                    </div>
                </div>
            </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 md:py-32 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-extrabold">Ready to Transform Your Workflow?</h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              Sign up today and experience the future of creative editing. Your first 10 credits are on us.
            </p>
            <div className="mt-8">
              <button
                type="button"
                onClick={() => onOpenAuthModal('register')}
                className="bg-gradient-to-br from-violet-500 to-cyan-500 text-white font-bold py-4 px-8 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-violet-500/20 hover:shadow-xl hover:shadow-violet-500/40 hover:-translate-y-px active:scale-95"
              >
                Sign Up & Start Creating
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-16 px-4 md:px-8 border-t border-slate-200 dark:border-slate-800/50 bg-slate-100 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 text-left">
            <div className="col-span-2 lg:col-span-1">
                 <div className="flex items-center gap-3 mb-4">
                    <SparkleIcon className="w-7 h-7 text-violet-500" />
                    <h1 className="text-2xl font-bold tracking-tight">Picslot</h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">The all-in-one AI creative suite.</p>
            </div>
            <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Product</h4>
                <ul className="space-y-3 text-slate-500 dark:text-slate-400">
                    <li><a href="#features" className="hover:text-slate-900 dark:hover:text-white">Features</a></li>
                    <li><a href="#pricing" className="hover:text-slate-900 dark:hover:text-white">Pricing</a></li>
                    <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Changelog</a></li>
                </ul>
            </div>
            <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Company</h4>
                <ul className="space-y-3 text-slate-500 dark:text-slate-400">
                    <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">About Us</a></li>
                    <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Contact</a></li>
                    <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Blog</a></li>
                </ul>
            </div>
             <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Resources</h4>
                <ul className="space-y-3 text-slate-500 dark:text-slate-400">
                    <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Help Center</a></li>
                    <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Community</a></li>
                    <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">API Docs</a></li>
                </ul>
            </div>
            <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Legal</h4>
                <ul className="space-y-3 text-slate-500 dark:text-slate-400">
                    <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Terms of Service</a></li>
                    <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Privacy Policy</a></li>
                </ul>
            </div>
        </div>
        <div className="mt-16 border-t border-slate-200 dark:border-slate-800/50 pt-8 text-center text-slate-500 dark:text-slate-500">
            <p>&copy; {new Date().getFullYear()} Picslot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;