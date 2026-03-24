import { Hono } from "hono";
import { cors } from "hono/cors";
import { analyzeBill, buildAppealLetter, mockExtractLineItems } from "./analysis.js";

const app = new Hono();

// 启用跨域
app.use("/api/*", cors());

// 根路径说明，避免直接访问域名时 404
app.get("/", (c) => {
  const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MediSaver AI - 医疗账单智能省费助手</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        margin: 0;
        padding: 0;
        background: #f8fafc;
        color: #1f2937;
      }
      .wrap {
        max-width: 980px;
        margin: 0 auto;
        padding: 32px 20px 56px;
      }
      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .logo {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        background: linear-gradient(135deg, #1d4ed8, #0ea5e9);
        color: #fff;
        display: grid;
        place-items: center;
        font-weight: 700;
      }
      .brand-title {
        font-weight: 700;
        font-size: 16px;
      }
      .lang-toggle {
        display: inline-flex;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        overflow: hidden;
        background: #fff;
      }
      .lang-btn {
        border: 0;
        background: transparent;
        padding: 8px 12px;
        cursor: pointer;
        font-size: 13px;
      }
      .lang-btn.active {
        background: #1d4ed8;
        color: #fff;
      }
      .hero {
        background: linear-gradient(135deg, #0f172a, #1d4ed8);
        color: #fff;
        border-radius: 16px;
        padding: 28px;
        box-shadow: 0 12px 28px rgba(2, 6, 23, 0.25);
      }
      .hero h1 {
        margin: 0 0 10px;
        font-size: 34px;
      }
      .hero p {
        margin: 0;
        font-size: 16px;
        line-height: 1.7;
        color: #dbeafe;
      }
      .cta-row {
        margin-top: 16px;
      }
      .cta {
        display: inline-block;
        background: #22c55e;
        color: #062e16;
        font-weight: 700;
        border-radius: 10px;
        padding: 10px 16px;
        text-decoration: none;
      }
      .cta:hover {
        filter: brightness(0.96);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 14px;
        margin-top: 18px;
      }
      .item {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 16px;
      }
      .item h3 {
        margin: 0 0 8px;
        font-size: 16px;
      }
      .item p {
        margin: 0;
        font-size: 14px;
        line-height: 1.7;
        color: #475569;
      }
      .section {
        margin-top: 26px;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 18px 20px;
      }
      .section h2 {
        margin: 0 0 10px;
        font-size: 20px;
      }
      .section p,
      .section li {
        color: #334155;
        line-height: 1.8;
        font-size: 15px;
      }
      .muted {
        color: #64748b;
        font-size: 13px;
      }
      .api {
        margin-top: 10px;
      }
      .api a {
        color: #2563eb;
        text-decoration: none;
      }
      .api a:hover {
        text-decoration: underline;
      }
      .demo-box {
        background: #0b1220;
        color: #dbeafe;
        border-radius: 12px;
        padding: 14px;
        margin-top: 12px;
      }
      .demo-box textarea {
        width: 100%;
        min-height: 96px;
        border-radius: 8px;
        border: 1px solid #334155;
        background: #111827;
        color: #e2e8f0;
        padding: 10px;
        resize: vertical;
        box-sizing: border-box;
      }
      .demo-actions {
        display: flex;
        gap: 10px;
        margin-top: 10px;
        flex-wrap: wrap;
      }
      .btn {
        border: 0;
        border-radius: 8px;
        padding: 10px 12px;
        cursor: pointer;
        font-weight: 600;
      }
      .btn-primary {
        background: #22c55e;
        color: #052e16;
      }
      .btn-secondary {
        background: #1e293b;
        color: #e2e8f0;
      }
      .json {
        margin-top: 12px;
        border: 1px solid #1e293b;
        border-radius: 10px;
        background: #020617;
        color: #93c5fd;
        padding: 10px;
        overflow-x: auto;
        white-space: pre;
        font-size: 12px;
      }
      .result-card {
        margin-top: 12px;
        background: linear-gradient(135deg, #052e16, #14532d);
        color: #dcfce7;
        border-radius: 12px;
        padding: 14px;
        border: 1px solid #166534;
      }
      .result-card strong {
        color: #86efac;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="topbar">
        <div class="brand">
          <div class="logo">M</div>
          <div class="brand-title">MediSaver AI</div>
        </div>
        <div class="lang-toggle" aria-label="language switcher">
          <button id="btn-zh" class="lang-btn active" type="button">中文</button>
          <button id="btn-en" class="lang-btn" type="button">EN</button>
        </div>
      </div>

      <div class="hero">
        <h1 data-i18n="heroTitle">MediSaver AI</h1>
        <p data-i18n="heroDesc">
          医疗账单智能省费助手。上传账单后，系统会自动识别收费项目、定位潜在异常与可申诉点，
          并生成可直接使用的申诉信草稿，帮助用户更快、更清晰地与保险方沟通。
        </p>
        <div class="cta-row">
          <a class="cta" href="#experience" data-i18n="cta">立即体验</a>
        </div>
      </div>

      <div class="grid">
        <div class="item">
          <h3 data-i18n="f1Title">1) 智能账单分析</h3>
          <p data-i18n="f1Desc">自动拆解收费项，标注高风险项目与疑似不合理费用。</p>
        </div>
        <div class="item">
          <h3 data-i18n="f2Title">2) 节省建议</h3>
          <p data-i18n="f2Desc">结合场景提供降费方向，辅助用户判断下一步行动。</p>
        </div>
        <div class="item">
          <h3 data-i18n="f3Title">3) 申诉信生成</h3>
          <p data-i18n="f3Desc">一键生成结构化申诉信，提高沟通效率和可执行性。</p>
        </div>
      </div>

      <section class="section">
        <h2 data-i18n="fitTitle">适合谁使用</h2>
        <ul>
          <li data-i18n="fit1">收到高额医疗账单、希望快速判断是否存在异常收费的患者与家庭。</li>
          <li data-i18n="fit2">需要准备保险沟通材料、但不熟悉账单术语与申诉流程的用户。</li>
          <li data-i18n="fit3">希望先完成自助初筛，再决定是否咨询专业机构的人群。</li>
        </ul>
      </section>

      <section id="experience" class="section">
        <h2 data-i18n="expTitle">立即体验</h2>
        <p data-i18n="expDesc">你可以先通过演示端体验账单分析流程，随后接入正式上传与申诉能力。</p>
        <div class="demo-box">
          <p class="muted" data-i18n="demoHint">模拟：用户上传了混乱急诊账单照片，系统将图片 + Prompt 发给模型并返回结构化 JSON。</p>
          <textarea id="demoInput">叫了一次救护车收了3000刀，缝了两针收了1500刀，急诊观察2小时收了2400刀。</textarea>
          <div class="demo-actions">
            <button id="runDemo" class="btn btn-primary" type="button" data-i18n="runDemo">生成专业砍价报告</button>
            <button id="fillDemo" class="btn btn-secondary" type="button" data-i18n="fillDemo">换一组离谱收费</button>
          </div>
          <div id="demoJson" class="json" hidden></div>
          <div id="demoCard" class="result-card" hidden></div>
        </div>
        <div class="api">
          <a href="/api/health" data-i18n="expLink">查看服务状态 /api/health</a>
        </div>
      </section>

      <section class="section">
        <h2 data-i18n="privacyTitle">隐私与安全</h2>
        <p data-i18n="privacyDesc">
          我们仅在功能所需范围内处理数据，并持续优化最小化存储策略与访问控制。
          请勿上传与分析无关的敏感信息。
        </p>
        <p class="muted" data-i18n="disclaimer">MediSaver AI 当前提供辅助分析结果，不构成医疗或法律意见。</p>
      </section>

      <section class="section">
        <h2 data-i18n="statusTitle">服务状态</h2>
        <p data-i18n="statusDesc">服务运行正常。如需技术对接，可使用以下接口：</p>
        <div class="api">
          <a href="/api/health">/api/health</a>
        </div>
      </section>
    </div>
    <script>
      const i18n = {
        zh: {
          heroTitle: "MediSaver AI",
          heroDesc: "医疗账单智能省费助手。上传账单后，系统会自动识别收费项目、定位潜在异常与可申诉点，并生成可直接使用的申诉信草稿，帮助用户更快、更清晰地与保险方沟通。",
          cta: "立即体验",
          f1Title: "1) 智能账单分析",
          f1Desc: "自动拆解收费项，标注高风险项目与疑似不合理费用。",
          f2Title: "2) 节省建议",
          f2Desc: "结合场景提供降费方向，辅助用户判断下一步行动。",
          f3Title: "3) 申诉信生成",
          f3Desc: "一键生成结构化申诉信，提高沟通效率和可执行性。",
          fitTitle: "适合谁使用",
          fit1: "收到高额医疗账单、希望快速判断是否存在异常收费的患者与家庭。",
          fit2: "需要准备保险沟通材料、但不熟悉账单术语与申诉流程的用户。",
          fit3: "希望先完成自助初筛，再决定是否咨询专业机构的人群。",
          expTitle: "立即体验",
          expDesc: "你可以先通过演示端体验账单分析流程，随后接入正式上传与申诉能力。",
          demoHint: "模拟：用户上传了混乱急诊账单照片，系统将图片 + Prompt 发给模型并返回结构化 JSON。",
          runDemo: "生成专业砍价报告",
          fillDemo: "换一组离谱收费",
          expLink: "查看服务状态 /api/health",
          privacyTitle: "隐私与安全",
          privacyDesc: "我们仅在功能所需范围内处理数据，并持续优化最小化存储策略与访问控制。请勿上传与分析无关的敏感信息。",
          disclaimer: "MediSaver AI 当前提供辅助分析结果，不构成医疗或法律意见。",
          statusTitle: "服务状态",
          statusDesc: "服务运行正常。如需技术对接，可使用以下接口："
        },
        en: {
          heroTitle: "MediSaver AI",
          heroDesc: "An AI assistant for reducing medical bill costs. Upload a bill to detect charge anomalies, identify appeal opportunities, and generate a ready-to-edit appeal letter for insurer communication.",
          cta: "Try Now",
          f1Title: "1) Smart Bill Analysis",
          f1Desc: "Automatically parses line items and flags suspicious or high-risk charges.",
          f2Title: "2) Savings Suggestions",
          f2Desc: "Provides practical cost-saving directions based on your scenario.",
          f3Title: "3) Appeal Letter Drafting",
          f3Desc: "Generates a structured appeal letter to speed up claim communication.",
          fitTitle: "Who Is It For",
          fit1: "Patients and families facing high medical bills and needing a fast first-pass review.",
          fit2: "Users preparing insurance communication without deep billing expertise.",
          fit3: "People who want self-service screening before contacting professionals.",
          expTitle: "Get Started",
          expDesc: "Start with a demo workflow, then connect full upload and appeal capabilities.",
          demoHint: "Demo flow: a messy ER bill photo is sent to a model with a compliance-audit system prompt, then rendered from JSON.",
          runDemo: "Generate Negotiation Report",
          fillDemo: "Try Another Extreme Case",
          expLink: "Check service status at /api/health",
          privacyTitle: "Privacy & Security",
          privacyDesc: "We process data only as required for core features and keep improving minimal-retention and access-control safeguards. Avoid uploading unrelated sensitive data.",
          disclaimer: "MediSaver AI provides assistive analysis and is not medical or legal advice.",
          statusTitle: "Service Status",
          statusDesc: "Service is running. For technical integration, use:"
        }
      };

      const btnZh = document.getElementById("btn-zh");
      const btnEn = document.getElementById("btn-en");
      const runDemoBtn = document.getElementById("runDemo");
      const fillDemoBtn = document.getElementById("fillDemo");
      const demoInput = document.getElementById("demoInput");
      const demoJson = document.getElementById("demoJson");
      const demoCard = document.getElementById("demoCard");

      const crazyCases = [
        "叫了一次救护车收了3000刀，缝了两针收了1500刀，急诊观察2小时收了2400刀。",
        "CT 头部扫描收了4200刀，普通止痛针一针收了460刀，一次基础验血收了980刀。",
        "急诊挂号费1200刀，5分钟医生问诊收了900刀，纱布和消毒收了380刀。"
      ];
      let caseIndex = 0;

      function applyLang(lang) {
        document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
        document.querySelectorAll("[data-i18n]").forEach((el) => {
          const key = el.getAttribute("data-i18n");
          if (i18n[lang][key]) el.textContent = i18n[lang][key];
        });
        btnZh.classList.toggle("active", lang === "zh");
        btnEn.classList.toggle("active", lang === "en");
      }

      btnZh.addEventListener("click", () => applyLang("zh"));
      btnEn.addEventListener("click", () => applyLang("en"));

      fillDemoBtn.addEventListener("click", () => {
        caseIndex = (caseIndex + 1) % crazyCases.length;
        demoInput.value = crazyCases[caseIndex];
      });

      runDemoBtn.addEventListener("click", () => {
        const text = demoInput.value.trim();
        const baseTotal = Math.max(2600, Math.min(9800, text.length * 42));
        const estimatedSavings = Math.round(baseTotal * 0.42);
        const premium = (1.8 + (text.length % 8) * 0.22).toFixed(1);
        const report = {
          original_total_usd: baseTotal,
          overcharge_items: [
            {
              cpt_code: "99285",
              premium_multiplier: premium,
              compliance_reason: "Charge materially exceeds 2026 CMS benchmark for comparable ER complexity and lacks clear supporting documentation."
            },
            {
              cpt_code: "12001",
              premium_multiplier: "2.4",
              compliance_reason: "Simple laceration repair appears priced as higher-acuity service without matching procedure notes."
            }
          ],
          estimated_savings_usd: estimatedSavings,
          legal_leverage: [
            "Request itemized bill and coding rationale under patient billing transparency rules.",
            "Dispute upcoding and ask for coding review with documentation.",
            "Escalate with insurer appeal citing parity with CMS fair-market reference."
          ],
          generated_from_user_text: text
        };

        demoJson.hidden = false;
        demoCard.hidden = false;
        demoJson.textContent = JSON.stringify(report, null, 2);
        demoCard.innerHTML =
          '<div><strong>' +
          (document.documentElement.lang === "en" ? "Potential savings: " : "预计可省金额：") +
          "$" +
          estimatedSavings +
          '</strong></div><div style="margin-top:6px;">' +
          (document.documentElement.lang === "en"
            ? "Detected likely upcoding. Tap to generate a one-click appeal package."
            : "检测到疑似高码计费。可一键生成申诉材料并用于和保险方谈判。") +
          "</div>";
      });
    </script>
  </body>
</html>`;
  return c.html(html);
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
