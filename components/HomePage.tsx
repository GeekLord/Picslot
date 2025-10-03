/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { SparkleIcon, BrushIcon, MagicWandIcon, PortraitIcon, ExpandIcon, ThreeViewIcon, LayoutGridIcon, BookmarkIcon, CheckIcon, CompCardIcon } from './icons';

interface HomePageProps {
  onOpenAuthModal: (view: 'login' | 'register') => void;
}

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="bg-gray-800/40 p-6 rounded-xl border border-gray-700/50 flex flex-col items-start text-left transition-all duration-300 hover:border-blue-500/50 hover:bg-gray-800/80 hover:-translate-y-1">
    <div className="flex items-center justify-center w-12 h-12 bg-gray-700 rounded-lg mb-4 text-blue-400">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-gray-100 mb-2">{title}</h3>
    <p className="text-gray-400">{children}</p>
  </div>
);

const HomePage: React.FC<HomePageProps> = ({ onOpenAuthModal }) => {
  return (
    <div className="min-h-screen text-gray-100 flex flex-col">
      {/* Header */}
      <header className="w-full py-4 px-4 md:px-8 bg-transparent sticky top-0 z-50">
        <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <SparkleIcon className="w-7 h-7 text-blue-400" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-100">Picslot</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenAuthModal('login')}
              className="px-4 py-2 rounded-md text-sm font-semibold text-gray-300 hover:bg-gray-800/80 hover:text-white transition-colors"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => onOpenAuthModal('register')}
              className="px-4 py-2 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors"
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="text-center py-20 md:py-32 px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-100 animated-tagline">
              <span>Professional</span>{' '}
              <span>Photo</span>{' '}
              <span className="text-blue-400 animated-glow">Magic.</span>
              <br/>
              <span>Powered</span>{' '}
              <span>by</span>{' '}
              <span className="text-blue-400 animated-glow">AI.</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-gray-400">
              Retouch photos, apply creative filters, and make professional adjustments using simple text prompts. No complex tools needed.
            </p>
            <div className="mt-8">
              <button
                type="button"
                onClick={() => onOpenAuthModal('register')}
                className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-8 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95"
              >
                Get Started for Free
              </button>
            </div>
          </div>
        </section>

        {/* Feature Highlights Section */}
        <section className="py-20 md:py-24 px-4 bg-gray-900/40 border-y border-gray-700/50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-100">Unleash Your Creativity</h2>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-400">
                From simple touch-ups to complex transformations, Picslot's AI-powered tools make it easy.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard icon={<BrushIcon className="w-6 h-6" />} title="Generative Inpainting">
                Paint over any part of an image to seamlessly add, remove, or replace elements with pinpoint accuracy.
              </FeatureCard>
              <FeatureCard icon={<MagicWandIcon className="w-6 h-6" />} title="One-Click Restoration">
                Instantly Auto Enhance, Remove Backgrounds, or Restore old and damaged photos to pristine condition.
              </FeatureCard>
              <FeatureCard icon={<PortraitIcon className="w-6 h-6" />} title="AI Studio Portraits">
                Transform any casual photo into a professional, forward-facing headshot with a clean studio background.
              </FeatureCard>
              <FeatureCard icon={<ExpandIcon className="w-6 h-6" />} title="Magic Scene Expansion">
                Intelligently expand your photos beyond their original borders, creating a wider, more complete scene.
              </FeatureCard>
              <FeatureCard icon={<ThreeViewIcon className="w-6 h-6" />} title="Character Turnarounds">
                Create a technical three-view (front, side, back) reference sheet, perfect for character design or fashion.
              </FeatureCard>
              <FeatureCard icon={<CompCardIcon className="w-6 h-6" />} title="Modeling Comp Cards">
                 Generate a professional, multi-pose modeling composite card, complete with estimated stats.
              </FeatureCard>
            </div>
          </div>
        </section>
        
        {/* Project Manager Section */}
        <section className="py-20 md:py-24 px-4">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-100">Your Workflow, In The Cloud.</h2>
              <p className="mt-4 text-lg text-gray-400">
                Never lose your progress again. Picslot's robust project manager keeps your creative work safe, organized, and accessible from anywhere.
              </p>
              <ul className="mt-8 space-y-4 text-left">
                <li className="flex items-start gap-3">
                  <CheckIcon className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-white">Cloud-Based Projects</h4>
                    <p className="text-gray-400">Save your editing sessions to the cloud and pick up right where you left off, on any device.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckIcon className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-white">Non-Destructive History</h4>
                    <p className="text-gray-400">Your entire edit history is saved with each project, allowing for full undo/redo capabilities across sessions.</p>
                  </div>
                </li>
                 <li className="flex items-start gap-3">
                  <CheckIcon className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-white">Version Snapshots</h4>
                    <p className="text-gray-400">Create named "snapshots" of your project at any point to easily compare versions and restore previous states.</p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="flex items-center justify-center p-8">
                <LayoutGridIcon className="w-64 h-64 text-gray-700/50" />
            </div>
          </div>
        </section>

        {/* Prompt Manager Section */}
        <section className="py-20 md:py-24 px-4 bg-gray-900/40">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="flex items-center justify-center p-8 lg:order-last">
                 <BookmarkIcon className="w-64 h-64 text-gray-700/50" />
            </div>
            <div className="text-center lg:text-left">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-100">Your Prompt Powerhouse.</h2>
              <p className="mt-4 text-lg text-gray-400">
                Stop guessing and start creating with precision. The Prompt Manager is your central hub to save, enhance, and deploy the perfect prompt, every time.
              </p>
              <ul className="mt-8 space-y-4 text-left">
                <li className="flex items-start gap-3">
                  <CheckIcon className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-white">Build Your Library</h4>
                    <p className="text-gray-400">Catalog your most effective prompts in a personal, searchable library. Achieve consistent results by deploying your best ideas with a single click.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckIcon className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-white">Refine with AI</h4>
                    <p className="text-gray-400">Transform basic prompts into richly detailed, professional directives. Our AI Enhancer adds camera settings, lighting styles, and artistic nuances for superior results.</p>
                  </div>
                </li>
                 <li className="flex items-start gap-3">
                  <CheckIcon className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-white">Collaborate & Organize</h4>
                    <p className="text-gray-400">Keep your library tidy with AI-generated titles, and share your most innovative prompts directly with other users to collaborate and inspire.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>


        {/* How It Works Section */}
        <section className="py-20 md:py-24 px-4">
            <div className="max-w-4xl mx-auto text-center">
                 <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-100">Simple, Powerful, Fast.</h2>
                 <p className="mt-4 text-lg text-gray-400">Get stunning results in three easy steps.</p>
                 <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                    <div className="relative">
                        <div className="absolute -left-4 top-1 text-5xl font-bold text-gray-700/80">01</div>
                        <h3 className="text-2xl font-bold text-white mb-2 ml-10">Upload</h3>
                        <p className="text-gray-400 ml-10">Start with any image from your device. Drag and drop, paste from your clipboard, or select a file.</p>
                    </div>
                     <div className="relative">
                        <div className="absolute -left-4 top-1 text-5xl font-bold text-gray-700/80">02</div>
                        <h3 className="text-2xl font-bold text-white mb-2 ml-10">Describe</h3>
                        <p className="text-gray-400 ml-10">Use simple words or our one-click tools to describe the edit you want. No technical skills required.</p>
                    </div>
                     <div className="relative">
                        <div className="absolute -left-4 top-1 text-5xl font-bold text-gray-700/80">03</div>
                        <h3 className="text-2xl font-bold text-white mb-2 ml-10">Create</h3>
                        <p className="text-gray-400 ml-10">Let our advanced AI bring your vision to life in seconds, delivering professional-quality results.</p>
                    </div>
                 </div>
            </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 md:py-24 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white">Join Thousands of Creators</h2>
            <p className="mt-4 text-lg text-gray-400">
              Sign up today and start creating stunning images for free.
            </p>
            <div className="mt-8">
              <button
                type="button"
                onClick={() => onOpenAuthModal('register')}
                className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-8 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95"
              >
                Sign Up Now
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 px-4 md:px-8 border-t border-gray-700/50">
        <div className="max-w-7xl mx-auto text-center text-gray-500">
          <p>&copy; {new Date().getFullYear()} Picslot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;