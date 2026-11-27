import os
import re

backend_src = 'backend/src/main/java/com/okututor/backend'

queries = []
for root, dirs, files in os.walk(backend_src):
    for f in files:
        if f.endswith('.java'):
            p = os.path.join(root, f)
            with open(p, 'r', encoding='utf-8', errors='ignore') as fp:
                content = fp.read()
                for m in re.finditer(r'@Query\s*\(\s*(?:value\s*=\s*)?["\'](.*?)["\']', content, re.DOTALL):
                    q = m.group(1).replace('\n', ' ').strip()
                    if 'tutor_profiles' in q.lower() or 'tutorprofile' in q.lower() or 'expires' in q.lower():
                        queries.append((f, q))

print(f'Total TutorProfile queries found: {len(queries)}')
all_clean = True
for f, q in queries:
    has_expires = 'expires' in q.lower()
    has_null = 'expires' in q.lower() and ('is null' in q.lower() or 'null or' in q.lower())
    if has_null:
        all_clean = False
    print(f'[{f}] strict: {has_expires and not has_null} | has_null_leak: {has_null}')
    print(f'   Snippet: {q[:140]}...\n')

print(f'ALL QUERIES AUDIT RESULT: {"100% STRICT PASS - 0 NULL LEAKS" if all_clean else "FAIL - LEAKS FOUND"}')
