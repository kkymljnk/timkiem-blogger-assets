from pathlib import Path

t = Path(__file__).with_name("aave-app.js").read_text(encoding="utf-8", errors="ignore")
here = Path(__file__).parent

# Find BrandMenu / copyPng usage outside i18n
idx = 0
hits = []
while True:
    j = t.find("copyPng", idx)
    if j < 0:
        break
    hits.append(j)
    idx = j + 7

print("copyPng hits", hits)
# take second hit which was component (~803624)
j = hits[1] if len(hits) > 1 else hits[0]
snip = t[max(0, j - 4000) : j + 5000]
(here / "aave-brand-comp.txt").write_text(snip, encoding="utf-8")
print("wrote aave-brand-comp.txt around", j)

# CSS modules often nearby as .menuButton
for key in ["menuButton", "brandMenu", "Copied!", "wordmark-lg"]:
    print(key, t.find(key))
    k = t.find(key)
    if k >= 0 and key != "Copied!":
        (here / f"aave-key-{key}.txt").write_text(t[max(0, k - 500) : k + 1500], encoding="utf-8")
