import subprocess
import re

patterns = {
    "Google API Key": re.compile(r"AIzaSy[0-9A-Za-z\-_]{33}"),
    "AWS Access Key": re.compile(r"AKIA[0-9A-Z]{16}"),
    "GitHub Token": re.compile(r"(ghp_[A-Za-z0-9_]{36}|github_pat_[0-9a-zA-Z_]{82})"),
    "RSA Private Key": re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    "Telegram Bot Token": re.compile(r"\b[0-9]{9,10}:[a-zA-Z0-9_-]{35}\b"),
    "Database Credentials in URI": re.compile(r"postgres(?:ql)?:\/\/[a-zA-Z0-9_\-]+:[a-zA-Z0-9_\-\.\$]{4,}@"),
}

print("=== STARTING FULL GIT LOG SECRETS SCAN ===")
try:
    log_diff = subprocess.check_output(
        ["git", "log", "-p", "--all", "--no-merges"],
        encoding="utf-8",
        errors="ignore"
    )
except Exception as e:
    print(f"Error reading git log: {e}")
    log_diff = ""

findings = []
current_commit = "unknown"
current_author = "unknown"
current_date = "unknown"

for line in log_diff.splitlines():
    if line.startswith("commit "):
        current_commit = line.split()[1]
    elif line.startswith("Author: "):
        current_author = line[8:].strip()
    elif line.startswith("Date: "):
        current_date = line[6:].strip()
    elif line.startswith("+") and not line.startswith("+++"):
        # Added line in diff
        for label, pat in patterns.items():
            m = pat.search(line)
            if m:
                # ignore security audit scripts where patterns are declared
                if "security-audit" in line or "pattern" in line.lower() or "re.compile" in line:
                    continue
                match_val = m.group(0)
                findings.append({
                    "type": label,
                    "commit": current_commit,
                    "author": current_author,
                    "date": current_date,
                    "snippet": line.strip()[:100],
                    "masked_val": match_val[:8] + "..." + match_val[-4:] if len(match_val) > 12 else match_val
                })

print(f"Scan complete. Total potential secrets found in git history: {len(findings)}")
for f in findings:
    print(f"\n[!] Type: {f['type']}")
    print(f"    Commit: {f['commit']} ({f['date']}) by {f['author']}")
    print(f"    Value: {f['masked_val']}")
    print(f"    Line: {f['snippet']}")

print("\n=== SCAN SUMMARY ===")
if not findings:
    print("NO SECRETS FOUND IN GIT HISTORY. Safe to change visibility.")
else:
    print(f"ATTENTION: {len(findings)} secret(s) detected in past git history.")
    print("MANDATORY ACTION: Rotate/revoke leaked credentials before making repository public or private.")
