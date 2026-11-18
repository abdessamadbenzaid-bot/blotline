# Blotline: دليل النشر على Google Play

## 1. قبل كلشي
- الإيميل ديال Privacy Policy محطوط: `abdessamadbenzaid@gmail.com`.
- معرّف التطبيق هو `ma.samed.blotline`، وما كيتبدلش من بعد أول رفع.

## 2. GitHub: البناء ورابط Privacy Policy
1. دير repo **عمومي** فـ GitHub سميتو `blotline`، وطلع فيه محتوى هاد المجلد كامل، بما فيه `.github` و `docs`.
2. فـ Settings > Pages اختار Branch `main` والمجلد `/docs`، ثم Save.
3. رابط Privacy Policy غادي يكون: `https://abdessamadbenzaid-bot.github.io/blotline/privacy-policy.html`.
4. صاوب مفتاح التوقيع مرة وحدة (Termux ولا PC):
   `keytool -genkeypair -v -keystore upload.jks -alias blotline -keyalg RSA -keysize 2048 -validity 10000`
5. حوّلو لنص: `base64 -w0 upload.jks`
6. فـ Settings > Secrets and variables > Actions زيد:
   `BLOTLINE_KEYSTORE_B64`, `BLOTLINE_KEYSTORE_PASSWORD`, `BLOTLINE_KEY_ALIAS` (blotline), `BLOTLINE_KEY_PASSWORD`
7. Actions > Build signed AAB > Run workflow، ومن بعد حمّل `blotline-aab`.

حافظ على `upload.jks` والمودباس فبلاصة آمنة، وما تطلعهمش أبدا فـ repo.

## 3. أجوبة Play Console
| القسم | الجواب |
|---|---|
| Category | Video Players & Editors |
| Ads | No |
| App access | All functionality available without special access |
| Data safety: collect or share data? | No |
| Advertising ID | No |
| Target audience | 18+ |
| Content rating | Utility / Productivity، بلا محتوى حساس |
| Government / Financial / Health / News | No |
| Privacy policy | رابط `privacy-policy.html` بعد رفعو (GitHub Pages مثلا) |

## 4. ملفات المتجر
- `play/listing.json`: العنوان والوصف ب 4 لغات.
- `play/graphics/`: الأيقونة 512 و Feature graphic 1024×500.
- `play/screenshots/`: لقطات EN و AR بقياس 1080×1920.

## 5. الإطلاق
1. Internal testing: جرّب على تليفون حقيقي (فتح، Track، تصدير، حفظ، مشاركة، واتساب).
2. صلّح أي مشكل، وعاود الاختبار.
3. Production: نشر تدريجي، بدا ب 20% من المستخدمين.

هاد الحساب فيه تطبيقات قديمة محيدة من Google، إذن ما ترفعش ل Production قبل ما تدوز الاختبارات.

## تعديل الواجهة
بدّل الملفات فـ `web/` ثم شغّل `python3 build.py` باش يتحدث `dist/` و assets ديال Android.
