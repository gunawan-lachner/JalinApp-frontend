import type * as Monaco from "monaco-editor"

let registered = false

/** Common XSLT 1.0 / 2.0 element local-names (after xsl: / xslt: prefix). */
const XSLT_ELEMENTS = [
  "stylesheet",
  "transform",
  "include",
  "import",
  "output",
  "strip-space",
  "preserve-space",
  "key",
  "decimal-format",
  "namespace-alias",
  "attribute-set",
  "variable",
  "param",
  "template",
  "apply-templates",
  "call-template",
  "apply-imports",
  "with-param",
  "for-each",
  "for-each-group",
  "sort",
  "if",
  "choose",
  "when",
  "otherwise",
  "value-of",
  "copy-of",
  "copy",
  "text",
  "attribute",
  "element",
  "processing-instruction",
  "comment",
  "number",
  "message",
  "fallback",
  "function",
  "result-document",
  "sequence",
  "analyze-string",
  "matching-substring",
  "non-matching-substring",
  "character-map",
  "output-character",
]

const XSLT_ATTRS = [
  "match",
  "select",
  "name",
  "mode",
  "priority",
  "test",
  "href",
  "method",
  "version",
  "encoding",
  "indent",
  "omit-xml-declaration",
  "standalone",
  "doctype-public",
  "doctype-system",
  "media-type",
  "cdata-section-elements",
  "use-attribute-sets",
  "disable-output-escaping",
  "terminate",
  "order",
  "data-type",
  "lang",
  "case-order",
  "group-by",
  "group-adjacent",
  "group-starting-with",
  "group-ending-with",
  "collation",
  "as",
  "tunnel",
  "required",
  "override",
  "xpath-default-namespace",
  "exclude-result-prefixes",
  "extension-element-prefixes",
  "use",
  "count",
  "from",
  "level",
  "format",
  "letter-value",
  "grouping-separator",
  "grouping-size",
]

/**
 * Monarch tokenizer for XSLT: XML structure + highlighted xsl:/xslt: elements & XPath-ish attrs.
 */
export function registerXsltLanguage(monaco: typeof Monaco): void {
  if (registered) return
  registered = true

  monaco.languages.register({ id: "xslt", extensions: [".xsl", ".xslt"], aliases: ["XSLT", "xslt"] })

  monaco.languages.setLanguageConfiguration("xslt", {
    comments: {
      blockComment: ["<!--", "-->"],
    },
    brackets: [
      ["<", ">"],
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "<", close: ">" },
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: "<", close: ">" },
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    folding: {
      markers: {
        start: /^\s*<!--\s*#?region\b/,
        end: /^\s*<!--\s*#?endregion\b/,
      },
    },
  })

  monaco.languages.setMonarchTokensProvider("xslt", {
    defaultToken: "",
    ignoreCase: true,
    xsltElements: XSLT_ELEMENTS,
    xsltAttrs: XSLT_ATTRS,
    tokenizer: {
      root: [
        [/<\?xml/, "metatag", "@xmlDecl"],
        [/<\?/, "metatag", "@processingInstr"],
        [/<!--/, "comment", "@comment"],
        [/<!\[CDATA\[/, "string", "@cdata"],
        [/<!DOCTYPE/, "metatag", "@doctype"],
        [
          /<\/?(?:xsl|xslt):([\w.-]+)/,
          {
            cases: {
              "$1@xsltElements": { token: "keyword", next: "@xsltTag" },
              "@default": { token: "tag", next: "@tag" },
            },
          },
        ],
        [/<\/?[\w.:-]+/, "tag", "@tag"],
        [/[^<]+/, ""],
      ],

      xmlDecl: [
        [/\?>/, "metatag", "@pop"],
        [/[\w.:-]+/, "attribute.name"],
        [/=/, "delimiter"],
        [/"[^"]*"/, "attribute.value"],
        [/'[^']*'/, "attribute.value"],
        [/./, ""],
      ],

      processingInstr: [
        [/\?>/, "metatag", "@pop"],
        [/./, "metatag.content"],
      ],

      comment: [
        [/-->/, "comment", "@pop"],
        [/[^-]+/, "comment"],
        [/./, "comment"],
      ],

      cdata: [
        [/\]\]>/, "string", "@pop"],
        [/[^\]]+/, "string"],
        [/./, "string"],
      ],

      doctype: [
        [/>/, "metatag", "@pop"],
        [/\[/, "metatag", "@doctypeInternal"],
        [/[^>\[]+/, "metatag.content"],
      ],

      doctypeInternal: [
        [/\]/, "metatag", "@pop"],
        [/./, "metatag.content"],
      ],

      xsltTag: [
        [/\s+/, ""],
        [
          /([\w.:-]+)(\s*)(=)/,
          {
            cases: {
              "$1@xsltAttrs": ["keyword", "", "delimiter"],
              "@default": ["attribute.name", "", "delimiter"],
            },
          },
        ],
        [/[\w.:-]+/, "attribute.name"],
        [/=/, "delimiter"],
        [/"/, "attribute.value", "@attrDoubleXpath"],
        [/'/, "attribute.value", "@attrSingleXpath"],
        [/\/?>/, "keyword", "@pop"],
        [/./, ""],
      ],

      tag: [
        [/\s+/, ""],
        [/[\w.:-]+/, "attribute.name"],
        [/=/, "delimiter"],
        [/"/, "attribute.value", "@attrDouble"],
        [/'/, "attribute.value", "@attrSingle"],
        [/\/?>/, "tag", "@pop"],
        [/./, ""],
      ],

      attrDouble: [
        [/[^"&]+/, "attribute.value"],
        [/&[^;]+;/, "string.escape"],
        [/"/, "attribute.value", "@pop"],
        [/./, "attribute.value"],
      ],

      attrSingle: [
        [/[^'&]+/, "attribute.value"],
        [/&[^;]+;/, "string.escape"],
        [/'/, "attribute.value", "@pop"],
        [/./, "attribute.value"],
      ],

      // Highlight XPath-ish tokens inside XSLT attribute values
      attrDoubleXpath: [
        [/\$[\w.-]+/, "variable"],
        [/\b(and|or|not|div|mod)\b/, "keyword"],
        [/\b(true|false|null)\b/, "constant"],
        [
          /\b(string|number|boolean|concat|substring|contains|starts-with|normalize-space|translate|count|sum|position|last|name|local-name|namespace-uri|generate-id|document|key|format-number|current|unparsed-entity-uri|system-property)\s*(?=\()/,
          "type",
        ],
        [/\d+(\.\d+)?/, "number"],
        [/[@*\/|=+<>!()[\].]/, "operator"],
        [/[^"'&$@*\/|=+<>!()[\].\w.-]+/, "attribute.value"],
        [/&[^;]+;/, "string.escape"],
        [/"/, "attribute.value", "@pop"],
        [/[\w.-]+/, "attribute.value"],
        [/./, "attribute.value"],
      ],

      attrSingleXpath: [
        [/\$[\w.-]+/, "variable"],
        [/\b(and|or|not|div|mod)\b/, "keyword"],
        [/\b(true|false|null)\b/, "constant"],
        [
          /\b(string|number|boolean|concat|substring|contains|starts-with|normalize-space|translate|count|sum|position|last|name|local-name|namespace-uri|generate-id|document|key|format-number|current|unparsed-entity-uri|system-property)\s*(?=\()/,
          "type",
        ],
        [/\d+(\.\d+)?/, "number"],
        [/[@*\/|=+<>!()[\].]/, "operator"],
        [/[^"'&$@*\/|=+<>!()[\].\w.-]+/, "attribute.value"],
        [/&[^;]+;/, "string.escape"],
        [/'/, "attribute.value", "@pop"],
        [/[\w.-]+/, "attribute.value"],
        [/./, "attribute.value"],
      ],
    },
  })
}
