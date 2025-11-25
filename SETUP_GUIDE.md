# 🚀 Remindly - מדריך הגדרה מלא

מדריך מפורט להתקנה והפעלה של אפליקציית Remindly

## 📋 דרישות מקדימות

### תוכנות נדרשות:

- ✅ **Node.js** >= 18.x ([הורדה](https://nodejs.org/))
- ✅ **PostgreSQL** >= 14.x ([הורדה](https://www.postgresql.org/download/))
- ✅ **Flutter** >= 3.x ([הורדה](https://flutter.dev/docs/get-started/install))
- ✅ **Git** ([הורדה](https://git-scm.com/downloads))

### חשבונות חיצוניים (אופציונלי):

- 🔑 **OpenAI API Key** - לעיבוד AI ([הרשמה](https://platform.openai.com/))
- 📱 **Twilio** - לSMS ושיחות טלפון ([הרשמה](https://www.twilio.com/try-twilio))
- 📧 **SendGrid** - לאימיילים ([הרשמה](https://sendgrid.com/))
- 🔔 **Firebase** - להתראות Push ([הרשמה](https://console.firebase.google.com/))
- 🔗 **Make.com או n8n** - לwebhooks ([Make](https://www.make.com/) / [n8n](https://n8n.io/))

---

## 🗄️ שלב 1: הגדרת PostgreSQL

### התקנת PostgreSQL (Windows)

1. הורד והתקן PostgreSQL מ-https://www.postgresql.org/download/windows/
2. במהלך ההתקנה, זכור את הסיסמה שתגדיר ל-user `postgres`
3. פתח **pgAdmin** או **psql** terminal

### יצירת מסד נתונים

#### דרך pgAdmin:

1. פתח **pgAdmin**
2. לחץ ימני על "Databases" → "Create" → "Database"
3. שם: `remindly_db`
4. Owner: `postgres`
5. לחץ "Save"

#### דרך Terminal (psql):

```bash
# התחבר ל-PostgreSQL
psql -U postgres

# צור מסד נתונים
CREATE DATABASE remindly_db;

# צור משתמש חדש (אופציונלי)
CREATE USER remindly_user WITH PASSWORD 'your_secure_password';

# תן הרשאות
GRANT ALL PRIVILEGES ON DATABASE remindly_db TO remindly_user;

# יצא
\q
```

### בדיקה שהמסד תקין:

```bash
psql -U postgres -d remindly_db -c "SELECT version();"
```

---

## ⚙️ שלב 2: הגדרת Backend

### 2.1 התקנת התלויות

```bash
cd remindly/backend
npm install
```

### 2.2 יצירת קובץ .env

צור קובץ `.env` בתיקיית `backend/` והעתק את התוכן הבא:

```env
# Server Configuration
NODE_ENV=development
PORT=3001
BASE_URL=http://localhost:3001

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=remindly_db
DB_USER=postgres
DB_PASSWORD=ci_test_only_not_a_secret

# JWT Configuration
JWT_SECRET=your_super_secret_key_min_32_characters_long_here
JWT_EXPIRE=7d

# OpenAI Configuration (אופציונלי - אם רוצה AI)
OPENAI_API_KEY=sk-your_openai_api_key_here

# Twilio Configuration (אופציונלי - אם רוצה SMS/שיחות)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# SendGrid Configuration (אופציונלי - אם רוצה Email)
SENDGRID_API_KEY=SG.your_sendgrid_api_key
FROM_EMAIL=noreply@remindly.app

# Firebase Configuration (אופציונלי - אם רוצה Push)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project"}

# Webhook Configuration (אופציונלי)
WEBHOOK_URL=https://hook.integromat.com/your_webhook_id

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2.3 הפעלת השרת

```bash
# מצב פיתוח (עם auto-reload)
npm run dev

# מצב ייצור
npm start
```

השרת יעלה על: **http://localhost:3001**

### 2.4 בדיקה שהשרת עובד

```bash
# בדוק health check
curl http://localhost:3001/api/health

# או פתח בדפדפן:
http://localhost:3001/api/health
```

---

## 🌐 שלב 3: הגדרת Web App

### 3.1 התקנת התלויות

```bash
cd remindly/web-app
npm install
```

### 3.2 יצירת קובץ .env

צור קובץ `.env` בתיקיית `web-app/` :

```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_NAME=Remindly
VITE_DEFAULT_LANGUAGE=he
```

### 3.3 הפעלת האפליקציה

```bash
npm run dev
```

האפליקציה תעלה על: **http://localhost:3000** או **http://localhost:5173**

---

## 📱 שלב 4: הגדרת Mobile App (Flutter)

### 4.1 התקנת התלויות

```bash
cd remindly/mobile-app
flutter pub get
```

### 4.2 הגדרת API URL

ערוך את הקובץ `lib/core/config/app_config.dart`:

```dart
class AppConfig {
  // עבור Android Emulator
  static const String apiBaseUrl = 'http://10.0.2.2:3001/api';

  // עבור iOS Simulator
  // static const String apiBaseUrl = 'http://localhost:3001/api';

  // עבור מכשיר פיזי (החלף ב-IP שלך)
  // static const String apiBaseUrl = 'http://192.168.1.100:3001/api';
}
```

### 4.3 הפעלת האפליקציה

```bash
# בדוק שיש devices זמינים
flutter devices

# הפעל על Android
flutter run

# או בחר device ספציפי
flutter run -d chrome
flutter run -d emulator-5554
```

---

## 🔑 שלב 5: הגדרת שירותים חיצוניים (אופציונלי)

### OpenAI (עבור AI features)

1. גש ל-https://platform.openai.com/
2. צור חשבון והתחבר
3. עבור ל-API Keys: https://platform.openai.com/api-keys
4. צור API Key חדש
5. העתק את המפתח ושים ב-`.env`:
   ```env
   OPENAI_API_KEY=sk-your_api_key_here
   ```

### Twilio (עבור SMS ושיחות)

1. גש ל-https://www.twilio.com/try-twilio
2. צור חשבון (יש trial חינמי)
3. מלוח הבקרה, העתק:
   - Account SID
   - Auth Token
4. קנה מספר טלפון (או השתמש ב-trial number)
5. עדכן ב-`.env`:
   ```env
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

### SendGrid (עבור Email)

1. גש ל-https://sendgrid.com/
2. צור חשבון (יש Free tier)
3. Settings → API Keys → Create API Key
4. העתק את המפתח ושים ב-`.env`:
   ```env
   SENDGRID_API_KEY=SG.your_api_key
   FROM_EMAIL=noreply@yourdomain.com
   ```

### Firebase (עבור Push Notifications)

1. גש ל-https://console.firebase.google.com/
2. צור פרויקט חדש
3. הוסף אפליקציית Web ו-Mobile
4. Project Settings → Service Accounts
5. Generate New Private Key
6. העתק את תוכן הקובץ JSON ל-`.env`:
   ```env
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
   ```

---

## 🧪 בדיקה שהכל עובד

### 1. בדוק Backend:

```bash
curl http://localhost:3001/api/health
```

### 2. בדוק Web App:

פתח דפדפן: http://localhost:3000

### 3. בדוק Mobile App:

הפעל: `flutter run`

### 4. בדוק API עם Postman:

1. הורד [Postman](https://www.postman.com/downloads/)
2. צור request חדש:
   - Method: POST
   - URL: http://localhost:3001/api/auth/register
   - Body (JSON):
     ```json
     {
       "name": "Test User",
       "email": "test@example.com",
       "password": "password123"
     }
     ```
3. שלח ובדוק שמקבל תשובה עם token

---

## 🐛 פתרון בעיות נפוצות

### Backend לא עולה:

**שגיאה: "Connection refused" או "Database connection failed"**

```bash
# בדוק ש-PostgreSQL רץ
# Windows:
services.msc → PostgreSQL → Start

# בדוק חיבור למסד:
psql -U postgres -d remindly_db
```

**שגיאה: "Port 3001 already in use"**

```bash
# מצא תהליך שתופס את הפורט
# Windows:
netstat -ano | findstr :3001
taskkill /PID <PID_NUMBER> /F

# או שנה את הפורט ב-.env:
PORT=3002
```

### Web App לא עולה:

**שגיאה: "CORS error"**

- בדוק ש-Backend רץ
- בדוק ש-ALLOWED_ORIGINS ב-Backend כולל את ה-URL של ה-Web App

**שגיאה: "Cannot connect to API"**

- בדוק את VITE_API_BASE_URL ב-.env
- בדוק ש-Backend רץ על הפורט הנכון

### Mobile App לא עולה:

**שגיאה: "No devices found"**

```bash
# Android:
flutter emulators
flutter emulators --launch <emulator_id>

# iOS (Mac בלבד):
open -a Simulator
```

**שגיאה: "Build failed"**

```bash
flutter clean
flutter pub get
flutter run
```

---

## 📚 משאבים נוספים

- [תיעוד Backend API](./backend/README.md)
- [תיעוד Web App](./web-app/README.md)
- [תיעוד Mobile App](./mobile-app/README.md)
- [Node.js Documentation](https://nodejs.org/docs/)
- [Flutter Documentation](https://docs.flutter.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Vuetify Documentation](https://vuetifyjs.com/)

---

## 🎉 סיימת!

עכשיו הכל אמור לעבוד. אתה יכול:

1. ✅ להירשם ולהתחבר
2. ✅ ליצור רשימות ומשימות
3. ✅ להשתמש ב-AI לניתוח טקסט (אם הגדרת OpenAI)
4. ✅ לקבל התראות (אם הגדרת Twilio/SendGrid/Firebase)
5. ✅ להקליט קול ולעבד אותו (אם הגדרת OpenAI Whisper)

**בהצלחה! 🚀**
