import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function page(title: string, body: string, status = 200) {
  return new Response(
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta
    name="viewport"
    content="width=device-width,initial-scale=1"
  >
  <title>${escapeHtml(title)}</title>
</head>

<body style="
  margin:0;
  background:#f8fafc;
  font-family:Arial,Helvetica,sans-serif;
  color:#0f172a;
">
  <main style="
    max-width:640px;
    margin:48px auto;
    padding:0 18px;
  ">
    <section style="
      overflow:hidden;
      background:white;
      border:1px solid #e2e8f0;
      border-radius:16px;
    ">
      <header style="
        background:#0f172a;
        color:white;
        padding:24px 28px;
      ">
        <div style="
          color:#fbbf24;
          font-size:12px;
          font-weight:700;
          letter-spacing:1.5px;
          text-transform:uppercase;
        ">
          Aviation Training Solutions
        </div>

        <h1 style="
          margin:7px 0 0;
          font-size:24px;
        ">
          ${escapeHtml(title)}
        </h1>
      </header>

      <div style="padding:28px;">
        ${body}
      </div>
    </section>
  </main>
</body>
</html>`,
    {
      status,
      headers: {
        "content-type": "text/html; charset=utf-8",

        "cache-control": "no-store, max-age=0",
      },
    },
  );
}

export default async (request: Request) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return page(
      "Request Follow-Up",
      `<p>Request follow-up is temporarily unavailable.</p>`,
      503,
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const url = new URL(request.url);

  let token = "";
  let action = "";

  if (request.method === "POST") {
    const formData = await request.formData();

    token = String(formData.get("token") ?? "");

    action = String(formData.get("action") ?? "");
  } else {
    token = url.searchParams.get("token") ?? "";

    action = url.searchParams.get("action") ?? "";
  }

  if (!token || !["remain_active", "cancel_request"].includes(action)) {
    return page(
      "Invalid Request",
      `<p>This follow-up link is invalid.</p>`,
      400,
    );
  }

  const tokenHash = hashToken(token);

  if (request.method === "GET") {
    const { data: followup, error: followupError } = await supabase
      .from("practical_test_request_followups")
      .select(
        `
        id,
        practical_test_request_id,
        token_expires_at,
        responded_at
      `,
      )
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (followupError || !followup) {
      return page(
        "Invalid Request",
        `<p>This follow-up link is invalid.</p>`,
        404,
      );
    }

    if (followup.responded_at) {
      return page(
        "Response Already Received",
        `<p>
          This follow-up has already been answered.
          No further action is required.
        </p>`,
      );
    }

    if (new Date(followup.token_expires_at).getTime() < Date.now()) {
      return page(
        "Link Expired",
        `<p>
          This follow-up link has expired.
          Please sign in to the Applicant Portal to
          review your request.
        </p>`,
        410,
      );
    }

    const { data: practicalRequest, error: requestError } = await supabase
      .from("practical_test_requests")
      .select(
        `
        request_number,
        certificate_sought,
        rating_sought,
        status
      `,
      )
      .eq("id", followup.practical_test_request_id)
      .maybeSingle();

    if (requestError || !practicalRequest) {
      return page(
        "Request Not Found",
        `<p>
          The practical test request could not be found.
        </p>`,
        404,
      );
    }

    if (
      !["submitted", "under_review", "accepted"].includes(
        practicalRequest.status,
      )
    ) {
      return page(
        "Request Already Updated",
        `<p>
          ${escapeHtml(practicalRequest.request_number)}
          is no longer awaiting an appointment.
          No response is required.
        </p>`,
      );
    }

    const isRemain = action === "remain_active";

    const actionLabel = isRemain ? "Remain Active" : "Cancel Request";

    const description = isRemain
      ? `Your request will remain active and the
           15-day follow-up clock will restart today.`
      : `Your request will be changed to
           Cancelled by Applicant.`;

    const buttonStyle = isRemain
      ? `
          background:#d97706;
          color:white;
          border:1px solid #d97706;
        `
      : `
          background:#ffffff;
          color:#b91c1c;
          border:1px solid #fecaca;
        `;

    return page(
      "Confirm Request Response",
      `
        <p style="
          margin:0 0 18px;
          line-height:1.7;
          color:#334155;
        ">
          Please confirm your selection for:
        </p>

        <div style="
          padding:16px;
          border:1px solid #e2e8f0;
          background:#f8fafc;
          border-radius:10px;
        ">
          <strong>
            ${escapeHtml(practicalRequest.request_number)}
          </strong><br>
          ${escapeHtml(practicalRequest.certificate_sought)}
          —
          ${escapeHtml(practicalRequest.rating_sought)}
        </div>

        <p style="
          margin:20px 0;
          line-height:1.7;
          color:#334155;
        ">
          ${description}
        </p>

        <form method="post">
          <input
            type="hidden"
            name="token"
            value="${escapeHtml(token)}"
          >

          <input
            type="hidden"
            name="action"
            value="${escapeHtml(action)}"
          >

          <button
            type="submit"
            style="
              cursor:pointer;
              padding:12px 18px;
              border-radius:8px;
              font-size:14px;
              font-weight:700;
              ${buttonStyle}
            "
          >
            Confirm ${escapeHtml(actionLabel)}
          </button>
        </form>

        <p style="
          margin:22px 0 0;
          font-size:13px;
          line-height:1.6;
          color:#64748b;
        ">
          No EMS login is required.
        </p>
      `,
    );
  }

  const { data, error } = await supabase.rpc(
    "service_respond_to_practical_test_followup",
    {
      p_token_hash: tokenHash,

      p_action: action,
    },
  );

  if (error) {
    return page(
      "Unable to Update Request",
      `<p>${escapeHtml(error.message)}</p>`,
      409,
    );
  }

  const result = Array.isArray(data) ? data[0] : data;

  if (action === "remain_active") {
    return page(
      "Request Remains Active",
      `
        <p style="line-height:1.7;color:#334155;">
          Thank you. Request
          <strong>
            ${escapeHtml(result?.request_number ?? "")}
          </strong>
          will remain active.
        </p>

        <p style="line-height:1.7;color:#334155;">
          We will continue working to find an
          appointment, and the 15-day follow-up clock
          has been restarted.
        </p>
      `,
    );
  }

  return page(
    "Request Cancelled",
    `
      <p style="line-height:1.7;color:#334155;">
        Request
        <strong>
          ${escapeHtml(result?.request_number ?? "")}
        </strong>
        has been cancelled.
      </p>

      <p style="line-height:1.7;color:#334155;">
        Its status is now
        <strong>Cancelled by Applicant</strong>.
      </p>
    `,
  );
};

export const config = {
  path: "/request-follow-up",
};
