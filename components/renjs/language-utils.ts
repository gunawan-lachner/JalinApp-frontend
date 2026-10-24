export type EditorLanguageId =
  | "javascript"
  | "typescript"
  | "html"
  | "css"
  | "json"
  | "sql"
  | "markdown"
  | "xml"
  | "xslt"
  | "yaml"
  | "python"
  | "shell"
  | "plaintext"
  | "renjs"

const EXT_TO_LANGUAGE: Record<string, EditorLanguageId> = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".html": "html",
  ".htm": "html",
  ".css": "css",
  ".scss": "css",
  ".less": "css",
  ".json": "json",
  ".sql": "sql",
  ".md": "markdown",
  ".markdown": "markdown",
  ".xml": "xml",
  ".xsl": "xslt",
  ".xslt": "xslt",
  ".yml": "yaml",
  ".yaml": "yaml",
  ".py": "python",
  ".sh": "shell",
  ".bash": "shell",
  // Script RenJS di project ini umumnya JavaScript
  ".renjs": "javascript",
  ".txt": "plaintext",
  ".log": "plaintext",
  ".conf": "plaintext",
  ".cfg": "plaintext",
  ".ini": "plaintext",
}

const LANGUAGE_LABELS: Record<EditorLanguageId, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  html: "HTML",
  css: "CSS",
  json: "JSON",
  sql: "SQL",
  markdown: "Markdown",
  xml: "XML",
  xslt: "XSLT",
  yaml: "YAML",
  python: "Python",
  shell: "Shell",
  plaintext: "Plain Text",
  renjs: "RenJS",
}

export function getExtension(fileNameOrPath: string): string {
  const base = fileNameOrPath.replace(/\\/g, "/").split("/").pop() || ""
  const idx = base.lastIndexOf(".")
  if (idx <= 0) return ""
  return base.slice(idx).toLowerCase()
}

export function detectLanguage(fileNameOrPath: string): EditorLanguageId {
  return EXT_TO_LANGUAGE[getExtension(fileNameOrPath)] || "plaintext"
}

export function languageLabel(lang: EditorLanguageId): string {
  return LANGUAGE_LABELS[lang] || lang
}

/** Monaco built-in id; renjs/xslt are registered as custom languages. */
export function toMonacoLanguage(lang: EditorLanguageId): string {
  return lang
}
