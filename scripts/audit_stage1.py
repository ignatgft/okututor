import os
import re

entity_pat = re.compile(r'@Entity\b')
table_pat = re.compile(r'@Table\s*\(\s*name\s*=\s*["\']([^"\']+)["\']')

backend_src = 'backend/src/main/java/com/okututor/backend'
entities = []
for root, dirs, files in os.walk(backend_src):
    for f in files:
        if f.endswith('.java'):
            p = os.path.join(root, f)
            with open(p, 'r', encoding='utf-8', errors='ignore') as fp:
                txt = fp.read()
                if entity_pat.search(txt):
                    table_m = table_pat.search(txt)
                    table = table_m.group(1) if table_m else 'DEFAULT'
                    entities.append((f.replace('.java', ''), table, p))

print(f'Total JPA Entities found: {len(entities)}')
for name, tbl, path in sorted(entities):
    print(f'   Entity: {name:30} -> Table: {tbl}')
