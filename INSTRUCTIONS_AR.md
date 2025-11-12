# دليل المطور لتطبيق QRAN.TOP

## جدول المحتويات
1.  [مقدمة](#1-مقدمة)
2.  [متطلبات التشغيل](#2-متطلبات-التشغيل)
3.  [خطوات التنصيب على الخادم](#3-خطوات-التنصيب-على-الخادم)
4.  [إعداد قاعدة بيانات Firebase](#4-إعداد-قاعدة-بيانات-firebase)
    *   [إنشاء مشروع Firebase](#41-إنشاء-مشروع-firebase)
    *   [ربط التطبيق بـ Firebase](#42-ربط-التطبيق-بـ-firebase)
    *   [إعداد قواعد الأمان (Security Rules)](#43-إعداد-قواعد-الأمان-security-rules)
    *   [إنشاء المجموعات والفهارس (Collections & Indexes)](#44-إنشاء-المجموعات-والفهارس-collections--indexes)
5.  [آلية عمل البرنامج](#5-آلية-عمل-البرنامج)
    *   [فلسفة الإصدار المزدوج للقرآن](#51-فلسفة-الإصدار-المزدوج-للقرآن)
    *   [تدفق البيانات](#52-تدفق-البيانات)
    *   [آلية البحث](#53-آلية-البحث)
    *   [نظام التعليقات المجهول](#54-نظام-التعليقات-المجهول)
    *   [ميزة الختمة الجماعية](#55-ميزة-الختمة-الجماعية)
6.  [هيكلية المشروع](#6-هيكلية-المشروع)
7.  [للتطوير المستقبلي](#7-للتطوير-المستقبلي)

---

## 1. مقدمة
تطبيق **QRAN.TOP** هو مستكشف قرآني حديث وسريع وغني بالميزات، يعمل كتطبيق ويب تقدمي (PWA). تم تصميمه للدراسة العميقة (التدبر) والتحليل اللغوي، حيث يجمع بين تجربة قراءة جميلة وقدرات بحث قوية.

**التقنيات الأساسية:**
- **إطار العمل:** React
- **اللغة:** TypeScript
- **التنسيق:** Tailwind CSS
- **الواجهة الخلفية وقاعدة البيانات:** Firebase (Firestore)
- **بيئة التشغيل:** يعمل التطبيق مباشرة في المتصفح باستخدام وحدات ES (`importmap`)، ولا يتطلب خطوة بناء (Build Step) تقليدية.

---

## 2. متطلبات التشغيل
- خادم ويب (Web Server) بسيط. أي استضافة مشتركة (Shared Hosting) تدعم رفع الملفات الثابتة (HTML, CSS, JS) ستكون كافية.
- حساب Google لإنشاء مشروع على Firebase.

---

## 3. خطوات التنصيب على الخادم
هذا التطبيق هو تطبيق ويب ثابت (Static Web App)، وعملية تنصيبه بسيطة جداً:

1.  **رفع الملفات:** قم برفع جميع ملفات ومجلدات المشروع كما هي إلى المجلد العام على خادم الويب الخاص بك (مثل `public_html` أو `www`).
2.  **الوصول للتطبيق:** بعد اكتمال الرفع، يمكنك الوصول إلى التطبيق مباشرة عبر اسم النطاق الخاص بك.

لا توجد خطوات إضافية. سيعمل التطبيق مباشرة. بفضل تقنية PWA، سيقوم المتصفح بتخزين الملفات الأساسية مؤقتاً (caching) لتسريع عمليات التحميل المستقبلية وتوفير إمكانية العمل دون اتصال بالإنترنت.

---

## 4. إعداد قاعدة بيانات Firebase
Firebase ضروري لتشغيل الميزات التفاعلية مثل التعليقات، الختمات الجماعية، ومزامنة دفتر التدبر.

### 4.1. إنشاء مشروع Firebase
1.  اذهب إلى [موقع Firebase](https://firebase.google.com).
2.  قم بتسجيل الدخول بحساب Google الخاص بك.
3.  انقر على "Go to console" ثم "Create a project".
4.  اتبع الخطوات لإنشاء مشروع جديد.
5.  من لوحة تحكم المشروع، اذهب إلى قسم **Firestore Database**.
6.  انقر على "Create database".
7.  اختر البدء في **Production mode**.
8.  اختر موقع الخادم الأقرب لجمهورك.

### 4.2. ربط التطبيق بـ Firebase
1.  من لوحة تحكم مشروعك، انقر على أيقونة الترس (الإعدادات) بجوار "Project Overview" واختر **Project settings**.
2.  في تبويب **General**، انزل إلى قسم "Your apps".
3.  انقر على أيقونة الويب (`</>`) لإضافة تطبيق ويب جديد.
4.  أعطِ التطبيق اسماً (مثل "QRAN.TOP Web") وانقر على "Register app".
5.  سيظهر لك Firebase SDK. ابحث عن كائن `firebaseConfig`.
6.  **انسخ** هذا الكائن بالكامل.
7.  افتح ملف `firebase.ts` في مشروعك.
8.  **استبدل** كائن `firebaseConfig` الموجود في الملف بالكائن الذي نسخته من Firebase.

### 4.3. إعداد قواعد الأمان (Security Rules)
هذه الخطوة حيوية للسماح للمستخدمين بالتفاعل مع التطبيق بشكل آمن.
1.  في لوحة تحكم Firebase، اذهب إلى **Firestore Database**.
2.  انقر على تبويب **Rules**.
3.  استبدل المحتوى الموجود بالقواعد التالية:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Public read-only collections for app configuration
    match /qran_fonts/{fontId} {
      allow read: if true;
      allow write: if false; // Should be managed from console
    }
    
    match /qran_editions/{editionId} {
      allow read: if true;
      allow write: if false; // Should be managed from console
    }
    
    // Topics for discussions, readable by all
    match /discussionTopics/{topicId} {
      allow read: if true;
      // Allow creation or update (incrementing count)
      allow write: if request.resource.data.keys().hasAll(['topic', 'count', 'lastDiscussed'])
                    && request.resource.data.count > 0;
    }

    // Comments collection
    match /qran_comments/{commentId} {
        // Anyone can read comments but not reports or admin actions
        allow read: if resource.data.topicId != '__ADMIN_ACTIONS__' && resource.data.type != 'report';

        // Anyone can create a new comment or a report, with validation
        allow create: if request.resource.data.keys().hasAll(['topicId', 'text', 'parentId', 'createdAt'])
                      && request.resource.data.text is string
                      && request.resource.data.text.size() > 0 && request.resource.data.text.size() < 1000;
                      
        // Only allow updating replyCount on parent comments
        allow update: if request.resource.data.replyCount == resource.data.replyCount + 1;
        
        // No direct deletes from client
        allow delete: if false;
    }
    
    // Temporary notebook sync, anyone can create, read, delete their own
    match /temp_notebook_sync/{code} {
        allow read, write, delete: if true;
    }
    
    // Khatmahs collection
    match /khatmahs/{khatmahId} {
        allow read: if true;
        allow create: if request.resource.data.keys().hasAll(['name', 'visibility', 'createdAt', 'juz_status']);
        allow update: if true; // Allow reserving and completing juz
        allow delete: if false; // Deletion should be handled by a server function for cleanup
    }
  }
}
```
4.  انقر على **Publish**.

### 4.4. إنشاء المجموعات والفهارس (Collections & Indexes)
**المجموعات (Collections):**
بعض المجموعات سيتم إنشاؤها تلقائياً عند أول استخدام للميزات المرتبطة بها (`qran_comments`, `discussionTopics`, `khatmahs`). لكن مجموعات الإعدادات يجب إنشاؤها يدوياً.
1.  اذهب إلى **Firestore Database** -> **Data**.
2.  انقر على **Start collection**.
3.  أنشئ المجموعات التالية:
    - `qran_fonts`: أضف مستندات تحتوي على الحقول: `name` (string), `font_family` (string), `url` (string, optional).
    - `qran_editions`: أضف مستندات تحتوي على الحقول المطابقة للنوع `QuranEdition` في `types.ts`.

**الفهارس (Indexes):**
Firestore يتطلب فهارس للاستعلامات المعقدة. عندما تجرب ميزة في التطبيق تتطلب فهرساً غير موجود، سيظهر خطأ في وحدة تحكم المتصفح (Browser Console) مع رابط مباشر لإنشاء الفهرس المطلوب.
1.  افتح التطبيق في متصفحك.
2.  افتح أدوات المطور (Developer Tools) واذهب إلى Console.
3.  تنقل في التطبيق وجرب الميزات التالية:
    - عرض صفحة "ترند النقاشات".
    - فتح صفحة التعليقات لأي موضوع بحث.
    - فتح لوحة تحكم المشرف (Admin View).
4.  عند ظهور خطأ `FAILED_PRECONDITION` في الـ Console، انقر على الرابط الذي يوفره Firebase.
5.  سيتم نقلك إلى صفحة إنشاء الفهرس في لوحة تحكم Firebase مع تعبئة الحقول تلقائياً. انقر على **Create**.
6.  انتظر بضع دقائق حتى يتم بناء الفهرس.

---

## 5. آلية عمل البرنامج

### 5.1. فلسفة الإصدار المزدوج للقرآن
هذا هو المفهوم الأساسي في التطبيق. لتحقيق كل من تجربة قراءة أصيلة ومحرك بحث قوي، يعتمد التطبيق على إصدارين أساسيين من القرآن:
- **`quran-uthmani`**: نص القرآن بالرسم العثماني الأصيل. يُستخدم حصرياً لعرض النص للقراءة.
- **`quran-simple-clean`**: نص القرآن برسم إملائي مبسط بدون تشكيل. هذا هو النص الذي يعمل عليه محرك البحث لضمان دقة النتائج بغض النظر عن الاختلافات الإملائية.

### 5.2. تدفق البيانات
- **التحميل الأولي:** عند فتح التطبيق، يقوم بجلب الإعدادات الأساسية (الخطوط والإصدارات) من Firestore، ثم يحمّل ملفات JSON الثابتة لإصداري القرآن الأساسيين (`quran-uthmani`, `quran-simple-clean`) لضمان سرعة الإقلاع.
- **التحميل عند الطلب:** عندما يختار المستخدم تفسيراً أو ترجمة، يقوم التطبيق بجلبه من مصدره الخارجي وتخزينه في حالة التطبيق (state) للاستخدام الفوري.

### 5.3. آلية البحث
1.  **التنظيم (Normalization):** يتم "تنظيف" كلمة البحث ونص القرآن (من إصدار `quran-simple-clean`) عبر إزالة التشكيل وتوحيد أشكال الحروف باستخدام دالة `normalizeArabicText`.
2.  **اختيار الإصدار الذكي:** إذا كانت كلمة البحث تحتوي على تشكيل، يتم البحث أولاً في النص العثماني الدقيق. إذا فشل، أو إذا كانت الكلمة بدون تشكيل، يتم البحث في النص المبسط.
3.  **اقتراح التراكيب:** يقوم التطبيق بتحليل نتائج البحث ليقترح الكلمات المجاورة الأكثر تكراراً، مما يسمح للمستخدم ببناء عبارات بحث مركبة بشكل تفاعلي.

### 5.4. نظام التعليقات المجهول
- لا يتطلب التطبيق تسجيل دخول.
- ترتبط التعليقات بـ `topicId` وهو نسخة منظّمة من كلمة البحث.
- الإشراف على المحتوى يتم من خلال نظام "إلحاق فقط" (append-only) حيث يقوم المشرف بإنشاء مستندات خاصة في قاعدة البيانات تقوم بإخفاء التعليقات المسيئة من العرض على جانب العميل (client-side).

### 5.5. ميزة الختمة الجماعية
- تعتمد على تحديثات Firestore اللحظية (real-time snapshots) لعرض حالة الأجزاء (متاح، محجوز، مكتمل) لجميع المشاركين في نفس الوقت.
- تستخدم معاملات Firestore (transactions) لضمان عدم حجز نفس الجزء من قبل شخصين في آن واحد.
- يتم تطبيق نظام بسيط لمكافحة الإزعاج (anti-spam) عبر التخزين المحلي للحد من عدد الختمات التي يمكن للمستخدم الواحد إنشاؤها يومياً.

---

## 6. هيكلية المشروع
```
/
├── components/         # جميع مكونات React
│   ├── comments/       # مكونات نظام التعليقات
│   └── icons.tsx       # أيقونات SVG
├── hooks/              # خطافات React المخصصة (useTheme, useNotebook)
├── public/             # ملفات ثابتة (أيقونات PWA)
├── utils/              # دوال مساعدة (text.ts)
├── App.tsx             # المكون الرئيسي للتطبيق (إدارة الحالة والتوجيه)
├── firebase.ts         # تهيئة وإعداد Firebase
├── index.html          # نقطة الدخول للتطبيق
├── index.tsx           # نقطة ربط React بالـ DOM
├── service-worker.js   # منطق تطبيق الويب التقدمي (PWA)
├── types.ts            # تعريفات TypeScript
└── ...                 # ملفات إعدادات أخرى
```

---

## 7. للتطوير المستقبلي
- **نظام مصادقة (Authentication):** يمكن إضافة نظام تسجيل دخول للمستخدمين لتوفير ميزات متقدمة مثل مزامنة دفتر التدبر عبر الأجهزة تلقائياً ولوحة تحكم للمشرفين بصلاحيات حقيقية.
- **ميزات بحث متقدمة:** يمكن إضافة البحث بالجذر اللغوي أو البحث الصوتي.
- **وظائف الخادم (Cloud Functions):** يمكن استخدام Firebase Cloud Functions لأتمتة عمليات حذف الختمات القديمة بدلاً من تشغيلها من جانب العميل.
