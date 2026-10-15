export type EditorLanguageId =
  | "javascript"
  | "typescript"
  | "html"
  | "css"
  | "json"
  | "sql"
  | "markdown"
  | "xml"
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
  ".yml": "yaml",
  ".yaml": "yaml",
  ".py": "python",
  ".sh": "shell",
  ".bash": "shell",
  ".renjs": "renjs",
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

/** Monaco built-in id; renjs is registered as custom language. */
export function toMonacoLanguage(lang: EditorLanguageId): string {
  return lang
}
