import translationDeDe from '../../lang/de_DE.json';
import translationEnCa from '../../lang/en_CA.json';
import baseEnglish from '../../lang/en_MAIN.json';
import translationEsCl from '../../lang/es_CL.json';
import translationFiFi from '../../lang/fi_FI.json';
import translationFrCa from '../../lang/fr_CA.json';
import translationKoKo from '../../lang/ko_KO.json';
import translationNlNl from '../../lang/nl_NL.json';
import translationPlPl from '../../lang/pl_PL.json';
import translationPtBr from '../../lang/pt_BR.json';
import translationPtPt from '../../lang/pt_PT.json';
import translationRuRu from '../../lang/ru_RU.json';

type RainwaveLocale =
  | 'de-DE'
  | 'en-CA'
  | 'es-CL'
  | 'fi-FI'
  | 'fr-CA'
  | 'ko-KO'
  | 'nl-NL'
  | 'pl-PL'
  | 'pt-BR'
  | 'pt-PT'
  | 'ru-RU';

type RainwaveTranslationKey = keyof typeof baseEnglish;

type RainwaveTranslationSubstitution = {
  type: 'substitute';
  key: string;
};

type RainwaveTranslationOrdinal = {
  type: 'ordinal';
  key: string;
};

type RainwaveTranslationPlural = {
  type: 'plural';
  key: string;
  plurals: Partial<Record<Intl.LDMLPluralRule, string>>;
};

type RainwaveTranslationToken =
  | RainwaveTranslationSubstitution
  | RainwaveTranslationOrdinal
  | RainwaveTranslationPlural;

type RainwaveTranslationValue = string | Array<string | RainwaveTranslationToken>;

type RainwaveTranslationFile = Record<string, RainwaveTranslationValue>;

const LOCALE_COOKIE_KEY = 'rw_lang';

const ALL_TRANSLATIONS: Record<RainwaveLocale, RainwaveTranslationFile> = {
  'de-DE': translationDeDe as RainwaveTranslationFile,
  'en-CA': translationEnCa as RainwaveTranslationFile,
  'es-CL': translationEsCl as RainwaveTranslationFile,
  'fi-FI': translationFiFi as RainwaveTranslationFile,
  'fr-CA': translationFrCa as RainwaveTranslationFile,
  'ko-KO': translationKoKo as RainwaveTranslationFile,
  'nl-NL': translationNlNl as RainwaveTranslationFile,
  'pl-PL': translationPlPl as RainwaveTranslationFile,
  'pt-BR': translationPtBr as RainwaveTranslationFile,
  'pt-PT': translationPtPt as RainwaveTranslationFile,
  'ru-RU': translationRuRu as RainwaveTranslationFile,
};

type OrdinalSuffixes = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

const ORDINAL_SUFFIXES: Record<RainwaveLocale, OrdinalSuffixes> = {
  'de-DE': { other: '.' },
  'en-CA': { one: 'st', two: 'nd', few: 'rd', other: 'th' },
  'es-CL': { other: 'º' },
  'fi-FI': { other: '.' },
  'fr-CA': { one: 'er', other: 'e' },
  'ko-KO': { other: '번째' },
  'nl-NL': { other: 'e' },
  'pl-PL': { other: '.' },
  'pt-BR': { other: 'º' },
  'pt-PT': { other: 'º' },
  'ru-RU': { other: '-е' },
};

function getLanguage(): [RainwaveLocale, OrdinalSuffixes, RainwaveTranslationFile] {
  let locale: RainwaveLocale = 'en-CA';
  let lang: RainwaveTranslationFile | undefined = ALL_TRANSLATIONS['en-CA'];

  const cookieLocale = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${LOCALE_COOKIE_KEY}=`))
    ?.substring(LOCALE_COOKIE_KEY.length + 1);
  const potentialLang = (cookieLocale || navigator.language || 'en-CA').replace('_', '-');

  Object.keys(ALL_TRANSLATIONS).forEach((key) => {
    if (key.toLowerCase() == potentialLang.toLowerCase()) {
      locale = key as RainwaveLocale;
      lang = ALL_TRANSLATIONS[key as RainwaveLocale];
    }
  });

  if (!lang) {
    Object.keys(ALL_TRANSLATIONS).forEach((key) => {
      if (key.slice(0, 2).toLowerCase() == potentialLang.slice(0, 2).toLowerCase()) {
        locale = key as RainwaveLocale;
        lang = ALL_TRANSLATIONS[key as RainwaveLocale];
      }
    });
  }

  return [
    locale,
    ORDINAL_SUFFIXES[locale],
    { ...(baseEnglish as RainwaveTranslationFile), ...lang },
  ];
}

const [locale, ordinalSuffixes, translation] = getLanguage();
const cardinal = new Intl.PluralRules(locale, { type: 'cardinal' });
const ordinal = new Intl.PluralRules(locale, { type: 'ordinal' });

export { ALL_TRANSLATIONS, locale, ordinalSuffixes, translation, cardinal, ordinal };
export type {
  RainwaveTranslationFile,
  RainwaveTranslationKey,
  RainwaveTranslationOrdinal,
  RainwaveTranslationPlural,
  RainwaveTranslationSubstitution,
  RainwaveTranslationToken,
  RainwaveTranslationValue,
  RainwaveLocale,
};
