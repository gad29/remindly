import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Always resolve from the backend folder, regardless of the PM2/current cwd.
dotenv.config({ path: path.resolve(__dirname, "../.env") });
