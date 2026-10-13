# نشر الموقع على rein1v1.com

كل شي جاهز: الموقع يشتغل داخل Docker، و**Caddy** قدامه يطلع شهادة HTTPS لحاله ويجددها، وقاعدة البيانات تنحفظ لها نسخة احتياطية كل يوم.

```
الزائر ──HTTPS──▶ Caddy (المنفذ 443) ──▶ الموقع (داخلي فقط) ──▶ data/rein.db
```

---

## 1) جهّز الخادم (VPS)

- نظام **Ubuntu 24.04** (أو 22.04).
- 1 معالج + 1 جيجا رام تكفي (2 جيجا أريح).
- أي شركة: Hetzner، DigitalOcean، Vultr، Contabo، AWS Lightsail (فيه سيرفرات في البحرين قريبة من السعودية).
- احفظ **IP الخادم** وكلمة مرور root (أو مفتاح SSH).

## 2) اربط الدومين بالخادم (DNS)

من لوحة الشركة اللي اشتريت منها الدومين (أو Cloudflare)، أضف:

| النوع | الاسم | القيمة |
|---|---|---|
| A | `@` | IP الخادم |
| A | `www` | IP الخادم |

- لو تستخدم **Cloudflare**: الأسهل تخلي السحابة **رمادية (DNS only)**.
  لو تبيها برتقالية: خل SSL/TLS على **Full (strict)**، وجاوب **y** لما سكربت التثبيت يسأل عن Cloudflare.
- انتظر دقائق لين يشتغل (تقدر تتأكد من https://dnschecker.org).

## 3) جهّز الملفات من جهازك

1. شغّل **`pack-for-server.bat`** من مجلد الموقع.
2. اختر **1** (أول رفع: الكود + قاعدة البيانات باللاعبين والبطولات).
3. بيطلع ملف **`rein1v1-server.zip`** في نفس المجلد.

> لا تشغّل الموقع على جهازك وعلى الخادم بنفس الوقت، وإلا بوت الديسكورد بيشتغل مرتين.

## 4) ارفع الملف للخادم

من **PowerShell** في جهازك (غيّر `IP` لعنوان خادمك):

```powershell
scp "$env:USERPROFILE\Desktop\rein1v1\rein-1v1\rein1v1-server.zip" root@IP:/root/
```

(أو استخدم برنامج **WinSCP** واسحب الملف لمجلد `/root`.)

## 5) ثبّت وشغّل (مرة وحدة)

ادخل على الخادم:

```powershell
ssh root@IP
```

وبعدين انسخ هذي الأوامر:

```bash
apt update && apt install -y unzip
mkdir -p /opt/rein1v1 && cd /opt/rein1v1
unzip -o ~/rein1v1-server.zip
sudo bash deploy/setup-server.sh
```

السكربت يسوي كل شي لحاله:
- يثبت Docker.
- يسألك عن الدومين (اضغط Enter لـ `rein1v1.com`)، و**كلمة مرور أدمن جديدة** (12 حرف أو أكثر)، وهل تستخدم Cloudflare البرتقالي.
- ينشئ ملف `.env` فيه رابط إدارة سري جديد ومفتاح جلسات عشوائي.
- يقفل كل المنافذ ما عدا SSH و HTTP و HTTPS.
- يشغّل الموقع ويطبع لك:

```
Site:         https://rein1v1.com
Admin panel:  https://rein1v1.com/admin-xxxxxxxxxxxxxxxx   (keep it private)
```

**احفظ رابط الإدارة.** ولو نسيته: `grep ADMIN_PATH /opt/rein1v1/.env`

## 6) افتح الموقع

- ادخل **https://rein1v1.com**. أول زيارة ممكن تاخذ ثواني لين تطلع الشهادة.
- `www.rein1v1.com` يحوّل تلقائي للدومين الأساسي، و`http://` يحوّل لـ `https://`.
- البوت يشتغل لحاله لو كان التوكن محفوظ من لوحة الإدارة (موجود في قاعدة البيانات اللي رفعتها). ولو كان في `.env` جهازك، حطه في `.env` الخادم: `nano /opt/rein1v1/.env` ثم `docker compose up -d`.

---

## تحديث الموقع بعد أي تعديل

1. في جهازك شغّل `pack-for-server.bat` واختر **2** (الكود فقط، **بدون** قاعدة البيانات).
2. ارفعه مثل الخطوة 4.
3. على الخادم:

```bash
cd /opt/rein1v1
unzip -o ~/rein1v1-server.zip -x 'data/*'
sudo bash deploy/update.sh
```

التحديث ياخذ نسخة احتياطية من قاعدة البيانات قبل ما يبدأ، والزوار ما يحسون بشي غير ثواني.

## النسخ الاحتياطية

- نسخة تلقائية كل يوم في `/opt/rein1v1/data/backups` (يحتفظ بآخر 14).
- **انسخها لجهازك كل فترة** (من WinSCP)، لأنها لو بقت على الخادم بس ما تنفعك إذا راح الخادم.
- **استرجاع نسخة:**

```bash
cd /opt/rein1v1
docker compose stop app
cp data/backups/<اسم-النسخة>.db data/rein.db
rm -f data/rein.db-wal data/rein.db-shm
docker compose start app
```

## أوامر مفيدة

| الأمر | وش يسوي |
|---|---|
| `docker compose ps` | حالة الموقع |
| `docker compose logs -f app` | سجل الموقع المباشر (Ctrl+C للخروج) |
| `docker compose logs -f caddy` | سجل HTTPS والشهادة |
| `docker compose restart app` | إعادة تشغيل الموقع |
| `docker compose down` | إيقاف كل شي |
| `nano .env` ثم `docker compose up -d` | تعديل الإعدادات |

(كلها تنكتب وأنت داخل `cd /opt/rein1v1`.)

## لو صار شي

- **الموقع ما يفتح أو الشهادة ما طلعت:** تأكد إن الـ DNS يأشر على IP الخادم، وشوف `docker compose logs caddy`.
- **أشوف "Too many attempts":** انتظر 15 دقيقة، أو سوّ `docker compose restart app`.
- **لو تبي تغيّر كلمة مرور الأدمن:** عدّل `ADMIN_PASSWORD` في `.env` ثم `docker compose up -d`، وكل جلسات المالك القديمة تنتهي.
- **لو تبي تغيّر رابط الإدارة:** عدّل `ADMIN_PATH` في `.env` ثم `docker compose up -d`.
