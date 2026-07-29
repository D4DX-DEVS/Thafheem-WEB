import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  BookOpen,
  Layers,
  BookMarked,
  FileText,
  Hash,
  Volume2,
  Sliders,
  HelpCircle,
  Lightbulb,
  Link2,
  MapPin,
  Palette,
  Search,
  SearchCheck,
  Bookmark,
  Info,
  GraduationCap,
  GripVertical,
} from "lucide-react";

// Resolve the public base path so screenshots load correctly when the app is
// served from a sub-folder (mirrors Vite's BASE_URL).
const asset = (name) => `${import.meta.env.BASE_URL || "/"}userguide/${name}`.replace(/\/{2,}/g, "/");

// Inline emphasis helpers — keep step text readable for a first-time user.
const B = ({ children }) => (
  <strong className="font-bold text-gray-900 dark:text-white font-malayalam">{children}</strong>
);
// Highlights an exact button/label name the user must look for on screen.
const UI = ({ children }) => (
  <span className="font-semibold text-[#2AA0BF] bg-cyan-50 dark:bg-cyan-900/30 rounded px-1.5 py-0.5 whitespace-nowrap font-malayalam border border-cyan-100 dark:border-cyan-800/50">
    {children}
  </span>
);

// A screenshot with numbered highlight overlays. Coordinates are percentages so
// the annotations stay perfectly aligned at any screen size.
const AnnotatedImage = ({ src, alt, annotations = [] }) => (
  <div className="relative w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm bg-gray-50 dark:bg-gray-800">
    <img src={src} alt={alt} loading="lazy" className="w-full h-auto block" />
    {annotations.map((a, i) => (
      <div
        key={i}
        className="absolute rounded-lg ring-2 ring-cyan-500 bg-cyan-400/10 pointer-events-none"
        style={{
          top: `${a.top}%`,
          left: `${a.left}%`,
          width: `${a.width}%`,
          height: `${a.height}%`,
        }}
      >
        <span className="absolute -top-3 -left-3 flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500 text-white text-xs font-bold shadow-md ring-2 ring-white dark:ring-gray-900">
          {a.n}
        </span>
      </div>
    ))}
  </div>
);

// Single guide section: icon + Malayalam title, intro, step list, tip + image.
const GuideStep = ({ index, icon: Icon, title, intro, steps, tip, image, image2, alt, annotations }) => (
  <section className="scroll-mt-[88px] rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1b1d27] p-5 sm:p-7 shadow-sm">
    <div className="flex items-center gap-3 mb-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-900/30 text-[#2AA0BF]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-[#2AA0BF] font-malayalam">
          {title}
        </h2>
      </div>
    </div>

    {intro && (
      <p className="mb-4 text-[15px] leading-relaxed text-gray-600 dark:text-gray-300 font-malayalam text-justify">
        {intro}
      </p>
    )}

    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <div>
        {steps && steps.length > 0 && (
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-white text-[13px] font-bold shadow-sm">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-[15px] leading-relaxed text-gray-700 dark:text-gray-200 font-malayalam text-justify">
                    {s}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}

        {tip && (
          <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 p-4">
            <Lightbulb className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
            <p className="text-[14.5px] leading-relaxed text-amber-900 dark:text-amber-200 font-malayalam text-justify">
              <B>ടിപ്പ്: </B>
              {tip}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <AnnotatedImage src={image} alt={alt} annotations={annotations} />
        {image2 && <AnnotatedImage src={image2} alt={`${alt} (2)`} annotations={[]} />}
      </div>
    </div>
  </section>
);

const UserGuide = () => {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState('');
  const sidebarRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-64px 0px -70% 0px', threshold: 0 }
    );
    // observe after render
    const timeout = setTimeout(() => {
      document.querySelectorAll('[data-guide-section]').forEach((el) => observer.observe(el));
    }, 100);
    return () => { clearTimeout(timeout); observer.disconnect(); };
  }, []);

  // Auto-scroll the sidebar list so the active link stays visible
  useEffect(() => {
    if (!activeId || !sidebarRef.current) return;
    const activeLink = sidebarRef.current.querySelector(`[data-section-id="${activeId}"]`);
    if (activeLink) activeLink.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeId]);

  const handleNavClick = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const navbarHeight = document.querySelector('nav[class*="sticky"]')?.offsetHeight ?? 64;
    const top = el.getBoundingClientRect().top + window.scrollY - navbarHeight - 16;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  const sections = [
    {
      id: "menu",
      icon: Menu,
      title: "നാവിഗേഷൻ മെനു (Drawer Menu)",
      intro:
        "ഉപയോക്താക്കൾക്ക് വിവിധ പഠനവിഭവങ്ങളിലേക്കും സേവനങ്ങളിലേക്കും ഉള്ളടക്കങ്ങളിലേക്കും വേഗത്തിൽ പ്രവേശിക്കാൻ സഹായിക്കുന്ന പ്രധാന നാവിഗേഷൻ സംവിധാനമാണ് ഡ്രോയർ മെനു. എല്ലാ ഫീച്ചറുകളും ഇതിൽ ക്രമബദ്ധമായി ലഭ്യമാക്കിയിരിക്കുന്നു.",
      steps: [
        <>സ്ക്രീനിന്റെ <B>ഇടത് മുകളിലുള്ള</B> <UI>☰</UI> ഐക്കണിൽ ടാപ്പ് ചെയ്യുക.</>,
        <>നാവിഗേഷൻ മെനു സ്ലൈഡ് ചെയ്ത് തുറന്നുവരും.</>,
        <>ഇതിൽ <B>ഹോം, സയ്യിദ് മൗദൂദി, തഫ്ഹീമുൽ ഖുർആൻ, ലൈബ്രറി, തജ്‌വീദ്, തഫ്ഹീം പ്രശ്നോത്തരി</B> തുടങ്ങിയ പ്രധാന വിഭാഗങ്ങൾ ലഭ്യമാണ്.</>,
        <>ഏത് പേജിലാണെങ്കിലും നിങ്ങൾക്ക് ഈ മെനു വഴി മറ്റ് വിഭാഗങ്ങളിലേക്ക് പ്രവേശിക്കാൻ സാധിക്കും.</>,
      ],
      tip: <>മെനു അടയ്ക്കാൻ സ്ക്രീനിന്റെ വലതുവശത്തുള്ള ഇരുണ്ട ഭാഗത്ത് ടാപ്പ് ചെയ്താൽ മതി.</>,
      image: asset("10-sidemenu.png"),
      alt: "Malayalam side menu",
      annotations: [{ n: 1, top: 20, left: 0.5, width: 22, height: 77 }],
    },
    {
      id: "surahs",
      icon: BookOpen,
      title: "സൂറകളും ജുസ്ഉം തിരഞ്ഞെടുക്കാം (Surahs & Juz)",
      intro:
        "ഹോം പേജിൽ വിശുദ്ധ ഖുർആനിലെ 114 സൂറകളും ക്രമത്തിൽ നൽകിയിട്ടുണ്ട്. ജുസ്അ് ക്രമത്തിലും ഇവിടെ നിന്നും തിരഞ്ഞെടുക്കാം.",
      steps: [
        <><B>തിരയാൻ:</B> മുകളിലുള്ള സെർച്ച് ബാറിൽ സൂറയുടെ പേരോ ആയത്ത് നമ്പറോ ടൈപ്പ് ചെയ്യുക (ഉദാഹരണത്തിന്: <UI>2:255</UI> എന്ന് നൽകിയാൽ നേരിട്ട് ആ ആയത്തിലെത്താം).</>,
        <><B>ക്രമീകരിക്കാൻ:</B> <UI>Surah</UI> ടാബ് സൂറ ക്രമത്തിലും, <UI>Juz</UI> ടാബ് ജുസ്അ് അടിസ്ഥാനത്തിലും ഉള്ളടക്കം കാണിക്കുന്നു.</>,
        <><B>തുറക്കാൻ:</B> വായന ആരംഭിക്കാൻ ആവശ്യമുള്ള സൂറയുടെ കാർഡിൽ ടാപ്പ് ചെയ്യുക.</>,
      ],
      tip: <>സൂറ കാർഡുകളിൽ ഇടത് വശത്ത് കാണുന്ന <B>നമ്പർ</B> സൂറയുടെ ക്രമവും, വലത് വശത്തെ <B>അക്കം</B> ആ സൂറയിലുള്ള ആകെ ആയത്തുകളുടെ എണ്ണവുമാണ്. സൂറ മക്കിയ്യ് ആണോ മദനിയ്യ് ആണോ എന്നറിയാൻ രണ്ട് ചിഹ്നങ്ങളും കാണാം.</>,
      image: asset("01-home.png"),
      alt: "Home page with surah list",
      annotations: [
        { n: 1, top: 47, left: 27, width: 61, height: 4.5 },
        { n: 2, top: 75, left: 10, width: 16, height: 4 },
        { n: 3, top: 81, left: 10, width: 31, height: 13 },
      ],
    },
    {
      id: "ayahwise",
      icon: FileText,
      title: "ആയത്ത് തിരഞ്ഞെടുത്തുള്ള വായന (Ayah Wise)",
      intro:
        "ഖുർആൻ പഠനത്തിനായി ഏറ്റവുമധികം ഉപയോഗിക്കപ്പെടുന്ന വിഭാഗമാണിത്. ഓരോ ആയത്തും അതിന്റെ മലയാള പരിഭാഷയോടൊപ്പം വെവ്വേറെ നൽകിയിരിക്കുന്നു.",
      steps: [
        <><B>കാഴ്ച മാറ്റാൻ:</B> മുകളിലുള്ള <UI>Translation</UI> / <UI>Mus’haf</UI> ടോഗിളുകളിലൂടെ പരിഭാഷയോ മുസ്ഹഫ് പേജോ തിരഞ്ഞെടുക്കാം.</>,
        <><B>ആയത്ത് / ബ്ലോക്ക്:</B> ഓരോ ആയത്തും ഒറ്റയ്ക്ക് കാണാൻ <UI>Ayah Wise</UI> എന്നും, ആശയത്തുടർച്ചയുള്ള ആയത്തുകൾ ഒന്നിച്ച് കാണാൻ <UI>Block Wise</UI> എന്നും മാറ്റാം.</>,
        <><B>ആയത്ത് ടൂളുകൾ (ഇടത്):</B> ഓരോ ആയത്തിനും താഴെ ഓഡിയോ പ്ലേ ചെയ്യാനും (▶), വ്യാഖ്യാനം വായിക്കാനും, വേഡ്-ബൈ-വേഡ് അർഥം അറിയാനും, ഷെയർ ചെയ്യാനുമുള്ള ഐക്കണുകളുണ്ട്.</>,
        <><B>കൂടുതൽ ടൂളുകൾ (വലത്):</B> ആയത്തുകൾ പകർത്താനും (Copy), ബുക്ക്മാർക്ക് ചെയ്യാനും സാധിക്കും.</>,
      ],
      tip: <>പ്രധാനപ്പെട്ട ആയത്തുകൾ പിന്നീടുള്ള ഉപയോ​ഗത്തിനായി വലതുവശത്തുള്ള <B>ബുക്ക്മാർക്ക്</B> ഐക്കൺ അമർത്തി സൂക്ഷിക്കാവുന്നതാണ്‌.</>,
      image: asset("02-ayahwise.png"),
      alt: "Ayah-wise page",
      annotations: [
        { n: 1, top: 8.5, left: 48, width: 18, height: 6 },
        { n: 2, top: 26, left: 49.5, width: 15, height: 5.5 },
        { n: 3, top: 62, left: 15, width: 15, height: 5 },
        { n: 4, top: 62, left: 87.5, width: 11, height: 5 },
      ],
    },
    {
      id: "blockwise",
      icon: Layers,
      title: "ബ്ലോക്ക് അടിസ്ഥാനത്തിലുള്ള വായന (Block Wise)",
      intro:
        "ആശയപൂർണതയ്ക്കായി ചില ആയത്തുകൾ ഒന്നിച്ചു ചേർത്ത് വായിക്കേണ്ടി വരും. ഇപ്രകാരം പരസ്പരബന്ധമുള്ള ആയത്തുകളെ ഒരു 'ബ്ലോക്ക്' ആയി കാണിക്കുന്നതിനാണ് ഈ വിഭാഗം.",
      steps: [
        <>മുകളിലെ ടോഗിളിൽ നിന്നും <UI>Block Wise</UI> തിരഞ്ഞെടുക്കുക.</>,
        <>ഇതുവഴി ബന്ധപ്പെട്ട ആയത്തുകൾ (ഉദാഹരണത്തിന്: <B>2:1-5</B>) ഒന്നിച്ച് ഒരു ബ്ലോക്കായി കാണാം.</>,
        <>പരിഭാഷകൾക്കിടയിലുള്ള ചെറിയ <B>നമ്പറുകൾ</B> (¹ ² ³) വ്യാഖ്യാനങ്ങളിലേക്കുള്ള സൂചകങ്ങളാണ് (References) — അവയിൽ ടാപ്പ് ചെയ്ത് വിശദമായ വിവരണം വായിക്കാം.</>,
      ],
      tip: <>സൂക്ഷ്മപഠനത്തിന് <B>ബ്ലോക്ക്‌വൈസ്</B> കാഴ്‌ചയും, ഒരോ ആയത്തും വേർതിരിച്ച് പഠിക്കാൻ <B>ആയത്ത്‌വൈസ്</B> കാഴ്‌ചയും ഉപയോഗപ്രദമാണ്.</>,
      image: asset("03-blockwise.png"),
      alt: "Block-wise page",
      annotations: [
        { n: 1, top: 43.5, left: 48, width: 8, height: 4.5 },
        { n: 3, top: 89, left: 5, width: 80, height: 9 },
      ],
    },
    {
      id: "mushaf",
      icon: BookMarked,
      title: "മുസ്ഹഫ് (Mus'haf)",
      intro:
        "അച്ചടിച്ച ഖുർആൻ പ്രതി വായിക്കുന്ന അതേ അനുഭവത്തിനായി, ഖുർആൻ  കാണിക്കുന്ന ഇടമാണ് മുസ്ഹഫ്.",
      steps: [
        <>മുകളിലെ ടോഗിളിൽ നിന്ന് <UI>Mus’haf</UI> ഓപ്ഷൻ തിരഞ്ഞെടുക്കുക.</>,
        <><B>പേജുകൾ മാറ്റാൻ:</B> താഴെയുള്ള <UI>Next</UI> / <UI>Previous</UI> ബട്ടണുകൾ ഉപയോഗിക്കുക. ഒത്ത നടുവിലായി <B>നിലവിലെ പേജ് നമ്പർ</B> രേഖപ്പെടുത്തിയിട്ടുണ്ടാകും.</>,
        <><B>സൂറകൾ മാറ്റാൻ:</B> ഏറ്റവും താഴെയുള്ള <UI>Next Surah</UI> / <UI>Previous Surah</UI> ഉപയോഗിക്കാവുന്നതാണ്.</>,
      ],
      tip: <>മുസ്ഹഫിലെ ഓരോ ആയത്തിന്റെയും അവസാനമുള്ള <B>വൃത്താകൃതിയിലുള്ള ചിഹ്നത്തിലെ നമ്പർ</B> ആയത്തിനെ സൂചിപ്പിക്കുന്നു.</>,
      image: asset("04-mushaf.png"),
      alt: "Mus'haf page",
      annotations: [
        { n: 1, top: 9, left: 49, width: 9, height: 5 },
        { n: 2, top: 79, left: 22, width: 53, height: 5.5 },
        { n: 3, top: 88, left: 13, width: 75, height: 4.5 },
      ],
    },
    {
      id: "tajweed",
      icon: Palette,
      title: "തജ്‌വീദ് (Colour Coded Tajweed)",
      intro:
        "ഖുർആൻ ശരിയായ ഉച്ചാരണ നിയമങ്ങളോടെ (തജ്‌വീദ്) പഠിക്കാൻ സഹായിക്കുന്ന വർണ്ണ കോഡിംഗ് സംവിധാനമാണ് Colour Coded Tajweed. ഓരോ നിറവും ഒരു പ്രത്യേക തജ്‌വീദ് നിയമത്തെ സൂചിപ്പിക്കുന്നു. Ayah Wise-ലും Mus'haf-ലും ഈ സൗകര്യം ലഭ്യമാണ്.",
      steps: [
        <>മുകളിലെ <UI>⚙️ Settings</UI> ഐക്കൺ അമർത്തി Settings പാനൽ തുറക്കുക.</>,
        <><B>QURAN DISPLAY</B> വിഭാഗത്തിൽ <UI>Colour coded Tajweed</UI> ടോഗിൾ <B>ON</B> ആക്കുക (സിയാൻ നിറത്തിൽ മാറും).</>,
        <><UI>Save Changes</UI> അമർത്തുക — ഇനി ഖുർആൻ ആയത്തുകൾ <B>വർണ്ണ കോഡ് ചെയ്ത</B> തജ്‌വീദ് ഫോണ്ടിൽ കാണാം.</>,
        <>സൂറ പേജിന്റെ മുകളിലായി <UI>Tajweed colors ∨</UI> ബട്ടൺ കാണാം — ക്ലിക്ക് ചെയ്യുമ്പോൾ <B>ഓരോ നിറവും ഏത് നിയമത്തെ സൂചിപ്പിക്കുന്നു</B> എന്ന വിശദവിവരം (legend) ലഭിക്കും.</>,
        <><B>മുസ്ഹഫ് വ്യൂവിലും</B> തജ്‌വീദ് നിറങ്ങൾ ദൃശ്യമാകും — നീല (Silent letter), മഞ്ഞ (Normal madd), ചുവപ്പ് (Connected/Necessary madd), പച്ച (Ghunna/Ikhfa), ഇളം നീല (Qalqala), പർപ്പിൾ (Tafkhim) എന്നിങ്ങനെ.</>,
      ],
      tip: <>തജ്‌വീദ് <B>OFF</B> ചെയ്യാൻ ഇതേ ടോഗിൾ വീണ്ടും ക്ലിക്ക് ചെയ്ത് Save Changes അമർത്തിയാൽ മതി — സാധാരണ കറുത്ത ഖുർആൻ ഫോണ്ടിലേക്ക് മടങ്ങും.</>,
      image: asset("14-tajweed-mushaf.png"),
      alt: "Tajweed rendered in Mus'haf view",
      annotations: [],
    },
    {
      id: "interpretation",
      icon: BookOpen,
      title: "തഫ്ഹീമുൽ ഖുർആൻ വ്യാഖ്യാനം (Interpretation)",
      intro:
        "ഓരോ ആയത്തിന്റെയും പൂർണ്ണമായ അർഥവും പശ്ചാത്തലവും സയ്യിദ് അബുൽ അഅ്‌ലാ മൗദൂദിയുടെ 'തഫ്ഹീമുൽ ഖുർആൻ' വ്യാഖ്യാനത്തിലൂടെ എളുപ്പത്തിൽ വായിച്ചു മനസ്സിലാക്കാം.",
      steps: [
        <>ആയത്തുകൾക്ക് താഴെ കാണുന്ന <B>വ്യാഖ്യാന ഐക്കണിൽ</B> ടാപ്പ് ചെയ്യുമ്പോൾ ഒരു വിൻഡോ തുറന്നുവരും.</>,
        <><B>മാറ്റങ്ങൾ വരുത്താൻ:</B> മുകളിലുള്ള ഡ്രോപ്പ്ഡൗൺ ഉപയോഗിച്ച് മറ്റ് <B>സൂറകളും ആയത്തുകളും</B> തിരഞ്ഞെടുക്കാം.</>,
        <><B>ഉള്ളടക്കം:</B> <UI>TAFHEEM-UL-QURAN</UI> എന്ന തലക്കെട്ടിന് താഴെയായി പൂർണ്ണമായ വിശദീകരണം നൽകിയിട്ടുണ്ട്.</>,
        <><B>നാവിഗേഷൻ:</B> താഴെയുള്ള <UI>Prev</UI> / <UI>Next Ayah</UI> ഉപയോഗിച്ച് തൊട്ടടുത്ത ആയത്തുകളുടെ വ്യാഖ്യാനങ്ങളിലേക്ക് നീങ്ങാം.</>,
      ],
      tip: <>വ്യാഖ്യാന പേജിന്റെ വലത് മുകളിലുള്ള <B>ബുക്ക്മാർക്ക്</B> ഐക്കൺ ഉപയോഗിച്ച് പ്രധാനപ്പെട്ട കുറിപ്പുകൾ സേവ് ചെയ്യാം.</>,
      image: asset("05-interpretation.png"),
      alt: "Interpretation modal",
      annotations: [
        { n: 1, top: 6, left: 14, width: 19, height: 5 },
        { n: 3, top: 47, left: 15, width: 21, height: 4.5 },
        { n: 4, top: 85.5, left: 14, width: 68, height: 7 },
      ],
    },
    {
      id: "reference",
      icon: Hash,
      title: "റഫറൻസ് കുറിപ്പുകൾ (Footnotes)",
      intro:
        "പരിഭാഷയിൽ നൽകിയിട്ടുള്ള ചെറിയ നമ്പറുകൾ അധികവിശദീകരണങ്ങളിലേക്കുള്ള (Footnotes) ലിങ്കുകളാണ്. നിർദ്ദിഷ്ട വിഷയങ്ങളെക്കുറിച്ചുള്ള കൂടുതൽ വിവരങ്ങൾ ഇതിലൂടെ ലഭിക്കും.",
      steps: [
        <>പരിഭാഷയിൽ കാണുന്ന ചെറിയ <B>നമ്പറുകളിൽ</B> (¹ ² ³) ടാപ്പ് ചെയ്യുക.</>,
        <><UI>Interpretation 1</UI> എന്ന തലക്കെട്ടോടെ പ്രസ്തുത നമ്പറിന്റ വിശദമായ വ്യാഖ്യാനം സ്ക്രീനിൽ പ്രത്യക്ഷപ്പെടും.</>,
        <>മുകളിലുള്ള <UI>Previous</UI> / <UI>Next</UI> ബട്ടണുകളിലൂടെ ക്രമപ്രകാരം മറ്റ് റഫറൻസുകളിലേക്ക് പോകാൻ സാധിക്കും.</>,
      ],
      tip: <>തലക്കെട്ടിന് താഴെയുള്ള വിവരണം (ഉദാ: 2- Al-Baqara • 1-5) ഈ കുറിപ്പ് ഏത് ആയത്തുകളുമായി ബന്ധപ്പെട്ടിരിക്കുന്നുവെന്ന് വ്യക്തമാക്കുന്നു.</>,
      image: asset("06-reference.png"),
      alt: "Reference / footnote popup",
      annotations: [
        { n: 1, top: 7.5, left: 14.5, width: 30, height: 8 },
        { n: 3, top: 18, left: 14.5, width: 67, height: 5.5 },
      ],
    },
    {
      id: "crossref",
      icon: Link2,
      title: "ക്രോസ് റഫറൻസുകളും കുറിപ്പുകളും (Cross-references & Notes)",
      intro:
        "വ്യാഖ്യാനത്തിനുള്ളിൽ കാണുന്ന സിയാൻ (നീല) നിറത്തിലുള്ള വാക്കുകളും നമ്പറുകളും ക്ലിക്ക് ചെയ്യാവുന്ന ലിങ്കുകളാണ്. ഇവ മറ്റ് ആയത്തുകളിലേക്കും അനുബന്ധ കുറിപ്പുകളിലേക്കും നിങ്ങളെ നയിക്കുന്നു.",
      steps: [
        <><B>ആയത്ത് ലിങ്ക് (ബ്രാക്കറ്റില്ലാതെ):</B> <UI>23:4</UI> പോലുള്ള നമ്പറുകൾ ആ ആയത്തിന്റെ <B>അറബിയും പരിഭാഷയും</B> കാണിക്കുന്ന വിൻഡോ തുറക്കും.</>,
        <><B>വ്യാഖ്യാന ലിങ്ക് (ബ്രാക്കറ്റിനുള്ളിൽ):</B> <UI>(23:4)</UI> പോലെ ബ്രാക്കറ്റിനുള്ളിലുള്ളവ നേരിട്ട് ആ ആയത്തിന്റെ <B>വ്യാഖ്യാനത്തിലേക്ക്</B> പോകും.</>,
        <><B>കുറിപ്പുകൾ (Notes):</B> <UI>B1</UI>, <UI>N440</UI>, <UI>H</UI>, <UI>P</UI>, <UI>X</UI> പോലെ അക്ഷരവും നമ്പറും ചേർന്ന ചെറിയ <B>മേൽക്കുറികൾ</B> അനുബന്ധ കുറിപ്പുകൾ (ഉദാ: ബൈബിൾ/തൽമൂദ് പരാമർശങ്ങൾ) ഒരു പോപ്പപ്പിൽ കാണിക്കും.</>,
      ],
      tip: <>ഈ ലിങ്കുകളെല്ലാം <B>സിയാൻ (നീല) നിറത്തിലും അടിവരയോടും</B> കൂടിയാണ് കാണിക്കുക — സാധാരണ ടെക്സ്റ്റിൽ നിന്ന് അവയെ എളുപ്പത്തിൽ തിരിച്ചറിയാം.</>,
      image: asset("11-references.png"),
      alt: "Cross-references and notes inside interpretation",
      annotations: [],
    },
    {
      id: "maps",
      icon: MapPin,
      title: "മാപ്പുകൾ (Maps)",
      intro:
        "ചരിത്രസംഭവങ്ങൾ, പ്രവാചകന്മാരുടെ യാത്രകൾ, പുരാതന സ്ഥലങ്ങൾ എന്നിവ എളുപ്പത്തിൽ മനസ്സിലാക്കാൻ ചില വ്യാഖ്യാനങ്ങളിലും ലേഖനങ്ങളിലും (ഉദാ: 'പ്രവാചകത്വ പരിസമാപ്തി') ഭൂപടങ്ങൾ ഉൾപ്പെടുത്തിയിട്ടുണ്ട്.",
      steps: [
        <>വ്യാഖ്യാന ടെക്സ്റ്റിൽ <UI>Map 1</UI>, <UI>Map 2</UI> എന്നിങ്ങനെ കാണുന്ന <B>സിയാൻ ലിങ്കുകളിൽ</B> ക്ലിക്ക് ചെയ്യുക.</>,
        <>ബന്ധപ്പെട്ട <B>ഭൂപടം</B> (ഉദാ: 'ഇബ്‌റാഹീം നബിയുടെ പാലായനം') ഒരു പോപ്പപ്പിൽ വ്യക്തമായ വിവരണത്തോടെ തുറന്നുവരും.</>,
        <>ഭൂപടം പരിശോധിച്ച ശേഷം മുകളിലുള്ള <B>(✕)</B> അമർത്തി വായനയിലേക്ക് മടങ്ങാം.</>,
      ],
      tip: <>ഭൂപടങ്ങൾ ഖുർആനിലെ ചരിത്രപരമായ പരാമർശങ്ങളെ ഭൂമിശാസ്ത്രപരമായി ദൃശ്യവൽക്കരിക്കാൻ സഹായിക്കുന്നു.</>,
      image: asset("12-map.png"),
      alt: "Map popup showing a historical map",
      annotations: [],
    },
    {
      id: "surahinfo",
      icon: Info,
      title: "സൂറ വിവരം (Surah Info)",
      intro:
        "ഓരോ സൂറയുടെയും പേര്, അവതരണ കാലം, ഉള്ളടക്കം, പശ്ചാത്തലം എന്നിവയടങ്ങിയ വിശദമായ പരിചയ കുറിപ്പ് (Preface) ഇവിടെ ലഭ്യമാണ്.",
      steps: [
        <>സൂറ പേജിന്റെ മുകളിലുള്ള <UI>Surah Info</UI> ബട്ടൺ ക്ലിക്ക് ചെയ്യുക.</>,
        <>തുറന്നുവരുന്ന വിൻഡോയിൽ സൂറയുടെ <B>അറബി നാമം</B>, <B>Revelation</B> (മക്കി/മദനി), <B>ആയത്തുകളുടെ എണ്ണം</B>, <B>Thafheem Vol</B>, <B>Paragraphs</B> എന്നീ വിവരങ്ങൾ സിയാൻ കാർഡുകളിൽ കാണാം.</>,
        <>താഴെയായി <B>നാമം</B>, <B>അവതരണ കാലം</B>, <B>ഉള്ളടക്കം</B> എന്നീ വിഭാഗങ്ങളിൽ മലയാളത്തിൽ വിശദമായ പരിചയക്കുറിപ്പ് നൽകിയിട്ടുണ്ട്.</>,
        <>മുകളിലെ <B>▶ (Play)</B> ഐക്കൺ അമർത്തിയാൽ ഈ പരിചയക്കുറിപ്പ് <B>ഓഡിയോ</B> ആയി കേൾക്കാം. <B>Copy</B>, <B>Share</B> ഐക്കണുകളും ലഭ്യമാണ്.</>,
      ],
      tip: <>പുതിയൊരു സൂറ വായിക്കാൻ തുടങ്ങുന്നതിന് മുമ്പ് Surah Info വായിക്കുന്നത് ആ സൂറയുടെ പശ്ചാത്തലവും ഉദ്ദേശ്യവും മനസ്സിലാക്കാൻ വളരെ സഹായകമാണ്.</>,
      image: asset("15-surahinfo.png"),
      alt: "Surah Info modal",
      annotations: [],
    },
    {
      id: "bookmarks",
      icon: Bookmark,
      title: "ബുക്ക്മാർക്കുകൾ (Bookmarks)",
      intro:
        "പ്രധാനപ്പെട്ട ആയത്തുകൾ പിന്നീട് എളുപ്പത്തിൽ കണ്ടെത്താനായി ബുക്ക്മാർക്ക് ചെയ്ത് സൂക്ഷിക്കാം. Ayah Wise, Block Wise രണ്ട് വായനാ രീതികളിലും ഈ സൗകര്യം ലഭ്യമാണ്.",
      steps: [
        <><B>Ayah Wise-ൽ:</B> ഓരോ ആയത്തിന്റെയും താഴെ വലതുവശത്ത് <UI>🔖</UI> (Bookmark) ഐക്കൺ കാണാം — അത് ക്ലിക്ക് ചെയ്താൽ ആ ആയത്ത് സേവ് ആകും. (സ്ക്രീൻഷോട്ടിൽ ➊ ചൂണ്ടിക്കാണിച്ച ഭാഗം)</>,
        <><B>Block Wise-ൽ:</B> വ്യാഖ്യാന പോപ്പപ്പിന്റെ മുകളിൽ വലതുവശത്തുള്ള <UI>Bookmark</UI> ഐക്കൺ ഉപയോഗിക്കാം.</>,
        <><B>കാണാൻ:</B> ഹോം പേജിലെ <UI>Bookmarks</UI> ബട്ടൺ ക്ലിക്ക് ചെയ്യുക. തുറക്കുന്ന പേജിൽ 4 ടാബുകളിൽ ബുക്ക്മാർക്കുകൾ കാണാം: <B>Verse</B> (ആയത്തുകൾ), <B>Surahs</B> (സൂറകൾ), <B>Blocks</B> (ബ്ലോക്കുകൾ), <B>Interpretations</B> (വ്യാഖ്യാനങ്ങൾ).</>,
        <>ബുക്ക്മാർക്ക് ചെയ്ത ആയത്ത് വീണ്ടും ക്ലിക്ക് ചെയ്താൽ ബുക്ക്മാർക്ക് <B>നീക്കം</B> ചെയ്യാം (toggle).</>,
      ],
      tip: <>സൈൻ ഇൻ ചെയ്തിട്ടുണ്ടെങ്കിൽ ബുക്ക്മാർക്കുകൾ ക്ലൗഡിൽ സേവ് ആകും — ഏത് ഉപകരണത്തിൽ നിന്നും ആക്സസ് ചെയ്യാം.</>,
      image: asset("18-bookmark.png"),
      image2: asset("19-bookmarks-page.png"),
      alt: "Ayah card showing bookmark icon and Bookmarks page with tabs",
      annotations: [
        { n: 1, top: 55, left: 88, width: 6, height: 35 },
      ],
    },
    {
      id: "home-search",
      icon: Search,
      title: "ഹോം പേജ് സെർച്ച് (Smart Search)",
      intro:
        "ഹോം പേജ് തുറക്കുമ്പോൾ നടുവിൽ കാണുന്ന വലിയ സെർച്ച് ബാറിൽ എന്തും ടൈപ്പ് ചെയ്ത് ഒരേസമയം പല തരത്തിൽ തിരയാം. ഇത് ഒരു Smart Search ആണ് — എല്ലാ തരം ഫലങ്ങളും ഒരുമിച്ച് കാണിക്കും.",
      steps: [
        <>സെർച്ച് ബാറിൽ <B>സൂറയുടെ പേര്</B> ടൈപ്പ് ചെയ്താൽ (ഉദാ: 'അൽബഖറ', 'Al-Mulk') ആ സൂറ നേരിട്ട് കാണാം.</>,
        <><B>ആയത്ത് നമ്പർ</B> ടൈപ്പ് ചെയ്താൽ (ഉദാ: <UI>2:255</UI>) Enter അടിക്കുമ്പോൾ നേരിട്ട് ആ ആയത്തിലേക്ക് പോകും.</>,
        <><B>മലയാള വാക്കുകൾ</B> ടൈപ്പ് ചെയ്താൽ (ഉദാ: 'അവനല്ലാതെ', 'നമസ്കാരം') Translation, Interpretation എന്നിവയിൽ നിന്ന് ആ വാക്കുള്ള ആയത്തുകൾ ഫലങ്ങളായി കാണാം.</>,
        <><B>അറബി വാക്യങ്ങൾ</B> ടൈപ്പ് ചെയ്താലും ആയത്തുകൾ കണ്ടെത്താം.</>,
        <><B>വിഷയങ്ങൾ (Subjects)</B> — ടൈപ്പ് ചെയ്യുന്ന വാക്കുമായി ബന്ധപ്പെട്ട Quran Subject, Tafseer Subject ഫലങ്ങളും ഒരുമിച്ച് കാണിക്കും.</>,
        <>ഫലങ്ങൾ ടൈപ്പ് ചെയ്യുമ്പോൾ തന്നെ <B>താഴെ Search Results</B> ആയി കാണാം — ക്ലിക്ക് ചെയ്താൽ നേരിട്ട് ആ ആയത്തിലേക്ക് പോകും.</>,
      ],
      tip: <>Quick Surah ബട്ടണുകൾ (Al-Mulk, Yaseen, Al-Kahf...) ക്ലിക്ക് ചെയ്താൽ ജനപ്രിയ സൂറകളിലേക്ക് ഒറ്റ ക്ലിക്കിൽ പോകാം.</>,
      image: asset("20-home-search-results.png"),
      image2: asset("17-homepage-search.png"),
      alt: "Homepage search bar with Malayalam word typed and search results",
      annotations: [],
    },
    {
      id: "advanced-search",
      icon: SearchCheck,
      title: "അഡ്വാൻസ്ഡ് സെർച്ച് (Header Search 🔍)",
      intro:
        "ഏത് പേജിലായാലും മുകളിൽ വലതുവശത്ത് കാണുന്ന 🔍 ഐക്കൺ ക്ലിക്ക് ചെയ്താൽ ഒരു വിശദമായ സെർച്ച് വിൻഡോ തുറക്കും. ഇവിടെ ഓരോ തരം സെർച്ചും വെവ്വേറെ ചെയ്യാം:",
      steps: [
        <><B>Malayalam phrase:</B> മലയാള വാക്കുകൾ ഉപയോഗിച്ച് <UI>Translation</UI> അല്ലെങ്കിൽ <UI>Interpretation</UI> ൽ മാത്രമായി തിരയാം.</>,
        <><B>Arabic phrase:</B> അറബി വാക്കുകൾ / വാക്യങ്ങൾ നേരിട്ട് ടൈപ്പ് ചെയ്ത് ആയത്തുകൾ കണ്ടെത്താം.</>,
        <><B>Arabic root word:</B> അറബി മൂലപദം (Root) നൽകിയാൽ ആ മൂലത്തിൽ നിന്ന് ഉരുത്തിരിഞ്ഞ എല്ലാ വാക്കുകളും അടങ്ങിയ ആയത്തുകൾ കാണാം.</>,
        <><B>Quran Subject:</B> വിഷയാടിസ്ഥാനത്തിൽ (ഉദാ: നമസ്‌കാരം, സക്കാത്ത്) ആയത്തുകൾ ഫിൽട്ടർ ചെയ്ത് കണ്ടെത്താം. Malayalam / Translation Subjects എന്ന് തിരഞ്ഞെടുത്ത് subjects ലോഡ് ചെയ്യാം.</>,
        <><B>Landmarks:</B> ഖുർആനിലെ പ്രധാന ലാൻഡ്‌മാർക്കുകൾ (ഉദാ: ജുസ്ഉ, ഹിസ്ബ്, സജ്ദ) നേരിട്ട് കണ്ടെത്താം.</>,
      ],
      tip: <>ഹോം പേജ് സെർച്ച് എല്ലാം ഒരുമിച്ച് തിരയുമ്പോൾ, Header Search ഓരോ കാറ്റഗറിയിലും കൃത്യമായി തിരയാൻ സഹായിക്കുന്നു — കൂടുതൽ accurate results ലഭിക്കും.</>,
      image: asset("16-search.png"),
      alt: "Advanced search modal with Malayalam phrase, Arabic phrase, root word, and subject filters",
      annotations: [],
    },
    {
      id: "audio-play",
      icon: Volume2,
      title: "ഖുർആൻ പാരായണം (Audio Player)",
      intro:
        "ഖുർആൻ പാരായണം ശ്രവിക്കാനും ഉച്ചാരണം പഠിക്കാനുമുള്ള സൗകര്യമാണിത്. ഓരോ ആയത്തും കേൾക്കുമ്പോൾ അവ സ്ക്രീനിൽ അടയാളപ്പെടുത്തി കാണാം.",
      steps: [
        <>ആയത്തിന് താഴെയുള്ള <B>പ്ലേ (▶) ഐക്കണിൽ</B> അമർത്തുക. (മുഴുവൻ സൂറയും കേൾക്കാൻ മുകളിലുള്ള <UI>Play Audio</UI> ഉപയോഗിക്കാം.)</>,
        <>പാരായണം നടന്നുകൊണ്ടിരിക്കുന്ന ആയത്ത് <B>പച്ച നിറത്തിൽ</B> തെളിഞ്ഞുകാണിക്കുന്നതിനാൽ എളുപ്പത്തിൽ പിന്തുടരാൻ സാധിക്കും.</>,
        <>സ്ക്രീനിന്റെ താഴെ വരുന്ന <B>പ്ലെയർ ബാറിൽ</B> പ്ലേ/പോസ്, അടുത്തത് (⏭), മുമ്പത്തേത് (⏮), റിപ്പീറ്റ് (🔁) എന്നിവ നിയന്ത്രിക്കാം.</>,
      ],
      tip: <>പ്ലെയറിലെ <B>റിപ്പീറ്റ് (🔁)</B> ബട്ടൺ ഒരു ആയത്ത് തന്നെ വീണ്ടും കേട്ട് ഹൃദിസ്ഥമാക്കാൻ (മനഃപാഠമാക്കാൻ) സഹായിക്കും.</>,
      image: asset("09-player.png"),
      alt: "Audio player bar",
      annotations: [
        { n: 1, top: 57, left: 14, width: 6, height: 6 },
        { n: 2, top: 36.5, left: 12.5, width: 75, height: 30 },
        { n: 3, top: 88, left: 18, width: 80, height: 11 },
      ],
    },
    {
      id: "audio-settings",
      icon: Sliders,
      title: "ഓഡിയോ ക്രമീകരണങ്ങൾ (Audio Settings)",
      intro:
        "ആയത്ത് വൈസ് (Ayah Wise) വായനയിൽ ഓഡിയോ പ്ലെയറിലെ സെറ്റിങ്സ് (⚙️) ബട്ടൺ അമർത്തിയാൽ ഈ 'Audio Settings' വിൻഡോ തുറക്കും. ഏത് തരം ഓഡിയോ കേൾക്കണം, ഏത് ഖാരി, ഏത് വേഗത എന്നിവ ഇവിടെ തിരഞ്ഞെടുക്കാം.",
      steps: [
        <><UI>Select Audio Options</UI> — ആയത്ത് വൈസ് വായനയിൽ <B>മൂന്ന് തരം</B> ഓഡിയോ ലഭ്യമാണ്: <B>Quran</B> (ഖിറാഅത്ത് / അറബി പാരായണം), <B>Translation</B> (മലയാളം പരിഭാഷ), <B>Interpretation</B> (വ്യാഖ്യാനം). കേൾക്കേണ്ടവ ടിക്ക് ചെയ്യുക — ഒന്നോ അതിലധികമോ ഒരുമിച്ച് തിരഞ്ഞെടുക്കാം.</>,
        <><UI>Reciter</UI> — ഡ്രോപ്പ്ഡൗണിൽ നിന്ന് പ്രമുഖരായ ഖാരിഉകളിൽ ഒരാളെ (ഉദാ: Mishari Rashid) നിങ്ങൾക്ക് യഥേഷ്ടം തിരഞ്ഞെടുക്കാം.</>,
        <><UI>Playback Speed</UI> — <B>−</B> / <B>+</B> ബട്ടണുകൾ വഴി വായനയുടെ വേഗത മാറ്റാം (<B>1.0x</B> ആണ് സാധാരണ വേഗത).</>,
      ],
      tip: <><B>ശ്രദ്ധിക്കുക:</B> ബ്ലോക്ക് വൈസ് (Block Wise) വായനയിൽ <B>ഖുർആൻ ആയത്തിന്റെ പാരായണം (ഖിറാഅത്ത്)</B> മാത്രമേ ഓഡിയോയായി ലഭ്യമാകൂ; പരിഭാഷ, വ്യാഖ്യാന ഓഡിയോകൾ ആയത്ത് വൈസ് വായനയിൽ മാത്രമേ ലഭിക്കൂ.</>,
      image: asset("08-audio.png"),
      alt: "Audio settings panel",
      annotations: [
        { n: 1, top: 18.5, left: 3, width: 94, height: 44 },
        { n: 2, top: 70.5, left: 3, width: 94, height: 12 },
        { n: 3, top: 85, left: 3, width: 94, height: 13 },
      ],
    },
    {
      id: "quiz",
      icon: GraduationCap,
      title: "തഫ്ഹീം പ്രശ്നോത്തരി (Quiz)",
      intro:
        "തഫ്ഹീമുൽ ഖുർആൻ എത്ര മനസ്സിലാക്കിയെന്ന് പരിശോധിക്കാനുള്ള പ്രശ്നോത്തരിയാണിത്. സൂറ അടിസ്ഥാനമാക്കിയോ മുഴുവൻ തഫ്ഹീം അടിസ്ഥാനമാക്കിയോ ക്വിസ് സെലക്ട് ചെയ്യാം.",
      steps: [
        <>മെനുവിൽ നിന്ന് <UI>തഫ്ഹീം പ്രശ്നോത്തരി</UI> തിരഞ്ഞെടുക്കുക.</>,
        <>മുകളിൽ <B>Entire Surah</B> അല്ലെങ്കിൽ <B>Entire Thafheem ✨</B> എന്ന് തിരഞ്ഞെടുക്കാം. <B>Entire Surah</B> തിരഞ്ഞെടുത്താൽ സൂറ ഡ്രോപ്പ്ഡൗണിൽ നിന്ന് ഒരു സൂറ തിരഞ്ഞെടുക്കാം.</>,
        <>ചോദ്യങ്ങൾ (ഉദാ: 'സൂറ അൽ ഫാതിഹയുടെ അവതരണ കാലം?') MCQ (Multiple Choice Question) രൂപത്തിൽ കാണും — A, B, C എന്നിവയിൽ നിന്ന് ശരിയായ ഉത്തരം ക്ലിക്ക് ചെയ്യുക.</>,
        <>ഉത്തരം സബ്മിറ്റ് ചെയ്യുമ്പോൾ ശരി/തെറ്റ് നിറത്തിൽ കാണിക്കും. <B>മാർക്ക്</B> മുകളിൽ കാണാം.</>,
        <>പേജിനേഷൻ ബട്ടണുകൾ (← →) വഴി അടുത്ത ചോദ്യങ്ങളിലേക്ക് നീങ്ങാം.</>,
      ],
      tip: <><B>Entire Thafheem ✨</B> മോഡിൽ മുഴുവൻ തഫ്ഹീമുൽ ഖുർആനിൽ നിന്നുള്ള റാൻഡം ചോദ്യങ്ങൾ ലഭിക്കും — പഠനം എത്ര മുന്നോട്ട് പോയിയെന്ന് പരിശോധിക്കാം!</>,
      image: asset("21-quiz.png"),
      alt: "Quiz page showing MCQ questions in Malayalam",
      annotations: [],
    },
    {
      id: "dragdrop",
      icon: GripVertical,
      title: "ഡ്രാഗ് & ഡ്രോപ്പ് (Drag & Drop)",
      intro:
        "ഖുർആൻ വാക്കുകളുടെ അർത്ഥം പഠിക്കാനുള്ള ഒരു ​ഗെയിമാണിത്. ഖുർആൻ പദങ്ങളുടെ ശരിയായ അർത്ഥം ഡ്രാഗ് ചെയ്ത് ഇടാം.",
      steps: [
        <>മെനുവിൽ നിന്ന് <UI>ഡ്രാഗ് & ഡ്രോപ്പ്</UI> തിരഞ്ഞെടുക്കുക. <B>Start</B> ബട്ടൺ അമർത്തി ​ഗെയിം തുടങ്ങുക.</>,
        <>ഇടത്ത് ഖുർആൻ പദങ്ങളും (ഉദാ: بِسْمِ, اللَّهِ) വലതുവശത്ത് അർത്ഥങ്ങളും (ഉദാ: 'അല്ലാഹുവിന്റെ', 'നാമത്തിൽ') കാണും.</>,
        <>വലതുവശത്തുള്ള അർത്ഥം <B>ഡ്രാഗ് ചെയ്ത്</B> ഇടത് ഭാ​ഗത്തുള്ള പദത്തിന് നേരെ <B>ഡ്രോപ്പ്</B> ചെയ്യുക.</>,
        <>ശരിയായി ഡ്രോപ്പ് ചെയ്താൽ <B>പച്ച</B> നിറത്തിൽ കാണും. തെറ്റായി ഡ്രോപ്പ് ചെയ്താൽ <B>ചുവപ്പ്</B> നിറത്തിൽ കാണും.</>,
        <><UI>Next Ayah</UI> ബട്ടൺ അമർത്തി അടുത്ത ആയത്തിലേക്ക് പോകാം. മുകളിലെ സൂറ ഡ്രോപ്പ്ഡൗണിൽ നിന്ന് മറ്റൊരു സൂറയും തിരഞ്ഞെടുക്കാം.</>,
      ],
      tip: <>ഈ ​ഗെയിം ഖുർആൻ പദങ്ങളുടെ അർത്ഥം വേഗത്തിൽ പഠിക്കാനും ഖുർആൻ വാക്കുകളുമായി പരിചയം സ്ഥാപിക്കാനും സഹായിക്കും. കുട്ടികൾക്കും ഇത് ഏറെ ഉപകാരപ്പെടും!</>,
      image: asset("22-dragdrop.png"),
      alt: "Drag and Drop game with Arabic words and Malayalam meanings",
      annotations: [],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-poppins">
      <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-8">
        {/* Header card — full width */}
        <div className="mb-8">
          {/* Header content inside a card */}
          <div className="w-full rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1b1d27] p-5 sm:p-7 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-900/30 text-[#2AA0BF]">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h1 className="text-lg sm:text-xl font-semibold text-[#2AA0BF] font-malayalam">
               ഉപയോഗ ക്രമം
              </h1>
            </div>
            <div className="text-[15px] leading-relaxed text-gray-600 dark:text-gray-300 font-malayalam text-justify space-y-4">
              <p>
                തഫ്ഹീമുൽ ഖുർആൻ ആപ്പിലെയും വെബ്സൈറ്റിലെയും വിവിധ പഠനവിഭവങ്ങളിലേക്കും സേവനങ്ങളിലേക്കും നിങ്ങളെ വേഗത്തിലും സുഗമമായും നയിക്കുന്നതിനായി തയ്യാറാക്കിയ സമഗ്ര വഴികാട്ടിയാണിത്.
              </p>
              <p>
                വിശുദ്ധ ഖുർആന്റെ വായന, പഠനം, ഓഡിയോ ശ്രവണം, ഇസ്‌ലാമിക വിജ്ഞാന സമ്പാദനം എന്നിവ കൂടുതൽ ഫലപ്രദവും അർത്ഥപൂർണ്ണവുമാക്കുന്നതിനായി ലഭ്യമായ പ്രധാന ഫീച്ചറുകളുടെയും അവയുടെ ഉപയോഗരീതികളുടെയും വിശദമായ വിവരണം ഈ ഗൈഡിൽ ഉൾപ്പെടുത്തിയിരിക്കുന്നു.
              </p>
              <p className="hidden sm:block">
                ആപ്പിലെയും വെബ്സൈറ്റിലെയും വിവിധ മെനുകൾ, പഠനസൗകര്യങ്ങൾ, സെർച്ച് സംവിധാനങ്ങൾ, വ്യക്തിഗത ക്രമീകരണങ്ങൾ, മറ്റ് അനുബന്ധ സേവനങ്ങൾ എന്നിവയെക്കുറിച്ച് വ്യക്തമായ ധാരണ നേടുന്നതിനും അവയുടെ പരമാവധി പ്രയോജനം കൈവരിക്കുന്നതിനും ഈ ഗൈഡ് നിങ്ങളെ സഹായിക്കും.
              </p>
              <p>
                ഖുർആന്റെ സന്ദേശം കൂടുതൽ ആഴത്തിൽ മനസ്സിലാക്കാനും, പഠനയാത്രയെ കൂടുതൽ ക്രമബദ്ധവും ഫലപ്രദവുമാക്കാനും ആഗ്രഹിക്കുന്ന ഓരോ ഉപയോക്താവിനും ഈ ഗൈഡ് ഒരു വിശ്വസനീയ സഹയാത്രികനാണ്.
              </p>
            </div>
            {/* How to read this guide */}
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-cyan-100 dark:border-cyan-900/40 bg-cyan-50/60 dark:bg-cyan-900/10 px-4 py-3 text-[14.5px] text-gray-600 dark:text-gray-300 font-malayalam">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 text-white text-[11px] font-bold shrink-0 mt-0.5">
                1
              </span>
              <span className="text-justify leading-relaxed">ചിത്രങ്ങളിലെ <span className="text-[#2AA0BF] font-semibold">നീല വൃത്ത നമ്പറുകൾ</span> ഈ ഗൈഡിൽ വിശദീകരിച്ചിരിക്കുന്ന അനുബന്ധ ഘട്ടങ്ങളെ സൂചിപ്പിക്കുന്നവയാണ്. കൂടുതൽ വ്യക്തതയ്ക്കായി നമ്പറുകളുടെ ക്രമം പിന്തുടരുക.</span>
            </div>
          </div>
        </div>
        {/* Mobile quick navigation (hidden on lg+) */}
        <nav className="lg:hidden mb-8 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sections.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => handleNavClick(e, s.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[13px] font-medium transition-all shadow-sm font-malayalam outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                activeId === s.id
                  ? 'border-[#2AA0BF] bg-cyan-50 dark:bg-cyan-900/20 text-[#2AA0BF]'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1b1d27] text-gray-700 dark:text-gray-200 hover:border-[#2AA0BF] hover:text-[#2AA0BF]'
              }`}
            >
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${
                activeId === s.id ? 'bg-[#2AA0BF] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}>
                {i + 1}
              </span>
              <span className="truncate">{s.title}</span>
            </a>
          ))}
        </nav>

        {/* Sidebar + Content layout */}
        <div className="flex gap-6 relative">
          {/* Sticky Sidebar */}
          <aside className="hidden lg:block w-[280px] shrink-0">
            <div className="sticky top-[72px] max-h-[calc(100vh-88px)] flex flex-col rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1b1d27] shadow-sm overflow-hidden">
              {/* Fixed heading — never scrolls */}
              <div className="px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-700 shrink-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">ഉള്ളടക്കം</h3>
              </div>
              {/* Scrollable list */}
              <nav ref={sidebarRef} className="overflow-y-auto flex-1 p-3">
              <div className="space-y-1.5">
                {sections.map((s, i) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    data-section-id={s.id}
                    onClick={(e) => handleNavClick(e, s.id)}
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[13px] font-medium transition-all font-malayalam outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                      activeId === s.id
                        ? 'border-[#2AA0BF] bg-cyan-50 dark:bg-cyan-900/30 text-[#2AA0BF] shadow-sm'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:border-[#2AA0BF] hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:text-[#2AA0BF]'
                    }`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold transition-colors ${
                      activeId === s.id
                        ? 'bg-[#2AA0BF] text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="truncate">{s.title}</span>
                  </a>
                ))}
              </div>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Steps */}
            <div className="space-y-8">
              {sections.map((s, i) => (
                <div id={s.id} key={s.id} data-guide-section>
                  <GuideStep
                    index={i + 1}
                    icon={s.icon}
                    title={s.title}
                    intro={s.intro}
                    steps={s.steps}
                    tip={s.tip}
                    image={s.image}
                    image2={s.image2}
                    alt={s.alt}
                    annotations={s.annotations}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-12 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1b1d27] p-8 text-center shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white font-malayalam mb-2">
           ഖുർആൻ പഠനവും വിജ്ഞാന സമ്പാദനവും കൂടുതൽ എളുപ്പമാക്കാം.
          </h3>
          <p className="text-[15px] text-gray-600 dark:text-gray-300 font-malayalam mb-6">
          </p>
          <button
            onClick={() => { navigate("/"); window.scrollTo({ top: 0, behavior: "instant" }); }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2AA0BF] px-6 py-3 text-white font-medium hover:bg-cyan-600 transition-colors font-malayalam outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cyan-500 dark:focus-visible:ring-offset-[#1b1d27]"
          >
            <BookOpen className="h-5 w-5" /> ഹോമിലേക്ക് പോകുക
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserGuide;
