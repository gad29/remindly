# 🔍 מדריך בדיקת מסד נתונים

## בעיה: נתונים לא נשמרים

אם הנתונים לא נשמרים במסד הנתונים, בצע את הבדיקות הבאות:

## 1. בדוק את ה-Database Sync

הפעל את השרת ובדוק את הלוגים:

```bash
cd backend
npm start
```

חפש את ההודעה:
- ✅ `Database synchronized` - הכל תקין
- ❌ `Database not synchronized` - יש בעיה

## 2. בדוק את ה-.env

ודא שקובץ `.env` קיים ב-`backend/` עם הפרטים הנכונים:

```env
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=remindly
DB_USER=postgres
DB_PASSWORD=ci_test_only_not_a_secret
```

## 3. בדוק את ה-PostgreSQL

```bash
# Windows - בדוק ב-Services או Task Manager
# או
psql -U postgres -d remindly
```

אם זה לא עובד, התקן או הפעל את PostgreSQL.

## 4. הרץ את סקריפט התיקון

```bash
cd backend
npm run db:fix
```

או:

```bash
cd backend
node scripts/fix-db.js
```

## 5. בדוק את ה-Logs

```bash
cd backend
Get-Content logs/combined.log -Tail 50
```

חפש שגיאות כמו:
- `column does not exist`
- `relation does not exist`
- `syntax error`
- `permission denied`

## 6. בדוק את ה-API Response

פתח את ה-Developer Tools (F12) → Network:
1. נסה ליצור רשימה חדשה
2. בדוק את ה-request - צריך להיות POST ל-`/api/lists`
3. בדוק את ה-response:
   - Status: 201 (Created)
   - Body: `{ success: true, data: {...} }`

אם יש שגיאה:
- Status: 500 - שגיאת שרת
- Status: 400 - שגיאת validation
- Status: 401 - לא מאומת

## 7. בדוק את ה-Database ישירות

```bash
psql -U postgres -d remindly

# בדוק אם יש רשימות
SELECT id, name, user_id, created_at FROM lists;

# בדוק אם יש משימות
SELECT id, title, list_id, user_id, created_at FROM tasks;

# בדוק את ה-schema
\d lists
\d tasks
```

## 8. אם עדיין לא עובד - איפוס מלא

⚠️ **אזהרה**: זה ימחק את כל הנתונים!

```bash
cd backend
npm run db:reset
```

זה ימחק את כל הטבלאות ויצור אותן מחדש.

## מה תוקן בקוד

1. ✅ הוספתי `userId` ל-Task model
2. ✅ תיקנתי indexes להשתמש ב-snake_case
3. ✅ שיפרתי error handling
4. ✅ הסרתי `createDefaultLists`
5. ✅ תיקנתי response format ב-stores

## צעדים הבאים

1. הפעל מחדש את השרת
2. בדוק את הלוגים
3. נסה ליצור רשימה חדשה
4. בדוק את ה-Database ישירות

