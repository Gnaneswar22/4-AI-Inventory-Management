import os
import re

MAPPINGS = {
    # Backgrounds
    r'\bbg-white\b(?! dark:bg-)': r'bg-white dark:bg-[#24303f]',
    r'\bbg-slate-50\b(?!/)(?! dark:bg-)': r'bg-slate-50 dark:bg-[#1a222c]',
    r'\bbg-slate-100\b(?!/)(?! dark:bg-)': r'bg-slate-100 dark:bg-[#313d4a]',
    r'\bbg-\[#F1F5F9\]\b(?! dark:bg-)': r'bg-[#F1F5F9] dark:bg-[#1a222c]',
    r'\bbg-\[#F8FAFC\]\b(?! dark:bg-)': r'bg-[#F8FAFC] dark:bg-[#1a222c]',
    
    # Borders
    r'\bborder-slate-50\b(?!/)(?! dark:border-)': r'border-slate-50 dark:border-[#313d4a]',
    r'\bborder-slate-100\b(?!/)(?! dark:border-)': r'border-slate-100 dark:border-[#313d4a]',
    r'\bborder-slate-200\b(?!/)(?! dark:border-)': r'border-slate-200 dark:border-[#313d4a]',
    
    # Text colors
    r'\btext-slate-800\b(?! dark:text-)': r'text-slate-800 dark:text-white',
    r'\btext-slate-900\b(?! dark:text-)': r'text-slate-900 dark:text-white',
    r'\btext-slate-500\b(?! dark:text-)': r'text-slate-500 dark:text-[#8a99af]',
    r'\btext-slate-600\b(?! dark:text-)': r'text-slate-600 dark:text-[#8a99af]',
    r'\btext-slate-700\b(?! dark:text-)': r'text-slate-700 dark:text-slate-200',
    
    # Divides
    r'\bdivide-slate-50\b(?!/)(?! dark:divide-)': r'divide-slate-50 dark:divide-[#313d4a]',
    r'\bdivide-slate-100\b(?!/)(?! dark:divide-)': r'divide-slate-100 dark:divide-[#313d4a]',
    r'\bdivide-slate-200\b(?!/)(?! dark:divide-)': r'divide-slate-200 dark:divide-[#313d4a]',
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    orig = content
    for pattern, replacement in MAPPINGS.items():
        content = re.sub(pattern, replacement, content)
        
    if content != orig:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")

if __name__ == '__main__':
    base_dir = r"c:\4-AI Inventory-Management"
    for d in ['pages', 'components']:
        target = os.path.join(base_dir, d)
        for root, _, files in os.walk(target):
            for file in files:
                if file.endswith('.tsx') or file.endswith('.ts'):
                    process_file(os.path.join(root, file))
    print("Done")
