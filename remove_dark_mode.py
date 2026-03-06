import os
import re

MAPPINGS = {
    # Text colors
    r' dark:text-white': '',
    r' dark:text-\[#8a99af\]': '',
    r' dark:text-\[#313d4a\]': '',
    r' dark:text-slate-200': '',
    r' dark:text-slate-300': '',
    r' dark:text-\[#1a222c\]': '',
    
    # Backgrounds
    r' dark:bg-\[#24303f\]/\d+': '',
    r' dark:bg-\[#24303f\]': '',
    r' dark:bg-\[#1a222c\]/\d+': '',
    r' dark:bg-\[#1a222c\]': '',
    r' dark:bg-\[#313d4a\]/\d+': '',
    r' dark:bg-\[#313d4a\]': '',
    r' dark:bg-\[#1c2434\]': '',
    r' dark:bg-slate-800': '',
    r' dark:bg-slate-700': '',
    
    # Borders
    r' dark:border-\[#313d4a\]': '',
    r' dark:border-\[#24303f\]': '',
    r' dark:border-slate-700': '',
    
    # Divides
    r' dark:divide-\[#313d4a\]': '',
    
    # Hover states
    r' dark:hover:bg-slate-700': '',
}

def remove_dark_mode(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    orig = content
    for pattern, replacement in MAPPINGS.items():
        content = re.sub(pattern, replacement, content)
        
    if content != orig:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Cleaned {filepath}")

if __name__ == '__main__':
    base_dir = r"c:\4-AI Inventory-Management"
    for d in ['pages', 'components']:
        target = os.path.join(base_dir, d)
        for root, _, files in os.walk(target):
            for file in files:
                if file.endswith('.tsx') or file.endswith('.ts'):
                    remove_dark_mode(os.path.join(root, file))
    print("Done")
