import { useEffect, useRef, useState } from "react";
import type { AppMode, ColorScheme } from "../types";

interface Props {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  colorScheme: ColorScheme;
  onColorSchemeChange: (scheme: ColorScheme) => void;
  onStatsClick: () => void;
  editingEnabled: boolean;
  onToggleEditingEnabled: () => void;
  showEditingControl?: boolean;
  showStatsControl?: boolean;
  showSidebarToggle?: boolean;
  showDarkModeControl?: boolean;
  compactBreakpoint?: number;
}

const colorSchemes: { id: ColorScheme; label: string; color: string }[] = [
  { id: "neutral", label: "Neutral", color: "#9B9488" },
  { id: "indigo", label: "Indigo", color: "#4F46E5" },
  { id: "sky", label: "Sky", color: "#0284C7" },
  { id: "emerald", label: "Emerald", color: "#059669" },
  { id: "amber", label: "Amber", color: "#D97706" },
  { id: "rose", label: "Rose", color: "#E11D48" },
];

function IconMenu() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <line x1="2" y1="4" x2="13" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="7.5" x2="13" y2="7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="11" x2="13" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconSidebar() {
  return (
    <svg width="28" height="28" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <line x1="7" y1="3.5" x2="7" y2="14.5" stroke="currentColor" strokeWidth="1.4" />
      <line x1="4.5" y1="6" x2="5.5" y2="6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="4.5" y1="8.5" x2="5.5" y2="8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="4.5" y1="11" x2="5.5" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M2 2C2 2 3.5 1.5 7 1.5C10.5 1.5 12 2 12 2V11.5C12 11.5 10.5 11 7 11C3.5 11 2 11.5 2 11.5V2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line x1="7" y1="1.5" x2="7" y2="11" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconBrain() {
  return (
    <span aria-hidden="true" style={{ fontSize: "14px", lineHeight: 1 }}>
      🧠
    </span>
  );
}

function IconBarChart() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="7" width="3" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="5.5" y="4" width="3" height="8" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9.5" y="2" width="3" height="10" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5" />
      <line x1="9" y1="9" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconTheme({ darkMode }: { darkMode: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      {darkMode ? (
        <>
          <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.8 2.8l1 1M10.2 10.2l1 1M2.8 11.2l1-1M10.2 3.8l1-1"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </>
      ) : (
        <path
          d="M11.8 8.4A5 5 0 0 1 5.6 2.2a5.2 5.2 0 1 0 6.2 6.2Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

function IconPalette() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path
        d="M7.5 1.5a6 6 0 1 0 0 12h1.1c.8 0 1.2-.9.7-1.5-.3-.4 0-1 .6-1h.6a3 3 0 0 0 3-3.1A6.4 6.4 0 0 0 7.5 1.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="4.6" cy="7.2" r=".7" fill="currentColor" />
      <circle cx="6.7" cy="4.5" r=".7" fill="currentColor" />
      <circle cx="10" cy="5.4" r=".7" fill="currentColor" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path
        d="M6.1 1.7h2.8l.4 1.4c.4.2.8.4 1.1.7l1.4-.3 1.4 2.4-1 1c.1.4.1.8 0 1.2l1 1-1.4 2.4-1.4-.3c-.3.3-.7.5-1.1.7l-.4 1.4H6.1l-.4-1.4c-.4-.2-.8-.4-1.1-.7l-1.4.3-1.4-2.4 1-1a4 4 0 0 1 0-1.2l-1-1 1.4-2.4 1.4.3c.3-.3.7-.5 1.1-.7l.4-1.4Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="7.5" r="1.8" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

export default function TopBar({
  mode,
  onModeChange,
  searchQuery,
  onSearchChange,
  sidebarOpen,
  onToggleSidebar,
  darkMode,
  onToggleDarkMode,
  colorScheme,
  onColorSchemeChange,
  onStatsClick,
  editingEnabled,
  onToggleEditingEnabled,
  showEditingControl = true,
  showStatsControl = true,
  showSidebarToggle = true,
  showDarkModeControl = true,
  compactBreakpoint = 320,
}: Props) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [compactMenuOpen, setCompactMenuOpen] = useState(false);
  const [headerWidth, setHeaderWidth] = useState(() => (typeof window === "undefined" ? 1440 : window.innerWidth));
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isCompact = headerWidth <= compactBreakpoint;
  const secondaryMenuLevel = headerWidth <= 680 ? 2 : headerWidth <= 760 ? 1 : 0;
  const secondaryInMenu = secondaryMenuLevel > 0;
  const primaryOverflowLevel = headerWidth <= 330 ? 3 : headerWidth <= 360 ? 2 : headerWidth <= 410 ? 1 : 0;

  useEffect(() => {
    const element = headerRef.current;
    if (!element) return;

    const updateWidth = () => setHeaderWidth(element.clientWidth || window.innerWidth);
    updateWidth();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setHeaderWidth(width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isCompact && !secondaryInMenu) setCompactMenuOpen(false);
  }, [isCompact, secondaryInMenu]);

  useEffect(() => {
    if (!compactMenuOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setCompactMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [compactMenuOpen]);

  const topbarControls = (
    <div
      style={{
        display: "flex",
        alignItems: isCompact ? "stretch" : "center",
        flexDirection: isCompact ? "column" : "row",
        gap: "8px",
        flex: isCompact ? undefined : 1,
        minWidth: isCompact ? "230px" : undefined,
        width: isCompact ? "100%" : undefined,
      }}
    >
      <div
        className="mode-switcher"
        style={{
          display: "flex",
          alignItems: "center",
          background: "transparent",
          borderRadius: "6px",
          padding: 0,
          gap: "6px",
          marginLeft: isCompact ? 0 : "4px",
          width: isCompact ? "100%" : undefined,
        }}
      >
        {(
          [
            { id: "edit", label: "Library", icon: <IconBook /> },
            { id: "study", label: "Study", icon: <IconBrain /> },
          ] as { id: AppMode; label: string; icon: React.ReactNode }[]
        ).map(({ id, label, icon }) => (
          <button
            key={id}
            className="mode-button"
            onClick={() => {
              onModeChange(id);
              setCompactMenuOpen(false);
            }}
            style={{
              display: !isCompact && ((id === "edit" && primaryOverflowLevel >= 3) || (id === "study" && primaryOverflowLevel >= 2)) ? "none" : "flex",
              alignItems: "center",
              justifyContent: isCompact ? "center" : undefined,
              flex: isCompact ? 1 : undefined,
              gap: "5px",
              padding: "4px 10px",
              borderRadius: "5px",
              border: "1px solid #E2DED4",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s",
              background: mode === id ? "var(--app-accent-soft, #EEF2FF)" : "transparent",
              color: mode === id ? "var(--app-accent-strong, #4338CA)" : "#6B6560",
              boxShadow: "none",
            }}
            onMouseEnter={(event) => {
              const element = event.currentTarget as HTMLElement;
              element.style.background = "var(--app-accent-soft, #EEF2FF)";
              element.style.borderColor = "var(--app-accent, #4F46E5)";
              element.style.color = "var(--app-accent-strong, #4338CA)";
            }}
            onMouseLeave={(event) => {
              const element = event.currentTarget as HTMLElement;
              element.style.background = mode === id ? "var(--app-accent-soft, #EEF2FF)" : "transparent";
              element.style.borderColor = "#E2DED4";
              element.style.color = mode === id ? "var(--app-accent-strong, #4338CA)" : "#6B6560";
            }}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {showStatsControl && (
        <button
          onClick={() => {
            onStatsClick();
            setCompactMenuOpen(false);
          }}
            style={{
            display: !isCompact && primaryOverflowLevel >= 1 ? "none" : "flex",
            alignItems: "center",
            justifyContent: isCompact ? "flex-start" : undefined,
            gap: "5px",
            padding: "4px 10px",
            borderRadius: "6px",
            border: "1px solid #E2DED4",
            fontSize: "12px",
            fontWeight: 500,
            color: "#6B6560",
            background: mode === "stats" ? "#EEF2FF" : "transparent",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = "#F0EDE6";
            el.style.borderColor = "#C8C4B8";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = mode === "stats" ? "#EEF2FF" : "transparent";
            el.style.borderColor = "#E2DED4";
          }}
        >
          <IconBarChart />
          Stats
        </button>
      )}

      <div
        style={{
          display: secondaryMenuLevel >= 1 ? "none" : undefined,
          flex: isCompact ? undefined : 1,
          width: isCompact ? "100%" : undefined,
          maxWidth: isCompact ? "none" : "320px",
          marginLeft: isCompact ? 0 : "auto",
          position: "relative",
        }}
      >
        <span
          style={{
            position: "absolute",
            left: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#9B9488",
            pointerEvents: "none",
          }}
        >
          <IconSearch />
        </span>
        <input
          type="text"
          placeholder="Search cards…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            width: "100%",
            height: "32px",
            paddingLeft: "30px",
            paddingRight: "10px",
            borderRadius: "7px",
            border: "1px solid #E2DED4",
            background: "#F7F6F2",
            fontSize: "12px",
            color: "#111110",
            outline: "none",
            transition: "border-color 0.15s",
            fontFamily: "inherit",
          }}
          onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#4F46E5")}
          onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#E2DED4")}
        />
      </div>

      {showEditingControl && (
        <button
          type="button"
          onClick={() => {
            onToggleEditingEnabled();
            setCompactMenuOpen(false);
          }}
          aria-pressed={editingEnabled}
          aria-label={editingEnabled ? "Disable card editing" : "Enable card editing"}
          title={editingEnabled ? "Disable card editing" : "Enable card editing"}
          style={{
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            alignSelf: isCompact ? "flex-start" : undefined,
            borderRadius: "6px",
            border: editingEnabled ? "1px solid var(--app-accent, #4F46E5)" : "1px solid transparent",
            background: editingEnabled ? "var(--app-accent-soft, #EEF2FF)" : "transparent",
            color: editingEnabled ? "var(--app-accent, #4F46E5)" : "#9B9488",
            cursor: "pointer",
          }}
        >
          <IconGear />
        </button>
      )}

      <div style={{ display: secondaryMenuLevel >= 2 ? "none" : undefined, position: "relative", alignSelf: isCompact ? "flex-start" : undefined }}>
        <button
          type="button"
          onClick={() => setPaletteOpen((open) => !open)}
          aria-label="Change color scheme"
          title="Change color scheme"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isCompact ? "flex-start" : undefined,
            gap: "5px",
            padding: "4px 10px",
            borderRadius: "6px",
            border: "1px solid #E2DED4",
            fontSize: "12px",
            fontWeight: 500,
            color: "#6B6560",
            background: paletteOpen ? "#EEF2FF" : "transparent",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = "#F0EDE6";
            el.style.borderColor = "#C8C4B8";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = paletteOpen ? "#EEF2FF" : "transparent";
            el.style.borderColor = "#E2DED4";
          }}
        >
          <IconPalette />
          Theme
        </button>
        {paletteOpen && (
          <div
            style={{
              position: "absolute",
              top: "38px",
              right: 0,
              zIndex: 50,
              display: "flex",
              gap: "6px",
              padding: "8px",
              borderRadius: "8px",
              border: "1px solid #E2DED4",
              background: "#FFFFFF",
              boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
            }}
          >
            {colorSchemes.map((scheme) => (
              <button
                key={scheme.id}
                type="button"
                onClick={() => {
                  onColorSchemeChange(scheme.id);
                  setPaletteOpen(false);
                }}
                aria-label={scheme.label}
                title={scheme.label}
                style={{
                  width: "20px",
                  height: "20px",
                  padding: 0,
                  borderRadius: "50%",
                  border: colorScheme === scheme.id ? "2px solid #111110" : "2px solid transparent",
                  background: scheme.color,
                  cursor: "pointer",
                  boxShadow: colorScheme === scheme.id ? "0 0 0 1px #FFFFFF" : "none",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {showDarkModeControl && (
        <button
          onClick={() => {
            onToggleDarkMode();
            setCompactMenuOpen(false);
          }}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            alignSelf: isCompact ? "flex-start" : undefined,
            borderRadius: "6px",
            border: "none",
            background: "transparent",
            color: "#9B9488",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = "#F0EDE6";
            el.style.color = "#6B6560";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = "transparent";
            el.style.color = "#9B9488";
          }}
        >
          <IconTheme darkMode={darkMode} />
        </button>
      )}
    </div>
  );

  const menuButtonStyle: React.CSSProperties = {
    width: "100%",
    height: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: "5px",
    padding: "4px 10px",
    boxSizing: "border-box",
    borderRadius: "6px",
    border: "1px solid #E2DED4",
    background: "transparent",
    color: "#6B6560",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "12px",
  };

  const menuSearchControl = secondaryMenuLevel >= 1 && (
    <div style={{ width: "100%", position: "relative" }}>
      <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9B9488", pointerEvents: "none" }}>
        <IconSearch />
      </span>
      <input
        type="text"
        placeholder="Search cards…"
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        style={{ width: "100%", height: "32px", boxSizing: "border-box", paddingLeft: "30px", paddingRight: "10px", borderRadius: "7px", border: "1px solid #E2DED4", background: "#F7F6F2", fontSize: "12px", color: "#111110", outline: "none", fontFamily: "inherit" }}
      />
    </div>
  );

  const menuThemeControl = secondaryMenuLevel >= 2 && (
    <div style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setPaletteOpen((open) => !open)}
        aria-label="Change color scheme"
        title="Change color scheme"
        style={{ ...menuButtonStyle, background: paletteOpen ? "#EEF2FF" : "transparent" }}
      >
        <IconPalette />
        Theme
      </button>
      {paletteOpen && (
        <div style={{ position: "absolute", top: "38px", left: 0, zIndex: 70, display: "flex", gap: "6px", padding: "8px", borderRadius: "8px", border: "1px solid #E2DED4", background: "#FFFFFF", boxShadow: "0 4px 14px rgba(0,0,0,0.12)" }}>
          {colorSchemes.map((scheme) => (
            <button
              key={scheme.id}
              type="button"
              onClick={() => { onColorSchemeChange(scheme.id); setPaletteOpen(false); }}
              aria-label={scheme.label}
              title={scheme.label}
              style={{ width: "20px", height: "20px", padding: 0, borderRadius: "50%", border: colorScheme === scheme.id ? "2px solid #111110" : "2px solid transparent", background: scheme.color, cursor: "pointer", boxShadow: colorScheme === scheme.id ? "0 0 0 1px #FFFFFF" : "none" }}
            />
          ))}
        </div>
      )}
    </div>
  );

  const primaryOverflowControls = (
    <div style={{ display: "grid", gap: "8px", minWidth: "230px" }}>
      {primaryOverflowLevel >= 2 && (
        <button type="button" onClick={() => { onModeChange("study"); setCompactMenuOpen(false); }} style={{ ...menuButtonStyle, background: mode === "study" ? "var(--app-accent-soft, #EEF2FF)" : "transparent" }}><IconBrain />Study</button>
      )}
      {primaryOverflowLevel >= 1 && showStatsControl && (
        <button type="button" onClick={() => { onStatsClick(); setCompactMenuOpen(false); }} style={{ ...menuButtonStyle, background: mode === "stats" ? "var(--app-accent-soft, #EEF2FF)" : "transparent" }}><IconBarChart />Stats</button>
      )}
      {menuSearchControl}
      {primaryOverflowLevel >= 3 && (
        <button type="button" onClick={() => { onModeChange("edit"); setCompactMenuOpen(false); }} style={{ ...menuButtonStyle, background: mode === "edit" ? "var(--app-accent-soft, #EEF2FF)" : "transparent" }}><IconBook />Library</button>
      )}
      {menuThemeControl}
      {isCompact && showEditingControl && (
        <button type="button" onClick={() => { onToggleEditingEnabled(); setCompactMenuOpen(false); }} aria-pressed={editingEnabled} style={{ ...menuButtonStyle, background: editingEnabled ? "var(--app-accent-soft, #EEF2FF)" : "transparent" }}><IconGear />{editingEnabled ? "Disable editing" : "Enable editing"}</button>
      )}
      {isCompact && showDarkModeControl && (
        <button type="button" onClick={() => { onToggleDarkMode(); setCompactMenuOpen(false); }} style={menuButtonStyle}><IconTheme darkMode={darkMode} />{darkMode ? "Light mode" : "Dark mode"}</button>
      )}
    </div>
  );

  return (
    <header
      ref={headerRef}
      className="app-topbar"
      style={{
        height: "52px",
        background: "#FFFFFF",
        borderBottom: "1px solid #E2DED4",
        display: "flex",
        alignItems: "center",
        paddingLeft: "12px",
        paddingRight: "16px",
        gap: "8px",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Sidebar toggle + logo */}
      {showSidebarToggle && (
        <button
          onClick={onToggleSidebar}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "6px",
            gap: "5px",
            padding: "4px 10px",
            border: "1px solid #E2DED4",
            background: "transparent",
            color: "#6B6560",
            fontSize: "12px",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.15s",
            transform: "scale(0.75)",
            transformOrigin: "left center",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            const element = e.currentTarget as HTMLElement;
            element.style.background = "#F0EDE6";
            element.style.borderColor = "#C8C4B8";
          }}
          onMouseLeave={(e) => {
            const element = e.currentTarget as HTMLElement;
            element.style.background = "transparent";
            element.style.borderColor = "#E2DED4";
          }}
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <IconSidebar />
        </button>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginRight: "4px" }}>
        <div
          style={{
            width: "26px",
            height: "26px",
            background: "var(--app-accent, #4F46E5)",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5" height="5" rx="1" fill="white" />
            <rect x="8" y="1" width="5" height="5" rx="1" fill="white" opacity="0.6" />
            <rect x="1" y="8" width="5" height="5" rx="1" fill="white" opacity="0.6" />
            <rect x="8" y="8" width="5" height="5" rx="1" fill="white" />
          </svg>
        </div>
        <span style={{ fontSize: "14px", fontWeight: 600, color: "#111110", letterSpacing: "-0.01em" }}>
          Flashcard Genius
        </span>
      </div>

      {!isCompact && topbarControls}
      {(isCompact || secondaryInMenu) && (
        <div ref={menuRef} style={{ position: "relative", marginLeft: "auto", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setCompactMenuOpen((open) => !open)}
            aria-label="Open menu"
            title="Open menu"
            style={{
              width: "auto",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 8px",
              borderRadius: "6px",
              border: "1px solid #E2DED4",
              background: compactMenuOpen ? "var(--app-accent-soft, #EEF2FF)" : "#FAFAF8",
              color: "#6B6560",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "12px",
            }}
          >
            <IconMenu />
          </button>
          {compactMenuOpen && (
            <div
              style={{
                position: "absolute",
                top: "40px",
                right: 0,
                zIndex: 60,
                padding: "10px",
                borderRadius: "10px",
                border: "1px solid #E2DED4",
                background: "#FFFFFF",
                boxShadow: "0 6px 20px rgba(0,0,0,0.14)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {primaryOverflowControls}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
