export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const data = await request.json();
      const { name, email, phone, type, message } = data;

      // Validate required fields
      if (!name || !email || !message) {
        return new Response(JSON.stringify({ error: '請填寫必填欄位' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // In production, forward to email via Cloudflare Email Workers
      // For now, log and return success
      console.log('Contact form submission:', { name, email, phone, type, message });

      return new Response(JSON.stringify({ success: true, message: '感謝您的查詢！我們會盡快回覆。' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: '提交失敗，請稍後再試。' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
