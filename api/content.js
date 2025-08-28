export default async function handler(req, res) {
  // 设置CORS头部
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只允许GET请求', success: false });
  }

  try {
    // 并行获取图片和文本内容
    const [images, texts] = await Promise.all([
      getImagesFromGitHub(),
      getTextsFromGitHub()
    ]);
    
    res.status(200).json({
      success: true,
      images: images,
      texts: texts,
      imageCount: images.length,
      textCount: texts.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('获取内容错误:', error);
    res.status(500).json({
      success: false,
      error: '获取内容失败: ' + error.message
    });
  }
}

// 从GitHub获取图片
async function getImagesFromGitHub() {
  try {
    const GITHUB_OWNER = '6677nnannad';
    const GITHUB_REPO = 'HHL';
    const GITHUB_PATH = 'img';
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'HHL-Content-Server'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API错误: ${response.status}`);
    }

    const files = await response.json();

    // 过滤出图片文件
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const images = Array.isArray(files) ? files
      .filter(file => file.type === 'file' && 
        imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext)))
      .map(file => ({
        name: file.name,
        url: `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${GITHUB_PATH}/${file.name}`,
        size: file.size,
        uploadTime: file.name.split('.')[0],
        type: 'image',
        githubUrl: file.html_url
      }))
      .sort((a, b) => b.uploadTime - a.uploadTime) : [];

    return images;

  } catch (error) {
    console.error('获取图片失败:', error);
    return [];
  }
}

// 从GitHub获取文本
async function getTextsFromGitHub() {
  try {
    const GITHUB_OWNER = '6677nnannad';
    const GITHUB_REPO = 'HHL';
    const GITHUB_PATH = 'Wenan';
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'HHL-Content-Server'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API错误: ${response.status}`);
    }

    const files = await response.json();

    // 过滤出文本文件并获取内容
    const texts = Array.isArray(files) ? await Promise.all(
      files
        .filter(file => file.type === 'file' && file.name.toLowerCase().endsWith('.txt'))
        .map(async file => {
          try {
            // 获取文本文件内容
            const contentResponse = await fetch(file.download_url);
            const content = await contentResponse.text();
            
            return {
              name: file.name,
              content: content,
              size: file.size,
              uploadTime: file.name.split('.')[0],
              type: 'text',
              githubUrl: file.html_url,
              downloadUrl: file.download_url
            };
          } catch (error) {
            console.error(`获取文本内容失败 ${file.name}:`, error);
            return {
              name: file.name,
              content: '无法读取内容',
              size: file.size,
              uploadTime: file.name.split('.')[0],
              type: 'text',
              githubUrl: file.html_url,
              downloadUrl: file.download_url,
              error: true
            };
          }
        })
    ) : [];

    return texts.sort((a, b) => b.uploadTime - a.uploadTime);

  } catch (error) {
    console.error('获取文本失败:', error);
    return [];
  }
}
