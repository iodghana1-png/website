"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";

export type HeroSlide = {
  id: string;
  imageUrl: string;
  alt: string;
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  feature: string;
};

const fallbackSlides: HeroSlide[] = [
  {
    id: "better-boards",
    imageUrl: "/images/leadership-forum.png",
    alt: "Ghanaian executives connecting at a leadership forum",
    eyebrow: "Institute of Directors Ghana",
    title: "Better boards. Better governance.",
    description: "Developing directors and leaders for a stronger Ghana.",
    primaryLabel: "Become a member",
    primaryHref: "/membership/apply",
    secondaryLabel: "Explore training",
    secondaryHref: "/training",
    feature: "National Corporate Governance Conference",
  },
  {
    id: "directors-ready",
    imageUrl: "/images/leadership-director.png",
    alt: "Ghanaian director reviewing board documents",
    eyebrow: "Professional development",
    title: "Directors ready to lead.",
    description: "Practical programmes for sharper judgement, stronger challenge and greater boardroom impact.",
    primaryLabel: "Explore programmes",
    primaryHref: "/training",
    secondaryLabel: "View CPD",
    secondaryHref: "/training/cpd",
    feature: "Learning for the work that matters",
  },
  {
    id: "governance-trust",
    imageUrl: "/images/board-meeting.png",
    alt: "Ghanaian board members in a focused meeting",
    eyebrow: "Governance in practice",
    title: "Governance that creates trust.",
    description: "Independent perspective and practical support for organisations that expect more from their boards.",
    primaryLabel: "Explore services",
    primaryHref: "/services",
    secondaryLabel: "Our approach",
    secondaryHref: "/about",
    feature: "Better boards start with better dialogue",
  },
];

export function HeroCarousel({ slides = fallbackSlides }: { slides?: HeroSlide[] }) {
  const [current, setCurrent] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion || slides.length < 2) return;
    const timer = window.setInterval(() => setCurrent((index) => (index + 1) % slides.length), 7200);
    return () => window.clearInterval(timer);
  }, [reducedMotion, slides.length]);

  if (!slides.length) return null;

  const currentIndex = Math.min(current, slides.length - 1);
  const previous = () => setCurrent((currentIndex - 1 + slides.length) % slides.length);
  const next = () => setCurrent((currentIndex + 1) % slides.length);

  return (
    <section className="relative isolate min-h-[565px] overflow-hidden bg-[var(--color-ink)] text-white sm:min-h-[605px]" aria-roledescription="carousel" aria-label="IoD-Gh highlights">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          role="img"
          aria-label={index === currentIndex ? slide.alt : undefined}
          className={`absolute inset-0 -z-20 bg-cover bg-center transition-[opacity,transform] duration-1000 ease-in-out motion-reduce:transition-none ${index === currentIndex ? "hero-image-motion opacity-100" : "scale-[1.025] opacity-0"}`}
          style={{ backgroundImage: `url("${slide.imageUrl}")` }}
        />
      ))}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(39,27,84,0.97)_0%,rgba(39,27,84,0.86)_38%,rgba(39,27,84,0.34)_70%,rgba(39,27,84,0.18)_100%)] sm:bg-[linear-gradient(90deg,rgba(39,27,84,0.95)_0%,rgba(39,27,84,0.8)_42%,rgba(39,27,84,0.12)_76%)]" />
      <div className="site-container flex min-h-[565px] flex-col pb-8 pt-24 sm:min-h-[605px] sm:pb-10 sm:pt-28 lg:pt-32">
        <div className="flex flex-1 items-center py-6 sm:py-8">
          <div className="relative min-h-[270px] w-full sm:min-h-[290px]">
            {slides.map((slide, index) => (
              <div key={slide.id} className={`absolute inset-0 max-w-2xl transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ${index === currentIndex ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`} aria-hidden={index !== currentIndex}>
                <p className="eyebrow text-[var(--color-accent-light)]">{slide.eyebrow}</p>
                <h1 className="mt-5 max-w-[15ch] font-serif text-[clamp(2.7rem,4.6vw,4.9rem)] font-semibold leading-[0.98] tracking-[-0.052em] text-white">{slide.title}</h1>
                <p className="mt-5 max-w-md text-base leading-7 text-[var(--color-mist)] sm:text-[1.0625rem]">{slide.description}</p>
                <div className="mt-7 flex flex-wrap items-center gap-6">
                  <Link href={slide.primaryHref} tabIndex={index === currentIndex ? 0 : -1} style={{ color: "#271B54" }} className="inline-flex min-h-11 items-center justify-center bg-white px-5 text-sm font-bold transition-[background-color,color] duration-200 hover:bg-[var(--color-accent-light)]">
                    {slide.primaryLabel} <Icon name="arrow-right" className="ml-2 h-4 w-4" />
                  </Link>
                  <Link href={slide.secondaryHref} tabIndex={index === currentIndex ? 0 : -1} className="inline-flex border-b border-white/60 pb-1 text-sm font-bold text-white transition-colors duration-200 hover:border-[var(--color-accent-light)] hover:text-[var(--color-accent-light)]">
                    {slide.secondaryLabel} <Icon name="arrow-right" className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-white/25 pt-4 sm:justify-end sm:gap-6">
          <div className="flex gap-2" role="group" aria-label="Choose slide">
            {slides.map((slide, index) => (
              <button key={slide.id} type="button" onClick={() => setCurrent(index)} aria-label={`Show slide ${index + 1}: ${slide.feature}`} aria-current={index === currentIndex} className={`h-2.5 w-7 border transition-colors ${index === currentIndex ? "border-[var(--color-accent-light)] bg-[var(--color-accent-light)]" : "border-white/70 bg-transparent hover:bg-white"}`} />
            ))}
          </div>
          {slides.length > 1 && <div className="flex gap-2"><button type="button" onClick={previous} aria-label="Previous slide" className="grid h-9 w-9 place-items-center border border-white/60 transition-colors hover:bg-white hover:text-[var(--color-ink)]"><Icon name="arrow-left" className="h-4 w-4" /></button><button type="button" onClick={next} aria-label="Next slide" className="grid h-9 w-9 place-items-center border border-white/60 transition-colors hover:bg-white hover:text-[var(--color-ink)]"><Icon name="arrow-right" className="h-4 w-4" /></button></div>}
        </div>
      </div>
    </section>
  );
}
