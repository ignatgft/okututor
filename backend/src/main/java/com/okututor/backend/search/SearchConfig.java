package com.okututor.backend.search;

import com.okututor.backend.search.normalizer.KeyboardLayoutNormalizer;
import com.okututor.backend.search.normalizer.SearchQueryNormalizer;
import com.okututor.backend.search.normalizer.SynonymExpander;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(SearchProperties.class)
public class SearchConfig {

    @Bean
    public KeyboardLayoutNormalizer keyboardLayoutNormalizer() {
        return new KeyboardLayoutNormalizer();
    }

    @Bean
    public SynonymExpander synonymExpander(SearchProperties searchProperties) {
        return SynonymExpander.withDefaultsPlus(searchProperties.getSynonyms().getGroups());
    }

    @Bean
    public SearchQueryNormalizer searchQueryNormalizer(KeyboardLayoutNormalizer keyboardNormalizer,
                                                        SynonymExpander synonymExpander) {
        return new SearchQueryNormalizer(keyboardNormalizer, synonymExpander);
    }
}
