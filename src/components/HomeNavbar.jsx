import { useState, useEffect, useRef, useCallback } from "react";
import {
  Menu,
  Search,
  Settings,
  Moon,
  Sun,
  Languages,
  Bookmark,
  X,
  Home,
  FileText,
  User,
  BookOpen,
  Info,
  Zap,
  Heart,
  Download,
  Sparkles,
  Bug,
  Share,
  Users,
  UserCheck,
  Mail,
  MessageSquare,
  Shield,
  HelpCircle,
  Trash2,
  LogOut,
  ChevronRight,
  ChevronLeft,
  BookA,
  Book,
  LaptopMinimal,
  BookUser,
  BookType,
  BookOpenCheck,
  LetterText,
  MessageCircleQuestion,
  CircleAlert,
  MessageSquareMore,
  UserX,
  ChevronDown,
  Copy,
  ExternalLink,
  Send,
  FolderOpen,
  Bell,
  LibraryBig,
} from "lucide-react";
import logoBlack from "../assets/logo-black.png";
import logoWhite from "../assets/logo-white.png";
import { useNavigate, useLocation } from "react-router-dom";
import Transition from "./Transition";
import SearchConsole from "./SearchConsole";
import LanguageConsole from "./LanguageConsole";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useAnalytics } from "../context/AnalyticsContext";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import SettingsDrawer from "../pages/Settings";

const HomepageNavbar = () => {
  const { theme, toggleTheme, setViewType, translationLanguage, setTranslationLanguage, audioTypes, setAudioTypes, playbackSpeed, setPlaybackSpeed, reciter, setReciter, getAvailableAudioTypes } = useTheme();
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const [navbarHeight, setNavbarHeight] = useState(0);
  const [urduMenuTranslations, setUrduMenuTranslations] = useState({});
  const navRef = useRef(null);
  const lastScrollY = useRef(0);

  const navigate = useNavigate();
  const location = useLocation(); // Get current route
  const isUrdu = translationLanguage === 'ur';
  const isReaderPage =
    location.pathname.startsWith("/reading") ||
    location.pathname.startsWith("/surah") ||
    location.pathname.startsWith("/blockwise");
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleSubmenu = (index) =>
    setOpenSubmenu(openSubmenu === index ? null : index);

  // Lock body scroll when side menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  // Resolve share URL from env or current origin
  const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || window.location.origin;

  // Share App handler (uses Web Share API with clipboard/modal fallback)
  const handleShareApp = async () => {
    const shareUrl = `${PUBLIC_URL}/?lang=${translationLanguage}`;
    const shareData = {
      title: "Thafheem ul Quran",
      text: "Explore Thafheem ul Quran",
      url: shareUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        setIsShareOpen(true);
      }
    } catch (error) {
      console.error("Share failed:", error);
      setIsShareOpen(true);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut(auth);
      setIsSignOutConfirmOpen(false);
      navigate("/"); // Redirect to home page after successful logout
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  // Redirect away from Blockwise when language doesn't support it
  useEffect(() => {
    // Languages without Blockwise support
    const noBlockwise = new Set(["ta", "hi", "bn", "ur"]);
    if (location.pathname.startsWith("/blockwise/") && noBlockwise.has(translationLanguage)) {
      const match = location.pathname.match(/\/blockwise\/(\d+)/);
      const currentSurahId = match ? match[1] : undefined;
      if (currentSurahId) {
        navigate(`/surah/${currentSurahId}`, { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [translationLanguage, location.pathname, navigate]);

  // Close the sign out confirmation with Escape
  useEffect(() => {
    if (!isSignOutConfirmOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !isSigningOut) setIsSignOutConfirmOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isSignOutConfirmOpen, isSigningOut]);

  const handleAuthButtonClick = () => {
    if (user) {
      setIsSignOutConfirmOpen(true);
    } else {
      navigate("/sign");
    }
  };

  // Malayalam menu items
  const malayalamMenuItems = [
    { icon: Home, label: "ഹോം", path: "/", key: "home" },
    { icon: FileText, label: "സയ്യിദ് മൗദൂദി", path: "/maududi", key: "sayyid_maududi" },
    {
      icon: Book,
      label: "തഫ്ഹീം ഖുർആൻ",
      path: "/authorpreface",
      key: "thafheemul_quran",
      hasSubmenu: true,
      hasArrow: true,
      submenuItems: [
        { label: "ആമുഖം", path: "/authorpreface", key: "authors_preface" },
        { label: "ഉപസംഹാരം", path: "/authorconclusion", key: "authors_conclusion" },
      ],
    },
    {
      icon: FolderOpen,
      label: "ലൈബ്രററി",
      path: "/appendix/malayalam",
      key: "library",
      hasSubmenu: true,
      hasArrow: true,
      submenuItems: [
        { label: "അനുബന്ധം", path: "/appendix/malayalam", key: "appendix" },
        { label: "യേശുവും മുഹമ്മദും", path: "/malayalam/jesus-mohammed", key: "jesus_mohammed" },
        { label: "ഖുർആൻപഠനത്തിന് ഒരു മുഖവുര", path: "/introduction-to-quran", key: "introduction_to_quran" },
        { label: "പ്രവാചകത്വ പരിസമാപ്തി", path: "/malayalam/finality-of-prophethood", key: "finality_of_prophethood" },
        { label: "സാങ്കേതിക പദങ്ങൾ", path: "/technical-terms", key: "technical_terms" },
        { label: "വിവര്‍ത്തകര്‍", path: "/translators", key: "translators" },
        { label: "തര്‍ജമയുടെ ചരിത്രം", path: "/history-of-translation", key: "history_of_translation" },
      ],
    },
    { icon: LibraryBig, label: "സുജൂദിന്റെ ആയത്തുകൾ", path: "/sujud-ayahs", key: "sujud_ayahs" },
    { icon: BookType, label: "തജ്‌വീദ്", path: "/tajweed", key: "tajwid" },
    { icon: BookOpenCheck, label: "തഫ്ഹീം പ്രശ്നോത്തരി", path: "/quiz", key: "quiz" },
    { icon: LetterText, label: "ഡ്രാ​ഗ്  & ഡ്രോപ്", path: "/dragdrop", key: "drag_drop" },
    { icon: HelpCircle, label: "User Guide", path: "/user-guide", key: "user_guide", highlight: true },
    { icon: User, label: "ഞങ്ങളെക്കുറിച്ച്", path: "/about", key: "about_us" },
    { icon: MessageSquareMore, label: "Contact Us", path: "/contact", key: "contact_us" },
    { icon: MessageCircleQuestion, label: "Share app", onClick: handleShareApp, key: "share_app" },
    { icon: MessageSquare, label: "Feedback", path: "/feedback", key: "feedback" },
    { icon: Shield, label: "Privacy", onClick: () => window.open("https://d4dx.co/privacy-policy/", "_blank"), key: "privacy" },
  ];

  // English menu items
  const englishMenuItems = [
    { icon: Home, label: "Home", path: "/", key: "home" },
    { icon: FileText, label: "Sayyid Maududi", path: "/maududi", key: "sayyid_maududi" },
    {
      icon: Book,
      label: "Thafheemul Quran",
      path: "/authorpreface",
      key: "thafheemul_quran",
      hasSubmenu: true,
      hasArrow: true,
      submenuItems: [
        { label: "Author's Preface", path: "/authorpreface", key: "authors_preface" },
        { label: "Author's Conclusion", path: "/authorconclusion", key: "authors_conclusion" },
      ],
    },
    {
      icon: FolderOpen,
      label: "Library",
      path: "/appendix/english",
      key: "library",
      hasSubmenu: true,
      hasArrow: true,
      submenuItems: [
        { label: "Appendix", path: "/appendix/english", key: "appendix" },
        { label: "Jesus and Mohammed", path: "/english/jesus-mohammed", key: "jesus_mohammed" },
        { label: "An Introduction to the Quran", path: "/introduction-to-quran", key: "introduction_to_quran" },
        { label: "The Finality of Prophethood", path: "/english/finality-of-prophethood", key: "finality_of_prophethood" },
        { label: "Technical Terms", path: "/technical-terms", key: "technical_terms" },
        { label: "English Translation", path: "/englishtranslate", key: "english_translation" },
      ],
    },
    { icon: LibraryBig, label: "Prostration Verses", path: "/sujud-ayahs", key: "sujud_ayahs" },
    { icon: LetterText, label: "Drag and Drop", path: "/dragdrop", key: "drag_drop" },
    { icon: User, label: "About Us", path: "/about", key: "about_us" },
    { icon: MessageSquareMore, label: "Contact Us", path: "/contact", key: "contact_us" },
    { icon: MessageCircleQuestion, label: "Share app", onClick: handleShareApp, key: "share_app" },
    { icon: MessageSquare, label: "Feedback", path: "/feedback", key: "feedback" },
    { icon: Shield, label: "Privacy", onClick: () => window.open("https://d4dx.co/privacy-policy/", "_blank"), key: "privacy" },
  ];

  // Urdu menu items
  const urduMenuItems = [
    { icon: Home, label: "صفحہ اول", path: "/", key: "home" },
    { icon: FileText, label: "سید مودودی", path: "/maududi", key: "sayyid_maududi" },
    {
      icon: Book,
      label: "تفہیم القرآن",
      path: "/authorpreface",
      key: "thafheemul_quran",
      hasSubmenu: true,
      hasArrow: true,
      submenuItems: [
        { label: "مصنف کا دیباچہ", path: "/authorpreface", key: "authors_preface" },
        { label: "مصنف کا اختتامیہ", path: "/authorconclusion", key: "authors_conclusion" },
      ],
    },
    {
      icon: FolderOpen,
      label: "لائبریری",
      path: "/appendix/urdu",
      key: "library",
      hasSubmenu: true,
      hasArrow: true,
      submenuItems: [
        { label: "ضمیمہ", path: "/appendix/urdu", key: "appendix" },
        { label: "عیسیٰ اور محمد", path: "/urdu/jesus-mohammed", key: "jesus_mohammed" },
        { label: "قرآن کا تعارف", path: "/introduction-to-quran", key: "introduction_to_quran" },
        { label: "ختم نبوت", path: "/urdu/finality-of-prophethood", key: "finality_of_prophethood" },
        { label: "اصطلاحات", path: "/technical-terms", key: "technical_terms" },
      ],
    },
    { icon: LibraryBig, label: "سجدہ والی آیات", path: "/sujud-ayahs", key: "sujud_ayahs" },
    { icon: LetterText, label: "کھینچیں اور چھوڑیں", path: "/dragdrop", key: "drag_drop" },
    { icon: User, label: "ہمارے بارے میں", path: "/about", key: "about_us" },
    { icon: MessageSquareMore, label: "ہم سے رابطہ کریں", path: "/contact", key: "contact_us" },
    { icon: MessageCircleQuestion, label: "ایپ شیئر کریں", onClick: handleShareApp, key: "share_app" },
    { icon: MessageSquare, label: "فیڈ بیک", path: "/feedback", key: "feedback" },
    { icon: Shield, label: "Privacy", onClick: () => window.open("https://d4dx.co/privacy-policy/", "_blank"), key: "privacy" },
  ];

  // Hindi menu items
  const hindiMenuItems = [
    { icon: Home, label: "मुखपृष्ठ", path: "/", key: "home" },
    { icon: FileText, label: "सैय्यद मौदूदी", path: "/maududi", key: "sayyid_maududi" },
    {
      icon: Book,
      label: "तफहीम-उल-कुरान",
      path: "/authorpreface",
      key: "thafheemul_quran",
      hasSubmenu: true,
      hasArrow: true,
      submenuItems: [
        { label: "लेखक की प्रस्तावना", path: "/authorpreface", key: "authors_preface" },
        { label: "लेखक का निष्कर्ष", path: "/authorconclusion", key: "authors_conclusion" },
      ],
    },
    {
      icon: FolderOpen,
      label: "पुस्तकालय",
      path: "/appendix/hindi",
      key: "library",
      hasSubmenu: true,
      hasArrow: true,
      submenuItems: [
        { label: "परिशिष्ट", path: "/appendix/hindi", key: "appendix" },
        { label: "ईसा और मुहाम्मद", path: "/hindi/jesus-mohammed", key: "jesus_mohammed" },
        { label: "कुरान का परिचय", path: "/introduction-to-quran", key: "introduction_to_quran" },
        { label: "नबीत्व की पूर्णता / खत्मे नबूवत", path: "/hindi/finality-of-prophethood", key: "finality_of_prophethood" },
        { label: "पारिभाषिक शब्दावली", path: "/technical-terms", key: "technical_terms" },
      ],
    },
    { icon: LibraryBig, label: "सजदा वाली आयतें", path: "/sujud-ayahs", key: "sujud_ayahs" },
    { icon: LetterText, label: "खींचें और छोड़ें", path: "/dragdrop", key: "drag_drop" },
    { icon: User, label: "हमारे बारे में", path: "/about", key: "about_us" },
    { icon: MessageSquareMore, label: "हमसे संपर्क करें", path: "/contact", key: "contact_us" },
    { icon: MessageCircleQuestion, label: "Share app", onClick: handleShareApp, key: "share_app" },
    { icon: MessageSquare, label: "Feedback", path: "/feedback", key: "feedback" },
    { icon: Shield, label: "Privacy", onClick: () => window.open("https://d4dx.co/privacy-policy/", "_blank"), key: "privacy" },
  ];

  // Bangla menu items
  const banglaMenuItems = [
    { icon: Home, label: "মূল পাতা", path: "/", key: "home" },
    { icon: FileText, label: "সাইয়েদ মওদুদী", path: "/maududi", key: "sayyid_maududi" },
    {
      icon: Book,
      label: "তাফহীম-উল-কুরআন",
      path: "/authorpreface",
      key: "thafheemul_quran",
      hasSubmenu: true,
      hasArrow: true,
      submenuItems: [
        { label: "লেখকের ভূমিকা", path: "/authorpreface", key: "authors_preface" },
        { label: "লেখকের উপসংহার", path: "/authorconclusion", key: "authors_conclusion" },
      ],
    },
    {
      icon: FolderOpen,
      label: "পাঠাগার",
      path: "/appendix/bangla",
      key: "library",
      hasSubmenu: true,
      hasArrow: true,
      submenuItems: [
        { label: "পরিশিষ্ট", path: "/appendix/bangla", key: "appendix" },
        { label: "ঈসা ও মুহাম্মদ", path: "/bangla/jesus-mohammed", key: "jesus_mohammed" },
        { label: "কুরআন পরিচিতি", path: "/introduction-to-quran", key: "introduction_to_quran" },
        { label: "নবুওয়াতের পরিসমাপ্তি / খতমে নবুওয়াত", path: "/bangla/finality-of-prophethood", key: "finality_of_prophethood" },
        { label: "পরিভাষা", path: "/technical-terms", key: "technical_terms" },
      ],
    },
    { icon: LibraryBig, label: "সিজদাহর আয়াতসমূহ", path: "/sujud-ayahs", key: "sujud_ayahs" },
    { icon: LetterText, label: "টেনে এনে ছেড়ে দিন", path: "/dragdrop", key: "drag_drop" },
    { icon: User, label: "আমাদের সম্পর্কে", path: "/about", key: "about_us" },
    { icon: MessageSquareMore, label: "যোগাযোগ করুন", path: "/contact", key: "contact_us" },
    { icon: MessageCircleQuestion, label: "Share app", onClick: handleShareApp, key: "share_app" },
    { icon: MessageSquare, label: "Feedback", path: "/feedback", key: "feedback" },
    { icon: Shield, label: "Privacy", onClick: () => window.open("https://d4dx.co/privacy-policy/", "_blank"), key: "privacy" },
  ];

  // Tamil menu items
  const tamilMenuItems = [
    { icon: Home, label: "முகப்பு", path: "/", key: "home" },
    { icon: FileText, label: "சையித் மௌதூதி", path: "/tamil/sayyid-maududi", key: "sayyid_maududi" },
    {
      icon: Book,
      label: "தஃப்ஹீமுல் குர்ஆன்",
      path: "/tamil/author-preface",
      key: "thafheemul_quran",
      hasSubmenu: true,
      hasArrow: true,
      submenuItems: [
        { label: "ஆசிரியரின் முன்னுரை", path: "/tamil/author-preface", key: "authors_preface" },
        { label: "ஆசிரியரின் முடிவுரை", path: "/tamil/author-conclusion", key: "authors_conclusion" },
      ],
    },
    {
      icon: FolderOpen,
      label: "நூலகம்",
      path: "/appendix/tamil",
      key: "library",
      hasSubmenu: true,
      hasArrow: true,
      submenuItems: [
        { label: "பின்னிணைப்பு", path: "/appendix/tamil", key: "appendix" },
        { label: "ईसा और मुहाम्मद", path: "/tamil/jesus-mohammed", key: "jesus_mohammed" },
        { label: "குர்ஆன் அறிமுகம்", path: "/introduction-to-quran", key: "introduction_to_quran" },
        { label: "நபித்துவத்தின் முழுமை / கத்மே நுபுவ்வத்", path: "/tamil/finality-of-prophethood", key: "finality_of_prophethood" },
        { label: "கலைச்சொற்கள்", path: "/technical-terms", key: "technical_terms" },
      ],
    },
    { icon: LibraryBig, label: "ஸஜ்தாவுடைய வசனங்கள்", path: "/sujud-ayahs", key: "sujud_ayahs" },
    { icon: LetterText, label: "இழுத்து விடுங்கள்", path: "/dragdrop", key: "drag_drop" },
    { icon: User, label: "எங்களைப் பற்றி", path: "/about", key: "about_us" },
    { icon: MessageSquareMore, label: "எங்களைத் தொடர்புகொள்ள", path: "/contact", key: "contact_us" },
    { icon: MessageCircleQuestion, label: "Share app", onClick: handleShareApp, key: "share_app" },
    { icon: MessageSquare, label: "Feedback", path: "/feedback", key: "feedback" },
    { icon: Shield, label: "Privacy", onClick: () => window.open("https://d4dx.co/privacy-policy/", "_blank"), key: "privacy" },
  ];

  // Base menu items with English labels (for non-Malayalam languages)
  const baseMenuItems = [
    { icon: Home, label: "Home", path: "/", key: "home" },
    { icon: BookOpen, label: "Table of Contents", path: "/tablecontents", key: "table_of_contents" },
    { icon: FileText, label: "Sayyid Maududi", path: "/maududi", key: "sayyid_maududi" },
    { icon: BookA, label: "English Translation", path: "/englishtranslate", key: "english_translation" },
    {
      icon: Book,
      label: "Library",
      path: "/authorpreface",
      key: "introduction",
      hasSubmenu: true,
      hasArrow: true,
      submenuItems: [
        { label: "Author's Preface", path: "/authorpreface", key: "authors_preface" },
        { label: "Author's Conclusion", path: "/authorconclusion", key: "authors_conclusion" },
        { label: "An Introduction to the Quran", path: "/introduction-to-quran", key: "introduction_to_quran" },
      ],
    },
    {
      icon: FolderOpen,
      label: "Appendix",
      path: "/appendix/english",
      key: "appendix",
      hasSubmenu: true,
      hasArrow: true,
      submenuItems: [
        { label: "Malayalam Appendix", path: "/appendix/malayalam", key: "malayalam_appendix" },
        { label: "English Appendix", path: "/appendix/english", key: "english_appendix" },
        { label: "Urdu Appendix", path: "/appendix/urdu", key: "urdu_appendix" },
      ],
    },
    {
      icon: Book,
      label: "The Finality of Prophethood",
      path: "/urdu/finality-of-prophethood",
      key: "urdu_finality_of_prophethood",
    },
    {
      icon: Book,
      label: "Jesus and Mohammed",
      path: "/urdu/jesus-mohammed",
      key: "urdu_jesus_mohammed",
    },
    { icon: LaptopMinimal, label: "Digitisation", path: "/digitisation", key: "digitisation" },
    { icon: BookType, label: "Tajwid", path: "/tajweed", key: "tajwid" },
    { icon: Sparkles, label: "What's New", path: "/whatsnew", key: "whats_new" },
    { icon: MessageCircleQuestion, label: "Share App", onClick: handleShareApp, key: "share_app" },
    { icon: User, label: "About Us", path: "/about", key: "about_us" },
    { icon: MessageSquareMore, label: "Contact Us", path: "/contact", key: "contact_us" },
    { icon: Shield, label: "Privacy", onClick: () => window.open("https://d4dx.co/privacy-policy/", "_blank"), key: "privacy" },
  ];

  // Helper function to get translated label
  // Tamil uses Urdu translations for now
  const getTranslatedLabel = (key, defaultLabel) => {
    if ((translationLanguage === 'ur' || translationLanguage === 'ta') && urduMenuTranslations[key]) {
      return urduMenuTranslations[key];
    }
    return defaultLabel;
  };

  // Select menu items based on language
  const selectedMenuItems = 
    translationLanguage === 'mal' ? malayalamMenuItems :
    translationLanguage === 'E' ? englishMenuItems :
    translationLanguage === 'ur' ? urduMenuItems :
    translationLanguage === 'ta' ? tamilMenuItems :
    translationLanguage === 'hi' ? hindiMenuItems :
    translationLanguage === 'bn' ? banglaMenuItems :
    baseMenuItems;

  // Create menu items with translations applied
  const menuItems = selectedMenuItems.map(item => ({
    ...item,
    label: getTranslatedLabel(item.key, item.label),
    submenuItems: item.submenuItems?.map(subItem => ({
      ...subItem,
      label: getTranslatedLabel(subItem.key, subItem.label)
    }))
  }));

  const baseDangerMenuItems = [
    {
      icon: UserX,
      label: "Delete Account",
      path: "/deleteaccount",
      key: "delete_account",
      isDanger: true,
    },
    { icon: LogOut, label: "Log Out", path: "/logout", key: "log_out", isDanger: true },
  ];

  // Create danger menu items with translations applied
  const dangerMenuItems = baseDangerMenuItems.map(item => ({
    ...item,
    label: getTranslatedLabel(item.key, item.label)
  }));

  // Helper function to determine if a menu item is active
  const isActive = (path) => location.pathname === path;
  const handleBookmarkClick = () => {
    // Navigate to bookmarks page - users can then click on their preferred tab
    navigate("/bookmarkedverses");
  };

  // Urdu side menu translations - will be hardcoded later
  // Removed API call - translations will be hardcoded
  useEffect(() => {
    if (translationLanguage !== 'ur') {
      // Clear Urdu translations when language is not Urdu
      setUrduMenuTranslations({});
    }
  }, [translationLanguage]);

  useEffect(() => {
    if (typeof window === "undefined" || !navRef.current) {
      return;
    }

    const updateNavbarHeight = () => setNavbarHeight(navRef.current.offsetHeight || 0);

    updateNavbarHeight();
    // ResizeObserver (not just window resize) so height stays in sync when
    // the navbar's own padding changes size, e.g. reader-page padding after
    // a client-side route change that doesn't remount this component.
    const resizeObserver = new ResizeObserver(updateNavbarHeight);
    resizeObserver.observe(navRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    lastScrollY.current = window.scrollY;
    setIsNavbarVisible(true);

    if (!isReaderPage) {
      return;
    }

    const handleScroll = () => {
      const currentScroll = window.scrollY;
      const delta = Math.abs(currentScroll - lastScrollY.current);

      if (delta < 4) {
        return;
      }

      let nextVisible = true;

      if (currentScroll < 80) {
        nextVisible = true;
      } else if (currentScroll > lastScrollY.current) {
        nextVisible = false;
      } else {
        nextVisible = true;
      }

      setIsNavbarVisible((prev) => (prev === nextVisible ? prev : nextVisible));
      lastScrollY.current = currentScroll;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isReaderPage, location.pathname]);
  return (
    <>
      {/* Share Modal */}
      {isShareOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30" onClick={() => setIsShareOpen(false)}></div>
          <div className="relative z-10 w-full max-w-sm rounded-lg bg-white dark:bg-[#1C1C1E] p-4 shadow-xl">
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Share className="w-5 h-5" /> Share Thafheem
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Invite others with your favorite app or copy the link.</p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  const url = `${PUBLIC_URL}/?lang=${translationLanguage}`;
                  const text = encodeURIComponent("Explore Thafheem ul Quran");
                  const u = encodeURIComponent(url);
                  window.open(`https://wa.me/?text=${text}%20${u}`, "_blank");
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-[#25D366] text-white hover:opacity-90 transition"
              >
                <Send className="w-4 h-4" /> WhatsApp
              </button>
              <button
                onClick={() => {
                  const url = `${PUBLIC_URL}/?lang=${translationLanguage}`;
                  const text = encodeURIComponent("Explore Thafheem ul Quran");
                  const u = encodeURIComponent(url);
                  window.open(`https://t.me/share/url?url=${u}&text=${text}`, "_blank");
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-[#229ED9] text-white hover:opacity-90 transition"
              >
                <ExternalLink className="w-4 h-4" /> Telegram
              </button>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={`${PUBLIC_URL}/?lang=${translationLanguage}`}
                  className="flex-1 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100"
                />
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(`${PUBLIC_URL}/?lang=${translationLanguage}`);
                    alert("Link copied to clipboard");
                  }}
                  className="px-3 py-2 rounded-md bg-gray-900 text-white dark:bg-gray-700 hover:opacity-90 transition flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" /> Copy
                </button>
              </div>
              <button
                onClick={() => setIsShareOpen(false)}
                className="w-full mt-1 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Search Console Popup */}
      {isSearchOpen && (
        <SearchConsole 
          onClose={() => setIsSearchOpen(false)} 
          translationLanguage={translationLanguage}
        />
      )}

      {/* Language Console Popup */}
      {isLanguageOpen && (
        <LanguageConsole
          onClose={() => setIsLanguageOpen(false)}
          selectedLanguage={
            translationLanguage === 'E' ? 'English' :
              translationLanguage === 'ta' ? 'Tamil' :
                translationLanguage === 'hi' ? 'Hindi' :
                  translationLanguage === 'ur' ? 'Urdu' :
                    translationLanguage === 'bn' ? 'Bangla' :
                      'Malayalam'
          }
          onLanguageSelect={(lang) => {
            // Map UI selection to API language codes
            let code = 'mal'; // default to Malayalam
            if (lang.code?.toLowerCase() === 'en') {
              code = 'E';
            } else if (lang.code?.toLowerCase() === 'ta') {
              code = 'ta';
            } else if (lang.code?.toLowerCase() === 'hi') {
              code = 'hi';
            } else if (lang.code?.toLowerCase() === 'ur') {
              code = 'ur';
            } else if (lang.code?.toLowerCase() === 'bn') {
              code = 'bn';
            }
            // Analytics — track which language a user switched TO.
            // (skip 'E' because the dashboard treats en as 'en' below)
            const fromCode = translationLanguage;
            const toCode = code === 'E' ? 'en' : code;
            if (analytics) {
              analytics.trackLanguageChange(fromCode === 'E' ? 'en' : fromCode, toCode);
            }
            setTranslationLanguage(code);
            setIsLanguageOpen(false);
          }}
        />
      )}

      <nav
        ref={navRef}
        className={`bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-md w-full z-[80] border-b border-gray-200/50 dark:border-gray-700/50 ${isReaderPage ? "shadow-none" : "shadow-lg shadow-gray-200/50 dark:shadow-black/20"
          } sticky top-0 transition-all duration-300 ${isReaderPage && !isNavbarVisible ? "-translate-y-full" : ""
          }`}
      >
        <div
          className={`flex items-center justify-between ${isUrdu ? "flex-row-reverse" : ""} px-3 sm:px-4 ${isReaderPage ? "py-2 sm:py-2.5" : "py-2.5 sm:py-3"
            }`}
        >
          {/* Left side */}
          <div className={`flex items-center shrink-0 gap-2 sm:gap-3 ${isUrdu ? "mr-2 sm:mr-4 flex-row-reverse" : "ml-2 sm:ml-4"}`}>
            <button
              onClick={toggleMenu}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              className="group relative flex items-center space-x-2 p-2 sm:px-3 sm:py-2 
             text-gray-700 dark:text-gray-200 
             hover:text-[#2596be] dark:hover:text-[#62C3DC] 
             hover:bg-gradient-to-br hover:from-cyan-50 hover:to-blue-50 
             dark:hover:bg-gradient-to-br dark:hover:from-gray-800 dark:hover:to-gray-700 
             rounded-xl transition-all duration-300 ease-out
             min-h-[44px] min-w-[44px] justify-center 
             sm:min-h-auto sm:min-w-auto sm:justify-start
             hover:shadow-md hover:scale-105 active:scale-95"
              title={isMenuOpen ? "Close menu" : "Open menu"}
            >
              <Menu size={18} className="sm:w-5 sm:h-5 transition-transform duration-300 group-hover:rotate-180" />
            </button>

            <button
              onClick={() => {
                navigate('/');
                // Scroll to top when navigating to home
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center shrink-0 cursor-pointer hover:opacity-80 transition-all duration-300 hover:scale-105 active:scale-95"
              aria-label="Go to home page"
            >
              <img
                src={theme === 'dark' ? logoWhite : logoBlack}
                alt="Thafheem ul Quran"
                className="h-6 sm:h-7 w-auto min-w-[40px] select-none drop-shadow-sm"
                draggable="false"
              />
            </button>
          </div>

          {/* Right side */}
          <div className={`flex items-center gap-1.5 sm:gap-2 ${isUrdu ? "ml-1 sm:ml-4 flex-row-reverse" : "mr-1 sm:mr-4"}`}>
            {/* Language Button */}
            <button
              onClick={() => setIsLanguageOpen(true)}
              aria-label="Change language"
              className="group relative p-2 sm:p-2.5 text-gray-700 dark:text-gray-200 
                hover:text-white hover:bg-gradient-to-br hover:from-[#62C3DC] hover:to-[#3FA6C0] 
                dark:hover:from-[#3FA6C0] dark:hover:to-[#2596be] 
                rounded-xl transition-all duration-300 ease-out
                min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] 
                flex items-center justify-center
                hover:shadow-lg hover:shadow-cyan-500/30 hover:scale-110 active:scale-95"
              title="Change language"
            >
              <Languages size={15} className="sm:w-[18px] sm:h-[18px] transition-all duration-300 group-hover:rotate-12" />
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="group relative p-2 sm:p-2.5 text-gray-700 dark:text-gray-200 
                hover:text-white hover:bg-gradient-to-br hover:from-[#62C3DC] hover:to-[#3FA6C0] 
                dark:hover:from-[#3FA6C0] dark:hover:to-[#2596be] 
                rounded-xl transition-all duration-300 ease-out
                min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] 
                flex items-center justify-center
                hover:shadow-lg hover:shadow-cyan-500/30 hover:scale-110 active:scale-95"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <Sun size={15} className="sm:w-[18px] sm:h-[18px] transition-all duration-300 group-hover:rotate-180" />
              ) : (
                <Moon size={15} className="sm:w-[18px] sm:h-[18px] transition-all duration-300 group-hover:-rotate-12" />
              )}
            </button>

            {/* Bookmark Button - Only show when user is logged in */}
            {user && (
              <button
                onClick={handleBookmarkClick}
                aria-label="View bookmarks"
                className="group relative p-2 sm:p-2.5 text-gray-700 dark:text-gray-200 
                  hover:text-white hover:bg-gradient-to-br hover:from-[#62C3DC] hover:to-[#3FA6C0] 
                  dark:hover:from-[#3FA6C0] dark:hover:to-[#2596be] 
                  rounded-xl transition-all duration-300 ease-out
                  min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] 
                  flex items-center justify-center
                  hover:shadow-lg hover:shadow-cyan-500/30 hover:scale-110 active:scale-95"
                title="View bookmarks"
              >
                <Bookmark size={15} className="sm:w-[18px] sm:h-[18px] transition-all duration-300 group-hover:scale-110 group-hover:fill-current" />
              </button>
            )}

            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Open settings"
              className="group relative p-2 sm:p-2.5 text-gray-700 dark:text-gray-200 
                hover:text-white hover:bg-gradient-to-br hover:from-[#62C3DC] hover:to-[#3FA6C0] 
                dark:hover:from-[#3FA6C0] dark:hover:to-[#2596be] 
                rounded-xl transition-all duration-300 ease-out
                min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] 
                flex items-center justify-center
                hover:shadow-lg hover:shadow-cyan-500/30 hover:scale-110 active:scale-95"
              title="Open settings"
            >
              <Settings size={18} className="transition-all duration-300 group-hover:rotate-90" />
            </button>
            {isSettingsOpen && (
              <SettingsDrawer onClose={() => setIsSettingsOpen(false)} />
            )}

            {/* Search Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="group relative p-2 sm:p-2.5 text-gray-700 dark:text-gray-200 
                hover:text-white hover:bg-gradient-to-br hover:from-[#62C3DC] hover:to-[#3FA6C0] 
                dark:hover:from-[#3FA6C0] dark:hover:to-[#2596be] 
                rounded-xl transition-all duration-300 ease-out
                min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] 
                flex items-center justify-center
                hover:shadow-lg hover:shadow-cyan-500/30 hover:scale-110 active:scale-95"
              title="Search"
            >
              <Search size={15} className="sm:w-[18px] sm:h-[18px] transition-all duration-300 group-hover:scale-110" />
            </button>

            {/* Auth Button */}
            {user ? (
              <button
                onClick={handleAuthButtonClick}
                disabled={isSigningOut}
                className="group relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 
                  rounded-full text-red-500 
                  hover:bg-gradient-to-br hover:from-red-50 hover:to-red-100 
                  dark:hover:from-red-900/40 dark:hover:to-red-800/40 
                  transition-all duration-300 ease-out
                  disabled:opacity-50 disabled:cursor-not-allowed
                  hover:shadow-lg hover:shadow-red-500/30 hover:scale-110 active:scale-95"
                title="Sign out"
              >
                {isSigningOut ? (
                  <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <LogOut className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${isUrdu ? 'scale-x-[-1] group-hover:-translate-x-0.5' : 'group-hover:translate-x-0.5'}`} />
                )}
              </button>
            ) : (
              <button
                onClick={handleAuthButtonClick}
                className="group relative px-3 py-1.5 xs:px-4 sm:px-5 xs:py-2 sm:py-2.5 text-[9px] xs:text-xs sm:text-sm 
                  bg-white dark:bg-[#1C1C1E] 
                  text-[#2596be] dark:text-[#62C3DC] 
                  border border-[#2596be]/30 dark:border-[#62C3DC]/30 
                  hover:bg-gradient-to-r hover:from-[#2596be] hover:to-[#1e7a9a] 
                  hover:text-white hover:border-[#2596be]
                  rounded-xl transition-all duration-300 ease-out
                  font-medium whitespace-nowrap
                  shadow-sm hover:shadow-md hover:shadow-cyan-500/20 
                  hover:scale-[1.02] active:scale-[0.98]
                  overflow-hidden min-h-[32px] xs:min-h-[36px] sm:min-h-[40px] 
                  flex items-center justify-center
                  backdrop-blur-sm"
                title="Sign in"
              >
                <span className="relative z-10 hidden xs:inline font-semibold text-sm sm:text-base">Sign In</span>
                <span className="relative z-10 xs:hidden text-[15px] font-semibold">Sign in</span>
                <div className="absolute inset-0 bg-gradient-to-r from-[#62C3DC] to-[#2596be] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Route-scoped dropdown bar under the navbar (only on reading/surah/blockwise) - Made STICKY */}
      {isReaderPage && (
        <div
          className="sticky z-[70] transition-all duration-300"
          style={{ top: isNavbarVisible ? navbarHeight : 0 }}
        >
          <Transition showPageInfo={false} />
        </div>
      )}

      {/* Sidebar */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[80]">
          <div
            className="absolute inset-0 bg-black/50 dark:bg-black/70"
            onClick={toggleMenu}
          ></div>
          <div className={`absolute ${isUrdu ? "right-0" : "left-0"} top-0 h-full max-w-[280px] sm:max-w-[300px] md:w-72 bg-white dark:bg-[#1C1C1E] shadow-lg overflow-y-auto overscroll-contain`}>
            <div className={`flex ${isUrdu ? "flex-row-reverse" : ""} items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700`}>
              <img
                src={theme === 'dark' ? logoWhite : logoBlack}
                alt="Thafheemul Quran"
                className="h-10 sm:h-12 w-auto"
              />
              <button
                onClick={() => window.open('https://app.thafheem.net/', '_blank')}
                className="flex items-center gap-2 px-3 py-2 bg-[#2596be] hover:bg-[#1e7a9a] text-white rounded-lg transition-colors duration-200 text-sm font-medium"
              >
                <Heart className="w-4 h-4" />
                <span className="hidden sm:inline">Donate Now</span>
              </button>
              {/* Uncomment if you want to re-enable the close button */}
              {/* <button
                onClick={toggleMenu}
                className="p-1 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X size={20} />
              </button> */}
            </div>

            <div className="py-2 font-poppins">
              {menuItems.map((item, index) => {
                const IconComponent = item.icon;
                // Check if the main menu item or any submenu item is active
                const isMainActive =
                  isActive(item.path) ||
                  (item.hasSubmenu &&
                    item.submenuItems?.some((subItem) =>
                      isActive(subItem.path)
                    ));

                return (
                  <div key={index}>
                    {item.highlight ? (
                      <div className="px-4 sm:px-6 py-2">
                        <button
                          onClick={() => { navigate(item.path); setIsMenuOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 bg-[#2596be] hover:bg-[#1e7a9a] text-white rounded-lg transition-colors duration-200 text-sm font-medium"
                        >
                          <IconComponent className="w-4 h-4 flex-shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      </div>
                    ) : (
                      <>
                    <button
                      onClick={() => {
                        if (item.hasSubmenu) {
                          toggleSubmenu(index);
                        } else if (item.onClick) {
                          item.onClick();
                          setIsMenuOpen(false);
                        } else {
                          if (analytics && item.path) analytics.trackMenuOpen(item.path);
                          navigate(item.path);
                          setIsMenuOpen(false);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3 transition-colors ${translationLanguage === 'ur' ? 'text-right flex-row-reverse' : 'text-left'} min-h-[48px] ${isMainActive
                        ? "bg-[#ebeef0] dark:bg-gray-900 text-black dark:text-white"
                        : "text-black dark:text-white hover:bg-[#ebeef0] dark:hover:bg-gray-900"
                        }`}
                    >
                      <div className={`flex items-center gap-3 ${translationLanguage === 'ur' ? 'flex-row-reverse' : ''}`}>
                        <IconComponent
                          size={18}
                          className={`flex-shrink-0 ${isMainActive
                            ? "text-black dark:text-white "
                            : "text-[#d9d9d9] dark:text-gray-400"
                            }`}
                        />
                        <span
                          className={`leading-tight${
                            translationLanguage === 'ur'
                              ? ' font-urdu-nastaliq text-right'
                              : translationLanguage === 'mal'
                              ? ' font-malayalam text-sm sm:text-sm'
                              : translationLanguage === 'hi'
                              ? ' font-hindi text-base sm:text-base'
                              : translationLanguage === 'bn'
                              ? ' font-bengali text-base sm:text-base'
                              : translationLanguage === 'ta'
                              ? ' font-tamil text-sm sm:text-sm'
                              : ' text-sm sm:text-sm'
                          }`}
                          style={translationLanguage === 'ur' && !item.keepEnglishFont ? { fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif", fontSize: '17px', lineHeight: '2' } : {}}
                          dir={translationLanguage === 'ur' ? 'rtl' : 'ltr'}
                        >
                          {item.label}
                        </span>
                      </div>
                      {item.hasArrow &&
                        (openSubmenu === index ? (
                          <ChevronDown
                            size={16}
                            className="text-black dark:text-white flex-shrink-0 transition-transform"
                          />
                        ) : translationLanguage === 'ur' ? (
                          <ChevronLeft
                            size={16}
                            className="text-black dark:text-white flex-shrink-0 transition-transform"
                          />
                        ) : (
                          <ChevronRight
                            size={16}
                            className="text-black dark:text-white flex-shrink-0 transition-transform"
                          />
                        ))}
                    </button>

                    {item.hasSubmenu && openSubmenu === index && (
                      <div className={`bg-gray-50 dark:bg-[#1C1C1E] ${translationLanguage === 'ur' ? 'mr-4 sm:mr-6' : 'ml-4 sm:ml-6'}`}>
                        {item.submenuItems.map((subItem, subIndex) => {
                          const isSubActive = subItem.path
                            ? isActive(subItem.path)
                            : false;
                          return (
                            <button
                              key={subIndex}
                              onClick={() => {
                                if (subItem.action === "setAyahWise") {
                                  setViewType("Ayah Wise");
                                  navigate("/");
                                  setIsMenuOpen(false);
                                } else if (subItem.action === "setBlockWise") {
                                  setViewType("Block Wise");
                                  navigate("/");
                                  setIsMenuOpen(false);
                                } else if (subItem.path) {
                                  if (analytics) analytics.trackMenuOpen(subItem.path);
                                  navigate(subItem.path);
                                  setIsMenuOpen(false);
                                }
                              }}
                              className={`w-full rounded-xl flex items-center px-4 sm:px-6 py-2 sm:py-2 transition-colors ${translationLanguage === 'ur' ? 'text-right' : 'text-left'} text-sm min-h-[44px] ${isSubActive
                                ? "bg-gray-100 dark:bg-gray-900 text-black dark:text-white"
                                : "text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900"
                                }`}
                              dir={translationLanguage === 'ur' ? 'rtl' : 'ltr'}
                            >
                              <span className={`flex-shrink-0 ${translationLanguage === 'ur' ? 'ml-3' : 'mr-3'}`}>•</span>
                              <span
                                className={`leading-tight${
                                  translationLanguage === 'ur'
                                    ? ' font-urdu-nastaliq text-right'
                                    : translationLanguage === 'mal'
                                    ? ' font-malayalam whitespace-normal text-sm leading-snug'
                                    : translationLanguage === 'hi'
                                    ? ' font-hindi text-base whitespace-nowrap'
                                    : translationLanguage === 'bn'
                                    ? ' font-bengali whitespace-normal text-base leading-snug'
                                    : translationLanguage === 'ta'
                                    ? ' font-tamil whitespace-nowrap'
                                    : ' whitespace-nowrap'
                                }`}
                                style={translationLanguage === 'ur' ? { fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif", fontSize: '16px', lineHeight: '2' } : {}}
                                dir={translationLanguage === 'ur' ? 'rtl' : 'ltr'}
                              >
                                {subItem.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                      </>
                    )}
                  </div>
                );
              })}

              {user && <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>}

              {user && dangerMenuItems.map((item, index) => {
                const IconComponent = item.icon;
                const isDangerActive = isActive(item.path);
                return (
                  <button
                    key={`danger-${index}`}
                    onClick={() => {
                      navigate(item.path);
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 sm:px-6 py-3 transition-colors ${translationLanguage === 'ur' ? 'text-right flex-row-reverse' : 'text-left'} min-h-[48px] ${isDangerActive
                      ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                      : "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                      }`}
                    dir={translationLanguage === 'ur' ? 'rtl' : 'ltr'}
                  >
                    <IconComponent
                      size={18}
                      className={`flex-shrink-0 ${isDangerActive
                        ? "text-red-600 dark:text-red-400"
                        : "text-red-600 dark:text-red-400"
                        }`}
                    />
                    <span className={`text-sm leading-tight${translationLanguage === 'mal' ? ' font-malayalam' : translationLanguage === 'ta' ? ' font-tamil' : ''}`} dir={translationLanguage === 'ur' ? 'rtl' : 'ltr'}>{item.label}</span>
                  </button>
                );
              })}

            </div>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Modal - intentionally English only (no i18n) */}
      {isSignOutConfirmOpen && (
        <div
          className="fixed inset-0 bg-gray-500/70 flex items-center justify-center z-[200] p-4 font-poppins"
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-confirm-title"
          dir="ltr"
          onClick={() => {
            if (!isSigningOut) setIsSignOutConfirmOpen(false);
          }}
        >
          <div
            className="bg-white dark:bg-[#1C1C1E] rounded-lg shadow-xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="signout-confirm-title"
              className="text-xl font-semibold text-gray-900 dark:text-white mb-4"
            >
              Log Out
            </h2>

            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
              Are you sure you want to log out?
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsSignOutConfirmOpen(false)}
                disabled={isSigningOut}
                className="px-4 py-2 text-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSigningOut && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{isSigningOut ? "Logging Out..." : "Log Out"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HomepageNavbar;