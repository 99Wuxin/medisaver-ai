import express from "express";
import cors from "cors";
import multer from "multer";
import {
  analyzeBill,
  buildAppealLetter,
  mockExtractLineItems
} from "./analysis.js";

const app = express();
const PORT = process.env.PORT || 8787;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "healthcare-billing-arbitrage-api" });
});

/** Multipart upload: image triggers mock OCR + analysis */
app.post("/api/analyze", upload.single("bill"), (req, res) => {
  try {
    const demo = req.body?.demoScenario || "high";
    const buffer = req.file?.buffer;
    const parsed = mockExtractLineItems(buffer, demo);
    const analysis = analyzeBill(parsed);
    res.json({ parsed, analysis });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Analysis failed" });
  }
});

/** JSON body with explicit line items (for integrations / tests) */
app.post("/api/analyze-json", (req, res) => {
  try {
    const body = req.body;
    if (!body?.lineItems?.length) {
      return res.status(400).json({ error: "lineItems required" });
    }
    const parsed = {
      facilityName: body.facilityName || "Unknown facility",
      patientName: body.patientName || "Patient",
      statementDate: body.statementDate || "",
      lineItems: body.lineItems
    };
    const analysis = analyzeBill(parsed);
    res.json({ parsed, analysis });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Analysis failed" });
  }
});

app.post("/api/appeal", (req, res) => {
  try {
    const { analysis, patientName, insurerName } = req.body;
    if (!analysis?.summary) {
      return res.status(400).json({ error: "analysis object required" });
    }
    const letter = buildAppealLetter(analysis, patientName || "Policyholder", insurerName || "");
    res.json({ letter });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Appeal generation failed" });
  }
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
