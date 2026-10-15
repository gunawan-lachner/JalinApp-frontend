import type * as Monaco from "monaco-editor"

let registered = false

/**
 * Lightweight Monarch tokenizer for RenJS script files.
 * Covers common RenJS constructs: labels, say/show/hide/play, choices, vars, JS-like expressions.
 */
export function registerRenjsLanguage(monaco: typeof Monaco): void {
  if (registered) return
  registered = true

  monaco.languages.register({ id: "renjs" })

  monaco.languages.setLanguageConfiguration("renjs", {
    comments: {
      lineComment: "#",
      blockComment: ["/*", "*/"],
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: "`", close: "`" },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: "`", close: "`" },
    ],
  })

  monaco.languages.setMonarchTokensProvider("renjs", {
    defaultToken: "",
    ignoreCase: false,
    keywords: [
      "show",
      "hide",
      "say",
      "wait",
      "play",
      "stop",
      "scene",
      "end",
      "choice",
      "var",
      "set",
      "if",
      "else",
      "call",
      "jump",
      "label",
      "with",
      "at",
      "as",
      "to",
      "from",
      "fade",
      "move",
      "animate",
      "effect",
      "ambient",
      "bgm",
      "sfx",
      "voice",
      "clear",
      "pause",
      "resume",
      "return",
      "true",
      "false",
      "null",
      "and",
      "or",
      "not",
    ],
    typeKeywords: ["character", "image", "audio", "background", "gui", "config"],
    operators: ["=", "==", "!=", "<", ">", "<=", ">=", "+", "-", "*", "/", "&&", "||", "!"],
    symbols: /[=><!~?:&|+\-*\/^%]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    tokenizer: {
      root: [
        [/#.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [/^[ \t]*[a-zA-Z_][\w-]*\s*:/, "type.identifier"],
        [/@[a-zA-Z_][\w-]*/, "tag"],
        [
          /[a-zA-Z_][\w-]*/,
          {
            cases: {
              "@keywords": "keyword",
              "@typeKeywords": "type",
              "@default": "identifier",
            },
          },
        ],
        [/\d*\.\d+([eE][-+]?\d+)?/, "number.float"],
        [/\d+/, "number"],
        [/"([^"\\]|\\.)*$/, "string.invalid"],
        [/'([^'\\]|\\.)*$/, "string.invalid"],
        [/"/, "string", "@string_double"],
        [/'/, "string", "@string_single"],
        [/`/, "string", "@string_backtick"],
        [/[{}()[\]]/, "@brackets"],
        [/@symbols/, { cases: { "@operators": "operator", "@default": "" } }],
        [/[,;.]/, "delimiter"],
        [/\s+/, "white"],
      ],
      comment: [
        [/[^/*]+/, "comment"],
        [/\*\//, "comment", "@pop"],
        [/[/*]/, "comment"],
      ],
      string_double: [
        [/[^\\"]+/, "string"],
        [/@escapes/, "string.escape"],
        [/\\./, "string.escape.invalid"],
        [/"/, "string", "@pop"],
      ],
      string_single: [
        [/[^\\']+/, "string"],
        [/@escapes/, "string.escape"],
        [/\\./, "string.escape.invalid"],
        [/'/, "string", "@pop"],
      ],
      string_backtick: [
        [/\$\{/, { token: "delimiter.bracket", next: "@bracketCounting" }],
        [/[^\\`$]+/, "string"],
        [/@escapes/, "string.escape"],
        [/\\./, "string.escape.invalid"],
        [/`/, "string", "@pop"],
      ],
      bracketCounting: [
        [/\{/, "delimiter.bracket", "@bracketCounting"],
        [/\}/, "delimiter.bracket", "@pop"],
        { include: "root" },
      ],
    },
  })
}
