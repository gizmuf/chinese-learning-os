export const lesson11Materials=[
  {
    "id": "workbook-en",
    "locale": "en",
    "kind": "hybrid",
    "label": "English",
    "pages": 54,
    "filename": "Chinese_Practice_Lesson_11_HYBRID_EN_iPad_SAFE.pdf",
    "path": "resources/lesson11/hybrid-en.pdf",
    "commit": "ce90d581198ce9fa81234a2dc3ac561f583a6690",
    "bytes": 9374219,
    "sha256": "36b83851a409439fad7c36aa47e735d6ab50509f3ad638f818690dda157f38cc"
  },
  {
    "id": "workbook-fr",
    "locale": "fr",
    "kind": "hybrid",
    "label": "Français",
    "pages": 54,
    "filename": "Chinese_Practice_Lesson_11_HYBRID_FR_iPad_SAFE.pdf",
    "path": "resources/lesson11/hybrid-fr.pdf",
    "commit": "ce90d581198ce9fa81234a2dc3ac561f583a6690",
    "bytes": 9522353,
    "sha256": "940810a8d6ea39de30c9af2b06932f773b78bbafa5acea46f6d3fa5ffef761ad"
  },
  {
    "id": "workbook-ru",
    "locale": "ru",
    "kind": "hybrid",
    "label": "Русский",
    "pages": 54,
    "filename": "Chinese_Practice_Lesson_11_HYBRID_RU_iPad_SAFE.pdf",
    "path": "resources/lesson11/hybrid-ru.pdf",
    "commit": "ce90d581198ce9fa81234a2dc3ac561f583a6690",
    "bytes": 9572132,
    "sha256": "12d7d407f793bde82cc3194c88ba6cd13df1b4e825b5ab1ba3442088d0ab8edd"
  },
  {
    "id": "workbook-tr",
    "locale": "tr",
    "kind": "hybrid",
    "label": "Türkçe",
    "pages": 54,
    "filename": "Chinese_Practice_Lesson_11_HYBRID_TR_iPad_SAFE.pdf",
    "path": "resources/lesson11/hybrid-tr.pdf",
    "commit": "ce90d581198ce9fa81234a2dc3ac561f583a6690",
    "bytes": 9112637,
    "sha256": "e9d864b1dcca80147a050249327ff0f957937dcbae559474607e574d76b7027c"
  }
] as const;
export const lesson11MaterialHref=(id:string)=>'/api/lesson11-material?file='+encodeURIComponent(id);
