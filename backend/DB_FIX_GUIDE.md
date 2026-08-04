# 🔧 מדריך תיקון מסד נתונים

## הבעיה
המערכת לא מחוברת למסד הנתונים - רשימות ופריטים נמחקים אחרי ריענון.

## הסיבה
מסד הנתונים לא מסונכרן בגלל שגיאות ב-indexes של המודלים.

## פתרון

### אפשרות 1: תיקון אוטומטי (מומלץ)
```bash
cd backend
npm run db:fix
```

זה יעדכן את הטבלאות הקיימות בלי למחוק נתונים.

### אפשרות 2: איפוס מלא (מחק הכל!)
```bash
cd backend
npm run db:reset
```

⚠️ **אזהרה**: זה ימחק את כל הנתונים במסד הנתונים!

### אפשרות 3: הפעלה מחדש של השרת
אחרי התיקון, הפעל מחדש את השרת:

```bash
cd backend
npm start
# או
npm run dev
```

השרת ינסה לסנכרן את מסד הנתונים אוטומטית עם `alter: true`.

## בדיקה

אחרי התיקון, בדוק:
1. שהשרת רץ בלי שגיאות
2. שהלוגים מציגים "Database synchronized"
3. נסה ליצור רשימה חדשה
4. רענן את הדף - הרשימה צריכה להישאר

## אם עדיין לא עובד

1. בדוק את קובץ `.env` - ודא שהפרטים נכונים:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=remindly
   DB_USER=postgres
   DB_PASSWORD=ci_test_only_not_a_secret
   ```

2. בדוק שה-PostgreSQL רץ:
   ```bash
   # Windows
   # בדוק ב-Services או Task Manager
   
   # Linux/Mac
   sudo systemctl status postgresql
   ```

3. בדוק את החיבור:
   ```bash
   psql -U postgres -d remindly
   ```

4. אם צריך, צור את מסד הנתונים:
   ```bash
   createdb remindly
   ```

## מה תוקן?

1. ✅ תוקנו indexes ב-Reminder model (`reminder_time` במקום `reminderTime`)
2. ✅ תוקנו indexes ב-Category model (`parent_id` במקום `parentId`)
3. ✅ תוקנו indexes ב-Price model
4. ✅ תוקנו indexes ב-ShoppingItem model
5. ✅ שונה sync mode ל-`alter: true` כדי לעדכן טבלאות קיימות

