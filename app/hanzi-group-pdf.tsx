'use client';

import {useState} from 'react';
import {Download} from 'lucide-react';
import {useI18n} from './i18n';
import type {HanziGroupPdfEntry} from './notebook-pdf';

const missingStrokes = {
  en: (glyph: string) => `Stroke order is unavailable for ${glyph}.`,
  fr: (glyph: string) => `L’ordre des traits n’est pas disponible pour ${glyph}.`,
  ru: (glyph: string) => `Порядок черт для ${glyph} недоступен.`,
  tr: (glyph: string) => `${glyph} için çizgi sırası kullanılamıyor.`,
};


export function HanziGroupPdf({entries, title, fileName}: {
  entries: readonly HanziGroupPdfEntry[];
  title: string;
  fileName?: string;
}) {
  const {locale, t} = useI18n();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function download() {
    setBusy(true);
    setErrorMessage('');
    try {
      const {downloadHanziGroupPdf} = await import('./notebook-pdf');
      const slug = title.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
      await downloadHanziGroupPdf(entries, title, locale, fileName ?? `Chinese-OS-${slug || 'Hanzi'}-${locale}.pdf`);
    } catch (error) {
      setErrorMessage(error instanceof Error && error.name === 'MissingWorksheetStroke' && typeof error.cause === 'string'
        ? missingStrokes[locale](error.cause)
        : t('Could not create the PDF. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button type="button" className="secondary" onClick={() => void download()} disabled={busy || !entries.length}>
      <Download size={17} aria-hidden="true"/>
      {busy ? t('Preparing PDF…') : t('Download PDF')}
    </button>
    {errorMessage && <p role="alert">{errorMessage}</p>}
  </>;
}
