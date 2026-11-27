#!/usr/bin/env python3
"""
Generates docs/audit/FILE_INVENTORY.csv by scanning backend and frontend files.
Columns: path,purpose,callers,covered_by_tests,risk,status
Status values: used | dead | legacy | duplicate
"""
import os
import csv
import re
from pathlib import Path

ROOT = Path("D:/d2/okututor")
BACKEND_SRC = ROOT / "backend" / "src" / "main" / "java"
BACKEND_TEST = ROOT / "backend" / "src" / "test" / "java"
FRONTEND_SRC = ROOT / "frontend" / "src"
OUTPUT_CSV = ROOT / "docs" / "audit" / "FILE_INVENTORY.csv"

# Legacy / dead / duplicate patterns
LEGACY_MARKERS = [
    "Legacy", "STUDENT", "TUTOR", "Course", "Booking", "Enrollment", "Lesson", "TutorApplication"
]
DUPLICATE_FILES = {
    "frontend/src/pages/PgBecomeTutor.tsx": "duplicate: uses legacy tutorsApi.submitApplication instead of canonical tutorProfileMarketplaceApi",
    "frontend/src/api/tutors.api.ts": "legacy: duplicates tutorProfile.marketplace.api.ts with old endpoints",
    "frontend/src/api/messages.api.ts": "dead: /api/v1/messages/* blocked by LegacyApiGuard (410 GONE)",
    "backend/src/main/java/com/okututor/backend/tutor/LegacyTutorApplicationController.java": "legacy: old application flow, replaced by TutorProfileController",
    "backend/src/main/java/com/okututor/backend/config/ExpiryDataRepair.java": "used: one-off migration repair startup hook"
}

def get_test_files():
    backend_tests = set()
    if BACKEND_TEST.exists():
        for p in BACKEND_TEST.rglob("*.java"):
            backend_tests.add(p.stem)
            
    frontend_tests = set()
    if FRONTEND_SRC.exists():
        for p in FRONTEND_SRC.rglob("*"):
            if p.name.endswith(".test.ts") or p.name.endswith(".test.tsx") or p.name.endswith(".spec.ts"):
                base = p.name.split(".")[0]
                frontend_tests.add(base)
    return backend_tests, frontend_tests

def analyze_backend_file(file_path, all_backend_text, backend_tests):
    rel_path = file_path.relative_to(ROOT).as_posix()
    stem = file_path.stem
    content = file_path.read_text(encoding="utf-8", errors="ignore")
    
    # Purpose extraction
    purpose = ""
    # Check Javadoc or class comment
    comment_match = re.search(r'/\*\*(.*?)\*/', content, re.DOTALL)
    if comment_match:
        lines = [l.strip().lstrip('*').strip() for l in comment_match.group(1).splitlines() if l.strip().lstrip('*').strip()]
        if lines:
            purpose = lines[0].replace(',', ';')
    if not purpose:
        if "Controller" in stem:
            purpose = f"REST Controller for {stem.replace('Controller', '')}"
        elif "Service" in stem:
            purpose = f"Business logic service for {stem.replace('Service', '')}"
        elif "Repository" in stem:
            purpose = f"Spring Data JPA repository for {stem.replace('Repository', '')}"
        elif "Entity" in stem or "@Entity" in content:
            purpose = f"JPA Entity {stem}"
        elif "Request" in stem or "Response" in stem or "Dto" in stem or "record" in content:
            purpose = f"DTO / Record {stem}"
        elif "Config" in stem or "@Configuration" in content:
            purpose = f"Spring Configuration {stem}"
        elif "Filter" in stem:
            purpose = f"HTTP Servlet Filter {stem}"
        else:
            purpose = f"Component / utility {stem}"

    # Callers: count occurrences of stem across all backend java files
    callers_count = len(re.findall(r'\b' + re.escape(stem) + r'\b', all_backend_text)) - len(re.findall(r'\b' + re.escape(stem) + r'\b', content))
    callers = f"{max(0, callers_count)} references"
    
    # Test coverage
    test_name = f"{stem}Test"
    covered = "YES" if (test_name in backend_tests or stem in backend_tests) else "NO"
    
    # Risk
    if any(k in stem for k in ["Security", "Auth", "Jwt", "Password", "Payment", "Flyway", "Repository", "Audit"]):
        risk = "HIGH"
    elif any(k in stem for k in ["Controller", "Service", "Scheduler", "Filter"]):
        risk = "MEDIUM"
    else:
        risk = "LOW"
        
    # Status
    if rel_path in DUPLICATE_FILES:
        status = DUPLICATE_FILES[rel_path].split(":")[0]
    elif stem.startswith("Legacy"):
        status = "legacy"
    elif callers_count <= 0 and not any(k in content for k in ["@SpringBootApplication", "@Component", "@Service", "@Repository", "@RestController", "@Configuration", "@Bean", "@Entity"]):
        status = "dead"
    elif any(k in content for k in ["Role.STUDENT", "Role.TUTOR"]):
        status = "legacy"
    else:
        status = "used"
        
    return {
        "path": rel_path,
        "purpose": purpose,
        "callers": callers,
        "covered_by_tests": covered,
        "risk": risk,
        "status": status
    }

def analyze_frontend_file(file_path, all_frontend_text, frontend_tests):
    rel_path = file_path.relative_to(ROOT).as_posix()
    stem = file_path.stem
    content = file_path.read_text(encoding="utf-8", errors="ignore")
    
    purpose = ""
    if "Pg" in stem or "Page" in stem:
        purpose = f"Page component {stem}"
    elif "Modal" in stem:
        purpose = f"Modal dialog {stem}"
    elif "api" in file_path.parts:
        purpose = f"API client service {stem}"
    elif "store" in file_path.parts:
        purpose = f"Zustand state store {stem}"
    elif "hook" in file_path.parts or stem.startswith("use"):
        purpose = f"React custom hook {stem}"
    elif "types" in file_path.parts:
        purpose = f"TypeScript type definitions {stem}"
    elif "components" in file_path.parts:
        purpose = f"UI component {stem}"
    else:
        purpose = f"Frontend module {stem}"

    callers_count = len(re.findall(r'\b' + re.escape(stem) + r'\b', all_frontend_text)) - len(re.findall(r'\b' + re.escape(stem) + r'\b', content))
    callers = f"{max(0, callers_count)} references"
    
    covered = "YES" if stem in frontend_tests else "NO"
    
    if any(k in stem for k in ["Auth", "Route", "Security", "Admin"]):
        risk = "HIGH"
    elif any(k in stem for k in ["Pg", "Page", "Api", "Store", "Form"]):
        risk = "MEDIUM"
    else:
        risk = "LOW"
        
    if rel_path in DUPLICATE_FILES:
        status = DUPLICATE_FILES[rel_path].split(":")[0]
    elif callers_count <= 0 and not any(k in stem for k in ["main", "App", "index", "Routes", "vite-env"]):
        status = "dead"
    elif "messages.api" in rel_path or "tutors.api" in rel_path:
        status = "dead" if "messages" in rel_path else "duplicate"
    else:
        status = "used"
        
    return {
        "path": rel_path,
        "purpose": purpose,
        "callers": callers,
        "covered_by_tests": covered,
        "risk": risk,
        "status": status
    }

def main():
    print("Collecting files...")
    backend_tests, frontend_tests = get_test_files()
    
    backend_files = list(BACKEND_SRC.rglob("*.java"))
    all_backend_text = "\n".join([f.read_text(encoding="utf-8", errors="ignore") for f in backend_files])
    
    frontend_files = [f for f in FRONTEND_SRC.rglob("*") if f.suffix in [".ts", ".tsx"] and not (".test." in f.name or ".spec." in f.name)]
    all_frontend_text = "\n".join([f.read_text(encoding="utf-8", errors="ignore") for f in frontend_files])
    
    rows = []
    for f in sorted(backend_files):
        rows.append(analyze_backend_file(f, all_backend_text, backend_tests))
        
    for f in sorted(frontend_files):
        rows.append(analyze_frontend_file(f, all_frontend_text, frontend_tests))
        
    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as out:
        writer = csv.DictWriter(out, fieldnames=["path", "purpose", "callers", "covered_by_tests", "risk", "status"])
        writer.writeheader()
        for r in rows:
            writer.writerow(r)
            
    print(f"Generated {len(rows)} entries in {OUTPUT_CSV}")
    
    # Summary
    by_status = {}
    by_risk = {}
    for r in rows:
        by_status[r["status"]] = by_status.get(r["status"], 0) + 1
        by_risk[r["risk"]] = by_risk.get(r["risk"], 0) + 1
    print("Status counts:", by_status)
    print("Risk counts:", by_risk)

if __name__ == "__main__":
    main()
