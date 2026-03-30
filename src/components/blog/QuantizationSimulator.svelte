<script lang="ts">
  import { afterUpdate, onMount } from "svelte";

  type BitWidth = 8 | 4 | 2;

  let canvasRef: HTMLCanvasElement | undefined;
  let rValue = 3.0;
  let bitWidth: BitWidth = 8;

  const rMin = -2.0;
  const rMax = 6.0;
  const qMin = 0;

  let qMax: number;
  let scale: number;
  let zeroPointRaw: number;
  let zeroPoint: number;
  let qFormulaValue: number;
  let qVal: number;
  let rQuantized: number;
  let error: number;

  $: qMax = (1 << bitWidth) - 1;
  $: scale = (rMax - rMin) / (qMax - qMin);
  $: zeroPointRaw = qMin - rMin / scale;
  $: zeroPoint = Math.round(zeroPointRaw);
  $: qFormulaValue = rValue / scale + zeroPoint;
  $: qVal = Math.max(qMin, Math.min(qMax, Math.round(qFormulaValue)));
  $: rQuantized = scale * (qVal - zeroPoint);
  $: error = Math.abs(rValue - rQuantized);

  function drawCanvas(): void {
    if (!canvasRef) return;

    const ctx = canvasRef.getContext("2d");
    if (!ctx) return;

    const width = canvasRef.width;
    const height = canvasRef.height;
    const padding = 40;
    const lineLength = width - padding * 2;
    const yFloat = 60;
    const yInt = 160;

    ctx.clearRect(0, 0, width, height);

    ctx.beginPath();
    ctx.moveTo(padding, yFloat);
    ctx.lineTo(width - padding, yFloat);
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#475569";
    ctx.font = "13px sans-serif";
    ctx.fillText(`R_min (${rMin})`, padding - 18, yFloat - 14);
    ctx.fillText(`R_max (${rMax})`, width - padding - 34, yFloat - 14);

    ctx.beginPath();
    ctx.moveTo(padding, yInt);
    ctx.lineTo(width - padding, yInt);
    ctx.stroke();

    ctx.fillText(`Q_min (${qMin})`, padding - 18, yInt + 22);
    ctx.fillText(`Q_max (${qMax})`, width - padding - 40, yInt + 22);

    const xFloat = padding + ((rValue - rMin) / (rMax - rMin)) * lineLength;
    const xInt = padding + ((qVal - qMin) / (qMax - qMin)) * lineLength;

    ctx.beginPath();
    ctx.moveTo(xFloat, yFloat);
    ctx.lineTo(xInt, yInt);
    ctx.strokeStyle = "#2563eb";
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(xFloat, yFloat, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#ef4444";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(xInt, yInt, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#10b981";
    ctx.fill();

    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(`R = ${rValue.toFixed(2)}`, xFloat - 26, yFloat - 14);
    ctx.fillText(`Q = ${qVal}`, xInt - 18, yInt + 22);
  }

  function handleRChange(event: Event): void {
    const target = event.currentTarget as HTMLInputElement | null;
    if (!target) return;
    rValue = parseFloat(target.value);
  }

  function handleBitChange(event: Event): void {
    const target = event.currentTarget as HTMLSelectElement | null;
    if (!target) return;
    bitWidth = parseInt(target.value, 10) as BitWidth;
  }

  function resetToExample(): void {
    rValue = 3.0;
    bitWidth = 8;
  }

  onMount(() => {
    drawCanvas();
  });

  afterUpdate(() => {
    drawCanvas();
  });
</script>

<div
  style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin: 20px 0; background-color: #f8fafc;"
>
  <h3 style="margin: 0 0 12px; font-size: 1.1rem; font-weight: 700;">
    非对称量化交互推导器
  </h3>

  <canvas
    bind:this={canvasRef}
    width="620"
    height="220"
    style="width: 100%; max-width: 620px; display: block; margin: 0 auto;"
  ></canvas>

  <div style="display: flex; gap: 18px; margin-top: 16px; flex-wrap: wrap;">
    <div style="flex: 1; min-width: 220px;">
      <label for="r-value-range" style="display: block; margin-bottom: 8px; font-weight: 700;">
        输入浮点数 R: {rValue.toFixed(2)}
      </label>
      <input
        id="r-value-range"
        type="range"
        min={rMin}
        max={rMax}
        step="0.01"
        value={rValue}
        on:input={handleRChange}
        style="width: 100%;"
      />
    </div>

    <div>
      <label for="bit-width-select" style="display: block; margin-bottom: 8px; font-weight: 700;">
        目标位宽
      </label>
      <select id="bit-width-select" value={bitWidth} on:change={handleBitChange} style="padding: 4px 8px;">
        <option value="8">UINT8 (0-255)</option>
        <option value="4">UINT4 (0-15)</option>
        <option value="2">UINT2 (0-3)</option>
      </select>
      <div style="margin-top: 8px;">
        <button
          type="button"
          on:click={resetToExample}
          style="padding: 4px 8px; border: 1px solid #94a3b8; border-radius: 6px; background: #ffffff; cursor: pointer;"
        >
          恢复示例参数 (R=3.0, UINT8)
        </button>
      </div>
    </div>
  </div>

  <div
    style="margin-top: 16px; padding: 14px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px;"
  >
    <p style="margin: 4px 0;">
      <strong>步骤 1：</strong>
      S = (R_max - R_min) / (Q_max - Q_min) = ({rMax} - {rMin}) / ({qMax} - {qMin}) =
      {scale.toFixed(5)}
    </p>
    <p style="margin: 4px 0;">
      <strong>步骤 2：</strong>
      Z = round(Q_min - R_min / S) = round({qMin} - ({rMin}) / {scale.toFixed(5)}) =
      round({zeroPointRaw.toFixed(4)}) = {zeroPoint}
    </p>
    <p style="margin: 4px 0;">
      <strong>步骤 3：</strong>
      Q = round(R / S + Z) = round({rValue.toFixed(2)} / {scale.toFixed(5)} + {zeroPoint})
      = round({qFormulaValue.toFixed(4)}) = {qVal}
    </p>
    <p style="margin: 4px 0;">
      <strong>步骤 4：</strong>
      R' = S * (Q - Z) = {scale.toFixed(5)} * ({qVal} - {zeroPoint}) = {rQuantized.toFixed(4)}
    </p>
    <p style="margin: 4px 0; color: #dc2626;">
      <strong>量化误差：</strong>
      |R - R'| = |{rValue.toFixed(4)} - {rQuantized.toFixed(4)}| = {error.toFixed(4)}
    </p>
  </div>
</div>
