package com.okututor.backend.tutor;

import com.okututor.backend.level.Level;
import com.okututor.backend.level.LevelRepository;
import com.okututor.backend.location.City;
import com.okututor.backend.location.CityRepository;
import com.okututor.backend.location.District;
import com.okututor.backend.location.DistrictRepository;
import com.okututor.backend.subject.Subject;
import com.okututor.backend.subject.SubjectRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReferenceDataService {
    private final SubjectRepository subjectRepository;
    private final LevelRepository levelRepository;
    private final CityRepository cityRepository;
    private final DistrictRepository districtRepository;

    public ReferenceDataService(SubjectRepository subjectRepository, LevelRepository levelRepository, CityRepository cityRepository, DistrictRepository districtRepository) {
        this.subjectRepository = subjectRepository;
        this.levelRepository = levelRepository;
        this.cityRepository = cityRepository;
        this.districtRepository = districtRepository;
    }

    @Transactional(readOnly = true)
    public List<Subject> subjects() { return subjectRepository.findAll().stream().sorted((a,b)->Integer.compare(a.getSortOrder(), b.getSortOrder())).toList(); }
    @Transactional(readOnly = true)
    public List<Level> levels() { return levelRepository.findAll().stream().sorted((a,b)->Integer.compare(a.getSortOrder(), b.getSortOrder())).toList(); }
    @Transactional(readOnly = true)
    public List<City> cities() { return cityRepository.findAll().stream().sorted((a,b)->Integer.compare(a.getSortOrder(), b.getSortOrder())).toList(); }
    @Transactional(readOnly = true)
    public List<District> districts(UUID cityId) { return districtRepository.findByCityIdOrderByNameRu(cityId); }
}
