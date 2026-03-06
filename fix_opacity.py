import os
import re

MAPPINGS = {
    # Fix the missing opacity in light mode that was shifted to the dark mode class
    r'bg-white dark:bg-\[#24303f\]/(\d+)': r'bg-white/\1 dark:bg-[#24303f]/\1',
}

def fix_opacity(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    orig = content
    for pattern, replacement in MAPPINGS.items():
        content = re.sub(pattern, replacement, content)
        
    if content != orig:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {filepath}")

if __name__ == '__main__':
    base_dir = r"c:\4-AI Inventory-Management"
    for d in ['pages', 'components']:
        target = os.path.join(base_dir, d)
        for root, _, files in os.walk(target):
            for file in files:
                if file.endswith('.tsx') or file.endswith('.ts'):
                    fix_opacity(os.path.join(root, file))
    print("Done")
