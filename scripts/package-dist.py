"""Zip the contents of out/ (not the folder itself) into coffeemap-dist.zip.

Run through `npm run package`, which builds first. Dotfiles such as
.htaccess are included. Unzip the result straight into the site folder.
"""
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'out')
ZIP = os.path.join(ROOT, 'coffeemap-dist.zip')

if not os.path.isfile(os.path.join(OUT, 'index.html')):
    sys.exit('out/index.html not found: run the build first.')

count = 0
with zipfile.ZipFile(ZIP, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for folder, _, files in os.walk(OUT):
        for name in sorted(files):
            path = os.path.join(folder, name)
            z.write(path, os.path.relpath(path, OUT).replace(os.sep, '/'))
            count += 1

print(f'{count} files -> {os.path.relpath(ZIP, ROOT)} ({os.path.getsize(ZIP) / 1e6:.1f} MB)')
