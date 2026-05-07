/**
 * Cloudflare Pages Function — 聯繫表單處理
 * 路由: POST /api/contact
 *
 * 使用 Cloudflare Email Routing + send_email binding。
 *
 * Cloudflare 配置:
 * 1. Email → Email Routing → 開啟 beautydiaro.com
 * 2. 創建 info@beautydiaro.com → 轉發到你的真實郵箱
 * 3. Workers & Pages → beauskin-astro → Settings → Functions → Bindings
 *    新增 binding: 類型 Send Email, 名稱 SEND_EMAIL, 郵箱 info@beautydiaro.com
 */

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    let data;
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await request.json();
    } else {
      const formData = await request.formData();
      data = Object.fromEntries(formData);
    }
    const { name, email, phone, type, message } = data;

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: '請填寫必填欄位（姓名、電郵、訊息）' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: '請輸入有效的電郵地址' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 構建郵件 HTML
    const htmlContent = `
      <div style="font-family: 'Noto Sans TC', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #8B6F5E; padding: 20px; text-align: center;">
          <h2 style="color: #fff; margin: 0;">綻顏 BEAUSKIN</h2>
          <p style="color: #E5C9B5; margin: 5px 0 0;">新查詢通知</p>
        </div>
        <div style="padding: 20px; background: #FDF8F3;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; color: #6B5445; font-weight: bold; width: 80px;">姓名</td>
                <td style="padding: 8px; color: #4A3A30;">${escapeHtml(name)}</td></tr>
            <tr><td style="padding: 8px; color: #6B5445; font-weight: bold;">電郵</td>
                <td style="padding: 8px; color: #4A3A30;">${escapeHtml(email)}</td></tr>
            <tr><td style="padding: 8px; color: #6B5445; font-weight: bold;">電話</td>
                <td style="padding: 8px; color: #4A3A30;">${escapeHtml(phone || '未提供')}</td></tr>
            <tr><td style="padding: 8px; color: #6B5445; font-weight: bold;">類型</td>
                <td style="padding: 8px; color: #4A3A30;">${escapeHtml(type || '一般查詢')}</td></tr>
          </table>
          <div style="margin-top: 20px; padding: 15px; background: #fff; border-radius: 8px;">
            <p style="color: #6B5445; font-weight: bold; margin: 0 0 10px;">訊息內容：</p>
            <p style="color: #4A3A30; white-space: pre-wrap; margin: 0;">${escapeHtml(message)}</p>
          </div>
        </div>
        <div style="background: #4A3A30; padding: 10px; text-align: center;">
          <p style="color: #D4A882; font-size: 12px; margin: 0;">此郵件由 BEAUSKIN 網站聯繫表單自動發送</p>
        </div>
      </div>
    `;

    // 通過 send_email binding 發送
    let emailSent = false;
    if (env.SEND_EMAIL) {
      try {
        await env.SEND_EMAIL.send({
          from: { name: 'BEAUSKIN 綻顏', email: 'info@beautydiaro.com' },
          to: [{ email: 'info@beautydiaro.com' }],
          subject: `新查詢: ${escapeHtml(type || '一般')} - ${escapeHtml(name)}`,
          html: htmlContent,
        });
        emailSent = true;
      } catch (sendErr) {
        console.error('Send email failed:', sendErr);
      }
    } else {
      console.log('SEND_EMAIL binding 尚未配置。表單數據:', { name, email, phone, type, message });
    }

    return new Response(JSON.stringify({
      success: true,
      sent: emailSent,
      message: '感謝您的查詢！我們會盡快回覆。',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: '提交失敗，請稍後再試。' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
