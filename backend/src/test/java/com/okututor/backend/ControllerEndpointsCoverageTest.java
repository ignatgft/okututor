package com.okututor.backend;

import static org.assertj.core.api.Assertions.assertThat;

import com.okututor.backend.favorite.FavoriteController;
import com.okututor.backend.tutor.TutorProfileController;
import com.okututor.backend.review.ReviewController;
import com.okututor.backend.search.SearchController;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.*;

class ControllerEndpointsCoverageTest {

    private static Set<String> pathsOf(Class<?> ctrl) {
        String[] bases = {};
        if (ctrl.isAnnotationPresent(RequestMapping.class)) {
            bases = ctrl.getAnnotation(RequestMapping.class).value();
        }
        if (bases.length == 0) bases = new String[]{""};
        Set<String> out = new java.util.HashSet<>();
        for (Method m : ctrl.getDeclaredMethods()) {
            String[] subs = null;
            if (m.isAnnotationPresent(GetMapping.class)) subs = m.getAnnotation(GetMapping.class).value();
            else if (m.isAnnotationPresent(PostMapping.class)) subs = m.getAnnotation(PostMapping.class).value();
            else if (m.isAnnotationPresent(DeleteMapping.class)) subs = m.getAnnotation(DeleteMapping.class).value();
            else if (m.isAnnotationPresent(PutMapping.class)) subs = m.getAnnotation(PutMapping.class).value();
            else if (m.isAnnotationPresent(RequestMapping.class)) subs = m.getAnnotation(RequestMapping.class).value();
            if (subs == null) continue;
            if (subs.length == 0) {
                for (String b : bases) out.add(normalize(b.isEmpty() ? "/" : b));
            } else {
                for (String b : bases) {
                    for (String s : subs) {
                        s = s.trim();
                        String path;
                        if (s.isEmpty()) path = b;
                        else if (s.startsWith("/")) path = b + s;
                        else path = b + "/" + s;
                        out.add(normalize(path));
                    }
                }
            }
        }
        return out;
    }

    private static String normalize(String path) {
        return path.replaceAll("\\{(\\w+):[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\}", "{$1}");
    }

    @Test
    void allExpectedEndpointsRegistered() {
        Set<String> fav = pathsOf(FavoriteController.class);
        assertThat(fav).contains("/api/v1/favorites", "/api/v1/favorites/{profileId}", "/api/v1/favorites/ids");
        Set<String> tutor = pathsOf(TutorProfileController.class);
        assertThat(tutor).contains("/api/v1/tutors", "/api/v1/tutors/{slug}");
        assertThat(Arrays.stream(TutorProfileController.class.getDeclaredMethods()).anyMatch(m -> m.getName().equals("hide"))).isTrue();
        assertThat(Arrays.stream(TutorProfileController.class.getDeclaredMethods()).anyMatch(m -> m.getName().equals("deleteMe"))).isTrue();
        assertThat(pathsOf(SearchController.class)).contains("/api/v1/search/tutors");
    }

    @Test
    void favoriteAndTutorProfileMutations_mapped() {
        assertThat(Arrays.stream(FavoriteController.class.getDeclaredMethods()).anyMatch(m -> m.getName().equals("add"))).isTrue();
        assertThat(Arrays.stream(FavoriteController.class.getDeclaredMethods()).anyMatch(m -> m.getName().equals("remove"))).isTrue();
        assertThat(Arrays.stream(TutorProfileController.class.getDeclaredMethods()).anyMatch(m -> m.getName().equals("hide"))).isTrue();
    }
}
