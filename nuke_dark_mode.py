import os
import re

def remove_all_dark_classes(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Regex to match and remove any tailwind class starting with 'dark:'
    # e.g. dark:bg-[#1a222c] dark:text-white dark:border-slate-800 dark:hover:bg-rose-50/30
    pattern = r'\s*dark:[a-zA-Z0-9\-#\[\]\/:]+'
    new_content = re.sub(pattern, '', content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Stripped dark mode from: {filepath}")

if __name__ == '__main__':
    base_dir = r"c:\4-AI Inventory-Management"
    for d in ['pages', 'components']:
        target = os.path.join(base_dir, d)
        for root, _, files in os.walk(target):
            for file in files:
                if file.endswith('.tsx') or file.endswith('.ts'):
                    remove_all_dark_classes(os.path.join(root, file))
    print("Done")
