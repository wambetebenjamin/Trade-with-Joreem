const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sendJson(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

module.exports = async function contactHandler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  // Browser submissions must be same-origin. Do not accept origin-less requests.
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) return sendJson(res, 403, { error: "Request rejected." });
  try {
    const parsedOrigin = new URL(origin);
    if (parsedOrigin.protocol !== "https:" || parsedOrigin.host !== host) {
      return sendJson(res, 403, { error: "Request rejected." });
    }
  } catch (_) {
    return sendJson(res, 403, { error: "Request rejected." });
  }

  const contentType = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") return sendJson(res, 415, { error: "Unsupported content type." });
  const contentLength = Number(req.headers["content-length"] || 0);
  if (contentLength > 8192) return sendJson(res, 413, { error: "Request is too large." });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (_) { return sendJson(res, 400, { error: "Invalid request." }); }
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return sendJson(res, 400, { error: "Invalid request." });
  }

  // Honeypot: quietly accept automated spam without sending email.
  if (typeof body.company === "string" && body.company.trim()) return sendJson(res, 200, { ok: true });

  const textField = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";
  const name = textField(body.name, 100);
  const email = textField(body.email, 254);
  const topic = textField(body.topic, 120).replace(/[\r\n\x00-\x1f\x7f]/g, " ") || "General question";
  const phone = textField(body.phone, 40);
  const message = textField(body.message, 3000);

  if (name.length < 2 || !EMAIL_RE.test(email) || message.length < 10 || /[\r\n]/.test(email)) {
    return sendJson(res, 400, { error: "Please check your name, email address, and message." });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !to || !from) {
    return sendJson(res, 503, { error: "Contact delivery is not configured yet. Please email hello@tradewithjoreem.com." });
  }

  const text = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone/WhatsApp: ${phone || "Not provided"}`,
    `Topic: ${topic}`,
    "",
    "Message:",
    message
  ].join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `Website contact: ${topic}`,
        text
      })
    });
    if (!response.ok) return sendJson(res, 502, { error: "We could not send your message just now. Please try again or email us directly." });
    return sendJson(res, 200, { ok: true });
  } catch (_) {
    return sendJson(res, 502, { error: "We could not send your message just now. Please try again or email us directly." });
  }
};
