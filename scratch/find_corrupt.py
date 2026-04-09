import os

corrupt_patterns = [
    'Î“Ã‡Ãª',
    'Î“Ã‡Ã¶',
    'â€”',
    'â”¬â•–',
    'â”¬â•–',
    'Î“'
]

def scan_dir(directory):
    for root, dirs, files in os.walk(directory):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if '.git' in dirs:
            dirs.remove('.git')
        
        for file in files:
            if file.endswith(('.jsx', '.js', '.css', '.html')):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        for pattern in corrupt_patterns:
                            if pattern in content:
                                print(f"FOUND '{pattern}' in {path}")
                except Exception as e:
                    # Try again with cp1252 if it might be double encoded
                    try:
                        with open(path, 'r', encoding='cp1252') as f:
                            content = f.read()
                            for pattern in corrupt_patterns:
                                if pattern in content:
                                    print(f"FOUND '{pattern}' in {path} (via CP1252)")
                    except:
                        pass

if __name__ == "__main__":
    scan_dir('src')
