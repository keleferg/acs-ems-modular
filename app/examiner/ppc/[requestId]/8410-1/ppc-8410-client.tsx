"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { createClient } from "@/lib/supabase/client";

type TaskGrade = {
  task_number: number;
  task_name: string;
  grade_value: "S" | "U" | "W";
  remarks: string | null;
};

type ReviewFields = {
  date_of_check: string;
  location: string;
  name_of_airman: string;
  type_of_check: string;
  employed_by: string;
  based_at: string;
  type_aircraft_simulator_used: string;
  name_of_check_airman: string;
  block_time: string;
  remarks: string;
  check_airman_performance: string;
  region: string;
  district_office: string;
};

type Packet = {
  document_id: string;
  practical_test_id: string;
  practical_test_request_id: string;
  task_set_code: "FAA_8410_1_PILOT" | "FAA_8410_1_FLIGHT_ENGINEER";
  result: "pass" | "fail";
  approved_status: "Approved" | "Disapproved";
  review_fields: ReviewFields;
  signature_svg: string | null;
  signed_at: string | null;
  finalized_pdf_path: string | null;
  finalized_pdf_sha256: string | null;
  finalized_at: string | null;
  tasks: TaskGrade[];
};

const PILOT_Y: Record<number, number> = {
  1: 276,
  2: 294,
  3: 311,
  4: 329,

  5: 365,
  6: 382,
  7: 400,
  8: 417,
  9: 435,

  10: 470,
  11: 488,
  12: 505,
  13: 523,
  14: 540,
  15: 558,
  16: 576,

  17: 611,
  18: 628,
  19: 646,
  20: 664,

  21: 699,
  22: 717,
  23: 734,
  24: 752,
  25: 769,
  26: 787,

  27: 820,
  28: 838,
  29: 856,
  30: 873,
  31: 891,
  32: 909,
};

const FE_Y: Record<number, number> = {
  1: 258,
  2: 276,
  3: 294,
  4: 311,
  5: 329,
  6: 347,
  7: 365,
  8: 382,
  9: 400,
  10: 417,
  11: 435,
  12: 452,
  13: 470,
  14: 488,
  15: 505,
  16: 523,
  17: 540,
  18: 558,
  19: 576,
  20: 593,
  21: 611,
  22: 628,
};

function wrapText(text: string, maxChars: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function SignaturePad({
  disabled,
  onChange,
}: {
  disabled: boolean;
  onChange: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const drawingRef = useRef(false);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),

      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(event.pointerId);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const point = getPoint(event);

    drawingRef.current = true;

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || !drawingRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const point = getPoint(event);

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";

    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const end = () => {
    if (!drawingRef.current) return;

    drawingRef.current = false;

    const canvas = canvasRef.current;

    if (canvas) {
      onChange(canvas.toDataURL("image/png"));
    }
  };

  const clear = () => {
    if (disabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    ctx?.clearRect(0, 0, canvas.width, canvas.height);

    onChange("");
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={900}
        height={220}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className={`h-44 w-full touch-none rounded-lg border-2 bg-white ${
          disabled
            ? "cursor-not-allowed border-slate-200"
            : "cursor-crosshair border-slate-300"
        }`}
      />

      {!disabled ? (
        <button
          type="button"
          onClick={clear}
          className="mt-2 rounded-lg border px-3 py-2 text-sm font-semibold"
        >
          Clear Signature
        </button>
      ) : null}
    </div>
  );
}

export default function Ppc8410Client() {
  const params = useParams<{ requestId: string }>();

  const requestId = params?.requestId;

  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  const [packet, setPacket] = useState<Packet | null>(null);

  const [fields, setFields] = useState<ReviewFields | null>(null);

  const [signature, setSignature] = useState("");

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [finalPdfUrl, setFinalPdfUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const [working, setWorking] = useState(false);

  const [error, setError] = useState("");

  const [message, setMessage] = useState("");

  const loadPacket = useCallback(async () => {
    if (!requestId) return;

    setLoading(true);
    setError("");

    const { data, error: loadError } = await supabase.rpc(
      "examiner_get_ppc_8410_packet",
      {
        p_practical_test_request_id: requestId,
      },
    );

    if (loadError) {
      setError(loadError.message);
      setLoading(false);
      return;
    }

    const next = data as Packet;

    setPacket(next);
    setFields(next.review_fields);

    if (next.signature_svg) {
      setSignature(next.signature_svg);
    }

    if (next.finalized_pdf_path) {
      const { data: signed } = await supabase.storage
        .from("ppc-8410-documents")
        .createSignedUrl(next.finalized_pdf_path, 3600);

      if (signed?.signedUrl) {
        setFinalPdfUrl(signed.signedUrl);
      }
    }

    setLoading(false);
  }, [requestId, supabase]);

  useEffect(() => {
    void loadPacket();
  }, [loadPacket]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const setField = (key: keyof ReviewFields, value: string) => {
    setFields((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );
  };

  const createPdf = useCallback(async () => {
    if (!packet || !fields) {
      throw new Error("FAA Form 8410-1 packet is not loaded.");
    }

    const source = await fetch("/forms/faa-form-8410-1.pdf");

    if (!source.ok) {
      throw new Error("FAA Form 8410-1 template could not be loaded.");
    }

    const sourceBytes = await source.arrayBuffer();

    const pdf = await PDFDocument.load(sourceBytes);

    const page = pdf.getPages()[0];

    const width = page.getWidth();
    const height = page.getHeight();

    const font = await pdf.embedFont(StandardFonts.Helvetica);

    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    /*
     * Coordinate helpers.
     *
     * The source form is treated as a
     * 768 x 1024 reference canvas and
     * converted proportionally into PDF
     * page coordinates.
     */
    const X = (px: number) => (px / 768) * width;

    const Y = (pxFromTop: number) => height - (pxFromTop / 1024) * height;

    const draw = (
      value: string,
      x: number,
      y: number,
      size = 7,
      useBold = false,
    ) => {
      if (!value) return;

      page.drawText(value, {
        x: X(x),
        y: Y(y),
        size,
        font: useBold ? bold : font,
        color: rgb(0, 0, 0),
      });
    };

    /*
     * TEMPORARY FAA 8410-1 CALIBRATION GRID.
     *
     * Reference coordinates use the same
     * 768 x 1024 system as the form mapper.
     *
     * Remove after final coordinate calibration.
     */
    for (let x = 0; x <= 768; x += 50) {
      page.drawLine({
        start: { x: X(x), y: Y(0) },
        end: { x: X(x), y: Y(1024) },
        thickness: x % 100 === 0 ? 0.45 : 0.2,
        color: rgb(0.75, 0.75, 0.75),
        opacity: 0.55,
      });

      if (x > 0 && x < 768) {
        page.drawText(String(x), {
          x: X(x) + 1,
          y: Y(12),
          size: 5,
          font: bold,
          color: rgb(0.15, 0.15, 0.15),
        });
      }
    }

    for (let y = 0; y <= 1024; y += 25) {
      page.drawLine({
        start: { x: X(0), y: Y(y) },
        end: { x: X(768), y: Y(y) },
        thickness: y % 100 === 0 ? 0.45 : 0.18,
        color: rgb(0.75, 0.75, 0.75),
        opacity: 0.5,
      });

      if (y > 0 && y < 1024 && y % 50 === 0) {
        page.drawText(String(y), {
          x: X(3),
          y: Y(y) + 2,
          size: 5,
          font: bold,
          color: rgb(0.15, 0.15, 0.15),
        });
      }
    }

    /*
     * Current field anchors.
     */
    const calibrationAnchors: Array<[string, number, number]> = [
      ["DATE", 491, 39],
      ["LOCATION", 491, 72],
      ["AIRMAN", 24, 105],
      ["CHECK", 491, 105],
      ["EMPLOYED", 24, 140],
      ["BASED", 257, 140],
      ["AIRCRAFT", 491, 140],
      ["EXAMINER", 24, 173],
      ["BLOCK", 491, 173],
      ["REMARKS", 410, 666],
      ["APPROVED", 214, 930],
      ["DISAPPROVED", 214, 947],
      ["REGION", 24, 967],
      ["DISTRICT", 208, 967],
      ["SIGNATURE", 391, 992],
    ];

    for (const [label, x, y] of calibrationAnchors) {
      page.drawCircle({
        x: X(x),
        y: Y(y),
        size: 2.5,
        borderWidth: 0.8,
        borderColor: rgb(0, 0, 0),
      });

      page.drawText(label, {
        x: X(x) + 4,
        y: Y(y) + 2,
        size: 4.5,
        font: bold,
        color: rgb(0, 0, 0),
      });
    }

    /*
     * Header fields.
     */
    draw(fields.date_of_check, 491, 39, 7);

    draw(fields.location, 491, 72, 7);

    draw(fields.name_of_airman, 24, 105, 7);

    draw(fields.type_of_check, 491, 105, 6.6);

    draw(fields.employed_by, 24, 140, 7);

    draw(fields.based_at, 257, 140, 7);

    draw(fields.type_aircraft_simulator_used, 491, 140, 6.5);

    draw(fields.name_of_check_airman, 24, 173, 7);

    draw(fields.block_time, 491, 173, 7);

    /*
     * Grades.
     *
     * S and U are marked with X.
     * W is printed centered across the
     * grade pair because the source form
     * identifies W as a permitted grade
     * but provides only S/U columns.
     */
    for (const task of packet.tasks) {
      const isPilot = packet.task_set_code === "FAA_8410_1_PILOT";

      const yPx = isPilot ? PILOT_Y[task.task_number] : FE_Y[task.task_number];

      if (!yPx) continue;

      const sX = isPilot ? 352 : 714;

      const uX = isPilot ? 386 : 739;

      const wX = isPilot ? 369 : 726;

      if (task.grade_value === "S") {
        draw("X", sX, yPx + 3, 8, true);
      }

      if (task.grade_value === "U") {
        draw("X", uX, yPx + 3, 8, true);
      }

      if (task.grade_value === "W") {
        draw("W", wX, yPx + 3, 7, true);
      }
    }

    /*
     * Remarks.
     */
    const taskRemarks = packet.tasks
      .filter((task) => task.remarks?.trim())
      .map((task) => `${task.task_number}. ${task.remarks}`)
      .join("  ");

    const combinedRemarks = [fields.remarks, taskRemarks]
      .filter(Boolean)
      .join("  ");

    const remarkLines = wrapText(combinedRemarks, 55).slice(0, 17);

    remarkLines.forEach((line, index) => {
      draw(line, 410, 666 + index * 13, 6.1);
    });

    /*
     * Result of Check.
     */
    if (packet.approved_status === "Approved") {
      draw("X", 214, 930, 8, true);
    } else {
      draw("X", 214, 947, 8, true);
    }

    /*
     * Check Airman's Performance.
     */
    if (fields.check_airman_performance.toLowerCase() === "unsatisfactory") {
      draw("X", 591, 947, 8, true);
    } else {
      draw("X", 591, 930, 8, true);
    }

    draw(fields.region, 24, 967, 6.5);

    draw(fields.district_office, 208, 967, 6.5);

    /*
     * Examiner signature.
     */
    if (signature) {
      const signatureBytes = await fetch(signature).then((response) =>
        response.arrayBuffer(),
      );

      const embedded = await pdf.embedPng(signatureBytes);

      const maxWidth = X(345);
      const maxHeight = (50 / 1024) * height;

      const scale = Math.min(
        maxWidth / embedded.width,
        maxHeight / embedded.height,
      );

      page.drawImage(embedded, {
        x: X(391),
        y: Y(992),
        width: embedded.width * scale,
        height: embedded.height * scale,
      });
    }

    return pdf.save();
  }, [fields, packet, signature]);

  const preview = async () => {
    try {
      setWorking(true);
      setError("");
      setMessage("");

      const bytes = await createPdf();

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      const blob = new Blob([bytes as BlobPart], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(blob);

      setPreviewUrl(url);

      setMessage("8410-1 preview generated.");
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : String(previewError),
      );
    } finally {
      setWorking(false);
    }
  };

  const finalize = async () => {
    if (!packet || !fields || !requestId) {
      return;
    }

    if (!signature) {
      setError("Examiner signature is required.");
      return;
    }

    if (
      !window.confirm(
        "Finalize FAA Form 8410-1? Once finalized, the signed form will be immutable.",
      )
    ) {
      return;
    }

    try {
      setWorking(true);
      setError("");
      setMessage("");

      const bytes = await createPdf();

      const digest = await crypto.subtle.digest(
        "SHA-256",
        bytes as BufferSource,
      );

      const hash = Array.from(new Uint8Array(digest))
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("");

      const filename =
        `${packet.practical_test_id}/` +
        `FAA-8410-1-${requestId}-${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("ppc-8410-documents")
        .upload(
          filename,
          new Blob([bytes as BlobPart], {
            type: "application/pdf",
          }),
          {
            contentType: "application/pdf",
            upsert: false,
          },
        );

      if (uploadError) {
        throw uploadError;
      }

      const { error: finalizeError } = await supabase.rpc(
        "examiner_finalize_ppc_8410",
        {
          p_practical_test_request_id: requestId,
          p_review_fields: fields,
          p_signature_svg: signature,
          p_finalized_pdf_path: filename,
          p_finalized_pdf_sha256: hash,
        },
      );

      if (finalizeError) {
        /*
         * Avoid leaving an orphan PDF if
         * database finalization fails.
         */
        await supabase.storage.from("ppc-8410-documents").remove([filename]);

        throw finalizeError;
      }

      const { data: signed } = await supabase.storage
        .from("ppc-8410-documents")
        .createSignedUrl(filename, 3600);

      if (signed?.signedUrl) {
        setFinalPdfUrl(signed.signedUrl);
      }

      setMessage("FAA Form 8410-1 finalized and archived.");

      await loadPacket();
    } catch (finalizeError) {
      setError(
        finalizeError instanceof Error
          ? finalizeError.message
          : String(finalizeError),
      );
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl p-6">Loading FAA Form 8410-1…</main>
    );
  }

  if (error && !packet) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <div className="rounded-xl border border-red-300 bg-red-50 p-5 text-red-900">
          {error}
        </div>
      </main>
    );
  }

  if (!packet || !fields) {
    return null;
  }

  const immutable = Boolean(packet.finalized_at);

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push(`/examiner/ppc/${requestId}`)}
            className="mb-2 text-sm font-semibold text-blue-700 hover:underline"
          >
            ← Back to PPC Evaluation
          </button>

          <h1 className="text-2xl font-bold text-slate-950">FAA Form 8410-1</h1>

          <p className="mt-1 text-sm text-slate-600">
            Review, sign, finalize, print, or save the completed proficiency
            check.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {packet.task_set_code === "FAA_8410_1_PILOT" ? (
            <span className="rounded-full border bg-white px-3 py-1 text-xs font-bold">
              Pilot Tasks
            </span>
          ) : (
            <span className="rounded-full border bg-white px-3 py-1 text-xs font-bold">
              Flight Engineer Tasks
            </span>
          )}

          <span className="rounded-full border bg-white px-3 py-1 text-xs font-bold">
            {packet.approved_status}
          </span>

          {immutable ? (
            <span className="rounded-full border border-green-300 bg-green-50 px-3 py-1 text-xs font-bold text-green-800">
              Finalized / Immutable
            </span>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mb-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mb-5 rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
        <div className="space-y-6">
          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold">Form Information</h2>

            <div className="grid gap-4">
              {[
                ["date_of_check", "Date of Check"],
                ["location", "Location"],
                ["name_of_airman", "Name of Airman"],
                ["type_of_check", "Type of Check"],
                ["employed_by", "Employed By"],
                ["based_at", "Based At"],
                [
                  "type_aircraft_simulator_used",
                  "Type Aircraft / Simulator Used",
                ],
                ["name_of_check_airman", "Name of Check Airman"],
                ["block_time", "Block Time"],
                ["region", "Region"],
                ["district_office", "District Office"],
              ].map(([key, label]) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                    {label}
                  </span>

                  <input
                    value={fields[key as keyof ReviewFields]}
                    disabled={immutable}
                    onChange={(event) =>
                      setField(key as keyof ReviewFields, event.target.value)
                    }
                    className={inputClass}
                  />
                </label>
              ))}

              <label>
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                  Remarks
                </span>

                <textarea
                  value={fields.remarks}
                  disabled={immutable}
                  onChange={(event) => setField("remarks", event.target.value)}
                  rows={5}
                  className={inputClass}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-lg font-bold">Examiner Signature</h2>

            <p className="mb-4 text-sm text-slate-600">
              Sign with your finger, mouse, trackpad, or Apple Pencil.
            </p>

            {immutable && packet.signature_svg ? (
              <div className="rounded-lg border bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={packet.signature_svg}
                  alt="Examiner signature"
                  className="h-32 w-full object-contain"
                />
              </div>
            ) : (
              <SignaturePad disabled={immutable} onChange={setSignature} />
            )}
          </section>

          {!immutable ? (
            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <button
                type="button"
                disabled={working}
                onClick={() => void preview()}
                className="w-full rounded-lg border border-blue-700 px-4 py-3 font-bold text-blue-700 disabled:opacity-50"
              >
                Generate 8410-1 Preview
              </button>

              <button
                type="button"
                disabled={working || !signature}
                onClick={() => void finalize()}
                className="mt-3 w-full rounded-lg bg-blue-700 px-4 py-3 font-bold text-white disabled:opacity-50"
              >
                Sign & Finalize 8410-1
              </button>

              <p className="mt-3 text-xs text-slate-500">
                Finalizing stores the signed PDF, SHA-256 fingerprint, signer
                identity, and signed timestamp. The finalized document cannot be
                altered.
              </p>
            </section>
          ) : null}

          {finalPdfUrl ? (
            <section className="rounded-xl border border-green-300 bg-green-50 p-5">
              <h2 className="font-bold text-green-950">Final Signed 8410-1</h2>

              <div className="mt-3 grid gap-2">
                <a
                  href={finalPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-green-700 px-4 py-3 text-center font-bold text-white"
                >
                  Open / Print PDF
                </a>

                <a
                  href={finalPdfUrl}
                  download
                  className="rounded-lg border border-green-700 px-4 py-3 text-center font-bold text-green-800"
                >
                  Save PDF
                </a>
              </div>
            </section>
          ) : null}
        </div>

        <section className="min-h-[900px] overflow-hidden rounded-xl border bg-slate-100 shadow-sm">
          {previewUrl ? (
            <iframe
              title="FAA Form 8410-1 Preview"
              src={previewUrl}
              className="h-[1050px] w-full"
            />
          ) : finalPdfUrl ? (
            <iframe
              title="Final FAA Form 8410-1"
              src={finalPdfUrl}
              className="h-[1050px] w-full"
            />
          ) : (
            <div className="flex h-[900px] items-center justify-center p-8 text-center text-slate-500">
              Review the fields, add the examiner signature, then choose
              Generate 8410-1 Preview.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
