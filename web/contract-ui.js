const reportData = window.__VIBETRACE_REPORT__;
const checkpointId = document.getElementById("checkpointId");
const impactPanel = document.querySelector(".impact-panel");
const riskSection = document.querySelector(".risk-section");

if (!checkpointId || !impactPanel || !riskSection) {
  throw new Error("VibeTrace authorization UI could not find its host elements.");
}

const card = document.createElement("section");
card.className = "authorization-section";
card.setAttribute("aria-labelledby", "authorization-title");
riskSection.before(card);

function escapeHtml(value) {
  return String(value).replace(
    /[&<>'"]/gu,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ],
  );
}

function currentCheckpoint() {
  const displayed = checkpointId.textContent.trim().replace(/^#/u, "");
  if (reportData?.checkpoints?.length) {
    return reportData.checkpoints.find(
      (checkpoint) => checkpoint.id.replace(/^vt_/u, "") === displayed,
    );
  }

  return {
    authorization: {
      allow: ["src/components/**", "src/styles/**"],
      deny: ["src/auth/**", "src/router/**"],
      maxFiles: 3,
      maxLines: 80,
    },
    analysis: {
      contractCompliance: {
        declared: true,
        status: "violated",
        protectedFiles: ["src/auth/session.ts", "src/router/index.ts"],
        unauthorizedFiles: ["src/auth/session.ts", "src/router/index.ts", "package.json"],
        violations: [
          { detail: "The observed change crossed explicitly protected paths." },
          { detail: "12 changed files exceeded the declared 3-file budget." },
        ],
      },
    },
    receipt: { receiptId: "vtr_4f71a9c83e16d52a3f308cf0" },
  };
}

function patterns(values, empty) {
  if (!values?.length) return `<span class="contract-empty">${escapeHtml(empty)}</span>`;
  return values
    .slice(0, 3)
    .map((value) => `<code>${escapeHtml(value)}</code>`)
    .join("");
}

function renderAuthorization() {
  const checkpoint = currentCheckpoint();
  const contract = checkpoint?.authorization;
  const compliance = checkpoint?.analysis?.contractCompliance;
  const receipt = checkpoint?.receipt;

  if (!contract || !compliance?.declared) {
    card.innerHTML = `
      <div class="authorization-heading">
        <div><p class="section-label">WHAT YOU AUTHORIZED</p><h2 id="authorization-title">Change contract</h2></div>
        <span class="contract-status undeclared">OPTIONAL</span>
      </div>
      <p class="contract-copy">No explicit boundary was declared for this checkpoint. Intent mismatch remains heuristic evidence only.</p>
      <div class="contract-hint"><span>+</span><code>--allow "src/ui/**" --deny "src/auth/**" --max-files 3</code></div>`;
    return;
  }

  const violated = compliance.status === "violated";
  const limits = [
    contract.maxFiles === null ? null : `${contract.maxFiles} files max`,
    contract.maxLines === null ? null : `${contract.maxLines} lines max`,
  ].filter(Boolean);
  const violation = compliance.violations?.[0]?.detail;

  card.innerHTML = `
    <div class="authorization-heading">
      <div><p class="section-label">WHAT YOU AUTHORIZED</p><h2 id="authorization-title">Change contract</h2></div>
      <span class="contract-status ${violated ? "violated" : "compliant"}">${violated ? "DRIFT" : "ALIGNED"}</span>
    </div>
    <div class="contract-grid">
      <div><span>ALLOW</span>${patterns(contract.allow, "any path")}</div>
      <div><span>PROTECT</span>${patterns(contract.deny, "none")}</div>
      <div><span>BUDGET</span><strong>${escapeHtml(limits.join(" · ") || "unbounded")}</strong></div>
    </div>
    <div class="contract-verdict ${violated ? "violated" : "compliant"}">
      <span>${violated ? "AUTHORIZATION DRIFT" : "AUTHORIZED SCOPE HELD"}</span>
      <strong>${escapeHtml(violation || "Observed files stayed inside the explicit change contract.")}</strong>
    </div>
    ${receipt?.receiptId ? `<button class="receipt-chip" type="button" title="Evidence receipt"><span>EVIDENCE RECEIPT</span><code>${escapeHtml(receipt.receiptId)}</code></button>` : ""}`;

  const receiptButton = card.querySelector(".receipt-chip");
  if (receiptButton) {
    receiptButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(receipt.receiptId);
        receiptButton.classList.add("copied");
        setTimeout(() => receiptButton.classList.remove("copied"), 1200);
      } catch {
        receiptButton.title = receipt.receiptId;
      }
    });
  }
}

const observer = new MutationObserver(renderAuthorization);
observer.observe(checkpointId, { childList: true, characterData: true, subtree: true });
renderAuthorization();
