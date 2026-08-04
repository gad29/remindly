import OpenAI from "openai";
import sequelize from "../config/database.js";
import { Task } from "../models/Task.js";
import { List } from "../models/List.js";

const getModel = () => process.env.OPENROUTER_MODEL || "google/gemini-3.1-flash-lite";

const actionSchema = {
  name: "remindly_task_actions",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: { type: "string" },
      reply: { type: "string" },
      actions: {
        type: "array",
        maxItems: 10,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: { type: "string", enum: ["create_task", "update_task", "complete_task", "reopen_task"] },
            taskId: { type: ["string", "null"] },
            listId: { type: ["string", "null"] },
            title: { type: ["string", "null"] },
            description: { type: ["string", "null"] },
            dueDate: { type: ["string", "null"] },
            dueTime: { type: ["string", "null"] },
            priority: { type: ["string", "null"], enum: ["low", "medium", "high", "urgent", null] },
            explanation: { type: "string" }
          },
          required: ["type", "taskId", "listId", "title", "description", "dueDate", "dueTime", "priority", "explanation"]
        }
      }
    },
    required: ["summary", "reply", "actions"]
  }
};

const getClient = () => {
  if (!process.env.OPENROUTER_API_KEY) {
    const error = new Error("OpenRouter is not configured");
    error.code = "OPENROUTER_NOT_CONFIGURED";
    throw error;
  }

  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      "HTTP-Referer": process.env.APP_URL || "http://localhost:5173",
      "X-OpenRouter-Title": "Remindly"
    }
  });
};

const safeDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? value : null;
const safeTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || "") ? value : null;

class OpenRouterService {
  async preview(text, userId, language = "en") {
    const [tasks, lists] = await Promise.all([
      Task.findAll({
        where: { userId },
        attributes: ["id", "listId", "title", "description", "priority", "dueDate", "dueTime", "completed"],
        order: [["updatedAt", "DESC"]],
        limit: 100
      }),
      List.findAll({ where: { userId, isArchived: false }, attributes: ["id", "name", "description"] })
    ]);

    const completion = await getClient().chat.completions.create({
      model: getModel(),
      temperature: 0.1,
      max_tokens: 1200,
      provider: { require_parameters: true },
      response_format: { type: "json_schema", json_schema: actionSchema },
      messages: [
        {
          role: "system",
          content: `You are Remindly's task interpreter. Convert a spoken or typed command into a small set of proposed task actions. Never delete data. Match an existing task only when the title and intent clearly identify it. Use ISO dates and 24-hour times. Today is ${new Date().toISOString()}. The user's language is ${language}. Return no actions for conversational text or uncertain requests; ask a concise clarification in reply instead.`
        },
        {
          role: "user",
          content: JSON.stringify({ command: text, lists, tasks })
        }
      ]
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenRouter returned an empty response");
    return { ...JSON.parse(content), model: completion.model || getModel() };
  }

  async apply(actions, userId) {
    if (!Array.isArray(actions) || actions.length > 10) throw new Error("Invalid action list");

    return sequelize.transaction(async (transaction) => {
      const changed = [];
      for (const action of actions) {
        if (!["create_task", "update_task", "complete_task", "reopen_task"].includes(action.type)) continue;

        if (action.type === "create_task") {
          let list = action.listId ? await List.findOne({ where: { id: action.listId, userId }, transaction }) : null;
          if (!list) {
            [list] = await List.findOrCreate({
              where: { userId, name: "Tasks" },
              defaults: { description: "General tasks", icon: "mdi-check-circle-outline", color: "#4F6BFF", isDefault: true },
              transaction
            });
          }
          if (!action.title?.trim()) throw new Error("A new task needs a title");
          const task = await Task.create({
            userId,
            listId: list.id,
            title: action.title.trim().slice(0, 255),
            description: action.description?.trim() || null,
            priority: action.priority || "medium",
            dueDate: safeDate(action.dueDate),
            dueTime: safeTime(action.dueTime),
            metadata: { aiUpdated: true, source: "openrouter" }
          }, { transaction });
          changed.push(task);
          continue;
        }

        const task = await Task.findOne({ where: { id: action.taskId, userId }, transaction });
        if (!task) throw new Error("One proposed task no longer exists");

        if (action.type === "complete_task" || action.type === "reopen_task") {
          await task.update({ completed: action.type === "complete_task" }, { transaction });
        } else {
          const updates = {};
          if (action.title?.trim()) updates.title = action.title.trim().slice(0, 255);
          if (action.description !== null) updates.description = action.description?.trim() || null;
          if (action.priority) updates.priority = action.priority;
          if (action.dueDate !== null) updates.dueDate = safeDate(action.dueDate);
          if (action.dueTime !== null) updates.dueTime = safeTime(action.dueTime);
          updates.metadata = { ...(task.metadata || {}), aiUpdated: true, source: "openrouter" };
          await task.update(updates, { transaction });
        }
        changed.push(task);
      }
      return changed;
    });
  }

  status() {
    return { configured: Boolean(process.env.OPENROUTER_API_KEY), model: getModel() };
  }
}

export default new OpenRouterService();
