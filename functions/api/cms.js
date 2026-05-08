/**
 * Cloudflare Pages Function — CMS API 代理
 * 使用 GITHUB_PAT 操作 GitHub 倉庫
 * CMS_PASSWORD 用於密碼驗證
 */

const GH_HEADERS = (pat) => ({
  Authorization: `token ${pat}`,
  'User-Agent': 'BEAUSKIN-CMS/1.0',
  'Accept': 'application/vnd.github.v3+json',
});

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || '';
  const pat = env.GITHUB_PAT;
  const cmsPassword = env.CMS_PASSWORD || 'beauskin2024';

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (action === 'login') {
      const { password } = await request.json();
      if (password === cmsPassword) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      return new Response(JSON.stringify({ error: '密碼錯誤' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (action === 'list') {
      const { type } = await request.json();
      const folder = type === 'blog' ? 'src/content/blog' : 'src/content/products';

      const res = await fetch(
        `https://api.github.com/repos/zaftboy/beauskin-astro/contents/${folder}`,
        { headers: GH_HEADERS(pat) }
      );

      if (!res.ok) {
        return new Response(JSON.stringify({ error: '讀取失敗', items: [] }), {
          status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const files = await res.json();
      const items = (await Promise.all(
        (files || []).filter(f => f.name.endsWith('.md')).map(async f => {
          const cr = await fetch(f.url, { headers: GH_HEADERS(pat) });
          const cd = await cr.json();
          const raw = base64Decode(cd.content || '');
          const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
          const fm = match ? parseFm(match[1]) : {};
          return {
            name: f.name,
            slug: f.name.replace(/\.md$/, ''),
            sha: cd.sha,
            title: fm.title || fm.name || f.name,
            date: fm.date || '',
            excerpt: fm.excerpt || fm.shortDesc || '',
            category: fm.category || '',
            draft: fm.draft === 'true' || fm.draft === true,
            rawFrontmatter: match ? match[1] : '',
            body: match ? match[2] : raw,
          };
        })
      )).filter(Boolean);

      return new Response(JSON.stringify({ items }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (action === 'save') {
      const { type, slug, frontmatter, body, sha } = await request.json();
      const folder = type === 'blog' ? 'src/content/blog' : 'src/content/products';
      const filePath = `${folder}/${slug}.md`;
      const content = `---\n${frontmatter}\n---\n${body}`;
      const bodyData = {
        message: `CMS: 更新 ${filePath}`,
        content: btoa(unescape(encodeURIComponent(content))),
        branch: 'main',
      };
      if (sha) bodyData.sha = sha;

      const res = await fetch(
        `https://api.github.com/repos/zaftboy/beauskin-astro/contents/${filePath}`,
        { method: 'PUT', headers: { ...GH_HEADERS(pat), 'Content-Type': 'application/json' }, body: JSON.stringify(bodyData) }
      );
      const result = await res.json();
      if (!res.ok) {
        return new Response(JSON.stringify({ error: result.message || '儲存失敗' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      return new Response(JSON.stringify({ success: true, sha: result.content?.sha }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (action === 'delete') {
      const { type, slug, sha } = await request.json();
      const folder = type === 'blog' ? 'src/content/blog' : 'src/content/products';
      const filePath = `${folder}/${slug}.md`;
      await fetch(
        `https://api.github.com/repos/zaftboy/beauskin-astro/contents/${filePath}`,
        {
          method: 'DELETE',
          headers: { ...GH_HEADERS(pat), 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: `CMS: 刪除 ${filePath}`, sha, branch: 'main' }),
        }
      );
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // --- 圖片上傳 ---
    if (action === 'upload') {
      const formData = await request.formData();
      const file = formData.get('file');
      if (!file) {
        return new Response(JSON.stringify({ error: '未提供檔案' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // 讀取檔案內容
      const ext = file.name.match(/\.(\w+)$/)?.[1] || 'png';
      const fileName = `${Date.now()}.${ext}`;
      const filePath = `public/images/${fileName}`;
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      uint8Array.forEach(byte => binary += String.fromCharCode(byte));
      const base64 = btoa(binary);

      const bodyData = {
        message: `CMS: 上傳圖片 ${fileName}`,
        content: base64,
        branch: 'main',
      };

      // 檢查文件是否存在
      const checkRes = await fetch(
        `https://api.github.com/repos/zaftboy/beauskin-astro/contents/${filePath}`,
        { headers: GH_HEADERS(pat) }
      );
      if (checkRes.ok) {
        const existing = await checkRes.json();
        bodyData.sha = existing.sha;
      }

      const res = await fetch(
        `https://api.github.com/repos/zaftboy/beauskin-astro/contents/${filePath}`,
        { method: 'PUT', headers: { ...GH_HEADERS(pat), 'Content-Type': 'application/json' }, body: JSON.stringify(bodyData) }
      );
      const result = await res.json();
      if (!res.ok) {
        return new Response(JSON.stringify({ error: result.message || '上傳失敗' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const imageUrl = `https://raw.githubusercontent.com/zaftboy/beauskin-astro/main/public/images/${fileName}`;
      return new Response(JSON.stringify({ success: true, url: imageUrl }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // --- 友情連結列表 ---
    if (action === 'links_list') {
      const ghRes = await ghGetFile(pat, 'src/data/links.json');
      if (ghRes.error) return new Response(JSON.stringify({ items: [] }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
      const links = JSON.parse(ghRes.content);
      return new Response(JSON.stringify({ items: links, sha: ghRes.sha }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // --- 友情連結儲存 ---
    if (action === 'links_save') {
      const { links, sha } = await request.json();
      const content = JSON.stringify(links, null, 2) + '\n';
      const bodyData = {
        message: 'CMS: 更新友情連結',
        content: btoa(unescape(encodeURIComponent(content))),
        branch: 'main',
      };
      if (sha) bodyData.sha = sha;

      const res = await fetch(
        'https://api.github.com/repos/zaftboy/beauskin-astro/contents/src/data/links.json',
        { method: 'PUT', headers: { ...GH_HEADERS(pat), 'Content-Type': 'application/json' }, body: JSON.stringify(bodyData) }
      );
      const result = await res.json();
      if (!res.ok) {
        return new Response(JSON.stringify({ error: result.message || '儲存失敗' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // --- 作者列表 ---
    if (action === 'authors_list') {
      const ghRes = await ghGetFile(pat, 'src/data/authors.json');
      if (ghRes.error) return new Response(JSON.stringify({ items: defaultAuthors }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
      const authors = JSON.parse(ghRes.content);
      return new Response(JSON.stringify({ items: authors, sha: ghRes.sha }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // --- 作者儲存 ---
    if (action === 'authors_save') {
      const { authors, sha } = await request.json();
      const content = JSON.stringify(authors, null, 2) + '\n';
      const bodyData = {
        message: 'CMS: 更新作者資料',
        content: btoa(unescape(encodeURIComponent(content))),
        branch: 'main',
      };
      if (sha) bodyData.sha = sha;

      const res = await fetch(
        'https://api.github.com/repos/zaftboy/beauskin-astro/contents/src/data/authors.json',
        { method: 'PUT', headers: { ...GH_HEADERS(pat), 'Content-Type': 'application/json' }, body: JSON.stringify(bodyData) }
      );
      const result = await res.json();
      if (!res.ok) {
        return new Response(JSON.stringify({ error: result.message || '儲存失敗' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

function base64Decode(str) {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch {
    return atob(str);
  }
}

function parseFm(yaml) {
  const r = {};
  yaml.split('\n').forEach(line => {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) {
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      r[m[1]] = v;
    }
  });
  return r;
}

const defaultAuthors = [
  { id: 'beauskin-editorial', name: 'BEAUSKIN 編輯部', avatar: '/images/author-default.png', bio: '綻顏 BEAUSKIN 編輯團隊，致力於分享專業護膚知識。', role: '編輯團隊' },
];

async function ghGetFile(pat, path) {
  const res = await fetch(`https://api.github.com/repos/zaftboy/beauskin-astro/contents/${path}`, { headers: GH_HEADERS(pat) });
  if (!res.ok) return { error: true };
  const data = await res.json();
  return { content: base64Decode(data.content || ''), sha: data.sha };
}
