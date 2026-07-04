const VERSION = 'v22.0';
const BASE = `https://graph.instagram.com/${VERSION}`;

async function igPost(path, body, useBearer = false) {
  const token = process.env.IG_ACCESS_TOKEN;
  const url = useBearer
    ? `${BASE}${path}`
    : `${BASE}${path}?access_token=${token}`;

  const headers = { 'Content-Type': 'application/json' };
  if (useBearer) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`IG API ${res.status} on ${path}: ${text}`);
  }

  return res.json();
}

export function postPublicReply(commentId, message) {
  return igPost(`/${commentId}/replies`, { message });
}

export function sendPrivateOpener(commentId, text, keywordId) {
  return igPost(
    `/${process.env.IG_ACCOUNT_ID}/messages`,
    {
      recipient: { comment_id: commentId },
      message: {
        text,
        quick_replies: [
          {
            content_type: 'text',
            title: 'Send me the link',
            payload: `GET_LINK:${keywordId}`,
          },
        ],
      },
    },
    true
  );
}

export function sendLinkMessage(recipientId, closingText, linkUrl, buttonLabel) {
  return igPost(
    `/${process.env.IG_ACCOUNT_ID}/messages`,
    {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: closingText,
            buttons: [
              {
                type: 'web_url',
                url: linkUrl,
                title: buttonLabel,
              },
            ],
          },
        },
      },
    },
    true
  );
}
