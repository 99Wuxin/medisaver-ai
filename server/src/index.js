import { Hono } from "hono";
import { cors } from "hono/cors";
import { analyzeBill, buildAppealLetter, mockExtractLineItems } from "./analysis.js";

const app = new Hono();

// 启用跨域
app.use("/api/*", cors());

// 根路径说明，避免直接访问域名时 404
app.get("/", (c) => {
  return c.json({
    ok: true,
    service: "medisaver-ai-api",
    endpoints: ["/api/health", "/api/analyze", "/api/analyze-json", "/api/appeal"]
  });
});

// 健康检查
app.get("/api/health", (c) => {
  return c.json({ ok: true, service: "medisaver-ai-api" });
});

/** 处理图片上传分析 */
app.post("/api/analyze", async (c) => {
  try {
    const body = await c.req.parseBody();
    const billFile = body["bill"]; // 这是一个 Blob 对象
    const demoScenario = body["demoScenario"] || "high";

    let buffer = null;
    if (billFile instanceof File) {
      buffer = await billFile.arrayBuffer();
    }

    // 调用你分析逻辑中的 mock 函数
    const parsed = mockExtractLineItems(buffer, demoScenario);
    const analysis = analyzeBill(parsed);

    return c.json({ parsed, analysis });
  } catch (e) {
    console.error(e);
    return c.json({ error: "Analysis failed" }, 500);
  }
});

/** 处理 JSON 提交的分析 */
app.post("/api/analyze-json", async (c) => {
  try {
    const body = await c.req.json();
    if (!body?.lineItems?.length) {
      return c.json({ error: "lineItems required" }, 400);
    }
    const parsed = {
      facilityName: body.facilityName || "Unknown facility",
      patientName: body.patientName || "Patient",
      statementDate: body.statementDate || "",
      lineItems: body.lineItems
    };
    const analysis = analyzeBill(parsed);
    return c.json({ parsed, analysis });
  } catch (e) {
    return c.json({ error: "Analysis failed" }, 500);
  }
});

/** 生成申诉信 */
app.post("/api/appeal", async (c) => {
  try {
    const { analysis, patientName, insurerName } = await c.req.json();
    if (!analysis?.summary) {
      return c.json({ error: "analysis object required" }, 400);
    }
    const letter = buildAppealLetter(analysis, patientName || "Policyholder", insurerName || "");
    return c.json({ letter });
  } catch (e) {
    return c.json({ error: "Appeal generation failed" }, 500);
  }
});

export default app;
