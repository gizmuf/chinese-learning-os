'use client';

import {useState} from 'react';
import {Download} from 'lucide-react';
import {useI18n} from './i18n';
import type {HanziGroupPdfEntry} from './notebook-pdf';

export function HanziGroupPdf({entries, title, fileName}: {
  entries: readonly HanziGroupPdfEntry[];
  title: string;
  fileName?: string;
}) {
  const {locale, t} = useI18n();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function download() {
    setBusy(true);
    setFailed(false);
    try {
      const {downloadHanziGroupPdf} = await import('./notebook-pdf');
      const slug = title.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
      await downloadHanziGroupPdf(entries, title, locale, fileName ?? `Chinese-OS-${slug || 'Hanzi'}-${locale}.pdf`);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button type="button" className="secondary" onClick={() => void download()} disabled={busy || !entries.length}>
      <Download size={17} aria-hidden="true"/>
      {busy ? t('Preparing PDF…') : t('Download PDF')}
    </button>
    {failed && <p role="alert">{t('Could not create the PDF. Please try again.')}</p>}
  </>;
}
