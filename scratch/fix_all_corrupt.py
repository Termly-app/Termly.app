import os
import re

mappings = {
    'Î“Ã‡Ã¶': '-',
    'Î“Ã‡Ãª': '-',
    'Î“Ã²Ã‰': '-',
    'Î“Ã¶Ã‡': '-',
    'â€”': '-',
    'â”¬â•–': '-',
    'â”¬â”€': '-',
    'ΓÇö': '-',
    '┬╖': '·',
}

# Also handle common individual characters that might be part of mojibake
# but we need to be careful not to break legitimate UTF-8
mojibake_chars = ['Î', 'Γ', 'â', 'Ã', 'Ç', '¶', 'ª', '²', '‰', '¶', '‡', '¶']

def fix_file(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        try:
            with open(path, 'r', encoding='cp1252') as f:
                content = f.read()
        except:
            return False
            
    original = content
    for k, v in mappings.items():
        content = content.replace(k, v)
    
    # Specific fix for the App.jsx breakage I caused (manual fallback)
    # Check if we accidentally removed the option tag
    if 'periods.map(p => (' in content and '{p.year} - {p.term}' in content and '<option' not in content:
        content = content.replace('{p.year} - {p.term}{p.is_active ? \' (Active)\' : \'\'}', 
                                  '<option key={p.id} value={p.id}>{p.year} - {p.term}{p.is_active ? \' (Active)\' : \'\'}</option>')

    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    modified = []
    for root, dirs, files in os.walk('src'):
        for file in files:
            if file.endswith(('.jsx', '.js', '.css', '.html')):
                path = os.path.join(root, file)
                if fix_file(path):
                    modified.append(path)
    
    if modified:
        print("MODIFIED FILES:")
        for m in modified:
            print(f"  {m}")
    else:
        print("No files modified.")

if __name__ == "__main__":
    main()
