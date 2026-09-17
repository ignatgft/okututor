package com.okututor.backend.search.normalizer;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

public class SearchQueryNormalizer {

    private static final int MAX_QUERY_LENGTH = 200;
    private static final int MAX_TOKEN_COUNT = 20;
    private static final int MIN_FUZZY_LENGTH = 3;

    private static final Set<String> STOP_WORDS = Set.of(
            "и", "или", "но", "а", "в", "на", "с", "по", "для", "от", "до", "из", "к", "о", "об",
            "the", "and", "or", "but", "in", "on", "with", "for", "to", "from", "by", "of", "a", "an"
    );

    private final KeyboardLayoutNormalizer keyboardNormalizer;
    private final SynonymExpander synonymExpander;

    public SearchQueryNormalizer(KeyboardLayoutNormalizer keyboardNormalizer,
                                 SynonymExpander synonymExpander) {
        this.keyboardNormalizer = keyboardNormalizer;
        this.synonymExpander = synonymExpander;
    }

    public NormalizedQuery normalize(String rawQuery) {
        if (rawQuery == null || rawQuery.isBlank()) {
            return NormalizedQuery.empty();
        }

        String trimmed = rawQuery.trim();
        if (trimmed.length() > MAX_QUERY_LENGTH) {
            trimmed = trimmed.substring(0, MAX_QUERY_LENGTH);
        }

        String lowercased = trimmed.toLowerCase(Locale.ROOT);

        String unicodeNormalized = java.text.Normalizer
                .normalize(lowercased, java.text.Normalizer.Form.NFKC);

        String keyboardCorrected = keyboardNormalizer.correctLayout(unicodeNormalized);

        List<String> tokens = tokenize(keyboardCorrected);
        tokens = removeStopWords(tokens);
        if (tokens.size() > MAX_TOKEN_COUNT) {
            tokens = tokens.subList(0, MAX_TOKEN_COUNT);
        }

        // межраскладка: если исходный запрос был латиницей (vantv), добавить транслит варианты
        // чтобы "vantv" → "матем" нашёл "математика"
        List<String> interLayoutTokens = new java.util.ArrayList<>();
        if (hasLatin(rawQuery) && !hasCyrillic(rawQuery)) {
            String translit = transliterateSimple(rawQuery.toLowerCase(Locale.ROOT));
            if (!translit.equalsIgnoreCase(rawQuery)) {
                interLayoutTokens.addAll(tokenize(translit));
            }
            String keyboardAlt = keyboardNormalizer.correctLayout(rawQuery.toLowerCase(Locale.ROOT));
            if (!keyboardAlt.equalsIgnoreCase(rawQuery) && !keyboardAlt.equalsIgnoreCase(translit)) {
                interLayoutTokens.addAll(tokenize(keyboardAlt));
            }
        }
        // также для кириллицы добавить латиницу (матем → matem)
        if (hasCyrillic(rawQuery) && !hasLatin(rawQuery)) {
            // обратная транслитерация для поиска "матем" когда в БД есть "math"
            String reverse = transliterateRuToEn(rawQuery.toLowerCase(Locale.ROOT));
            if (!reverse.equalsIgnoreCase(rawQuery)) {
                interLayoutTokens.addAll(tokenize(reverse));
            }
        }

        List<String> allTokensForSyn = new java.util.ArrayList<>(tokens);
        allTokensForSyn.addAll(interLayoutTokens);
        List<String> expandedTokens = synonymExpander.expand(allTokensForSyn, keyboardCorrected);
        // добавить межраскладные токены напрямую, чтобы FTS их тоже искал
        for (String t : interLayoutTokens) {
            if (!expandedTokens.contains(t)) expandedTokens.add(t);
        }

        String ftsQuery = buildFtsQuery(tokens);
        String fuzzyQuery = buildFuzzyQuery(tokens);

        boolean shouldUseFuzzy = tokens.stream()
                .anyMatch(t -> t.length() >= MIN_FUZZY_LENGTH);

        return new NormalizedQuery(
                ftsQuery,
                fuzzyQuery,
                expandedTokens,
                shouldUseFuzzy,
                tokens);
    }

    private List<String> tokenize(String query) {
        return java.util.Arrays.stream(query.split("\\s+"))
                .filter(t -> !t.isBlank())
                .map(String::trim)
                .collect(Collectors.toList());
    }

    private List<String> removeStopWords(List<String> tokens) {
        return tokens.stream()
                .filter(t -> !STOP_WORDS.contains(t))
                .collect(Collectors.toList());
    }

    private String buildFtsQuery(List<String> tokens) {
        // токены для to_tsquery: только буквы/цифры (без операторов &|! и кавычек),
        // префикс :* для prefix-matching
        List<String> ftsParts = tokens.stream()
                .map(SearchQueryNormalizer::ftsToken)
                .filter(t -> !t.isEmpty())
                .distinct()
                .map(t -> t + ":*")
                .toList();
        return joinCapped(ftsParts, " & ");
    }

    private static String ftsToken(String token) {
        return token.replaceAll("[^\\p{L}\\p{N}]", "");
    }

    private String buildFuzzyQuery(List<String> tokens) {
        return joinCapped(tokens.stream()
                .filter(t -> t.length() >= MIN_FUZZY_LENGTH)
                .map(t -> t + "%")
                .toList(), " | ");
    }

    private boolean hasLatin(String s) {
        if (s == null) return false;
        return s.chars().anyMatch(c -> (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'));
    }
    private boolean hasCyrillic(String s) {
        if (s == null) return false;
        return s.chars().anyMatch(c -> c >= 0x0400 && c <= 0x04FF);
    }
    private String transliterateSimple(String s) {
        // простая фонетическая: v->в, a->а, n->н, t->т и т.д. + клавиатурная
        Map<Character, String> map = Map.ofEntries(
            Map.entry('a',"а"), Map.entry('b',"б"), Map.entry('v',"в"), Map.entry('g',"г"), Map.entry('d',"д"),
            Map.entry('e',"е"), Map.entry('z',"з"), Map.entry('i',"и"), Map.entry('y',"й"), Map.entry('k',"к"),
            Map.entry('l',"л"), Map.entry('m',"м"), Map.entry('n',"н"), Map.entry('o',"о"), Map.entry('p',"п"),
            Map.entry('r',"р"), Map.entry('s',"с"), Map.entry('t',"т"), Map.entry('u',"у"), Map.entry('f',"ф"),
            Map.entry('h',"х"), Map.entry('c',"ц"), Map.entry('q',"к"), Map.entry('w',"в"), Map.entry('x',"х"),
            Map.entry('A',"А"), Map.entry('B',"Б"), Map.entry('V',"В"), Map.entry('G',"Г"), Map.entry('D',"Д"),
            Map.entry('E',"Е"), Map.entry('Z',"З"), Map.entry('I',"И"), Map.entry('Y',"Й"), Map.entry('K',"К"),
            Map.entry('L',"Л"), Map.entry('M',"М"), Map.entry('N',"Н"), Map.entry('O',"О"), Map.entry('P',"П"),
            Map.entry('R',"Р"), Map.entry('S',"С"), Map.entry('T',"Т"), Map.entry('U',"У"), Map.entry('F',"Ф"),
            Map.entry('H',"Х"), Map.entry('C',"Ц")
        );
        StringBuilder sb = new StringBuilder();
        for (char c : s.toCharArray()) {
            String repl = map.get(c);
            sb.append(repl != null ? repl : String.valueOf(c));
        }
        return sb.toString();
    }
    private String transliterateRuToEn(String s) {
        Map<Character, String> map = Map.ofEntries(
            Map.entry('а',"a"), Map.entry('б',"b"), Map.entry('в',"v"), Map.entry('г',"g"), Map.entry('д',"d"),
            Map.entry('е',"e"), Map.entry('ё',"yo"), Map.entry('ж',"zh"), Map.entry('з',"z"), Map.entry('и',"i"),
            Map.entry('й',"y"), Map.entry('к',"k"), Map.entry('л',"l"), Map.entry('м',"m"), Map.entry('н',"n"),
            Map.entry('о',"o"), Map.entry('п',"p"), Map.entry('р',"r"), Map.entry('с',"s"), Map.entry('т',"t"),
            Map.entry('у',"u"), Map.entry('ф',"f"), Map.entry('х',"h"), Map.entry('ц',"c"), Map.entry('ч',"ch"),
            Map.entry('ш',"sh"), Map.entry('щ',"sch"), Map.entry('ъ',"'"), Map.entry('ы',"y"), Map.entry('ь',"'"),
            Map.entry('э',"e"), Map.entry('ю',"yu"), Map.entry('я',"ya")
        );
        StringBuilder sb = new StringBuilder();
        for (char c : s.toCharArray()) {
            String repl = map.get(c);
            sb.append(repl != null ? repl : String.valueOf(c));
        }
        return sb.toString();
    }

    /** Склеивает части, не превышая MAX_QUERY_LENGTH; одиночная длинная часть обрезается. */
    private String joinCapped(List<String> parts, String separator) {
        if (parts.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            if (sb.isEmpty()) {
                sb.append(part.length() > MAX_QUERY_LENGTH
                        ? part.substring(0, MAX_QUERY_LENGTH)
                        : part);
            } else if (sb.length() + separator.length() + part.length() <= MAX_QUERY_LENGTH) {
                sb.append(separator).append(part);
            } else {
                break;
            }
        }
        return sb.toString();
    }

    public record NormalizedQuery(
            String ftsQuery,
            String fuzzyQuery,
            List<String> expandedTokens,
            boolean shouldUseFuzzy,
            List<String> originalTokens) {

        public static NormalizedQuery empty() {
            return new NormalizedQuery("", "", List.of(), false, List.of());
        }
    }
}
