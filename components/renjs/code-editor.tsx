"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import Editor, { type OnMount } from "@monaco-editor/react"
import type * as Monaco from "monaco-editor"
import { Loader2 } from "lucide-react"
import { detectLanguage, languageLabel, toMonacoLanguage } from "@/components/renjs/language-utils"
import { registerRenjsLanguage } from "@/components/renjs/renjs-language"
import { registerXsltLanguage } from "@/components/renjs/xslt-language"

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  fileName?: string | null
  readOnly?: boolean
  className?: string
}

export function CodeEditor({ value, onChange, fileName, readOnly = false, className }: CodeEditorProps) {
  const language = useMemo(() => detectLanguage(fileName || ""), [fileName])
  const monacoLanguage = toMonacoLanguage(language)
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof Monaco | null>(null)

  const applyLanguage = useCallback((lang: string) => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco) return
    const model = editor.getModel()
    if (model && model.getLanguageId() !== lang) {
      monaco.editor.setModelLanguage(model, lang)
    }
  }, [])

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor
      monacoRef.current = monaco
      registerRenjsLanguage(monaco)
      registerXsltLanguage(monaco)
      const model = editor.getModel()
      if (model) {
        monaco.editor.setModelLanguage(model, monacoLanguage)
      }
    },
    [monacoLanguage],
  )

  useEffect(() => {
    applyLanguage(monacoLanguage)
  }, [monacoLanguage, applyLanguage])

  return (
    <div className={`h-full w-full min-h-0 ${className || ""}`}>
      <Editor
        height="100%"
        language={monacoLanguage}
        value={value}
        path={fileName || "untitled.js"}
        onChange={(v) => onChange(v ?? "")}
        onMount={handleMount}
        theme="vs"
        loading={
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Memuat editor ({languageLabel(language)})...
          </div>
        }
        options={{
          readOnly,
          fontSize: 13,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          minimap: { enabled: true, scale: 1 },
          wordWrap: "on",
          automaticLayout: true,
          scrollBeyondLastLine: false,
          tabSize: 2,
          renderWhitespace: "selection",
          smoothScrolling: true,
          bracketPairColorization: { enabled: true },
          padding: { top: 12, bottom: 12 },
          lineNumbers: "on",
          glyphMargin: false,
          folding: true,
          cursorBlinking: "smooth",
          // Bantuan edit JavaScript
          autoClosingBrackets: "languageDefined",
          autoClosingQuotes: "languageDefined",
          suggestOnTriggerCharacters: true,
          quickSuggestions: {
            other: true,
            comments: false,
            strings: true,
          },
          formatOnPaste: true,
          formatOnType: true,
        }}
      />
    </div>
  )
}

export function CodeEditorLanguageBadge({ fileName }: { fileName?: string | null }) {
  const language = detectLanguage(fileName || "")
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-600">
      {languageLabel(language)}
    </span>
  )
}
