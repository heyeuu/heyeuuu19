import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { defineEcConfig } from "astro-expressive-code";

export default defineEcConfig({
  themes: ["github-light"],
  plugins: [pluginCollapsibleSections()],
  frames: {
    extractFileNameFromCode: true,
    removeCommentsWhenCopyingTerminalFrames: false,
    showCopyToClipboardButton: true,
  },
  defaultProps: {
    collapseStyle: "collapsible-auto",
  },
  styleOverrides: {
    borderColor: "color-mix(in oklab, var(--color-secondary) 45%, transparent)",
    borderRadius: "1.75rem",
    borderWidth: "1px",
    codeFontFamily: "var(--font-plex)",
    codeFontSize: "0.92rem",
    codeLineHeight: "1.75",
    codePaddingBlock: "1rem",
    codePaddingInline: "1.2rem",
    uiFontFamily: "var(--font-plex)",
    uiFontSize: "0.8rem",
    frames: {
      editorActiveTabBackground:
        "color-mix(in oklab, var(--color-background) 96%, transparent)",
      editorActiveTabForeground: "var(--color-foreground)",
      editorTabBarBackground: "transparent",
      inlineButtonBorder: "var(--color-secondary)",
      inlineButtonForeground: "var(--color-secondary)",
      terminalTitlebarBackground:
        "color-mix(in oklab, var(--color-background) 96%, transparent)",
      terminalTitlebarForeground: "var(--color-secondary)",
      tooltipSuccessBackground: "var(--color-foreground)",
      tooltipSuccessForeground: "var(--color-background)",
    },
    textMarkers: {
      markBackground:
        "color-mix(in oklab, var(--color-primary) 14%, transparent)",
      markBorderColor:
        "color-mix(in oklab, var(--color-primary) 35%, transparent)",
    },
    collapsibleSections: {
      closedBackgroundColor:
        "color-mix(in oklab, var(--color-primary) 10%, transparent)",
      closedBorderColor:
        "color-mix(in oklab, var(--color-primary) 25%, transparent)",
      closedTextColor: "var(--color-secondary)",
    },
  },
});
