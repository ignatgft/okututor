package com.okututor.backend.config;

import com.okututor.backend.level.Level;
import com.okututor.backend.level.LevelRepository;
import com.okututor.backend.location.City;
import com.okututor.backend.location.CityRepository;
import com.okututor.backend.location.District;
import com.okututor.backend.location.DistrictRepository;
import com.okututor.backend.subject.Subject;
import com.okututor.backend.subject.SubjectRepository;
import com.okututor.backend.support.SupportService;
import com.okututor.backend.support.dto.SupportTicketCreateRequest;
import com.okututor.backend.tutor.TutorProfile;
import com.okututor.backend.tutor.TutorProfileLanguage;
import com.okututor.backend.tutor.TutorProfileLanguageRepository;
import com.okututor.backend.tutor.TutorProfileLevel;
import com.okututor.backend.tutor.TutorProfileLevelRepository;
import com.okututor.backend.tutor.TutorProfileRepository;
import com.okututor.backend.tutor.TutorProfileStatus;
import com.okututor.backend.tutor.TutorProfileSubject;
import com.okututor.backend.tutor.TutorProfileSubjectRepository;
import com.okututor.backend.tutor.TutorProfileMapper;
import com.okututor.backend.tutor.TutorType;
import com.okututor.backend.user.Role;
import com.okututor.backend.user.User;
import com.okututor.backend.user.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Мок-данные маркетплейса для теста: 20 репетиторов с резюме, разные статусы,
 * города, предметы, языки. Идемпотентно — проверяет count. Включается через
 * app.seed.enabled (как SeedData) и дополнительно app.seed.marketplace=true.
 * Для prod можно отключить через SPRING_PROFILES_ACTIVE=prod без сида.
 */
@Component
@ConditionalOnProperty(prefix = "app.seed", name = "marketplace", havingValue = "true", matchIfMissing = true)
@Order(2)
public class MarketplaceMockSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(MarketplaceMockSeeder.class);
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TutorProfileRepository profileRepository;
    private final CityRepository cityRepository;
    private final DistrictRepository districtRepository;
    private final SubjectRepository subjectRepository;
    private final LevelRepository levelRepository;
    private final TutorProfileSubjectRepository profileSubjectRepository;
    private final TutorProfileLevelRepository profileLevelRepository;
    private final TutorProfileLanguageRepository profileLanguageRepository;
    private final SupportService supportService;

    public MarketplaceMockSeeder(UserRepository userRepository,
                                 PasswordEncoder passwordEncoder,
                                 TutorProfileRepository profileRepository,
                                 CityRepository cityRepository,
                                 DistrictRepository districtRepository,
                                 SubjectRepository subjectRepository,
                                 LevelRepository levelRepository,
                                 TutorProfileSubjectRepository profileSubjectRepository,
                                 TutorProfileLevelRepository profileLevelRepository,
                                 TutorProfileLanguageRepository profileLanguageRepository,
                                 SupportService supportService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.profileRepository = profileRepository;
        this.cityRepository = cityRepository;
        this.districtRepository = districtRepository;
        this.subjectRepository = subjectRepository;
        this.levelRepository = levelRepository;
        this.profileSubjectRepository = profileSubjectRepository;
        this.profileLevelRepository = profileLevelRepository;
        this.profileLanguageRepository = profileLanguageRepository;
        this.supportService = supportService;
    }

    @Override
    @Transactional
    public void run(String... args) {
        // Не мешаем prod если сид отключен в SeedData
        if (profileRepository.count() >= 15) {
            log.info("[MockSeeder] tutor_profiles already {} — skip", profileRepository.count());
            return;
        }
        log.info("[MockSeeder] seeding marketplace mock data...");

        List<City> cities = cityRepository.findAll();
        List<Subject> subjects = subjectRepository.findAll();
        List<Level> levels = levelRepository.findAll();
        if (cities.isEmpty() || subjects.isEmpty()) {
            log.warn("[MockSeeder] reference data empty — V38 not applied?");
            return;
        }

        // 20 мок-репетиторов
        List<MockTutor> mocks = mockTutors();
        Random rnd = new Random(42);
        int created = 0;
        for (int i = 0; i < mocks.size(); i++) {
            final int idx = i;
            MockTutor mt = mocks.get(idx);
            String email = "mock.tutor" + (idx+1) + "@test.com";
            User user = userRepository.findByEmail(email).orElseGet(() -> {
                User u = new User();
                u.setEmail(email);
                u.setFirstName(mt.firstName);
                u.setLastName(mt.lastName);
                u.setRole(Role.USER);
                u.setVerified(true);
                u.setBlocked(false);
                u.setPasswordHash(passwordEncoder.encode("Tutor#12345"));
                u.setBio(mt.about.substring(0, Math.min(200, mt.about.length())));
                // avatar for beautiful card — pravatar
                int imgIdx = (idx % 70) + 1;
                u.setAvatarUrl("https://i.pravatar.cc/300?img=" + imgIdx);
                return userRepository.save(u);
            });

            if (profileRepository.existsByUserId(user.getId())) continue;

            TutorProfile p = new TutorProfile();
            p.setUser(user);
            p.setFirstName(mt.firstName);
            p.setLastName(mt.lastName);
            p.setTitle(mt.title);
            p.setShortDescription(mt.shortDescription);
            p.setAbout(mt.about);
            p.setTutorType(mt.tutorType);
            p.setEducation(mt.education);
            p.setUniversity(mt.university);
            p.setEducationDetails(mt.educationDetails);
            p.setExperienceYears(mt.experienceYears);
            p.setPriceFrom(mt.priceFrom);
            p.setPriceTo(mt.priceTo);
            p.setCurrency("KGS");
            p.setOnline(mt.online);
            p.setOffline(mt.offline);
            // city/district
            City city = cities.get(rnd.nextInt(cities.size()));
            p.setCity(city);
            if ("bishkek".equals(city.getSlug())) {
                List<District> districts = districtRepository.findByCityIdOrderByNameRu(city.getId());
                if (!districts.isEmpty() && rnd.nextBoolean()) {
                    p.setDistrict(districts.get(rnd.nextInt(districts.size())));
                }
            }
            p.setPhone("+996 " + (500 + rnd.nextInt(500)) + " " + (100000 + rnd.nextInt(900000)));
            // status distribution
            TutorProfileStatus status;
            if (idx < 12) status = TutorProfileStatus.PUBLISHED;
            else if (idx < 15) status = TutorProfileStatus.PENDING_MODERATION;
            else if (idx < 17) status = TutorProfileStatus.DRAFT;
            else if (idx < 19) status = TutorProfileStatus.REJECTED;
            else status = TutorProfileStatus.SUSPENDED;
            p.setStatus(status);
            if (status == TutorProfileStatus.REJECTED) p.setRejectionReason("Недостаточно информации в образовании. Добавьте диплом.");
            if (status == TutorProfileStatus.SUSPENDED) p.setRejectionReason("Нарушение правил платформы");
            if (status == TutorProfileStatus.PUBLISHED) p.setPublishedAt(Instant.now().minusSeconds(rnd.nextInt(30*86400)));
            // SEO
            p.setSeoTitle(mt.title + " — " + mt.firstName + " " + mt.lastName + " | OkuTutor");
            p.setSeoDescription(mt.shortDescription);
            p.setSeoKeywords(String.join(", ", mt.subjectSlugs) + ", репетитор, " + city.getNameRu());
            p.setNoindex(false);
            // rating/achievements for spec card
            p.setRating(BigDecimal.valueOf(4.5 + rnd.nextDouble()*0.5).setScale(1, java.math.RoundingMode.HALF_UP));
            p.setReviewsCount(10 + rnd.nextInt(200));
            p.setAchievements("[\"Подготовил более 80 учеников к ОРТ с высокими баллами\",\"Призёр республиканских олимпиад по математике\",\"Опыт преподавания " + mt.experienceYears + " лет\"]");
            p.setEducationJson("[{\"institution\":\"" + mt.university.replace("\"","\\\"") + "\",\"specialty\":\"" + mt.education.replace("\"","\\\"") + "\",\"years\":\"2018–2022\"}]");
            p.setSlug("tmp-" + UUID.randomUUID().toString().substring(0,8));
            profileRepository.saveAndFlush(p);
            String slug = TutorProfileMapper.slugify(p.getFirstName(), p.getLastName(), p.getId());
            String candidate = slug;
            int attempt = 0;
            while (profileRepository.existsBySlug(candidate)) {
                candidate = slug + "-" + (attempt++ + 1);
            }
            p.setSlug(candidate);
            profileRepository.save(p);

            // subjects
            List<String> subjSlugs = mt.subjectSlugs;
            for (String sSlug : subjSlugs) {
                subjects.stream().filter(s -> s.getSlug().equals(sSlug)).findFirst()
                        .ifPresent(s -> profileSubjectRepository.save(new TutorProfileSubject(p, s)));
            }
            // levels — unique random 2
            List<Level> shuffledLevels = new ArrayList<>(levels);
            java.util.Collections.shuffle(shuffledLevels, rnd);
            for (int li = 0; li < Math.min(2, shuffledLevels.size()); li++) {
                Level lvl = shuffledLevels.get(li);
                try { profileLevelRepository.save(new TutorProfileLevel(p, lvl)); } catch (Exception ignored) {}
            }
            // languages
            for (String lang : mt.languages) {
                profileLanguageRepository.save(new TutorProfileLanguage(p, lang));
            }
            created++;
        }
        log.info("[MockSeeder] created {} tutor_profiles", created);

        // Мок-заявки от студентов к репетиторам + поддержка
        seedMockRequestsAndSupport();
    }

    private void seedMockRequestsAndSupport() {
        // создаем 5 студентов если нет
        for (int i = 1; i <= 5; i++) {
            final int idx = i;
            String email = "mock.student" + idx + "@test.com";
            User u = userRepository.findByEmail(email).orElseGet(() -> {
                User stu = new User();
                stu.setEmail(email);
                stu.setFirstName("Student" + idx);
                stu.setLastName("Testov");
                stu.setRole(Role.USER);
                stu.setVerified(true);
                stu.setPasswordHash(passwordEncoder.encode("Student#12345"));
                return userRepository.save(stu);
            });
            // поддержка: каждый 2-й создает тикет
            if (idx % 2 == 1) {
                try {
                    var existing = supportService.mine(u, 0, 1);
                    if (existing.getTotalElements() == 0) {
                        supportService.create(u, new SupportTicketCreateRequest("TECHNICAL", "Проблема с заявкой " + idx, "Не могу связаться с репетитором, помогите решить вопрос. Тестовый тикет " + idx, "NORMAL"));
                    }
                } catch (Exception e) {
                    log.debug("[MockSeeder] support seed skip {}", e.getMessage());
                }
            }
        }
        log.info("[MockSeeder] support tickets seeded");
    }

    record MockTutor(String firstName, String lastName, String title, String shortDescription, String about,
                     TutorType tutorType, String education, String university, String educationDetails,
                     Integer experienceYears, BigDecimal priceFrom, BigDecimal priceTo,
                     boolean online, boolean offline, List<String> subjectSlugs, List<String> languages) {}

    private List<MockTutor> mockTutors() {
        return List.of(
            new MockTutor("Айбек", "Токтогулов", "Репетитор по математике — ОРТ и ЕГЭ", "Готовлю к ОРТ, ЕНТ, олимпиадам. Объясняю просто и на примерах.", "Опыт 8 лет, выпускник КГТУ. Автор методики быстрого счета. 120+ учеников поступили на бюджет. Провожу онлайн и оффлайн в Бишкеке (Свердловский район). Индивидуальный подход.", TutorType.PROFESSIONAL_TUTOR, "Высшее, КГТУ, прикладная математика", "КГТУ", "Диплом с отличием, курсы Cambridge", 8, bd(800), bd(1500), true, true, List.of("matematika","ort"), List.of("Русский","Кыргызский")),
            new MockTutor("Асель", "Осмонова", "Английский для жизни и работы — IELTS 8.0", "Разговорный английский, IELTS, бизнес-английский. Заговорите за 3 месяца.", "Сертификат IELTS 8.0, 5 лет в языковой школе. Ученики сдают IELTS 7+ и уезжают по Work&Travel. Онлайн по всему КГ, оффлайн Бишкек/Ош.", TutorType.TEACHER, "КНУ, филология", "КНУ им. Ж. Баласагына", "IELTS 8.0, CELTA", 5, bd(1000), bd(2000), true, false, List.of("angliyskiy"), List.of("Английский","Русский")),
            new MockTutor("Данияр", "Уулу", "Python и информатика — с нуля до junior", "Python, алгоритмы, ОРТ информатика. Делаем проекты для портфолио.", "Middle Python dev, 4 года. Выпускник AUCA. Помогаю войти в IT без воды.", TutorType.STUDENT_TUTOR, "AUCA, Computer Science", "AUCA", "Pet-проекты, хакатоны", 4, bd(700), bd(1200), true, true, List.of("python","informatika"), List.of("Русский","Кыргызский","Английский")),
            new MockTutor("Жылдыз", "Касымова", "Физика — понятно и интересно", "Физика для 7-11 классов и ОРТ. Люблю когда 'щелкает' понимание.", "КНУ, физика, 10 лет. Подготовила 80+ к ОРТ.", TutorType.TEACHER, "КНУ, физика", "КНУ", "Кандидат наук", 10, bd(900), bd(1600), true, true, List.of("fizika"), List.of("Кыргызский","Русский")),
            new MockTutor("Эрмек", "Садыков", "Химия и биология — ОРТ, ЕНТ", "Химия и биология для поступления в мед.", "КГМА, 6 лет репетиторства.", TutorType.PROFESSIONAL_TUTOR, "КГМА", "КГМА", "Мед. диплом", 6, bd(850), bd(1400), true, false, List.of("khimiya","biologiya"), List.of("Русский")),
            new MockTutor("Гульнара", "Мамбеталиева", "Русский язык и литература — 5-11 класс", "Грамматика, сочинения, ОРТ.", "Педагог 12 лет, отличник образования.", TutorType.TEACHER, "КГУ", "КГУ", "Почетная грамота", 12, bd(700), bd(1100), false, true, List.of("russkiy"), List.of("Русский","Кыргызский")),
            new MockTutor("Алина", "Ким", "Информатика + Python для школьников", "Scratch, Python, олимпиады.", "Выпускница КГТУ, 3 года.", TutorType.STUDENT_TUTOR, "КГТУ", "КГТУ", "Олимпиада", 3, bd(600), bd(1000), true, true, List.of("informatika","python"), List.of("Русский","Английский")),
            new MockTutor("Бектур", "Исаков", "История Кыргызстана и всемирная", "История для ОРТ и вузов.", "КНУ, история, 7 лет.", TutorType.PROFESSIONAL_TUTOR, "КНУ, история", "КНУ", "Статья", 7, bd(600), bd(900), true, false, List.of("istoriya"), List.of("Кыргызский","Русский")),
            new MockTutor("Нурлан", "Жумабаев", "Математика 1-6 класс — база", "Мягко ставлю базу, без страха.", "Педагог началки, 9 лет.", TutorType.TEACHER, "КГУ", "КГУ", "Методика", 9, bd(500), bd(800), false, true, List.of("matematika"), List.of("Кыргызский")),
            new MockTutor("Айпери", "Шабданова", "Кыргызский язык — с любовью", "Кыргыз тили для всех.", "Филолог, 5 лет.", TutorType.TEACHER, "КНУ", "КНУ", "Кыргыз тили", 5, bd(600), bd(950), true, true, List.of("kyrgyzskiy"), List.of("Кыргызский","Русский")),
            new MockTutor("Артем", "Волков", "ОРТ на 200+ баллов — система", "ОРТ математика+логика.", "Тренер ОРТ, 6 лет, 90% 180+.", TutorType.PROFESSIONAL_TUTOR, "КГТУ", "КГТУ", "Тренер ОРТ", 6, bd(1100), bd(1900), true, true, List.of("ort","matematika"), List.of("Русский")),
            new MockTutor("Салтанат", "Эсенова", "Биология для медиков", "Биология углубленно.", "КГМА, 4 года.", TutorType.STUDENT_TUTOR, "КГМА", "КГМА", "Олимпиада", 4, bd(800), bd(1300), true, false, List.of("biologiya"), List.of("Русский")),
            new MockTutor("Марат", "Асанов", "Английский + Кыргызский", "Два языка — дешевле.", "Лингвист, 8 лет.", TutorType.TEACHER, "КНУ", "КНУ", "Переводчик", 8, bd(900), bd(1500), true, true, List.of("angliyskiy","kyrgyzskiy"), List.of("Английский","Кыргызский","Русский")),
            new MockTutor("Чынгыз", "Токтоев", "Физика + математика — STEM", "STEM для подростков.", "Физтех, 5 лет.", TutorType.STUDENT_TUTOR, "КГТУ", "КГТУ", "STEM", 5, bd(750), bd(1250), true, true, List.of("fizika","matematika"), List.of("Русский")),
            new MockTutor("Айжамал", "Дуйшеева", "Химия ОРТ — 190+", "Химия ОРТ", "КГТУ, 7 лет.", TutorType.PROFESSIONAL_TUTOR, "КГТУ", "КГТУ", "ОРТ", 7, bd(850), bd(1450), false, true, List.of("khimiya-ort"), List.of("Кыргызский")),
            new MockTutor("Улан", "Бекболотов", "IT + ОРТ логика", "Логика ОРТ.", "AUCA, 3 года.", TutorType.STUDENT_TUTOR, "AUCA", "AUCA", "Логика", 3, bd(650), bd(1050), true, false, List.of("ort","informatika"), List.of("Русский")),
            new MockTutor("Назира", "Султанова", "Русский как иностранный", "Русский для начинающих.", "Педагог, 11 лет.", TutorType.TEACHER, "КНУ", "КНУ", "РКИ", 11, bd(700), bd(1150), true, true, List.of("russkiy"), List.of("Русский","Английский")),
            new MockTutor("Азамат", "Кулов", "Математика + Python", "Универсал", "КГТУ, 4 года.", TutorType.PROFESSIONAL_TUTOR, "КГТУ", "КГТУ", "Python", 4, bd(750), bd(1300), true, true, List.of("matematika","python"), List.of("Русский","Кыргызский")),
            new MockTutor("Перизат", "Асанова", "Английский для детей", "Игровой английский 1-6.", "Лингвист, 6 лет.", TutorType.TEACHER, "КНУ", "КНУ", "TESOL", 6, bd(650), bd(1000), false, true, List.of("angliyskiy"), List.of("Английский")),
            new MockTutor("Эрлан", "Мамытов", "Информатика ОРТ", "ОРТ информатика.", "КГТУ, 5 лет.", TutorType.STUDENT_TUTOR, "КГТУ", "КГТУ", "Олимпиада", 5, bd(700), bd(1100), true, true, List.of("informatika","ort"), List.of("Русский","Кыргызский"))
        );
    }

    private BigDecimal bd(int v) { return BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_UP); }
}
