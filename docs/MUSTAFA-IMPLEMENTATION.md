# تنفيذ مهام مصطفى — SmartShelf

تم تنفيذ حصة مصطفى البرمجية من `output/pdf/SmartShelf-Mustafa-Two-Week-Tasks.pdf` داخل المشروع، باستخدام NestJS وPrisma 6.19 وPostgreSQL فقط. المرجع في أسلوب الأكواد هو الدليل داخل `output.rar` ودروس المشروع داخل `New folder.zip`: Module → Controller → DTO/Guards → Service → Prisma. الأكواد الفعلية أصبحت داخل `apps/api`؛ ملفات الدليل تبقى مرجعاً للشرح.

## شغّل المشروع على جهازك

افتح Terminal ضمن مجلد المشروع الذي فيه `package.json` ثم:

```powershell
npm run db:local:start
npm run dev
```

القاعدة المحلية الجديدة جاهزة، وتم تطبيق migration وseed عليها. اسمها `smartshelf_mustafa_local` على `127.0.0.1:55433`. ملف `apps/api/.env` مربوط فيها، والنسخة السابقة محفوظة محلياً في `.local/api.env.before-local-db`.

1. افتح <http://localhost:5173/login>.
2. البريد: `active@smartshelf.test`، وكلمة مرور الحساب التجريبي: `DemoPass123!`.
3. افتح <http://localhost:5173/pharmacist/inventory> وجرب إضافة دواء، إضافة دفعة، تعديلهما، والبحث والتصفية.
4. Swagger موجود في <http://localhost:3000/api/docs>. نفّذ login، انسخ `accessToken` إلى Authorize، ثم جرّب طلبات المخزون.
5. لتجربة اشتراك منتهي، سجّل الدخول بـ`expired@smartshelf.test` ونفس كلمة المرور: القراءة تعمل والتعديل يرجع 403. يوجد أيضاً حسابا `suspended@smartshelf.test` و`none@smartshelf.test` وحساب المالك `owner@smartshelf.test`.

بعد إغلاق السيرفر يمكنك إيقاف القاعدة بـ`npm run db:local:stop`. بعد إعادة تشغيل الكمبيوتر شغّلها بأمر `db:local:start`. إعداد جهاز آخر موضح في [LOCAL-SETUP.md](LOCAL-SETUP.md).

## الملفات الفعلية، بالترتيب

| افتح                                                                      | الموجود فيه                                                                                      |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `apps/api/prisma/schema.prisma`                                           | Account، Pharmacy، Subscription، Medicine، Batch، DutyPeriod وعلاقاتها                           |
| `apps/api/prisma/migrations/20261105090000_init_smartshelf/migration.sql` | إنشاء الجداول والمفاتيح والقيود، ومنع الربط الخاطئ للدور والقيم السالبة                          |
| `apps/api/prisma/seed.ts`                                                 | 5 حسابات، 4 صيدليات بمنطقتين، 16 دواء، 24 دفعة، مناوبة ليلية؛ إعادة التشغيل لا تمسح التعديلات    |
| `apps/api/src/prisma/`                                                    | اتصال Prisma المشترك ودورة بدء/إغلاق الاتصال                                                     |
| `apps/api/src/common/security.ts`                                         | التحقق من JWT، الدور، ملكية السجل، والاشتراك للكتابة                                             |
| `apps/api/src/common/business-date.ts`                                    | تاريخ العمل بتوقيت عمّان والتحقق من اليوم الحقيقي، مثل رفض 30 شباط                               |
| `apps/api/src/common/subscription-status.ts`                              | حساب حالة الاشتراك من دالة دليل شيم المرفق                                                       |
| `apps/api/src/common/inventory-calculations.ts`                           | حسابات محمد من فرعه المحلي `origin/Mohammad`، مع توحيد مؤشرات الدواء والدفعة ضمن نفس الدوال      |
| `apps/api/src/common/inventory-mapper.ts`                                 | تحويل سجلات Prisma إلى صيغة الرد المتفق عليها، والتكلفة كنص بمنزلتين                             |
| `apps/api/src/modules/auth/`                                              | login وme، DTOs، bcrypt وJWT وتوثيق Swagger                                                      |
| `apps/api/src/modules/inventory/`                                         | عرض/إنشاء/تعديل الأدوية والدفعات، والفلاتر، والحفظ مع تحديث الوقت ضمن transaction                |
| `apps/api/src/inventory.integration.spec.ts`                              | اختبارات HTTP مع PostgreSQL حقيقي، بما فيها طلبات واجهة علاء والتراجع عن الحفظ وإعادة تشغيل Nest |

## الـAPI المنفّذ

كل المسارات تبدأ بـ`/api`.

| الطلب                                        | النتيجة                                                         |
| -------------------------------------------- | --------------------------------------------------------------- |
| `POST /auth/login`                           | 200: `{ accessToken, user }`                                    |
| `GET /auth/me`                               | 200: الحساب الحالي من قاعدة البيانات                            |
| `GET /pharmacist/medicines?q=...&status=...` | 200: `{ items, total, subscriptionStatus }` بعد التصفية         |
| `POST /pharmacist/medicines`                 | 201: دواء الصيدلية الحالية                                      |
| `PATCH /pharmacist/medicines/:id`            | 200: الحقول الأربعة مطلوبة                                      |
| `POST /pharmacist/medicines/:id/batches`     | 201: دفعة؛ يمكن تسجيل مخزون منتهي                               |
| `PATCH /pharmacist/batches/:id`              | 200: quantity وexpiryDate وstorageLocation فقط، والثلاثة مطلوبة |

اسم الدواء فريد داخل الصيدلية بعد trim/lowercase، ورقم الدفعة فريد داخل الدواء. quantity عدد صحيح غير سالب. unitCost نص عشري غير سالب، ويرجع دائماً بمنزلتين. انتهاء اليوم غير منتهي، و90 يوماً داخلة في EXPIRING_SOON. الكمية المتاحة تستبعد المنتهي. LOW_STOCK تشمل مساواة الحد. قد يجتمع أكثر من مؤشر للدواء؛ الدفعات الفارغة لا تضيف تنبيه انتهاء للدواء.

لا يقبل الـAPI pharmacyId من العميل لتحديد الملكية. يعتمد على حساب المستخدم الحالي. السجل التابع لصيدلية أخرى يرجع 404، والدور غير المسموح 403، والتوكن غير الصالح 401، والبيانات الخاطئة 400، والتكرار 409. الاشتراك غير الفعّال يسمح بالقراءة ويمنع جميع عمليات المخزون الأربع.

## واجهات التسليم لباقي الفريق

```ts
import { PrismaService } from '../../prisma/prisma.service';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  OwnershipGuard,
  OwnResource,
  ActiveSubscriptionGuard,
  type ActorRequest,
} from '../../common/security';
import { businessDate } from '../../common/business-date';
import { effectiveSubscriptionStatus } from '../../common/subscription-status';
```

`request.actor` شكله `{ id, email, role, pharmacyId }`. JWT يحتوي `{ sub, role, pharmacyId }` مع وقت الإصدار والانتهاء؛ الصلاحيات تُقرأ مجدداً من الحساب الحالي حتى لا نعتمد على دور قديم داخل التوكن. `PrismaModule` و`AuthModule` مسجلان عالمياً في AppModule.

استخدم `@UseGuards(JwtAuthGuard, RolesGuard)` مع `@Roles('OWNER')` أو `@Roles('PHARMACIST')`. ضع `ActiveSubscriptionGuard` على عمليات كتابة الصيدلي فقط، وليس القراءة أو إدارة المالك للاشتراكات. للملكية، `@OwnResource('medicine' | 'batch' | 'duty')` يتوقع باراميتر اسمه `id`؛ واستخدم `OwnershipGuard` بعد حارس الدور. أبقِ تحديد الصيدلية والتحقق من الاشتراك داخل transaction أيضاً عند الكتابة.

دالة شيم `effectiveSubscriptionStatus(subscription, today)` تستقبل `{ startDate: Date, endDate: Date, suspended: boolean } | null` واليوم كنص YYYY-MM-DD. لا تنفّذ استعلامات. تاريخ البداية والنهاية شاملان، والتعليق يتقدم على بقية الحالات.

تم الحفاظ على واجهة محمد `calculateDashboard(medicines, businessDate)` واختباره الأصلي. الدوال الجديدة `calculateBatchIndicators` و`calculateMedicineInventory` تجمع قواعد المخزون لئلا يختلف حساب الدواء عن الداشبورد. تحوّل طبقة mapper أسماء Prisma: `reorderThreshold → threshold` و`unitCost → cost`.

## ما بقي مع الفريق

هذه نتائج مراجعة النسخة الحالية، وليست وظائف مكتملة:

- شيم: `OwnerModule` ما زال فارغاً؛ تسجيل دخول المالك أصبح جاهزاً، لكن إدارة الصيدليات والحسابات والاشتراكات تحتاج دمج عملها.
- حميد: حارس `TemporaryPharmacistGuard` ما زال يرفض الطلبات، وواجهات التخزين/حالة الاشتراك المؤقتة ترجع 503. يلزم ربطها بـPrisma والحراس المشتركة. الـactor المؤقت عنده يستخدم `userId`؛ يجب تحويل `actor.id` إليه أو تحديث المستهلكين، مع إبقاء شكل رد `/auth/me` المتفق عليه. قفل المناوبات الحالي داخل العملية فقط؛ عند ربط التخزين يلزم منع التداخل بين أكثر من عملية أيضاً.
- محمد: الدوال الحسابية جاهزة هنا؛ `DashboardModule` في هذا الفرع ما زال فارغاً ويحتاج دمج خدمة ومسارات الداشبورد الخاصة به.
- علاء: اختُبرت دوال طلباته الفعلية لتسجيل الدخول والمخزون مع السيرفر الحقيقي دون تغيير أشكال الردود. الاختبار لا يساوي مراجعة بصرية لجميع صفحات المتصفح.

بالتالي تجربة owner → pharmacist → public كاملة، مراجعة PR ودمجه، وتجربة المشروع على جهاز زميل والتقديم الجماعي تبقى خطوات مع الفريق. التغييرات مخصصة لفرع `mustafa`؛ دمج `main` والمراجعة الجماعية يبقيان مع الفريق.

## التحقق والعرض

```powershell
npm run typecheck
npm test
npm run build
npm run smoke
npm run test:integration
```

`test:integration` يستخدم قاعدة مستقلة من `.local/test.env` على هذا الجهاز. يثبت A01/A02/A05/A07/A08/A10/A12/A17 المتعلقة بحصتك: منع الوصول بين الصيدليات، قراءة الاشتراك غير الفعّال، التحقق من المدخلات، الفلاتر، التراجع عن كل عملية حفظ إذا فشل تحديث الوقت، قراءة البيانات بعد إعادة تشغيل API، وتوافق عميل الواجهة. اختبارات التوقيت والحسابات تغطي منتصف الليل، السنة الكبيسة، اليوم و+90 و+91، واجتماع المؤشرات. migration طُبّقت على قواعد جديدة، والـseed شُغّل مرتين.

نتائج التحقق بتاريخ 5 تشرين الثاني 2026:

- `typecheck` وproduction build وsmoke نجحت.
- `npm test`: نجح 431 اختبار API و5 اختبارات واجهة؛ مجموعة قاعدة البيانات تُتخطى في هذا الأمر لأنها تُشغّل منفصلة.
- `npm run test:integration`: نجحت 10 اختبارات بما فيها المجموعة الرئيسية، على PostgreSQL حقيقي.
- إعادة تشغيل PostgreSQL نفسه وإعادة تشغيل seed حافظتا على بصمة جميع السجلات؛ بيانات الحسابات والصيدليات والأدوية والدفعات والمناوبة لم تتغير.
- تنسيق الملفات المعدّلة ناجح. أمر `format:check` الشامل ما زال يفشل بسبب 91 ملفاً سابقاً خارج هذا التغيير؛ لم تُعدّل ملفات الفريق لمجرد إعادة تنسيقها.

مقطع إنجليزي جاهز للتدريب:

> My part connects NestJS to PostgreSQL through Prisma. The controller validates the request, the guards check authentication and pharmacy access, and the service saves the data. A medicine describes the product; a batch stores its quantity, expiry date, location and purchase cost. Medicine names are unique within each pharmacy. Each inventory change and its update timestamp are saved in one transaction, so either both succeed or neither is saved. I will show a successful login, a rejected cross-pharmacy request, and the same saved inventory after restarting the API.
