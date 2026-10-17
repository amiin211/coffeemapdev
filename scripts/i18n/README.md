# Arabic copies of the static tools

`public/projects-static/ar/*.html` are generated from the English pages in
`public/projects-static/`. After editing an English tool, regenerate:

```bash
node scripts/i18n/extract.cjs          # QA/QC: lists the strings to translate
python3 scripts/i18n/qaqc_ar.py        # fails and names any string without Arabic
python3 scripts/i18n/serverless_ar.py  # fails on any untranslated diagram label
```

Translations live in `qaqc_ar_1.py`–`qaqc_ar_3.py` (keyed by the index printed
by extract.cjs) and at the top of `serverless_ar.py`.
