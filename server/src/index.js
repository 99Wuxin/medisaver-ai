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
    <title>MediSaver AI - The Settlement Shield</title>
    <style>
      :root {
        --blue: #1f4a86;
        --blue-dark: #0f2f5a;
        --bg: #f1f5f9;
        --text: #0f172a;
      }
      body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      }
      .wrap {
        max-width: 1000px;
        margin: 0 auto;
        padding: 24px 18px 48px;
      }
      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .lang-toggle {
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
      }
      .lang-btn.active {
        background: var(--blue);
        color: #fff;
      }
      .hero {
        background: linear-gradient(135deg, var(--blue-dark), #1f4a86);
        border-radius: 16px;
        padding: 20px;
        color: #dbeafe;
      }
      .brand-row {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .logo-svg {
        width: 68px;
        height: 68px;
        flex: none;
      }
      .wordmark {
        line-height: 1.1;
      }
      .wordmark .title {
        font-size: 34px;
        font-weight: 800;
        letter-spacing: 0.3px;
        color: #fff;
      }
      .wordmark .sub {
        font-size: 14px;
        opacity: 0.95;
      }
      .hero p {
        margin: 14px 0 0;
        font-size: 16px;
        line-height: 1.75;
      }
      .cta {
        margin-top: 16px;
        display: inline-block;
        background: #2563eb;
        color: #fff;
        border-radius: 10px;
        text-decoration: none;
        font-weight: 700;
        padding: 11px 16px;
      }
      .trust {
        margin-top: 14px;
        font-size: 13px;
        color: #bfdbfe;
      }
      .panel {
        margin-top: 20px;
        background: #fff;
        border-radius: 14px;
        border: 1px solid #dbe2ea;
        padding: 16px;
      }
      .step-tabs {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .step-btn {
        border: 1px solid #cbd5e1;
        background: #fff;
        color: #0f172a;
        border-radius: 999px;
        padding: 8px 12px;
        cursor: pointer;
        font-weight: 600;
      }
      .step-btn.active {
        background: #dbeafe;
        border-color: #93c5fd;
        color: #1d4ed8;
      }
      .step-view {
        margin-top: 14px;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        border-radius: 12px;
        padding: 16px;
      }
      .step-view h3 {
        margin: 0 0 8px;
      }
      .upload-box {
        margin-top: 10px;
        border: 2px dashed #93c5fd;
        background: #eff6ff;
        border-radius: 10px;
        padding: 20px;
        text-align: center;
      }
      .blue-btn {
        margin-top: 12px;
        display: inline-block;
        background: #2563eb;
        color: #fff;
        border-radius: 8px;
        padding: 10px 14px;
        text-decoration: none;
        font-weight: 700;
      }
      .save {
        color: #15803d;
        font-size: 30px;
        font-weight: 800;
      }
      .list {
        margin: 10px 0 0;
        padding-left: 18px;
      }
      .list li {
        margin-bottom: 6px;
        line-height: 1.7;
      }
      .charge {
        margin-top: 10px;
        background: #fef3c7;
        border: 1px solid #fcd34d;
        border-radius: 10px;
        padding: 12px;
      }
      .final-save {
        color: #166534;
        font-size: 28px;
        font-weight: 800;
      }
      .unlock {
        margin-top: 10px;
        border: 1px solid #fecaca;
        border-radius: 10px;
        padding: 14px;
        background: #fff1f2;
        position: relative;
        filter: blur(1px);
      }
      .lock-stamp {
        position: absolute;
        right: 12px;
        top: 10px;
        color: #b91c1c;
        font-weight: 800;
        border: 2px solid #b91c1c;
        border-radius: 8px;
        padding: 4px 8px;
        background: #fee2e2;
      }
      .small {
        color: #475569;
        font-size: 13px;
      }
      .api-link {
        margin-top: 14px;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="topbar">
        <div></div>
        <div class="lang-toggle">
          <button id="btn-zh" class="lang-btn active" type="button">中文</button>
          <button id="btn-en" class="lang-btn" type="button">EN</button>
        </div>
      </div>

      <section class="hero">
        <div class="brand-row">
          <svg class="logo-svg" viewBox="0 0 100 100" aria-hidden="true">
            <path d="M50 6 L86 24 L80 67 L50 94 L20 67 L14 24 Z" fill="#1f4a86" stroke="#ffffff" stroke-width="4"/>
            <rect x="44" y="28" width="12" height="44" rx="4" fill="#ffffff"/>
            <rect x="28" y="44" width="44" height="12" rx="4" fill="#ffffff"/>
          </svg>
          <div class="wordmark">
            <div class="title">MEDISAVER.AI</div>
            <div class="sub">The Settlement Shield</div>
          </div>
        </div>
        <p data-i18n="heroDesc">医疗和金融科技风格的账单审计体验：安全、专业、极简。上传一张医疗账单照片，AI 自动完成识别、审计、申诉建议与结案证明流程。</p>
        <a href="#demo-flow" id="startFlowBtn" class="cta" data-i18n="startBtn">立即体验</a>
        <div class="trust" data-i18n="trust">HIPAA 级隐私保护 · 专业法务支持 · 基于美国合规框架</div>
      </section>

      <section id="demo-flow" class="panel">
        <div class="step-tabs">
          <button class="step-btn active" data-step="1" data-i18n="tab1">步骤 1：上传账单</button>
          <button class="step-btn" data-step="2" data-i18n="tab2">步骤 2：审计结果</button>
          <button class="step-btn" data-step="3" data-i18n="tab3">步骤 3：验证与解锁</button>
        </div>

        <div id="step-1" class="step-view">
          <h3 data-i18n="s1Title">上传您的医疗账单或拍一张照片</h3>
          <p data-i18n="s1Desc">我们不要求用户填写复杂表格，只需上传账单图片，AI 将自动识别并审计。</p>
          <div class="upload-box">
            <div data-i18n="uploadHint">拖拽文件到这里，或手机直接拍照上传</div>
            <a href="#demo-flow" class="blue-btn" data-step-jump="2" data-i18n="auditBtn">开始 AI 审计</a>
          </div>
          <p class="small" data-i18n="s1Trust">安全与隐私（HIPAA）· 专业法务支持</p>
        </div>

        <div id="step-2" class="step-view" hidden>
          <h3 data-i18n="s2Title">审计完成！预计节省：$2,100</h3>
          <div class="save" data-i18n="s2Save">预计可省 $2,100</div>
          <ul class="list">
            <li data-i18n="s2L1">重复计费：CPT-99285（急诊高码计费）</li>
            <li data-i18n="s2L2">收费溢价：高于 2026 CMS 公平市场基准 2.3 倍</li>
            <li data-i18n="s2L3">法律依据：No Surprises Act + Billing Transparency Rule</li>
          </ul>
          <a href="#demo-flow" class="blue-btn" data-step-jump="3" data-i18n="s2Btn">下载 AI 申诉信</a>
          <p class="small">No Surprises Act compliant</p>
        </div>

        <div id="step-3" class="step-view" hidden>
          <h3 data-i18n="s3Title">验证成功！最终节省：$2,100</h3>
          <div class="final-save" data-i18n="s3Save">最终节省 $2,100</div>
          <div class="charge" data-i18n="s3Fee">服务费（20%）：$420</div>
          <div class="unlock">
            <div class="lock-stamp" data-i18n="locked">待激活</div>
            <h4 data-i18n="docTitle">《医疗债务结清声明》</h4>
            <p data-i18n="docDesc">包含减免金额、医院确认记录、保险沟通摘要与法务建议（预览已模糊）。</p>
          </div>
          <a href="#demo-flow" class="blue-btn" data-i18n="payBtn">付钱解锁并获取证明</a>
          <p class="small" data-i18n="s3Trust">HIPAA 安全合规 · 专业法务支持</p>
        </div>

        <div class="api-link small"><a href="/api/health">API Health Check</a></div>
      </section>
    </div>
    <script>
      const copy = {
        zh: {
          heroDesc: "医疗和金融科技风格的账单审计体验：安全、专业、极简。上传一张医疗账单照片，AI 自动完成识别、审计、申诉建议与结案证明流程。",
          startBtn: "立即体验",
          trust: "HIPAA 级隐私保护 · 专业法务支持 · 基于美国合规框架",
          tab1: "步骤 1：上传账单",
          tab2: "步骤 2：审计结果",
          tab3: "步骤 3：验证与解锁",
          s1Title: "上传您的医疗账单或拍一张照片",
          s1Desc: "我们不要求用户填写复杂表格，只需上传账单图片，AI 将自动识别并审计。",
          uploadHint: "拖拽文件到这里，或手机直接拍照上传",
          auditBtn: "开始 AI 审计",
          s1Trust: "安全与隐私（HIPAA）· 专业法务支持",
          s2Title: "审计完成！预计节省：$2,100",
          s2Save: "预计可省 $2,100",
          s2L1: "重复计费：CPT-99285（急诊高码计费）",
          s2L2: "收费溢价：高于 2026 CMS 公平市场基准 2.3 倍",
          s2L3: "法律依据：No Surprises Act + Billing Transparency Rule",
          s2Btn: "下载 AI 申诉信",
          s3Title: "验证成功！最终节省：$2,100",
          s3Save: "最终节省 $2,100",
          s3Fee: "服务费（20%）：$420",
          locked: "待激活",
          docTitle: "《医疗债务结清声明》",
          docDesc: "包含减免金额、医院确认记录、保险沟通摘要与法务建议（预览已模糊）。",
          payBtn: "付钱解锁并获取证明",
          s3Trust: "HIPAA 安全合规 · 专业法务支持"
        },
        en: {
          heroDesc: "A secure, professional, minimalist MedTech + FinTech billing audit experience. Upload one bill photo and AI handles extraction, compliance audit, appeal strategy, and settlement proof workflow.",
          startBtn: "Try It Now",
          trust: "HIPAA-grade privacy · Professional legal support · US compliance-aligned",
          tab1: "Step 1: Upload Bill",
          tab2: "Step 2: Audit Result",
          tab3: "Step 3: Verify & Unlock",
          s1Title: "Upload your medical bill or take a photo",
          s1Desc: "No long forms required. Upload once, then AI extracts and audits automatically.",
          uploadHint: "Drag and drop your file, or capture from mobile camera",
          auditBtn: "Start AI Audit",
          s1Trust: "Security & Privacy (HIPAA) · Professional legal support",
          s2Title: "Audit complete! Estimated savings: $2,100",
          s2Save: "Potential savings $2,100",
          s2L1: "Duplicate billing found: CPT-99285 (high-complexity ER coding)",
          s2L2: "Pricing premium: 2.3x above 2026 CMS fair-market benchmark",
          s2L3: "Legal basis: No Surprises Act + Billing Transparency Rule",
          s2Btn: "Download AI Appeal Letter",
          s3Title: "Verification successful! Final savings: $2,100",
          s3Save: "Final savings $2,100",
          s3Fee: "Service fee (20%): $420",
          locked: "Locked",
          docTitle: "Medical Debt Settlement Statement",
          docDesc: "Includes reduction amount, provider confirmation trail, insurer communication summary, and legal notes (blurred preview).",
          payBtn: "Pay to Unlock and Download Proof",
          s3Trust: "HIPAA compliant · Professional legal support"
        }
      };

      function switchStep(step) {
        ["1", "2", "3"].forEach((id) => {
          document.getElementById("step-" + id).hidden = id !== step;
        });
        document.querySelectorAll(".step-btn").forEach((b) => {
          b.classList.toggle("active", b.getAttribute("data-step") === step);
        });
      }

      document.querySelectorAll(".step-btn").forEach((btn) => {
        btn.addEventListener("click", () => switchStep(btn.getAttribute("data-step")));
      });
      document.querySelectorAll("[data-step-jump]").forEach((btn) => {
        btn.addEventListener("click", () => switchStep(btn.getAttribute("data-step-jump")));
      });

      const btnZh = document.getElementById("btn-zh");
      const btnEn = document.getElementById("btn-en");
      function applyLang(lang) {
        document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
        document.querySelectorAll("[data-i18n]").forEach((el) => {
          const key = el.getAttribute("data-i18n");
          if (copy[lang][key]) el.textContent = copy[lang][key];
        });
        btnZh.classList.toggle("active", lang === "zh");
        btnEn.classList.toggle("active", lang === "en");
      }
      btnZh.addEventListener("click", () => applyLang("zh"));
      btnEn.addEventListener("click", () => applyLang("en"));
      document.getElementById("startFlowBtn").addEventListener("click", () => switchStep("1"));
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
