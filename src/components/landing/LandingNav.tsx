'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useSpring } from 'motion/react';
import { BunMascot } from '@/components/ui/BunMascot';
import { PixelVines } from './PixelVines';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const NAV_LINKS = [
  { href: '/playground', label: 'Playground', isExternal: true },
  { href: '/studio', label: 'Studio', isExternal: true },
  { href: '#engine-showcase', label: 'Engine', sectionId: 'engine-showcase' },
  { href: '#features', label: 'Pillars', sectionId: 'features' },
  { href: '#gallery', label: 'Shelf', sectionId: 'gallery' },
  { href: '#story', label: 'Story', sectionId: 'story' },
];

export const LandingNav: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 240,
    damping: 30,
    restDelta: 0.001,
  });

  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');

  useEffect(() => {
    // 1. Passive scroll listener for header elevation only
    const handleScroll = () => {
      const scrolled = window.scrollY > 20;
      setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // 2. Zero-reflow IntersectionObserver for active section spying
    const sections = ['engine-showcase', 'features', 'gallery', 'story'];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: 0 }
    );

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-200 ${
        isScrolled
          ? 'bg-[var(--desk-surface)]/95 backdrop-blur-sm border-b-2 border-[var(--desk-border)] shadow-[0_4px_12px_rgba(0,0,0,0.4)]'
          : 'header-trim-bar'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 h-14 flex items-center justify-between relative">
        {/* Brand / Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[var(--text-heading)] hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0be7c] rounded-[2px]"
          aria-label="PixiBun Home"
        >
          <div className="w-8 h-8 flex items-center justify-center bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[2px] p-0.5 shadow-sm">
            <BunMascot size={22} animate />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display font-bold text-sm tracking-wider text-[var(--text-heading)]">
              PIXIBUN
            </span>
            <span className="text-[10px] font-mono tracking-tight text-[var(--accent-gold)]">
              ATELIER
            </span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Main Navigation">
          {NAV_LINKS.map((link) => {
            const isActive = link.sectionId && activeSection === link.sectionId;

            if (link.isExternal) {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs font-mono font-bold tracking-wide text-[var(--text-body)] hover:text-[var(--accent-gold)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0be7c] rounded-[2px]"
                >
                  {link.label}
                </Link>
              );
            }

            return (
              <a
                key={link.href}
                href={link.href}
                className={`relative px-2 py-1 text-xs font-mono font-bold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0be7c] rounded-[2px] flex items-center justify-center ${
                  isActive ? 'text-[var(--accent-gold)]' : 'text-[var(--text-body)] hover:text-[var(--accent-gold)]'
                }`}
              >
                <span>{link.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute -bottom-1 left-1.5 right-1.5 h-[2px] bg-[var(--accent-gold)] rounded-full shadow-[0_0_8px_rgba(240,190,124,0.6)]"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}
              </a>
            );
          })}
        </nav>

        {/* Action Button & Cute 16-Bit Theme Switcher */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          <Link
            href="/studio"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[2px] pixel-primary-btn text-xs font-display font-bold tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0be7c]"
          >
            <span>START DRAWING</span>
            <span className="text-[#140d1f] text-[10px]">✦</span>
          </Link>
        </div>
      </div>

      {/* Retro Phosphor Scroll Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--desk-border)]/40 overflow-hidden pointer-events-none z-50">
        <motion.div
          style={{ scaleX, transformOrigin: '0%' }}
          className="h-full w-full bg-gradient-to-r from-[#f0be7c] via-[#dcabdf] to-[#c792df] shadow-[0_0_6px_rgba(240,190,124,0.6)]"
        />
      </div>

      {/* Hanging Pixel Vines attached directly beneath the sticky top bar */}
      <PixelVines />
    </header>
  );
};
