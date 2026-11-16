from pathlib import Path

p = Path(__file__).with_name("aave-app.js")
t = p.read_text(encoding="utf-8", errors="ignore")
out = []
for s in [
    "Copy as PNG",
    "Copy as SVG",
    "Copy PNG",
    "copyPng",
    "clipboard",
    "Assets, examples",
    "onContextMenu",
    "contextmenu",
    "Brand",
]:
    out.append(f"{s!r}: {t.find(s)}")

i = t.find("logo-eyes")
out.append(f"logo-eyes: {i}")
if i >= 0:
    out.append(t[i : i + 2800])

# also search brand page chunks via known strings from screenshot
for s in ["Assets, examples and guides", "Copy as"]:
    idx = 0
    c = 0
    while c < 3:
        j = t.find(s, idx)
        if j < 0:
            break
        out.append(f"\n=== {s} @{j} ===\n{t[max(0,j-200):j+400]}")
        idx = j + len(s)
        c += 1

Path(__file__).with_name("aave-ctx-search.txt").write_text("\n".join(out), encoding="utf-8")
print("wrote", len(out), "lines")
