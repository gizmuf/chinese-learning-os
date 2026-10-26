"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { translate, localeNames, type Locale } from "./translate";
const LanguageContext = createContext({locale:"en" as Locale, setLocale: (_:Locale)=>{}, t:(text:string,values?: (string|number|null|undefined)[])=>translate(text,"en",values)});
export function I18nProvider({children}:{children:React.ReactNode}) {
  const [locale,setLanguage] = useState<Locale>("en");
  useEffect(()=>{try {const saved=localStorage.getItem("chinese-os-language");if(saved==="en"||saved==="fr"||saved==="ru"||saved==="tr")setLanguage(saved);} catch {}},[]);
  const setLocale = useCallback((value:Locale)=>{setLanguage(value);try{localStorage.setItem("chinese-os-language",value);}catch{}},[]);
  useEffect(()=>{document.documentElement.lang=locale;},[locale]);
  const t=useCallback((text:string,values?: (string|number|null|undefined)[])=>translate(text,locale,values),[locale]);
  const value=useMemo(()=>({locale,setLocale,t}),[locale,setLocale,t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export const useI18n=()=>useContext(LanguageContext);
export function LanguagePicker(){const {locale,setLocale,t}=useI18n();return <select className="study-language" aria-label={t("Language")} value={locale} onChange={e=>setLocale(e.target.value as Locale)}>{Object.entries(localeNames).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select>;}
