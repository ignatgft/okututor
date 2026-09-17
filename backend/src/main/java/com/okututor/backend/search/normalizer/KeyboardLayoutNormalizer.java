package com.okututor.backend.search.normalizer;

import java.util.HashMap;
import java.util.Map;

public class KeyboardLayoutNormalizer {

    private static final Map<Character, Character> EN_TO_RU = new HashMap<>();
    private static final Map<Character, Character> RU_TO_EN = new HashMap<>();

    static {
        char[] en = "`qwertyuiop[]asdfghjkl;'zxcvbnm,./".toCharArray();
        char[] ru = "ёйцукенгшщзхъфывапролджэячсмитьбю.".toCharArray();
        for (int i = 0; i < en.length; i++) {
            EN_TO_RU.put(en[i], ru[i]);
            EN_TO_RU.put(Character.toUpperCase(en[i]), Character.toUpperCase(ru[i]));
            RU_TO_EN.put(ru[i], en[i]);
            RU_TO_EN.put(Character.toUpperCase(ru[i]), Character.toUpperCase(en[i]));
        }
        EN_TO_RU.put('{', 'х'); EN_TO_RU.put('}', 'ъ');
        EN_TO_RU.put(':', 'ж'); EN_TO_RU.put('"', 'э');
        EN_TO_RU.put('<', 'б'); EN_TO_RU.put('>', 'ю');
        EN_TO_RU.put('?', ',');
        RU_TO_EN.put('х', '{'); RU_TO_EN.put('ъ', '}');
        RU_TO_EN.put('ж', ':'); RU_TO_EN.put('э', '"');
        RU_TO_EN.put('б', '<'); RU_TO_EN.put('ю', '>');
        RU_TO_EN.put(',', '?');
    }

    public String correctLayout(String input) {
        if (input == null || input.isBlank()) return input;

        boolean hasCyrillic = input.chars().anyMatch(c -> c >= 0x0400 && c <= 0x04FF);
        boolean hasLatin = input.chars().anyMatch(c -> (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'));

        // Кириллицу (RU/KG) никогда не трогаем: прежняя RU→EN транслитерация
        // превращала "математика" в "vfnfvfnbrf" и ломала весь русский поиск.
        if (hasCyrillic) {
            return input;
        }

        // Латиница, похожая на русский текст, набранный в английской раскладке
        // ("ghbdtn" -> "привет"), исправляется в кириллицу.
        if (hasLatin && looksLikeCyrillicTypedInLatin(input)) {
            return transliterate(input, EN_TO_RU);
        }

        return input;
    }

    // Транслитерация a->а, b->б и т.д. для поиска "vantv" -> "матем" (пользователь думает что a=а, а не ф)
    private static final Map<Character, Character> TRANSLIT_EN_TO_RU = new HashMap<>();
    static {
        String[][] pairs = {
            {"a","а"}, {"b","б"}, {"v","в"}, {"g","г"}, {"d","д"}, {"e","е"}, {"yo","ё"}, {"zh","ж"}, {"z","з"},
            {"i","и"}, {"y","й"}, {"k","к"}, {"l","л"}, {"m","м"}, {"n","н"}, {"o","о"}, {"p","п"}, {"r","р"},
            {"s","с"}, {"t","т"}, {"u","у"}, {"f","ф"}, {"h","х"}, {"c","ц"}, {"ch","ч"}, {"sh","ш"}, {"sch","щ"},
            {"'","ъ"}, {"y","ы"}, {"e","э"}, {"yu","ю"}, {"ya","я"}
        };
        // single char map для быстрой проверки vantv -> матем
        TRANSLIT_EN_TO_RU.put('a','а'); TRANSLIT_EN_TO_RU.put('A','А');
        TRANSLIT_EN_TO_RU.put('b','б'); TRANSLIT_EN_TO_RU.put('B','Б');
        TRANSLIT_EN_TO_RU.put('v','в'); TRANSLIT_EN_TO_RU.put('V','В');
        TRANSLIT_EN_TO_RU.put('g','г'); TRANSLIT_EN_TO_RU.put('G','Г');
        TRANSLIT_EN_TO_RU.put('d','д'); TRANSLIT_EN_TO_RU.put('D','Д');
        TRANSLIT_EN_TO_RU.put('e','е'); TRANSLIT_EN_TO_RU.put('E','Е');
        TRANSLIT_EN_TO_RU.put('z','з'); TRANSLIT_EN_TO_RU.put('Z','З');
        TRANSLIT_EN_TO_RU.put('i','и'); TRANSLIT_EN_TO_RU.put('I','И');
        TRANSLIT_EN_TO_RU.put('y','й'); TRANSLIT_EN_TO_RU.put('Y','Й');
        TRANSLIT_EN_TO_RU.put('k','к'); TRANSLIT_EN_TO_RU.put('K','К');
        TRANSLIT_EN_TO_RU.put('l','л'); TRANSLIT_EN_TO_RU.put('L','Л');
        TRANSLIT_EN_TO_RU.put('m','м'); TRANSLIT_EN_TO_RU.put('M','М');
        TRANSLIT_EN_TO_RU.put('n','н'); TRANSLIT_EN_TO_RU.put('N','Н');
        TRANSLIT_EN_TO_RU.put('o','о'); TRANSLIT_EN_TO_RU.put('O','О');
        TRANSLIT_EN_TO_RU.put('p','п'); TRANSLIT_EN_TO_RU.put('P','П');
        TRANSLIT_EN_TO_RU.put('r','р'); TRANSLIT_EN_TO_RU.put('R','Р');
        TRANSLIT_EN_TO_RU.put('s','с'); TRANSLIT_EN_TO_RU.put('S','С');
        TRANSLIT_EN_TO_RU.put('t','т'); TRANSLIT_EN_TO_RU.put('T','Т');
        TRANSLIT_EN_TO_RU.put('u','у'); TRANSLIT_EN_TO_RU.put('U','У');
        TRANSLIT_EN_TO_RU.put('f','ф'); TRANSLIT_EN_TO_RU.put('F','Ф');
        TRANSLIT_EN_TO_RU.put('h','х'); TRANSLIT_EN_TO_RU.put('H','Х');
        TRANSLIT_EN_TO_RU.put('c','ц'); TRANSLIT_EN_TO_RU.put('C','Ц');
    }

    private boolean looksLikeCyrillicTypedInLatin(String input) {
        String lower = input.toLowerCase();
        // короткие запросы типа vantv (5 букв) — тоже проверяем
        if (lower.length() >= 3 && lower.length() <= 10) {
            // если транслитерация даёт кириллический корень, считаем что это русский в английской раскладке
            String translit = transliterate(lower, TRANSLIT_EN_TO_RU);
            String keyboard = transliterate(lower, EN_TO_RU);
            if (isCommonRoot(translit) || isCommonRoot(keyboard)) return true;
        }
        String common = "ghbdtn prvt ghbvthf pfq hfr yfcnz gjkjujv gjkyjv gjkyj ghbdtn vantv fynf";
        return common.contains(lower) || lower.contains("ghbdtn") || lower.contains("hfr") || lower.contains("vantv");
    }

    private boolean isCommonRoot(String s) {
        String[] roots = {"матем","физи","хими","биолог","информ","питон","python","англ","рус","кыргыз","орт","истор"};
        String low = s.toLowerCase();
        for (String r : roots) if (low.contains(r) || r.contains(low)) return true;
        return false;
    }

    private String transliterate(String input, Map<Character, Character> map) {
        StringBuilder sb = new StringBuilder(input.length());
        for (char c : input.toCharArray()) {
            sb.append(map.getOrDefault(c, c));
        }
        return sb.toString();
    }

    public Map<String, String> generateAlternatives(String input) {
        Map<String, String> alts = new HashMap<>();
        alts.put("original", input);

        String corrected = correctLayout(input);
        if (!corrected.equals(input)) {
            alts.put("corrected", corrected);
        }

        if (hasMixedLayout(input)) {
            alts.put("en", transliterate(input, RU_TO_EN));
            alts.put("ru", transliterate(input, EN_TO_RU));
        }
        return alts;
    }

    private boolean hasMixedLayout(String input) {
        return input.chars().anyMatch(c -> c >= 0x0400 && c <= 0x04FF) &&
               input.chars().anyMatch(c -> (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'));
    }
}