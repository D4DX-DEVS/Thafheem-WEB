import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Send, MessageSquare, Star, Lightbulb, Phone, Mail, User, ChevronDown, Search, Check, X, CheckCircle2, Sparkles } from 'lucide-react';
import { submitFeedback, submitFeatureRequest } from '../api/apifunction';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';
import googlePlayBadge from '../assets/google-play-badge.png';
import appStoreBadge from '../assets/app-store-badge.png';

// ─── Country Codes ────────────────────────────────────────────────────────────

const COUNTRY_CODES = [
  // South Asia
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
  { code: '+94', country: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+977', country: 'Nepal', flag: '🇳🇵' },
  { code: '+960', country: 'Maldives', flag: '🇲🇻' },
  { code: '+93', country: 'Afghanistan', flag: '🇦🇫' },
  { code: '+975', country: 'Bhutan', flag: '🇧🇹' },
  { code: '+95', country: 'Myanmar', flag: '🇲🇲' },
  // GCC
  { code: '+971', country: 'United Arab Emirates (UAE)', flag: '🇦🇪' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+974', country: 'Qatar', flag: '🇶🇦' },
  { code: '+968', country: 'Oman', flag: '🇴🇲' },
  { code: '+973', country: 'Bahrain', flag: '🇧🇭' },
  { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
  // Levant
  { code: '+964', country: 'Iraq', flag: '🇮🇶' },
  { code: '+962', country: 'Jordan', flag: '🇯🇴' },
  { code: '+961', country: 'Lebanon', flag: '🇱🇧' },
  { code: '+970', country: 'Palestine', flag: '🇵🇸' },
  { code: '+963', country: 'Syria', flag: '🇸🇾' },
  { code: '+357', country: 'Cyprus', flag: '🇨🇾' },
  // Arabian Peninsula & wider Middle East
  { code: '+967', country: 'Yemen', flag: '🇾🇪' },
  { code: '+98', country: 'Iran', flag: '🇮🇷' },
  { code: '+90', country: 'Turkey', flag: '🇹🇷' },
  // Caucasus (Middle East–adjacent)
  { code: '+374', country: 'Armenia', flag: '🇦🇲' },
  { code: '+995', country: 'Georgia', flag: '🇬🇪' },
  // Southeast Asia
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
  { code: '+63', country: 'Philippines', flag: '🇵🇭' },
  { code: '+66', country: 'Thailand', flag: '🇹🇭' },
  { code: '+84', country: 'Vietnam', flag: '🇻🇳' },
  { code: '+673', country: 'Brunei', flag: '🇧🇳' },
  { code: '+855', country: 'Cambodia', flag: '🇰🇭' },
  { code: '+856', country: 'Laos', flag: '🇱🇦' },
  { code: '+670', country: 'Timor-Leste', flag: '🇹🇱' },
  // East Asia
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+852', country: 'Hong Kong', flag: '🇭🇰' },
  { code: '+886', country: 'Taiwan', flag: '🇹🇼' },
  { code: '+976', country: 'Mongolia', flag: '🇲🇳' },
  // North Africa & Arab League
  { code: '+20', country: 'Egypt', flag: '🇪🇬' },
  { code: '+212', country: 'Morocco', flag: '🇲🇦' },
  { code: '+213', country: 'Algeria', flag: '🇩🇿' },
  { code: '+216', country: 'Tunisia', flag: '🇹🇳' },
  { code: '+218', country: 'Libya', flag: '🇱🇾' },
  { code: '+249', country: 'Sudan', flag: '🇸🇩' },
  { code: '+222', country: 'Mauritania', flag: '🇲🇷' },
  { code: '+269', country: 'Comoros', flag: '🇰🇲' },
  { code: '+235', country: 'Chad', flag: '🇹🇩' },
  // Sub-Saharan Africa
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+254', country: 'Kenya', flag: '🇰🇪' },
  { code: '+255', country: 'Tanzania', flag: '🇹🇿' },
  { code: '+256', country: 'Uganda', flag: '🇺🇬' },
  { code: '+251', country: 'Ethiopia', flag: '🇪🇹' },
  { code: '+233', country: 'Ghana', flag: '🇬🇭' },
  { code: '+225', country: 'Ivory Coast', flag: '🇨🇮' },
  { code: '+221', country: 'Senegal', flag: '🇸🇳' },
  { code: '+237', country: 'Cameroon', flag: '🇨🇲' },
  { code: '+252', country: 'Somalia', flag: '🇸🇴' },
  { code: '+253', country: 'Djibouti', flag: '🇩🇯' },
  { code: '+291', country: 'Eritrea', flag: '🇪🇷' },
  { code: '+258', country: 'Mozambique', flag: '🇲🇿' },
  { code: '+260', country: 'Zambia', flag: '🇿🇲' },
  { code: '+263', country: 'Zimbabwe', flag: '🇿🇼' },
  { code: '+230', country: 'Mauritius', flag: '🇲🇺' },
  { code: '+261', country: 'Madagascar', flag: '🇲🇬' },
  // Europe
  { code: '+44', country: 'United Kingdom (UK)', flag: '🇬🇧' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
  { code: '+32', country: 'Belgium', flag: '🇧🇪' },
  { code: '+41', country: 'Switzerland', flag: '🇨🇭' },
  { code: '+43', country: 'Austria', flag: '🇦🇹' },
  { code: '+46', country: 'Sweden', flag: '🇸🇪' },
  { code: '+47', country: 'Norway', flag: '🇳🇴' },
  { code: '+45', country: 'Denmark', flag: '🇩🇰' },
  { code: '+358', country: 'Finland', flag: '🇫🇮' },
  { code: '+48', country: 'Poland', flag: '🇵🇱' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+30', country: 'Greece', flag: '🇬🇷' },
  { code: '+353', country: 'Ireland', flag: '🇮🇪' },
  { code: '+36', country: 'Hungary', flag: '🇭🇺' },
  { code: '+420', country: 'Czech Republic', flag: '🇨🇿' },
  { code: '+40', country: 'Romania', flag: '🇷🇴' },
  { code: '+380', country: 'Ukraine', flag: '🇺🇦' },
  { code: '+7', country: 'Russia / Kazakhstan', flag: '🌍' },
  // Central Asia
  { code: '+998', country: 'Uzbekistan', flag: '🇺🇿' },
  { code: '+992', country: 'Tajikistan', flag: '🇹🇯' },
  { code: '+996', country: 'Kyrgyzstan', flag: '🇰🇬' },
  { code: '+993', country: 'Turkmenistan', flag: '🇹🇲' },
  { code: '+994', country: 'Azerbaijan', flag: '🇦🇿' },
  // Americas
  { code: '+1', country: 'United States / Canada', flag: '🌎' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+51', country: 'Peru', flag: '🇵🇪' },
  { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
  { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
  { code: '+591', country: 'Bolivia', flag: '🇧🇴' },
  { code: '+595', country: 'Paraguay', flag: '🇵🇾' },
  { code: '+598', country: 'Uruguay', flag: '🇺🇾' },
  { code: '+1-868', country: 'Trinidad & Tobago', flag: '🇹🇹' },
  { code: '+592', country: 'Guyana', flag: '🇬🇾' },
  { code: '+597', country: 'Suriname', flag: '🇸🇷' },
  // Oceania
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+64', country: 'New Zealand', flag: '🇳🇿' },
  { code: '+679', country: 'Fiji', flag: '🇫🇯' },
];

const SIDE_TABS = [
  { key: 'feedback', label: 'Feedback', icon: MessageSquare },
  { key: 'rate-us', label: 'Rate Us', icon: Star },
  { key: 'suggestion', label: 'Request a feature', icon: Lightbulb },
];

const FEEDBACK_RATINGS = [
  {
    value: 'excellent',
    label: 'Excellent',
    emoji: '😍',
    caption: 'Loved it',
    tone: 'Top pick',
    accent: 'from-emerald-300/35 via-cyan-300/18 to-sky-300/8',
    glow: 'shadow-[0_24px_48px_-28px_rgba(16,185,129,0.9)]',
    barColor: 'from-emerald-400 via-green-400 to-emerald-300',
    barPercent: '100%',
  },
  {
    value: 'good',
    label: 'Good',
    emoji: '🙂',
    caption: 'Works well',
    tone: 'Smooth',
    accent: 'from-sky-300/35 via-blue-300/18 to-indigo-300/8',
    glow: 'shadow-[0_24px_48px_-28px_rgba(59,130,246,0.85)]',
    barColor: 'from-blue-400 via-sky-400 to-blue-300',
    barPercent: '75%',
  },
  {
    value: 'average',
    label: 'Average',
    emoji: '😐',
    caption: 'Could improve',
    tone: 'Neutral',
    accent: 'from-amber-300/35 via-orange-300/18 to-yellow-200/8',
    glow: 'shadow-[0_24px_48px_-28px_rgba(245,158,11,0.8)]',
    barColor: 'from-amber-400 via-orange-400 to-yellow-300',
    barPercent: '50%',
  },
  {
    value: 'poor',
    label: 'Poor',
    emoji: '😞',
    caption: 'Needs attention',
    tone: 'Needs work',
    accent: 'from-rose-300/35 via-red-300/18 to-pink-200/8',
    glow: 'shadow-[0_24px_48px_-28px_rgba(244,63,94,0.85)]',
    barColor: 'from-rose-500 via-red-400 to-pink-400',
    barPercent: '25%',
  },
];

const getEmojiAssetUrl = (emoji) => {
  if (!emoji) {
    return null;
  }

  const codePoints = [...emoji]
    .map((char) => char.codePointAt(0)?.toString(16))
    .filter(Boolean)
    .join('-');

  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codePoints}.svg`;
};

const FlagIcon = ({ emoji, alt, className = 'h-4 w-4' }) => {
  const assetUrl = getEmojiAssetUrl(emoji);

  if (!assetUrl) {
    return <span className={`${className} inline-flex items-center justify-center`}>🌍</span>;
  }

  return (
    <img
      src={assetUrl}
      alt={alt}
      className={`${className} shrink-0 object-contain`}
      loading="lazy"
    />
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const Feedback = () => {
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState('feedback');

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(42,160,191,0.14),_transparent_24%),linear-gradient(180deg,_#f8fcfe_0%,_#ffffff_40%,_#f7fbfd_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_22%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.14),_transparent_20%),linear-gradient(180deg,_#07111a_0%,_#0b1320_42%,_#0f1724_100%)] font-poppins">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_15%_20%,rgba(42,160,191,0.18),transparent_28%),radial-gradient(circle_at_88%_10%,rgba(14,165,233,0.12),transparent_24%)] dark:bg-[radial-gradient(circle_at_15%_18%,rgba(34,211,238,0.18),transparent_24%),radial-gradient(circle_at_85%_12%,rgba(59,130,246,0.18),transparent_22%),linear-gradient(180deg,rgba(7,17,26,0.08),rgba(7,17,26,0))]" />
      <div className="relative max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#2AA0BF]/20 bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#2AA0BF] shadow-sm backdrop-blur dark:border-cyan-400/25 dark:bg-slate-900/75 dark:text-cyan-300">
            <MessageSquare className="h-3.5 w-3.5" />
            Community Voice
          </span>
          <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl font-poppins">
            Feedback & Suggestions
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 dark:text-slate-300/95 sm:text-base">
            Tell us what feels right, what needs work, and what you want next.
          </p>
        </div>

        <div className="rounded-[28px] border border-white/70 bg-white/85 p-3 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.22)] backdrop-blur dark:border-slate-700/70 dark:bg-slate-950/70 dark:shadow-[0_28px_90px_-38px_rgba(0,0,0,0.85)] sm:p-5">
        <div className="flex flex-col gap-5 md:flex-row md:gap-6">
          {/* Side Menu */}
          <div className="shrink-0 md:w-60">
            <nav role="tablist" aria-label="Feedback sections" className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200/80 bg-slate-50/90 p-2 md:flex-col md:overflow-visible dark:border-slate-700/70 dark:bg-slate-900/75">
              {SIDE_TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  id={`${key}-tab`}
                  role="tab"
                  aria-selected={activeTab === key}
                  aria-controls={`${key}-panel`}
                  onClick={() => setActiveTab(key)}
                  className={`group relative flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 active:scale-[0.98]
                    ${activeTab === key
                      ? 'bg-white text-[#178cab] shadow-sm ring-1 ring-[#2AA0BF]/15 dark:bg-slate-950 dark:text-cyan-300 dark:ring-cyan-400/15'
                      : 'text-gray-600 hover:bg-white hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-950 dark:hover:text-white'
                    }`}
                >
                  <span className={`absolute inset-y-2 left-1 w-1 rounded-full bg-[#2AA0BF] transition-all duration-300 ${activeTab === key ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`} />
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ${activeTab === key ? 'bg-[#2AA0BF]/12 text-[#2AA0BF] dark:bg-cyan-400/10 dark:text-cyan-300' : 'bg-white text-gray-500 group-hover:text-[#2AA0BF] dark:bg-slate-800 dark:text-slate-400'}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div id={`${activeTab}-panel`} role="tabpanel" aria-labelledby={`${activeTab}-tab`} className="min-w-0 flex-1 rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_48px_-30px_rgba(15,23,42,0.25)] dark:border-slate-700/80 dark:bg-[#10161f]/95 dark:shadow-[0_24px_60px_-32px_rgba(0,0,0,0.9)] sm:p-7">
            {activeTab === 'feedback' && (
              <FeedbackForm showSuccess={showSuccess} showError={showError} />
            )}
            {activeTab === 'rate-us' && <RateUsSection />}
            {activeTab === 'suggestion' && (
              <FeatureRequestForm showSuccess={showSuccess} showError={showError} />
            )}
          </div>
        </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

// ─── Section Heading ──────────────────────────────────────────────────────────

const SectionHeading = ({ title, beforeHighlight, highlight, afterHighlight }) => (
  <div className="mb-6 rounded-2xl border border-slate-200/80 bg-[linear-gradient(135deg,rgba(42,160,191,0.09),rgba(255,255,255,0.7))] px-4 py-4 dark:border-cyan-500/10 dark:bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(15,23,42,0.94))] sm:px-5">
    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 sm:text-2xl">
      {title}
    </h2>
    <p className="text-sm leading-6 text-gray-600 dark:text-gray-300 sm:text-base">
      {beforeHighlight}
      <span className="text-[#2AA0BF] font-semibold">{highlight}</span>
      {afterHighlight}
    </p>
  </div>
);

// ─── Feedback Form Tab ────────────────────────────────────────────────────────

const FeedbackForm = ({ showSuccess, showError }) => {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', platforms: [], rating: '', message: '',
  });
  const [countryCode, setCountryCode] = useState('+91');
  const [submitting, setSubmitting] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [submittedName, setSubmittedName] = useState('');

  const platformOptions = [
    { value: 'website', label: 'Website' },
    { value: 'android', label: 'Mobile App Android' },
    { value: 'ios', label: 'Mobile App iOS' },
    { value: 'all', label: 'All' },
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePlatformToggle = (value) => {
    setFormData((prev) => {
      const platforms = prev.platforms.includes(value)
        ? prev.platforms.filter((p) => p !== value)
        : [...prev.platforms, value];
      return { ...prev, platforms };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        platform: formData.platforms.join(', '),
        phone: formData.phone ? `${countryCode} ${formData.phone}` : '',
        source: 'web',
      };
      delete payload.platforms;
      await submitFeedback(payload);
      setSubmittedName(formData.name);
      setShowPopup(true);
      setFormData({ name: '', email: '', phone: '', platforms: [], rating: '', message: '' });
    } catch (error) {
      showError(error.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <SuccessPopup
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        name={submittedName}
        type="feedback"
      />
      <SectionHeading
        title="Share Your Feedback"
        beforeHighlight="We value Your Thoughts about "
        highlight="Thafheemul Quran"
        afterHighlight=""
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
        <InputField
          label="Name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="Enter your full name"
          icon={<User className="w-4 h-4" />}
        />

        <InputField
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          placeholder="Enter your email address"
          icon={<Mail className="w-4 h-4" />}
        />
        </div>

        <PhoneField
          label="Phone Number"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          countryCode={countryCode}
          onCountryCodeChange={setCountryCode}
          placeholder="Enter your phone number"
          required
        />

        <CheckboxGroup
          label="Where are you using Thafheem?"
          options={platformOptions}
          values={formData.platforms}
          onChange={handlePlatformToggle}
          required
        />

        <EmojiRatingGroup
          label="Rate Your Experience"
          name="rating"
          options={FEEDBACK_RATINGS}
          value={formData.rating}
          onChange={handleChange}
          required
        />

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Your Feedback <span className="text-red-500">*</span>
          </label>
          <textarea
            name="message"
            rows="4"
            value={formData.message}
            onChange={handleChange}
            required
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-gray-900 shadow-sm transition-all duration-300 placeholder:text-gray-400 hover:border-slate-300 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-[#2AA0BF]/30 dark:border-gray-700 dark:bg-gray-800/70 dark:text-white dark:hover:border-gray-600 dark:focus:bg-gray-900 resize-none"
            placeholder="Write your message here..."
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#2AA0BF,#178cab)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-14px_rgba(42,160,191,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-16px_rgba(42,160,191,0.95)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <><MessageSquare className="w-5 h-5" />Submitting...</>
          ) : (
            <><Send className="w-5 h-5" />Send Feedback</>
          )}
        </button>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your feedback helps us improve and grow!
        </p>
      </form>
    </div>
  );
};

// ─── Rate Us Tab ──────────────────────────────────────────────────────────────

const RateUsSection = () => {
  return (
    <div className="text-center">
      <div className="mb-8 rounded-[24px] border border-slate-200/80 bg-[linear-gradient(160deg,rgba(42,160,191,0.10),rgba(255,255,255,0.86))] px-5 py-8 dark:border-gray-700 dark:bg-[linear-gradient(160deg,rgba(42,160,191,0.16),rgba(17,24,39,0.82))]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm dark:bg-gray-800">
          <Star className="h-8 w-8 text-[#2AA0BF]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 font-poppins">
          Rate Us
        </h2>
        <p className="text-sm leading-6 text-gray-600 dark:text-gray-300 max-w-xl mx-auto sm:text-base">
          If you enjoy using Thafheem, please take a moment to rate us on the store. Your support motivates us to keep improving.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Google Play */}
        <a
          href="https://play.google.com/store/apps/details?id=com.d4media.thafheem"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center gap-3 rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#2AA0BF]/45 hover:shadow-[0_18px_36px_-18px_rgba(42,160,191,0.45)] dark:border-gray-700 dark:bg-gray-900"
        >
          <img src={googlePlayBadge} alt="Get it on Google Play" className="h-14 object-contain" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-[#2AA0BF]">
            Rate on Google Play
          </span>
        </a>

        {/* App Store */}
        <a
          href="https://apps.apple.com/in/app/thafheem-ul-quran/id1292572556"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center gap-3 rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#2AA0BF]/45 hover:shadow-[0_18px_36px_-18px_rgba(42,160,191,0.45)] dark:border-gray-700 dark:bg-gray-900"
        >
          <img src={appStoreBadge} alt="Download on the App Store" className="h-14 object-contain" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-[#2AA0BF]">
            Rate on App Store
          </span>
        </a>
      </div>
    </div>
  );
};

// ─── Feature Request / Suggestion Tab ─────────────────────────────────────────

const FeatureRequestForm = ({ showSuccess, showError }) => {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', target_platform: '', category: '', title: '', description: '',
  });
  const [countryCode, setCountryCode] = useState('+91');
  const [submitting, setSubmitting] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [submittedName, setSubmittedName] = useState('');

  const targetPlatforms = [
    { value: 'website', label: 'Website' },
    { value: 'mobile', label: 'Mobile App' },
    { value: 'both', label: 'Both' },
  ];

  const categories = [
    { value: 'ui_ux', label: 'UI/UX Improvement' },
    { value: 'content', label: 'Content Feature' },
    { value: 'performance', label: 'Performance or Speed' },
    { value: 'accessibility', label: 'Accessibility' },
    { value: 'other', label: 'Other' },
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        phone: formData.phone ? `${countryCode} ${formData.phone}` : '',
        source: 'web',
      };
      await submitFeatureRequest(payload);
      setSubmittedName(formData.name);
      setShowPopup(true);
      setFormData({ name: '', email: '', phone: '', target_platform: '', category: '', title: '', description: '' });
    } catch (error) {
      showError(error.message || 'Failed to submit feature request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <SuccessPopup
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        name={submittedName}
        type="feature"
      />
      <SectionHeading
        title="Feature Request"
        beforeHighlight="Help us improve "
        highlight="Thafheemul Quran"
        afterHighlight=" with Your ideas…"
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
        <InputField
          label="Name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="Enter your full name"
          icon={<User className="w-4 h-4" />}
        />

        <InputField
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          placeholder="Enter your email address"
          icon={<Mail className="w-4 h-4" />}
        />
        </div>

        <PhoneField
          label="Phone Number"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          countryCode={countryCode}
          onCountryCodeChange={setCountryCode}
          placeholder="Enter your phone number"
          required
        />

        <RadioGroup
          label="Where should this feature be added?"
          name="target_platform"
          options={targetPlatforms}
          value={formData.target_platform}
          onChange={handleChange}
          required
        />

        <RadioGroup
          label="Feature Type"
          name="category"
          options={categories}
          value={formData.category}
          onChange={handleChange}
          required
        />

        <InputField
          label="Feature Title"
          name="title"
          type="text"
          value={formData.title}
          onChange={handleChange}
          required
          placeholder="Eg. Add quran bookmarking option"
        />

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Feature Description <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            rows="4"
            value={formData.description}
            onChange={handleChange}
            required
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-gray-900 shadow-sm transition-all duration-300 placeholder:text-gray-400 hover:border-slate-300 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-[#2AA0BF]/30 dark:border-gray-700 dark:bg-gray-800/70 dark:text-white dark:hover:border-gray-600 dark:focus:bg-gray-900 resize-none"
            placeholder="Explain your idea in detail..."
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#2AA0BF,#178cab)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-14px_rgba(42,160,191,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-16px_rgba(42,160,191,0.95)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <><Lightbulb className="w-5 h-5" />Submitting...</>
          ) : (
            <><Send className="w-5 h-5" />Send Request</>
          )}
        </button>
      </form>
    </div>
  );
};

// ─── Shared Components ────────────────────────────────────────────────────────

const InputField = ({ label, name, type, value, onChange, required, placeholder, icon }) => (
  <div>
    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-300">
          {icon}
        </span>
      )}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className={`w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-all duration-300 placeholder:text-gray-400 hover:border-slate-300 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-[#2AA0BF]/30 dark:border-gray-700 dark:bg-gray-800/70 dark:text-white dark:hover:border-gray-600 dark:focus:bg-gray-900
                  ${icon ? 'pl-10' : ''}`}
      />
    </div>
  </div>
);

// ─── Phone Field with Country Code ────────────────────────────────────────────

const PhoneField = ({ label, name, value, onChange, countryCode, onCountryCodeChange, placeholder, required }) => (
  <div>
    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="flex gap-2">
      <CountryCodeDropdown value={countryCode} onChange={onCountryCodeChange} />
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-300">
          <Phone className="w-4 h-4" />
        </span>
        <input
          type="tel"
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-4 text-sm text-gray-900 shadow-sm transition-all duration-300 placeholder:text-gray-400 hover:border-slate-300 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-[#2AA0BF]/30 dark:border-gray-700 dark:bg-gray-800/70 dark:text-white dark:hover:border-gray-600 dark:focus:bg-gray-900"
        />
      </div>
    </div>
  </div>
);

// ─── Country Code Dropdown ────────────────────────────────────────────────────

const CountryCodeDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const manualRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
        setManualMode(false);
        setActiveIndex(0);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && !manualMode && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen, manualMode]);

  useEffect(() => {
    if (manualMode && manualRef.current) {
      manualRef.current.focus();
    }
  }, [manualMode]);

  useEffect(() => {
    setActiveIndex(0);
  }, [search, manualMode]);

  const filtered = COUNTRY_CODES.filter((c) =>
    c.country.toLowerCase().includes(search.toLowerCase()) ||
    c.code.includes(search)
  );

  const selected = COUNTRY_CODES.find((c) => c.code === value);

  useEffect(() => {
    if (!isOpen || manualMode) {
      return;
    }

    const activeButton = dropdownRef.current?.querySelector(`[data-country-index="${activeIndex}"]`);
    activeButton?.focus();
  }, [activeIndex, isOpen, manualMode]);

  const closeDropdown = () => {
    setIsOpen(false);
    setSearch('');
    setManualMode(false);
    setActiveIndex(0);
  };

  const selectCountryCode = (code) => {
    onChange(code);
    closeDropdown();
  };

  const handleSearchKeyDown = (event) => {
    if (!filtered.length) {
      if (event.key === 'Escape') {
        closeDropdown();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % filtered.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + filtered.length) % filtered.length);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      selectCountryCode(filtered[activeIndex].code);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeDropdown();
    }
  };

  const handleOptionKeyDown = (event, index, code) => {
    if (!filtered.length) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index + 1) % filtered.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index - 1 + filtered.length) % filtered.length);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(filtered.length - 1);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectCountryCode(code);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeDropdown();
    }
  };

  const handleManualSubmit = () => {
    const code = manualCode.startsWith('+') ? manualCode : `+${manualCode}`;
    if (code.length >= 2) {
      onChange(code);
      setManualMode(false);
      setManualCode('');
      closeDropdown();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setIsOpen(true);
          }

          if (event.key === 'Escape') {
            closeDropdown();
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex min-w-[112px] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/85 px-3 py-2.5 text-sm text-gray-900 shadow-sm transition-all duration-300 hover:border-slate-300 dark:border-gray-700 dark:bg-gray-800/70 dark:text-white dark:hover:border-gray-600"
      >
        <FlagIcon emoji={selected?.flag || '🌍'} alt={selected ? `${selected.country} flag` : 'Custom country code'} className="h-4 w-4" />
        <span className="font-medium">{value}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_45px_-22px_rgba(15,23,42,0.35)] dark:border-gray-700 dark:bg-gray-800">
          {/* Search */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search country or code..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-8 pr-3 text-sm text-gray-900
                         dark:border-gray-600 dark:bg-gray-700 dark:text-white
                         focus:ring-1 focus:ring-[#2AA0BF] focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Country List */}
          <div role="listbox" aria-label="Country code options" className="max-h-44 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-3">No countries found</p>
            )}
            {filtered.map((c, index) => (
              <button
                key={c.code + c.country}
                type="button"
                data-country-index={index}
                role="option"
                aria-selected={value === c.code}
                tabIndex={index === activeIndex ? 0 : -1}
                onClick={() => {
                  selectCountryCode(c.code);
                }}
                onKeyDown={(event) => handleOptionKeyDown(event, index, c.code)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700
                  ${value === c.code ? 'bg-[#2AA0BF]/10 text-[#2AA0BF]' : 'text-gray-700 dark:text-gray-300'}
                  ${index === activeIndex ? 'outline-none ring-1 ring-inset ring-[#2AA0BF]/35' : ''}`}
              >
                <FlagIcon emoji={c.flag} alt={`${c.country} flag`} className="h-4 w-4" />
                <span className="flex-1 text-left">{c.country}</span>
                <span className="text-gray-400 text-xs font-mono">{c.code}</span>
                {value === c.code && <Check className="w-4 h-4 text-[#2AA0BF]" />}
              </button>
            ))}
          </div>

          {/* Manual Entry */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-2">
            {!manualMode ? (
              <button
                type="button"
                onClick={() => setManualMode(true)}
                className="w-full text-center text-xs text-[#2AA0BF] hover:text-[#1e7a9a] py-1.5 font-medium transition-colors"
              >
                Country not listed? Enter code manually
              </button>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">+</span>
                  <input
                    ref={manualRef}
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.replace(/[^0-9-]/g, ''))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        handleManualSubmit();
                      }

                      if (event.key === 'Escape') {
                        closeDropdown();
                      }
                    }}
                    placeholder="e.g. 234"
                    maxLength={6}
                    className="w-full pl-6 pr-2 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md
                             bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-1 focus:ring-[#2AA0BF] focus:border-transparent outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleManualSubmit}
                  className="px-3 py-2 bg-[#2AA0BF] hover:bg-[#1e7a9a] text-white text-xs font-medium rounded-md transition-colors"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Checkbox Group (Multi Select) ────────────────────────────────────────────

const CheckboxGroup = ({ label, options, values, onChange, required }) => (
  <div>
    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div role="group" aria-label={label} className="flex flex-wrap gap-2.5">
      {options.map((option) => {
        const isChecked = values.includes(option.value);
        return (
          <label
            key={option.value}
            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]
              ${isChecked
                ? 'border-[#2AA0BF]/40 bg-[linear-gradient(135deg,rgba(42,160,191,0.14),rgba(42,160,191,0.05))] text-[#178cab] shadow-[0_12px_24px_-18px_rgba(42,160,191,0.8)] dark:bg-[#2AA0BF]/20'
                : 'border-slate-200 bg-white text-gray-700 shadow-sm hover:border-slate-300 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-300 dark:hover:border-gray-600'
              }`}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0
              ${isChecked ? 'border-[#2AA0BF] bg-[#2AA0BF]' : 'border-gray-400 dark:border-gray-500'}`}
            >
              {isChecked && <Check className="w-3 h-3 text-white" />}
            </span>
            <span className="text-sm font-medium">{option.label}</span>
          </label>
        );
      })}
    </div>
  </div>
);

// ─── Radio Group ──────────────────────────────────────────────────────────────

const RadioGroup = ({ label, name, options, value, onChange, required }) => (
  <div>
    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2.5">
      {options.map((option) => (
        <label
          key={option.value}
          className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]
            ${value === option.value
              ? 'border-[#2AA0BF]/40 bg-[linear-gradient(135deg,rgba(42,160,191,0.14),rgba(42,160,191,0.05))] text-[#178cab] shadow-[0_12px_24px_-18px_rgba(42,160,191,0.8)] dark:bg-[#2AA0BF]/20'
              : 'border-slate-200 bg-white text-gray-700 shadow-sm hover:border-slate-300 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-300 dark:hover:border-gray-600'
            }`}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={onChange}
            required={required}
            className="sr-only"
          />
          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
            ${value === option.value ? 'border-[#2AA0BF]' : 'border-gray-400 dark:border-gray-500'}`}
          >
            {value === option.value && (
              <span className="w-2 h-2 rounded-full bg-[#2AA0BF]"></span>
            )}
          </span>
          <span className="text-sm font-medium">{option.label}</span>
        </label>
      ))}
    </div>
  </div>
);

const EmojiRatingGroup = ({ label, name, options, value, onChange, required }) => {
  const [hoveredValue, setHoveredValue] = useState(null);

  return (
  <div>
    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div role="radiogroup" aria-label={`${label} from poor to excellent`} className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      {options.map((option) => {
        const isSelected = value === option.value;
        const isHovered = hoveredValue === option.value;
        const showBar = isSelected || isHovered;

        return (
          <label
            key={option.value}
            onMouseEnter={() => setHoveredValue(option.value)}
            onMouseLeave={() => setHoveredValue(null)}
            className={`group relative cursor-pointer overflow-hidden rounded-[20px] border px-3.5 py-3 transition-all duration-300 hover:-translate-y-1 active:scale-[0.985]
              ${isSelected
                ? `border-[#2AA0BF]/40 bg-white text-slate-900 ring-1 ring-[#2AA0BF]/20 ${option.glow} dark:bg-slate-900`
                : 'border-slate-200 bg-white/95 text-slate-700 shadow-sm hover:border-slate-300 hover:shadow-[0_18px_32px_-24px_rgba(15,23,42,0.35)] dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-200 dark:hover:border-gray-600'
              }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={onChange}
              required={required}
              className="sr-only"
            />
            <span className={`absolute inset-0 bg-gradient-to-br ${option.accent} transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
            <span className="absolute -right-5 -top-5 h-16 w-16 rounded-full bg-white/40 blur-2xl dark:bg-white/10" />
            <span className="relative flex h-full flex-col gap-2.5">
              <span className="flex items-start justify-between gap-2">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] transition-all duration-300 ${isSelected ? 'border-white/60 bg-white/75 text-slate-700 dark:border-cyan-400/15 dark:bg-cyan-400/10 dark:text-cyan-100' : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-400'}`}>
                  {option.tone}
                </span>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all duration-300 ${isSelected ? 'border-[#2AA0BF] bg-[#2AA0BF] text-white' : 'border-slate-300 bg-white dark:border-gray-600 dark:bg-gray-900'}`}>
                  <Check className={`h-3 w-3 transition-all duration-300 ${isSelected ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
                </span>
              </span>

              <span className="flex items-center gap-2.5">
                <span role="img" aria-label={option.label} className={`flex h-11 w-11 items-center justify-center rounded-[16px] bg-white/90 text-[1.7rem] shadow-sm ring-1 ring-white/60 transition-all duration-300 will-change-transform dark:bg-slate-950/85 dark:ring-white/10 ${isSelected ? 'scale-105 rotate-[-3deg]' : 'group-hover:scale-[1.04] group-hover:rotate-[-2deg]'}`}>
                  {option.emoji}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold leading-tight">{option.label}</span>
                  <span className="mt-1 block text-[13px] font-medium leading-tight text-slate-600 dark:text-slate-300">
                    {option.caption}
                  </span>
                </span>
              </span>

              <span className={`mt-0.5 h-1 overflow-hidden rounded-full ${showBar ? 'bg-slate-200/70 dark:bg-slate-700/80' : 'bg-slate-100 dark:bg-slate-800'}`}>
                <span
                  className={`block h-full rounded-full bg-gradient-to-r ${option.barColor} transition-all duration-500`}
                  style={{ width: showBar ? option.barPercent : '0%' }}
                />
              </span>
            </span>
          </label>
        );
      })}
    </div>
  </div>
  );
};

// ─── Success Popup ────────────────────────────────────────────────────────────

const SuccessPopup = ({ isOpen, onClose, name, type = 'feedback' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm animate-[fadeIn_0.3s_ease-out] rounded-[28px] border border-white/70 bg-white p-8 shadow-[0_32px_80px_-20px_rgba(15,23,42,0.3)] dark:border-slate-700/70 dark:bg-slate-900 dark:shadow-[0_32px_80px_-20px_rgba(0,0,0,0.7)]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Success icon */}
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-teal-50 ring-1 ring-emerald-100 dark:from-emerald-950/50 dark:to-teal-950/50 dark:ring-emerald-800/30">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-[0_8px_24px_-8px_rgba(16,185,129,0.6)]">
            <CheckCircle2 className="h-7 w-7 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {type === 'feedback' ? 'Feedback Submitted!' : 'Request Submitted!'}
          </h3>
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <p className="text-sm font-medium text-gray-600 dark:text-slate-300">
              Thank you, <span className="font-semibold text-[#2AA0BF] dark:text-cyan-300">{name}</span>
            </p>
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
            {type === 'feedback'
              ? 'Your feedback helps us improve Thafheemul Quran for everyone.'
              : 'We\'ll review your suggestion and work on making it happen.'}
          </p>
        </div>

        {/* Button */}
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-[#2AA0BF] to-[#178cab] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-10px_rgba(42,160,191,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-12px_rgba(42,160,191,0.8)] active:scale-[0.98]"
        >
          Continue
        </button>
      </div>
    </div>,
    document.body
  );
};

export default Feedback;
