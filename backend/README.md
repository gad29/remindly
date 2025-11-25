# Remindly Backend API

שרת API עבור אפליקציית Remindly - ניהול משימות חכם.

## תכונות

- 🔐 **אימות משתמשים** - JWT tokens, הרשמה והתחברות
- 📝 **ניהול רשימות** - CRUD operations לרשימות
- ✅ **ניהול משימות** - יצירה, עריכה, מחיקה וסידור משימות
- 🛒 **רשימת קניות** - עם חיפוש מחירים אוטומטי
- 🎤 **עיבוד קולי** - אינטגרציה עם AI
- 🤖 **AI Processing** - ניתוח טקסט חכם
- 🔔 **התראות** - SMS, Email, Push notifications
- 🔍 **חיפוש** - חיפוש חכם בכל הנתונים
- 📊 **סטטיסטיקות** - נתונים ואנליטיקה

## טכנולוגיות

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL + Sequelize ORM
- **Authentication**: JWT
- **Validation**: express-validator
- **Logging**: Winston
- **AI**: OpenAI GPT-4
- **Notifications**: Twilio, SendGrid, Firebase
- **File Upload**: Multer

## התקנה

1. התקן את התלויות:
```bash
npm install
```

2. צור קובץ `.env` מהדוגמה:
```bash
cp .env.example .env
```

3. עדכן את המשתנים בקובץ `.env`:
```env
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=remindly
DB_USER=postgres
DB_PASSWORD=ci_test_only_not_a_secret
JWT_SECRET=your_jwt_secret_here
# ... שאר המשתנים
```

4. הגדר את מסד הנתונים:
```bash
# צור מסד נתונים PostgreSQL
createdb remindly

# הרץ migrations (אם יש)
npm run migrate
```

5. הפעל את השרת:
```bash
# Development
npm run dev

# Production
npm start
```

## סקריפטים

- `npm start` - הפעלת השרת בפרודקשן
- `npm run dev` - הפעלת השרת במצב פיתוח עם nodemon
- `npm test` - הרצת בדיקות
- `npm run lint` - בדיקת קוד עם ESLint
- `npm run format` - עיצוב קוד עם Prettier

## מבנה הפרויקט

```
backend/
├── config/          # הגדרות מסד נתונים
├── middleware/       # Middleware functions
├── models/          # Sequelize models
├── routes/          # API routes
├── utils/           # Utility functions
├── logs/            # Log files
├── uploads/         # Uploaded files
└── server.js        # Entry point
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - הרשמת משתמש חדש
- `POST /api/auth/login` - התחברות
- `GET /api/auth/me` - קבלת פרטי משתמש נוכחי
- `POST /api/auth/refresh` - רענון token
- `POST /api/auth/logout` - התנתקות
- `PUT /api/auth/profile` - עדכון פרופיל
- `PUT /api/auth/password` - שינוי סיסמה

### Lists
- `GET /api/lists` - קבלת כל הרשימות
- `POST /api/lists` - יצירת רשימה חדשה
- `GET /api/lists/:id` - קבלת רשימה ספציפית
- `PUT /api/lists/:id` - עדכון רשימה
- `DELETE /api/lists/:id` - מחיקת רשימה
- `PUT /api/lists/reorder` - סידור רשימות

### Tasks
- `GET /api/tasks` - קבלת כל המשימות
- `POST /api/tasks` - יצירת משימה חדשה
- `GET /api/tasks/:id` - קבלת משימה ספציפית
- `PUT /api/tasks/:id` - עדכון משימה
- `DELETE /api/tasks/:id` - מחיקת משימה
- `PATCH /api/tasks/:id/complete` - סימון משימה כהושלמה
- `PUT /api/tasks/reorder` - סידור משימות

### Shopping
- `GET /api/shopping/:listId/items` - קבלת פריטי קנייה
- `POST /api/shopping/:listId/items` - הוספת פריט קנייה
- `PUT /api/shopping/items/:id` - עדכון פריט קנייה
- `DELETE /api/shopping/items/:id` - מחיקת פריט קנייה
- `GET /api/shopping/prices/search` - חיפוש מחירים

### Voice Processing
- `POST /api/voice/upload` - העלאת קובץ אודיו
- `POST /api/voice/process` - עיבוד טקסט עם AI
- `GET /api/voice/history` - היסטוריית הקלטות

### Notifications
- `GET /api/notifications` - קבלת התראות
- `PATCH /api/notifications/:id/read` - סימון התראה כנקראה
- `PATCH /api/notifications/read-all` - סימון כל ההתראות כנקראות
- `DELETE /api/notifications/:id` - מחיקת התראה

### Search
- `GET /api/search` - חיפוש גלובלי

### AI
- `POST /api/ai/process` - עיבוד טקסט עם AI
- `POST /api/ai/translate` - תרגום טקסט

## דוגמאות שימוש

### הרשמה
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "יוסי כהן",
    "email": "yossi@example.com",
    "password": "password123",
    "language": "he"
  }'
```

### התחברות
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "yossi@example.com",
    "password": "password123"
  }'
```

### יצירת רשימה
```bash
curl -X POST http://localhost:3001/api/lists \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "רשימת קניות",
    "description": "מוצרים לקנייה השבוע",
    "icon": "mdi-cart",
    "color": "#4caf50"
  }'
```

### יצירת משימה
```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "לקנות חלב",
    "description": "חלב 3% ליטר אחד",
    "listId": "LIST_ID",
    "priority": "medium",
    "dueDate": "2024-01-15"
  }'
```

## אבטחה

- **JWT Authentication** - אימות עם JSON Web Tokens
- **Password Hashing** - הצפנת סיסמאות עם bcrypt
- **Rate Limiting** - הגבלת בקשות
- **Input Validation** - אימות קלט
- **CORS** - הגדרת Cross-Origin Resource Sharing
- **Helmet** - אבטחת headers

## לוגים

האפליקציה משתמשת ב-Winston ללוגים:
- `logs/error.log` - שגיאות
- `logs/combined.log` - כל הלוגים

## בדיקות

```bash
# הרצת כל הבדיקות
npm test

# בדיקות עם coverage
npm run test:coverage

# בדיקות watch mode
npm run test:watch
```

## פריסה

### Docker
```bash
# בניית image
docker build -t remindly-backend .

# הרצת container
docker run -p 3001:3001 remindly-backend
```

### PM2
```bash
# התקנת PM2
npm install -g pm2

# הפעלה
pm2 start server.js --name remindly-backend

# ניטור
pm2 monit
```

## תרומה

1. Fork את הפרויקט
2. צור branch חדש (`git checkout -b feature/amazing-feature`)
3. Commit את השינויים (`git commit -m 'Add amazing feature'`)
4. Push ל-branch (`git push origin feature/amazing-feature`)
5. פתח Pull Request

## רישיון

MIT License - ראה קובץ LICENSE לפרטים נוספים.

## תמיכה

לשאלות ותמיכה:
- Email: support@remindly.com
- GitHub Issues: [דף הבעיות](https://github.com/remindly/backend/issues)
