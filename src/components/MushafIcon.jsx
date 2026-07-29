const MushafIcon = ({ className = "", style = {} }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden="true"
  >
    {/* Left book page */}
    <path
      d="M256 148 C230 120 168 108 90 122 L64 140 L64 308 L90 294 C168 280 230 292 256 318 Z"
      strokeWidth="22"
      fill="none"
    />
    {/* Right book page */}
    <path
      d="M256 148 C282 120 344 108 422 122 L448 140 L448 308 L422 294 C344 280 282 292 256 318 Z"
      strokeWidth="22"
      fill="none"
    />
    {/* Book spine */}
    <line x1="256" y1="148" x2="256" y2="318" strokeWidth="17" />
    {/* Left page lines */}
    <line x1="104" y1="178" x2="234" y2="172" strokeWidth="12" />
    <line x1="100" y1="212" x2="232" y2="207" strokeWidth="12" />
    <line x1="98"  y1="246" x2="232" y2="242" strokeWidth="12" />
    {/* Right page lines */}
    <line x1="278" y1="172" x2="408" y2="178" strokeWidth="12" />
    <line x1="280" y1="207" x2="412" y2="212" strokeWidth="12" />
    <line x1="280" y1="242" x2="414" y2="246" strokeWidth="12" />
    {/* Stand — left arm (upper-left → lower-right) */}
    <path
      d="M64 308 L40 342 L40 388 L84 414 L256 340 L256 318 L90 294 Z"
      strokeWidth="18"
      fill="none"
    />
    {/* Stand — right arm (upper-right → lower-left) */}
    <path
      d="M448 308 L472 342 L472 388 L428 414 L256 340 L256 318 L422 294 Z"
      strokeWidth="18"
      fill="none"
    />
    {/* Stand — center overlap diamond */}
    <path
      d="M206 344 L256 318 L306 344 L256 370 Z"
      strokeWidth="16"
      fill="none"
    />
  </svg>
);

export default MushafIcon;
