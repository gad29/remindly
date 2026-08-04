# 🔍 בדיקת PostgreSQL ב-Windows

## הבעיה
ניסית להריץ פקודות SQL ישירות ב-PowerShell, אבל PowerShell לא מבין SQL. צריך להתחבר ל-PostgreSQL דרך `psql`.

## איך לבדוק אם PostgreSQL מותקן

### 1. בדוק אם PostgreSQL רץ

```powershell
# בדוק שירותים
Get-Service -Name "*postgres*"

# או
Get-Service | Where-Object {$_.Name -like "*postgres*"}
```

אם יש שירות, אמור להופיע משהו כמו:
- `postgresql-x64-XX` (XX = גרסה)

### 2. בדוק אם psql מותקן

```powershell
where.exe psql
```

אם זה לא עובד, נסה:
```powershell
Get-Command psql -ErrorAction SilentlyContinue
```

## איך להתקין PostgreSQL (אם לא מותקן)

### אפשרות 1: הורדה מ-EnterpriseDB
1. לך ל: https://www.postgresql.org/download/windows/
2. הורד את PostgreSQL Installer
3. התקן עם כל ההגדרות ברירת המחדל

### אפשרות 2: דרך Chocolatey
```powershell
choco install postgresql
```

### אפשרות 3: דרך winget
```powershell
winget install PostgreSQL.PostgreSQL
```

## איך להתחבר ל-PostgreSQL

### דרך 1: psql (Command Line)

```powershell
# אם psql לא ב-PATH, צריך להוסיף אותו
# בדרך כלל הוא נמצא ב:
# C:\Program Files\PostgreSQL\XX\bin

# הוסף ל-PATH זמנית:
$env:Path += ";C:\Program Files\PostgreSQL\15\bin"

# התחבר:
psql -U postgres -d remindly
```

אם זה לא עובד, נסה:
```powershell
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d remindly
```

### דרך 2: pgAdmin (GUI)
1. פתח את pgAdmin (אם מותקן)
2. התחבר ל-Server
3. בחר את מסד הנתונים `remindly`

### דרך 3: דרך Node.js (בלי psql)

```powershell
cd backend
node -e "import('./config/database.js').then(async (m) => { const sequelize = m.default; try { await sequelize.authenticate(); console.log('✅ Connected!'); const [results] = await sequelize.query('SELECT COUNT(*) as count FROM lists'); console.log('Lists count:', results[0].count); await sequelize.close(); } catch (e) { console.error('❌ Error:', e.message); process.exit(1); } })"
```

## איך לבדוק את הנתונים

### דרך Node.js (הכי קל)

צור קובץ `backend/scripts/check-db.js`:

```javascript
import sequelize from "../config/database.js";

const checkDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to PostgreSQL");

    // בדוק רשימות
    const [lists] = await sequelize.query("SELECT * FROM lists");
    console.log(`\n📋 Lists (${lists.length}):`);
    lists.forEach(list => {
      console.log(`  - ${list.name} (ID: ${list.id})`);
    });

    // בדוק משימות
    const [tasks] = await sequelize.query("SELECT * FROM tasks");
    console.log(`\n✅ Tasks (${tasks.length}):`);
    tasks.forEach(task => {
      console.log(`  - ${task.title} (List: ${task.list_id})`);
    });

    await sequelize.close();
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

checkDatabase();
```

הרץ:
```powershell
cd backend
node scripts/check-db.js
```

## איך ליצור מסד נתונים (אם לא קיים)

### דרך psql:
```powershell
# התחבר כ-postgres
psql -U postgres

# בתוך psql:
CREATE DATABASE remindly;
\q
```

### דרך Node.js:
```powershell
cd backend
node -e "import('pg').then(async (pg) => { const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'your_password' }); await client.connect(); await client.query('CREATE DATABASE remindly'); console.log('✅ Database created'); await client.end(); })"
```

## פתרון בעיות

### בעיה: "psql is not recognized"
**פתרון**: הוסף את PostgreSQL ל-PATH:
```powershell
# זמני (רק לסשן הנוכחי)
$env:Path += ";C:\Program Files\PostgreSQL\15\bin"

# קבוע (צריך הרשאות מנהל)
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\PostgreSQL\15\bin", "Machine")
```

### בעיה: "password authentication failed"
**פתרון**: בדוק את הסיסמה ב-`.env`:
```env
DB_PASSWORD=ci_test_only_not_a_secret
```

### בעיה: "connection refused"
**פתרון**: ודא ש-PostgreSQL רץ:
```powershell
# הפעל את השירות
Start-Service postgresql-x64-15
```

## בדיקה מהירה

```powershell
cd backend
npm start
```

חפש בהודעות:
- ✅ `PostgreSQL connection established successfully`
- ✅ `Database synchronized`

אם מופיע:
- ❌ `PostgreSQL connection failed` → PostgreSQL לא רץ או הפרטים לא נכונים

