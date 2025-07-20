import { sha256 } from '../js/sha256.js';

export async function onRequest(context) {
  const { request, env, next } = context;

  // Basic Auth 认证
  const authHeader = request.headers.get('authorization');
  const authPassword = env.AUTHPASSWORD || "";
  console.log('Basic Auth 调试:');
  console.log('Authorization Header:', authHeader);
  console.log('AUTHPASSWORD:', authPassword);

  if (authPassword) {
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      console.log('未检测到 Basic Auth 或格式不正确，返回 401');
      return new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="LibreTV"'
        }
      });
    }
    const base64Credentials = authHeader.replace('Basic ', '');
    let credentials;
    try {
      credentials = atob(base64Credentials);
    } catch (e) {
      console.log('Base64 解码失败:', e);
      return new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="LibreTV"'
        }
      });
    }
    const [username, password] = credentials.split(':');
    console.log('用户名:', username, '密码:', password);
    if (username !== 'admin' || password !== authPassword) {
      console.log('用户名或密码错误，返回 401');
      return new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="LibreTV"'
        }
      });
    }
    console.log('Basic Auth 认证通过');
  }

  const response = await next();
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("text/html")) {
    let html = await response.text();

    // 处理普通密码
    const password = env.PASSWORD || "";
    let passwordHash = "";
    if (password) {
      passwordHash = await sha256(password);
    }
    html = html.replace('window.__ENV__.PASSWORD = "{{PASSWORD}}";',
      `window.__ENV__.PASSWORD = "${passwordHash}";`);

    // 处理管理员密码 - 确保这部分代码被执行
    const adminPassword = env.ADMINPASSWORD || "";
    let adminPasswordHash = "";
    if (adminPassword) {
      adminPasswordHash = await sha256(adminPassword);
    }
    html = html.replace('window.__ENV__.ADMINPASSWORD = "{{ADMINPASSWORD}}";',
      `window.__ENV__.ADMINPASSWORD = "${adminPasswordHash}";`);

    return new Response(html, {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
    });
  }

  return response;
}
