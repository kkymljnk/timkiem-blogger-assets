from pathlib import Path

t = Path(__file__).with_name("aave-app.js").read_text(encoding="utf-8", errors="ignore")
here = Path(__file__).parent

idx = t.find(".copyPng")
print(".copyPng", idx)
if idx >= 0:
    (here / "aave-copypng.txt").write_text(t[max(0, idx - 1200) : idx + 1600], encoding="utf-8")

idx = t.find("onContextMenu")
print("onContextMenu", idx)
if idx >= 0:
    (here / "aave-onctx.txt").write_text(t[max(0, idx - 600) : idx + 1600], encoding="utf-8")

# find more occurrences of copyPng usage (not i18n definition)
start = 0
n = 0
while n < 8:
    j = t.find("copyPng", start)
    if j < 0:
        break
    snip = t[max(0, j - 250) : j + 400]
    (here / f"aave-copypng-{n}.txt").write_text(snip, encoding="utf-8")
    print("hit", n, j)
    start = j + 7
    n += 1
