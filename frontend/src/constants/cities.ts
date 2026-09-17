/** Cities for marketplace — §7, easily managed, fallback if API unavailable */
export const MARKETPLACE_CITIES = [
  { value: "bishkek", labelKey: "city.bishkek", labelRu: "Бишкек" },
  { value: "osh", labelKey: "city.osh", labelRu: "Ош" },
  { value: "jalal-abad", labelKey: "city.jalal_abad", labelRu: "Жалал-Абад" },
  { value: "karakol", labelKey: "city.karakol", labelRu: "Каракол" },
  { value: "tokmok", labelKey: "city.tokmok", labelRu: "Токмок" },
  { value: "kara-balta", labelKey: "city.kara_balta", labelRu: "Кара-Балта" },
  { value: "kant", labelKey: "city.kant", labelRu: "Кант" },
  { value: "talas", labelKey: "city.talas", labelRu: "Талас" },
  { value: "naryn", labelKey: "city.naryn", labelRu: "Нарын" },
  { value: "batken", labelKey: "city.batken", labelRu: "Баткен" },
  { value: "online", labelKey: "city.online", labelRu: "Онлайн" },
] as const;

export type MarketplaceCity = (typeof MARKETPLACE_CITIES)[number]["value"];

export const MARKETPLACE_SUBJECTS = [
  { value: "matematika", labelKey: "subject.matematika", labelRu: "Математика", synonyms: ["математика","матем","math"] },
  { value: "angliyskiy", labelKey: "subject.angliyskiy", labelRu: "Английский", synonyms: ["английский","англ","english"] },
  { value: "russkiy", labelKey: "subject.russkiy", labelRu: "Русский", synonyms: ["русский","russian"] },
  { value: "kyrgyzskiy", labelKey: "subject.kyrgyzskiy", labelRu: "Кыргызский", synonyms: ["кыргызский","kyrgyz"] },
  { value: "fizika", labelKey: "subject.fizika", labelRu: "Физика", synonyms: ["физика","physics"] },
  { value: "himiya", labelKey: "subject.himiya", labelRu: "Химия", synonyms: ["химия","chemistry"] },
  { value: "biologiya", labelKey: "subject.biologiya", labelRu: "Биология", synonyms: ["биология","biology"] },
  { value: "informatika", labelKey: "subject.informatika", labelRu: "Информатика", synonyms: ["информатика","informatics"] },
  { value: "python", labelKey: "subject.python", labelRu: "Python", synonyms: ["python","питон","питон"] },
  { value: "ort", labelKey: "subject.ort", labelRu: "ОРТ", synonyms: ["орт","ort"] },
] as const;

export type MarketplaceSubject = (typeof MARKETPLACE_SUBJECTS)[number]["value"];
