# Fix All Slate Colors - StepOut Dark Blue Theme

## Color Mapping:
- `slate-950` → `#0b1220` or `#141827`
- `slate-900` → `#0b1220`
- `slate-800` → `#1a1f2e`
- `slate-700` → `#1f2535`
- `slate-500` → `white/50`
- `slate-400` → `white/70`
- `slate-300` → `white/80` or `white`
- `slate-200` → `white`
- `slate-100` → `white`
- `slate-50` → `white`

## Files that still need fixing:
Run: `grep -r "slate-" src/app --include="*.tsx" --include="*.ts"`

## Quick Fix Command:
```bash
# Find all slate colors
grep -r "slate-" src/app --include="*.tsx" --include="*.ts" | wc -l
```





