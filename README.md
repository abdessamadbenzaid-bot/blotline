# Blotline: دليل النشر على Google Play

## 1. قبل كلشي
- الإيميل ديال Privacy Policy محطوط: `abdessamadbenzaid@gmail.com`.
- معرّف التطبيق هو `ma.samed.blotline`، وما كيتبدلش من بعد أول رفع.

## 2. بناء ملف AAB الموقّع
1. فـ GitHub: Settings > Secrets and variables > Actions > New repository secret.
2. الاسم: `BLOTLINE_KEY_PASSWORD`. القيمة: مودباس قوي فيه 20 حرف أو أكثر، وحفظو عندك.
3. Actions > Build signed AAB > Run workflow.
4. ملي يكمل، حمّل `blotline-aab-vN` من أسفل صفحة التشغيل.

أول تشغيل كيصاوب مفتاح الرفع ويحفظو مشفّر فـ `android/keystore/`. ما تبدلش هاد المودباس من بعد.

## 3. أجوبة Play Console
كاينين كاملين فـ `play/STORE_LISTING.md`.

## 4. ملفات المتجر
- `play/STORE_LISTING.md`: النصوص ب 4 لغات.
- `play/graphics/`: الأيقونة 512 و Feature graphic 1024×500.
- `play/screenshots/`: لقطات EN و FR و ES و AR بقياس 1080×1920.

## 5. الإطلاق
1. Internal testing: جرّب على تليفون حقيقي (فتح، Track، تصدير، حفظ، مشاركة، واتساب).
2. صلّح أي مشكل، وعاود الاختبار.
3. Production: نشر تدريجي، بدا ب 20% من المستخدمين.

هاد الحساب فيه تطبيقات قديمة محيدة من Google، إذن ما ترفعش ل Production قبل ما تدوز الاختبارات.

## تعديل الواجهة
بدّل الملفات فـ `web/` ثم شغّل `python3 build.py` باش يتحدث `dist/` و assets ديال Android.
